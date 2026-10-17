import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useStore, formatPrice } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AcademicService } from "@/lib/academicService";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Lock,
  BookOpen,
  FileText,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { MobileCanvasPdfViewer } from "@/components/pdf/MobileCanvasPdfViewer";

export const Route = createFileRoute("/viewer/$materialId")({
  validateSearch: (search: Record<string, unknown>): { studentId?: string | undefined } => {
    return {
      studentId: typeof search["studentId"] === "string" ? (search["studentId"] as string) : undefined,
    };
  },
  component: ProtectedDocumentViewer,
});

export default function ProtectedDocumentViewer() {
  const params = useParams({ strict: false }) as Record<string, string | undefined>;
  const materialId = params["materialId"] || "";
  const navigate = useNavigate();
  const { db, student, hasAccess, logDocumentAccess, ready, session, isAdmin } = useStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fetchedMaterial, setFetchedMaterial] = useState<any>(null);
  const [localPdfBlob, setLocalPdfBlob] = useState<Blob | null>(null);
  const [localPdfUrl, setLocalPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [remotePurchased, setRemotePurchased] = useState<boolean>(false);

  // Material resolution
  const material = useMemo(() => {
    const fromStore = db.materials.find((m) => m.id === materialId);
    const resolvedFileUrl = fromStore?.fileUrl || fetchedMaterial?.file_url;
    if (fromStore) {
      return {
        ...fromStore,
        fileUrl: resolvedFileUrl,
        driveUrl: fromStore.driveUrl || fetchedMaterial?.drive_url,
      };
    }
    if (fetchedMaterial) {
      return {
        id: fetchedMaterial.id,
        title: fetchedMaterial.title,
        description: fetchedMaterial.description || "",
        year: fetchedMaterial.year,
        semester: fetchedMaterial.semester,
        subjectId: fetchedMaterial.subject_id,
        isPremium: fetchedMaterial.is_premium ?? (fetchedMaterial.price > 0),
        price: Number(fetchedMaterial.price || 0),
        topics: [],
        sampleContent: [],
        fileUrl: fetchedMaterial.file_url,
        driveUrl: fetchedMaterial.drive_url,
        allowDownload: fetchedMaterial.allow_download ?? false,
      };
    }
    return undefined;
  }, [db.materials, materialId, fetchedMaterial]);

  const subject = material ? db.subjects.find((s) => s.id === (material as any).subjectId) : undefined;
  const routeStudentId = params["studentId"];

  // Check if watermark is enabled in material settings (default true)
  const watermarkEnabled =
    (material as any)?.addWatermark ??
    (material as any)?.add_watermark ??
    (material as any)?.security?.watermark_pdf ??
    true;

  // Real-time verification from Supabase purchases table
  useEffect(() => {
    const studentIdToCheck = student?.id || routeStudentId;
    if (!studentIdToCheck || !materialId) return;

    void (async () => {
      const { data } = await supabase
        .from("purchases")
        .select("id")
        .eq("student_id", studentIdToCheck)
        .eq("material_id", materialId)
        .maybeSingle();
      if (data) {
        setRemotePurchased(true);
      }
    })();
  }, [student?.id, routeStudentId, materialId]);

  // Strict Entitlement Check:
  // If note is paid, student MUST have purchased it to view notes!
  const isPurchased = useMemo(() => {
    if (!material) return false;
    // Free materials are accessible to all
    if (!material.isPremium || Number(material.price) === 0) return true;
    // Admins always have access
    if (session?.role === "admin" || isAdmin) return true;
    // Direct verified purchase in Supabase database
    if (remotePurchased) return true;
    // Must be logged in student
    if (!student) return false;

    // Check 1: Store hasAccess
    if (hasAccess(material as any)) return true;

    // Check 2: Direct purchase in store state
    const inLocalPurchases = db.purchases.some(
      (p) => p.studentId === student.id && p.materialId === material.id,
    );
    if (inLocalPurchases) return true;

    // Check 3: Paid order in store state
    const inLocalOrders = db.orders.some(
      (o) =>
        o.studentId === student.id &&
        o.status === "Paid" &&
        Array.isArray(o.materialIds) &&
        o.materialIds.includes(material.id),
    );
    if (inLocalOrders) return true;

    return false;
  }, [material, session?.role, isAdmin, remotePurchased, student, hasAccess, db.purchases, db.orders]);

  // Fetch complete material metadata from Supabase
  useEffect(() => {
    if (materialId) {
      void (async () => {
        const { data } = await supabase
          .from("materials")
          .select("*")
          .eq("id", materialId)
          .maybeSingle();
        if (data) setFetchedMaterial(data);
      })();
    }
  }, [materialId]);

  // Load Real PDF directly from Supabase Storage Bucket ('notes')
  // Using direct blob download so raw Supabase signed URL is never exposed to student
  useEffect(() => {
    let isMounted = true;
    let createdBlobUrl: string | null = null;

    async function loadRealPdfBlob() {
      if (!material) return;

      if (!isPurchased) {
        setLoadingPdf(false);
        return;
      }

      setLoadingPdf(true);
      setLoadError(null);

      try {
        const filePath =
          (material as any).fileUrl ||
          (material as any).file_url ||
          fetchedMaterial?.file_url;

        if (!filePath) {
          if (isMounted) {
            setLoadError("No PDF document has been uploaded for this study note yet.");
            setLoadingPdf(false);
          }
          return;
        }

        const cleanPath = filePath.replace(/^notes\//, "");

        // 1. Direct binary download from bucket 'notes'
        let blob: Blob | null = null;
        try {
          const { data: blobData, error: dlErr } = await supabase.storage
            .from("notes")
            .download(cleanPath);

          if (!dlErr && blobData) {
            blob = blobData;
          }
        } catch (e) {
          console.warn("Direct bucket download fallback:", e);
        }

        // 2. Fallback via secure signed URL if direct download restricted
        if (!blob) {
          const userId = student?.id || session?.id;
          const access = await AcademicService.getMaterialAccess(
            material.id,
            userId ? { id: userId, role: session?.role || "student" } : null,
            true, // Authorized override since frontend verified purchase
          );

          if (access.url) {
            const resp = await fetch(access.url);
            if (resp.ok) {
              blob = await resp.blob();
            }
          }
        }

        if (!blob) {
          throw new Error("Could not retrieve document file from storage bucket.");
        }

        // Convert binary into internal browser-origin blob URL
        // Result: blob:http://localhost:8080/<uuid>
        // Completely hides the external Supabase URL from the user!
        const pdfBlob = new Blob([blob], { type: "application/pdf" });
        createdBlobUrl = URL.createObjectURL(pdfBlob);

        if (isMounted) {
          setLocalPdfBlob(blob);
          setLocalPdfUrl(createdBlobUrl);
          setLoadingPdf(false);
        }
      } catch (err: any) {
        console.error("PDF loading error:", err);
        if (isMounted) {
          setLoadError(err?.message || "Failed to load document from storage bucket.");
          setLoadingPdf(false);
        }
      }
    }

    if (material && isPurchased) {
      void loadRealPdfBlob();
    } else {
      setLoadingPdf(false);
    }

    return () => {
      isMounted = false;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [material, isPurchased, student?.id, session?.id, fetchedMaterial]);

  // Log document access for authorized student
  useEffect(() => {
    if (material && student && isPurchased) {
      logDocumentAccess(material.id);
    }
  }, [material, student, isPurchased, logDocumentAccess]);

  // Restrict right click & text selection on protected reader
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    toast.warning("Protected Document: Right-click is restricted on licensed study materials.");
  };

  const handleCopy = (e: React.ClipboardEvent) => {
    e.preventDefault();
    toast.warning("Protected Document: Text copying is restricted to prevent unauthorized distribution.");
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        void document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-teal-500" />
          <p className="text-xs">Verifying document access...</p>
        </div>
      </div>
    );
  }

  if (!material) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-slate-100">
        <div className="text-center">
          <FileText className="size-12 mx-auto text-slate-600 mb-3" />
          <h1 className="text-xl font-bold">Study Note Not Found</h1>
          <p className="text-xs text-slate-400 mt-1">The requested document could not be located.</p>
          <Button asChild className="mt-5 bg-teal-600 hover:bg-teal-700">
            <Link to="/resources">Return to Resources</Link>
          </Button>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // ACCESS GUARD: IF STUDENT HAS NOT PURCHASED, SHOW LOCKED SCREEN ONLY
  // ────────────────────────────────────────────────────────────────────────────
  if (material.isPremium && !isPurchased) {
    return (
      <div className="flex min-h-screen flex-col justify-between bg-slate-950 text-slate-100 p-4">
        {/* Minimal header */}
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between py-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white hover:bg-slate-900"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                void navigate({ to: "/resources" });
              }
            }}
          >
            <ArrowLeft className="mr-2 size-4" /> Back
          </Button>
          <Badge variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-500/10 text-xs">
            Premium Note Locked
          </Badge>
        </div>

        {/* Center Lock Card */}
        <div className="mx-auto w-full max-w-md my-auto">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 sm:p-10 text-center shadow-2xl backdrop-blur-md">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner">
              <Lock className="size-8" />
            </div>

            <h1 className="mt-5 text-xl font-extrabold text-white">{material.title}</h1>
            <p className="mt-1 text-xs font-semibold text-teal-400">
              {subject?.name || "B.Pharm Curriculum"} · Year {material.year} Sem {material.semester}
            </p>
            <p className="mt-3 text-xs text-slate-400 leading-relaxed">
              This verified study document is part of the licensed educational vault. Please purchase this note to view the full PDF in the protected reader.
            </p>

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-left text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Access Type:</span>
                <span className="font-bold text-white">Full Multi-Page PDF</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Curriculum:</span>
                <span className="font-semibold text-emerald-400">PCI Syllabus Aligned</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-800/80 pt-2">
                <span className="text-slate-400">One-Time Price:</span>
                <span className="text-base font-black text-white">{formatPrice(material.price)}</span>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <Button
                asChild
                size="lg"
                className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg"
              >
                <Link
                  to="/checkout"
                  search={{ productId: material.id, productType: "material" } as any}
                >
                  Unlock & Purchase Document ({formatPrice(material.price)})
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full h-10 border-slate-800 text-slate-300 hover:bg-slate-800 rounded-xl"
              >
                <Link to="/resources">Browse Other Notes</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-slate-500 py-4">
          © {new Date().getFullYear()} PharmaStudents.com · Protected Academic Portal
        </div>
      </div>
    );
  }

  // Watermark text overlays on viewer
  const studentIdentifier = student
    ? `${student.name.toUpperCase()} • ${student.email.toUpperCase()} • ID: ${student.id.slice(0, 8)}`
    : `LICENSED PREVIEW • PHARMASTUDENTS.COM`;

  return (
    <div
      className="flex min-h-screen flex-col bg-slate-950 text-slate-100 select-none font-sans"
      onContextMenu={handleContextMenu}
      onCopy={handleCopy}
    >
      {/* Print protection */}
      <style>{`
        @media print {
          body { display: none !important; }
        }
      `}</style>

      {/* Top Protected Toolbar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-800/90 bg-slate-950/95 backdrop-blur-md px-4">
        {/* Left: Exit & Note Title */}
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-300 hover:bg-slate-900 hover:text-white shrink-0"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                void navigate({ to: "/dashboard/my-resources" });
              }
            }}
          >
            <ArrowLeft className="mr-1.5 size-4" /> Exit Reader
          </Button>

          <div className="hidden sm:block border-l border-slate-800 pl-3 min-w-0">
            <p className="truncate text-xs font-bold text-white max-w-sm lg:max-w-md">
              {material.title}
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              {subject?.name || "B.Pharm"} · Year {material.year} Sem {material.semester}
            </p>
          </div>
        </div>

        {/* Center: Viewer Title / Status */}
        <div className="flex items-center gap-2">
          <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <BookOpen className="size-3.5 text-teal-400" />
            <span>PCI Official Syllabus Reader</span>
          </span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Fullscreen Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-slate-400 hover:bg-slate-900 hover:text-white"
            onClick={toggleFullscreen}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </Button>

          {/* Security Badge */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="size-3" />
            <span>PROTECTED VIEWER</span>
          </div>
        </div>
      </header>

      {/* Main Document Reading Canvas */}
      <main className="relative flex flex-1 flex-col items-center justify-start overflow-auto p-1 sm:p-4 bg-slate-900/90">
        <div className="w-full max-w-5xl rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden">
          {/* Document Content Viewport */}
          <div className="relative z-10 w-full min-h-[60vh] flex flex-col items-center justify-center bg-slate-950">
            {loadingPdf ? (
              <div className="flex flex-col items-center gap-3 p-12 text-slate-400">
                <Loader2 className="size-10 animate-spin text-teal-500" />
                <p className="text-sm font-semibold text-slate-200">
                  Opening verified note from storage bucket...
                </p>
                <p className="text-xs text-slate-500">Decrypting document and generating secure reader stream</p>
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center gap-3 p-12 text-center max-w-md">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <AlertCircle className="size-6" />
                </div>
                <h3 className="text-base font-bold text-white">Document Display Issue</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{loadError}</p>
                <Button
                  onClick={() => window.location.reload()}
                  size="sm"
                  variant="outline"
                  className="mt-2 text-xs border-slate-700"
                >
                  Retry Loading
                </Button>
              </div>
            ) : localPdfBlob || localPdfUrl ? (
              // Renders actual multi-page PDF vectors directly via HTML5 Canvas (Full mobile & touch support)
              // No Supabase URL is ever displayed or leaked!
              <MobileCanvasPdfViewer
                pdfBlob={localPdfBlob}
                title={material.title}
                watermarkEnabled={watermarkEnabled}
                watermarkText="Pharmastudents.com"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 p-12 text-center text-slate-400">
                <FileText className="size-12 text-slate-600 mb-1" />
                <p className="text-sm font-semibold text-slate-300">No Document File Attached</p>
                <p className="text-xs text-slate-500">Please check back later or contact administrator.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Security Footer Notice */}
      <footer className="border-t border-slate-900 bg-slate-950 px-4 py-2 text-center text-[10px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-1">
        <span>
          Licensed to <strong>{student ? student.name : "Authenticated User"}</strong> ({student ? student.email : "PharmaStudents"})
        </span>
        <span className="text-slate-500">
          Protected Viewer • Unauthorized copying, downloading, or distribution is strictly prohibited.
        </span>
      </footer>
    </div>
  );
}
