import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useStore, formatPrice } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AcademicService } from "@/lib/academicService";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/site/Logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Lock,
  FileText,
  Loader2,
  AlertCircle,
  Bell,
  ChevronDown,
  User,
  LogOut,
  LayoutDashboard,
  BookOpen,
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
  const { db, student, hasAccess, logDocumentAccess, ready, session, isAdmin, logout } = useStore();

  const [fetchedMaterial, setFetchedMaterial] = useState<any>(null);
  const [localPdfBlob, setLocalPdfBlob] = useState<Blob | null>(null);
  const [localPdfUrl, setLocalPdfUrl] = useState<string | null>(null);
  const [driveEmbedUrl, setDriveEmbedUrl] = useState<string | null>(null);
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

  // Real-time verification from Supabase purchases and orders tables
  useEffect(() => {
    const studentIdToCheck = student?.id || routeStudentId;
    if (!studentIdToCheck || !materialId) return;

    void (async () => {
      const cleanId = materialId.startsWith("mat_u_") ? materialId.replace("mat_u_", "") : materialId;
      const targetSubId = fetchedMaterial?.subject_id || (material as any)?.subject_id || (material as any)?.subjectId;

      // 1. Direct material / unit purchase check
      const { data } = await supabase
        .from("purchases")
        .select("id")
        .eq("student_id", studentIdToCheck)
        .in("material_id", [materialId, cleanId])
        .maybeSingle();
      if (data) {
        setRemotePurchased(true);
        return;
      }

      // 2. Parent subject purchase check (Subject-wise sales unlocks all units)
      if (targetSubId) {
        const { data: subPur } = await supabase
          .from("purchases")
          .select("id")
          .eq("student_id", studentIdToCheck)
          .eq("material_id", targetSubId)
          .maybeSingle();
        if (subPur) {
          setRemotePurchased(true);
          return;
        }

        const { data: subOrd } = await supabase
          .from("orders")
          .select("id")
          .eq("student_id", studentIdToCheck)
          .eq("status", "Paid")
          .eq("product_id", targetSubId)
          .maybeSingle();
        if (subOrd) {
          setRemotePurchased(true);
          return;
        }
      }

      // 3. Check paid orders for material or unit
      const { data: allPaidOrders } = await supabase
        .from("orders")
        .select("id, product_id, material_ids")
        .eq("student_id", studentIdToCheck)
        .eq("status", "Paid");

      if (allPaidOrders && allPaidOrders.some((o) => {
        if (o.product_id === cleanId || o.product_id === materialId || (targetSubId && o.product_id === targetSubId)) return true;
        if (Array.isArray(o.material_ids) && (
          o.material_ids.includes(cleanId) ||
          o.material_ids.includes(materialId) ||
          (targetSubId && o.material_ids.includes(targetSubId))
        )) return true;
        return false;
      })) {
        setRemotePurchased(true);
        return;
      }
    })();
  }, [student?.id, routeStudentId, materialId, fetchedMaterial?.subject_id, (material as any)?.subject_id, (material as any)?.subjectId]);

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
        const cleanId = materialId.startsWith("mat_u_") ? materialId.replace("mat_u_", "") : materialId;

        // 1. Direct material lookup
        const { data } = await supabase
          .from("materials")
          .select("*")
          .eq("id", cleanId)
          .maybeSingle();
        if (data) {
          setFetchedMaterial(data);
          return;
        }

        // 2. Check material by unit_id
        const { data: mByUnit } = await supabase
          .from("materials")
          .select("*")
          .eq("unit_id", cleanId)
          .maybeSingle();
        if (mByUnit) {
          setFetchedMaterial(mByUnit);
          return;
        }

        // 3. Fallback check units table directly
        const { data: uData } = await supabase
          .from("units")
          .select("*")
          .eq("id", cleanId)
          .maybeSingle();
        if (uData) {
          setFetchedMaterial({
            id: uData.id,
            title: uData.title,
            description: uData.description || `Study materials for ${uData.title}`,
            subject_id: uData.subject_id,
            unit_id: uData.id,
            file_url: uData.file_url,
            file_name: uData.file_name,
            file_size: uData.file_size,
            is_premium: Boolean(uData.is_premium),
            price: uData.is_premium ? 79 : 0,
          });
        }
      })();
    }
  }, [materialId]);

  // Load Real PDF directly from Supabase Storage Bucket ('notes') or Google Drive
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
      setDriveEmbedUrl(null);

      try {
        const filePath =
          (material as any).fileUrl ||
          (material as any).file_url ||
          fetchedMaterial?.file_url;

        const driveUrl =
          (material as any).driveUrl ||
          (material as any).drive_url ||
          fetchedMaterial?.drive_url;

        // If no uploaded file but Google Drive URL is provided, open inside our app viewer
        if (!filePath && driveUrl) {
          const driveId = AcademicService.extractGoogleDriveId(driveUrl);
          if (driveId) {
            // Try fetching direct stream
            try {
              const directGdriveUrl = `https://drive.google.com/uc?export=download&id=${driveId}`;
              const resp = await fetch(directGdriveUrl);
              if (resp.ok) {
                const b = await resp.blob();
                if (b && b.size > 1000 && b.type.includes("pdf")) {
                  const pdfBlob = new Blob([b], { type: "application/pdf" });
                  createdBlobUrl = URL.createObjectURL(pdfBlob);
                  if (isMounted) {
                    setLocalPdfBlob(b);
                    setLocalPdfUrl(createdBlobUrl);
                    setLoadingPdf(false);
                  }
                  return;
                }
              }
            } catch {
              // Direct download blocked by CORS - use secure in-app iframe preview with overlay
            }

            if (isMounted) {
              setDriveEmbedUrl(`https://drive.google.com/file/d/${driveId}/preview`);
              setLoadingPdf(false);
            }
            return;
          }
        }

        if (!filePath && !driveUrl) {
          if (isMounted) {
            setLoadError("No PDF document or resource link has been attached for this study note yet.");
            setLoadingPdf(false);
          }
          return;
        }

        const cleanPath = (filePath || "").replace(/^notes\//, "");

        // 1. Direct binary download from bucket 'notes'
        let blob: Blob | null = null;
        if (cleanPath) {
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
        }

        // 2. Fallback via secure signed URL if direct download restricted
        if (!blob) {
          const userId = student?.id || session?.id;
          const access = await AcademicService.getMaterialAccess(
            material.id,
            userId ? { id: userId, role: session?.role || "student" } : null,
            true,
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
          setLoadError(err?.message || "Failed to load document.");
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

  const handleLogout = () => {
    logout();
    void navigate({ to: "/" });
  };

  const displayName = isAdmin
    ? db.admin.name || "Admin"
    : student?.name || "Ravi Kumar";

  const displayInitials = isAdmin
    ? "AD"
    : (student?.name || "Ravi Kumar")
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

  const courseSubtitle = `${subject?.name || "B.Pharm"} · Year ${material?.year || 2} · Semester ${material?.semester || 3}`;

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-teal-600" />
          <p className="text-xs font-semibold">Verifying document access...</p>
        </div>
      </div>
    );
  }

  if (!material) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] p-4 text-slate-800">
        <div className="text-center max-w-sm bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <FileText className="size-12 mx-auto text-slate-400 mb-3" />
          <h1 className="text-lg font-bold text-slate-900">Study Note Not Found</h1>
          <p className="text-xs text-slate-500 mt-1">The requested document could not be located in the curriculum database.</p>
          <Button asChild className="mt-5 bg-teal-600 hover:bg-teal-700 text-white font-semibold">
            <Link to="/resources">Return to Resources</Link>
          </Button>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // ACCESS GUARD: IF STUDENT HAS NOT PURCHASED, SHOW CLEAN LOCKED SCREEN
  // ────────────────────────────────────────────────────────────────────────────
  if (material.isPremium && !isPurchased) {
    return (
      <div className="flex min-h-screen flex-col justify-between bg-[#f8fafc] text-slate-800 p-4">
        {/* Minimal header */}
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between py-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                void navigate({ to: "/resources" });
              }
            }}
          >
            <ArrowLeft className="mr-2 size-4" /> Back to Notes
          </Button>
          <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10 text-xs font-semibold">
            Premium Note Locked
          </Badge>
        </div>

        {/* Center Lock Card */}
        <div className="mx-auto w-full max-w-md my-auto">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-10 text-center shadow-lg">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-inner">
              <Lock className="size-8" />
            </div>

            <h1 className="mt-5 text-xl font-extrabold text-slate-900">{material.title}</h1>
            <p className="mt-1 text-xs font-semibold text-teal-600">
              {subject?.name || "B.Pharm Curriculum"} · Year {material.year} Sem {material.semester}
            </p>
            <p className="mt-3 text-xs text-slate-500 leading-relaxed">
              This verified study document is part of the licensed educational vault. Please purchase this note to view the full PDF in the reader.
            </p>

            <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Access Type:</span>
                <span className="font-bold text-slate-800">Full Multi-Page PDF</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Curriculum:</span>
                <span className="font-semibold text-teal-700">PCI Syllabus Aligned</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200/80 pt-2">
                <span className="text-slate-500">Price:</span>
                <span className="text-base font-black text-slate-900">{formatPrice(material.price)}</span>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <Button
                asChild
                size="lg"
                className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md"
              >
                <Link
                  to="/checkout"
                  search={{
                    productId: (material as any).subject_id || (material as any).subjectId || material.id,
                    productType: ((material as any).subject_id || (material as any).subjectId) ? "subject" : "material",
                  } as any}
                >
                  Unlock & Purchase Document ({formatPrice(material.price || 79)})
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full h-10 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-medium"
              >
                <Link to="/resources">Browse Other Notes</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-slate-400 py-4">
          © {new Date().getFullYear()} PharmaStudents.com · Protected Academic Portal
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // MAIN PROTECTED READER VIEW (MATCHING REFERENCE DESIGN IMAGE)
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-slate-800 select-none font-sans">
      {/* ────────────────────────────────────────────────────────────────────────
          Top Main Header (Clean, Compact, White with Logo, Title, Bell, Profile)
          ──────────────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex h-14 sm:h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white px-3 sm:px-6 shadow-xs">
        {/* Left: PharmaStudents Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <Logo size="sm" />
        </div>

        {/* Center / Middle: Document Title and Course/Year/Semester */}
        <div className="hidden md:flex flex-col items-center justify-center text-center px-4 min-w-0">
          <h1 className="text-sm font-bold text-slate-900 truncate max-w-md lg:max-w-xl">
            {material.title}
          </h1>
          <p className="text-[11px] font-medium text-slate-500 truncate">
            {courseSubtitle}
          </p>
        </div>

        {/* Right: Notifications Bell and Student Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Notification Bell with red badge */}
          <Button
            variant="ghost"
            size="icon"
            className="relative size-9 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full"
            aria-label="Notifications"
            onClick={() => {
              if (isAdmin) {
                void navigate({ to: "/admin" });
              } else {
                void navigate({ to: "/dashboard" });
              }
            }}
          >
            <Bell className="size-4.5" />
            <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-xs">
              3
            </span>
          </Button>

          {/* Student Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 outline-none transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-teal-500"
                aria-label="Student profile menu"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0d9488] text-xs font-bold text-white shadow-xs">
                  {displayInitials}
                </span>
                <span className="hidden text-xs sm:text-sm font-semibold text-slate-800 sm:inline-block">
                  {displayName}
                </span>
                <ChevronDown className="size-3.5 text-slate-400" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-56 rounded-2xl border-slate-200 bg-white p-2 shadow-xl"
            >
              <div className="px-3 py-2">
                <p className="text-xs font-bold text-slate-900 leading-tight">
                  {displayName}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                  {student?.email || "student@pharmastudents.com"}
                </p>
              </div>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link
                  to={isAdmin ? "/admin" : "/dashboard"}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900"
                >
                  <LayoutDashboard className="size-4 text-slate-400" />
                  <span>Dashboard</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link
                  to="/dashboard/my-resources"
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900"
                >
                  <BookOpen className="size-4 text-slate-400" />
                  <span>My Unlocked Notes</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleLogout}
                className="rounded-xl cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700"
              >
                <div className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium">
                  <LogOut className="size-4 text-red-500" />
                  <span>Log out</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ────────────────────────────────────────────────────────────────────────
          Main PDF Continuous Reader Body (Placed directly below header)
          ──────────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col w-full">
        {loadingPdf ? (
          <div className="flex flex-1 flex-col items-center justify-center p-16 text-slate-500 bg-white min-h-[65vh]">
            <Loader2 className="size-10 animate-spin text-teal-600 mb-3" />
            <p className="text-sm font-bold text-slate-800">
              Opening verified note from storage vault...
            </p>
            <p className="text-xs text-slate-400 mt-1">Preparing high-resolution textbook pages</p>
          </div>
        ) : loadError ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center max-w-md mx-auto my-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 border border-rose-200 mb-3">
              <AlertCircle className="size-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Document Display Issue</h3>
            <p className="text-xs text-slate-500 leading-relaxed mt-1 mb-4">{loadError}</p>
            <Button
              onClick={() => window.location.reload()}
              size="sm"
              variant="outline"
              className="text-xs border-slate-300"
            >
              Retry Loading
            </Button>
          </div>
        ) : localPdfBlob || localPdfUrl ? (
          <MobileCanvasPdfViewer
            pdfBlob={localPdfBlob}
            title={material.title}
            courseInfo={courseSubtitle}
            watermarkEnabled={watermarkEnabled}
            watermarkText="PHARMASTUDENTS.COM"
            onBack={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                void navigate({ to: "/dashboard/my-resources" });
              }
            }}
          />
        ) : driveEmbedUrl ? (
          <div className="relative flex-1 w-full bg-slate-900 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] select-none">
            {/* Embedded Google Drive frame protected inside our app */}
            <iframe
              src={driveEmbedUrl}
              className="w-full h-full min-h-[calc(100vh-4rem)] border-0"
              title={material.title}
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
            {/* Security overlay with student identification watermark */}
            {watermarkEnabled && (
              <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-around overflow-hidden select-none opacity-25 rotate-[-25deg]">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="text-center font-black tracking-widest text-slate-300 text-xs sm:text-base">
                    PHARMASTUDENTS.COM • {student?.name || "AUTHENTICATED ACCESS"} • {student?.email || ""}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-12 text-center text-slate-500 bg-white min-h-[60vh]">
            <FileText className="size-12 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">No Document File Attached</p>
            <p className="text-xs text-slate-400 mt-1">Please check back later or contact support.</p>
          </div>
        )}
      </div>
    </div>
  );
}
