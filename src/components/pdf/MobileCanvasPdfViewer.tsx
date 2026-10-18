import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Loader2,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";

interface MobileCanvasPdfViewerProps {
  pdfBlob?: Blob | null;
  pdfArrayBuffer?: ArrayBuffer | null;
  title: string;
  courseInfo?: string;
  watermarkEnabled?: boolean;
  watermarkText?: string;
  onBack?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Single Continuous Page Item (Lazy-loaded with IntersectionObserver)
// ─────────────────────────────────────────────────────────────────────────────
interface PdfPageItemProps {
  pdfDoc: any;
  pageNumber: number;
  containerWidth: number;
  watermarkEnabled: boolean;
  watermarkText: string;
  onVisible: (pageNumber: number) => void;
}

function PdfPageItem({
  pdfDoc,
  pageNumber,
  containerWidth,
  watermarkEnabled,
  watermarkText,
  onVisible,
}: PdfPageItemProps) {
  const pageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number>(1.414); // standard A4 ratio default
  const renderTaskRef = useRef<any>(null);

  // 1. Initial measurement of aspect ratio from page viewport
  useEffect(() => {
    let active = true;
    async function measureRatio() {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (!active) return;
        const unscaled = page.getViewport({ scale: 1.0 });
        if (unscaled.width > 0 && unscaled.height > 0) {
          setAspectRatio(unscaled.height / unscaled.width);
        }
      } catch (err) {
        console.warn(`Could not measure ratio for page ${pageNumber}:`, err);
      }
    }
    void measureRatio();
    return () => {
      active = false;
    };
  }, [pdfDoc, pageNumber]);

  // 2. Render Page Canvas with high-DPI scaling
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || containerWidth <= 0) return;
    setRendering(true);

    try {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (_) {}
        renderTaskRef.current = null;
      }

      const page = await pdfDoc.getPage(pageNumber);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return;

      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const targetWidth = Math.max(280, containerWidth);
      const effectiveScale = targetWidth / unscaledViewport.width;
      const viewport = page.getViewport({ scale: effectiveScale });

      // High DPI calculation (Retina / Mobile sharp rendering)
      const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = "100%";
      canvas.style.height = "auto";

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const renderContext = {
        canvasContext: ctx,
        viewport,
      };

      const task = page.render(renderContext);
      renderTaskRef.current = task;
      await task.promise;
      setRendered(true);
      setRendering(false);
    } catch (err: any) {
      if (err?.name !== "RenderingCancelledException") {
        console.error(`Render error on page ${pageNumber}:`, err);
      }
      setRendering(false);
    }
  }, [pdfDoc, pageNumber, containerWidth]);

  // 3. Progressive render: Render immediately on mount with slight stagger, plus IntersectionObserver
  useEffect(() => {
    let active = true;

    // Render immediately or with short progressive stagger
    const delay = Math.min((pageNumber - 1) * 75, 1200);
    const timer = setTimeout(() => {
      if (active && !rendered && !rendering) {
        void renderPage();
      }
    }, delay);

    // Also observe intersection so if user scrolls fast to this page, it renders immediately
    const el = pageRef.current;
    let observer: IntersectionObserver | null = null;
    if (el) {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry && entry.isIntersecting && !rendered && !rendering) {
            void renderPage();
          }
        },
        {
          root: null,
          rootMargin: "600px 0px 600px 0px",
          threshold: 0,
        },
      );
      observer.observe(el);
    }

    return () => {
      active = false;
      clearTimeout(timer);
      if (observer) observer.disconnect();
    };
  }, [renderPage, rendered, rendering, pageNumber]);

  // 4. In-view tracking observer: update header page number when user scrolls
  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;

    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          onVisible(pageNumber);
        }
      },
      {
        root: null,
        rootMargin: "-20% 0px -60% 0px", // marks page active when top half crosses center
        threshold: 0.1,
      },
    );

    visibilityObserver.observe(el);
    return () => {
      visibilityObserver.disconnect();
    };
  }, [pageNumber, onVisible]);

  // Calculated height preserves exact document height and scrollbar accuracy
  const calculatedHeight = Math.round(containerWidth * aspectRatio);

  return (
    <div
      id={`pdf-page-${pageNumber}`}
      ref={pageRef}
      className="relative mx-auto my-3 sm:my-5 w-full bg-white rounded-md border border-slate-200/80 shadow-xs sm:shadow-sm overflow-hidden select-none"
      style={{
        minHeight: `${calculatedHeight}px`,
      }}
    >
      {/* Subtle, non-intrusive watermark overlay */}
      {watermarkEnabled && (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-around overflow-hidden select-none"
          aria-hidden="true"
        >
          <div className="rotate-[-25deg] text-center text-xs sm:text-sm font-black tracking-widest text-slate-900/[0.04] uppercase">
            {watermarkText}
          </div>
          <div className="rotate-[-25deg] text-center text-xs sm:text-sm font-black tracking-widest text-slate-900/[0.04] uppercase">
            {watermarkText}
          </div>
          <div className="rotate-[-25deg] text-center text-xs sm:text-sm font-black tracking-widest text-slate-900/[0.04] uppercase">
            {watermarkText}
          </div>
        </div>
      )}

      {/* Loading placeholder spinner if page is coming into view */}
      {rendering && !rendered && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-50/80 text-slate-400">
          <Loader2 className="size-6 animate-spin text-teal-600 mb-2" />
          <span className="text-[11px] font-medium text-slate-500">Loading Page {pageNumber}...</span>
        </div>
      )}

      {/* Vector Canvas */}
      <canvas ref={canvasRef} className="block w-full h-auto bg-white" />

      {/* Page indicator pill at bottom right of each page */}
      <div className="absolute bottom-2 right-2 z-10 rounded bg-slate-900/60 px-1.5 py-0.5 text-[9px] font-mono font-medium text-white/90 backdrop-blur-xs">
        {pageNumber}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Continuous Vertical PDF Viewer
// ─────────────────────────────────────────────────────────────────────────────
export function MobileCanvasPdfViewer({
  pdfBlob,
  pdfArrayBuffer,
  title,
  courseInfo,
  watermarkEnabled = true,
  watermarkText = "PHARMASTUDENTS.COM",
  onBack,
}: MobileCanvasPdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const readingAreaRef = useRef<HTMLDivElement>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageInput, setPageInput] = useState<string>("1");
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // 1. Content Protection: Disabling Print, Save, ContextMenu shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent PrintScreen key
      if (e.key === "PrintScreen" || e.code === "PrintScreen") {
        e.preventDefault();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText("").catch(() => {});
        }
        toast.warning("Protected Document: Screenshots are restricted on licensed notes.");
      }

      // Prevent Ctrl+P, Ctrl+S, Cmd+P, Cmd+S
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "p" || e.key === "P" || e.key === "s" || e.key === "S")
      ) {
        e.preventDefault();
        toast.warning("Protected Document: Printing and downloading are disabled.");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // 2. Fullscreen event synchronization
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // 3. Ensure PDF.js is loaded from CDN
  const ensurePdfJsLoaded = useCallback(async (): Promise<any> => {
    if ((window as any).pdfjsLib) {
      return (window as any).pdfjsLib;
    }

    return new Promise((resolve, reject) => {
      const existingScript = document.getElementById("pdfjs-lib-script");
      if (existingScript) {
        existingScript.addEventListener("load", () => {
          resolve((window as any).pdfjsLib);
        });
        existingScript.addEventListener("error", () => {
          reject(new Error("Failed to load PDF engine"));
        });
        return;
      }

      const script = document.createElement("script");
      script.id = "pdfjs-lib-script";
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.async = true;

      script.onload = () => {
        const lib = (window as any).pdfjsLib;
        if (lib) {
          lib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          resolve(lib);
        } else {
          reject(new Error("PDF.js library initialized without global object"));
        }
      };

      script.onerror = () => {
        reject(new Error("Failed to load PDF reader from CDN. Please check network."));
      };

      document.head.appendChild(script);
    });
  }, []);

  // 4. Load PDF Document into memory
  useEffect(() => {
    let isCancelled = false;

    async function loadDocument() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const pdfjs = await ensurePdfJsLoaded();
        let buffer: ArrayBuffer;

        if (pdfArrayBuffer) {
          buffer = pdfArrayBuffer;
        } else if (pdfBlob) {
          buffer = await pdfBlob.arrayBuffer();
        } else {
          throw new Error("No PDF data provided to viewer");
        }

        const loadingTask = pdfjs.getDocument({
          data: new Uint8Array(buffer),
          cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/",
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setPageInput("1");
        setLoading(false);
      } catch (err: any) {
        if (isCancelled) return;
        console.error("PDF.js doc load error:", err);
        setErrorMessage(err?.message || "Failed to parse PDF document.");
        setLoading(false);
      }
    }

    if (pdfBlob || pdfArrayBuffer) {
      void loadDocument();
    }

    return () => {
      isCancelled = true;
    };
  }, [pdfBlob, pdfArrayBuffer, ensurePdfJsLoaded]);

  // 5. Measure reading area width on mount and window resize
  useEffect(() => {
    function updateWidth() {
      if (readingAreaRef.current) {
        const clientW = readingAreaRef.current.clientWidth;
        if (clientW > 0) {
          setContainerWidth(clientW);
        }
      }
    }

    updateWidth();
    const observer = new ResizeObserver(() => {
      updateWidth();
    });

    if (readingAreaRef.current) {
      observer.observe(readingAreaRef.current);
    }

    window.addEventListener("resize", updateWidth);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  // 6. Smooth scrolling to a specific page
  const scrollToPage = (targetPage: number) => {
    const pageNum = Math.max(1, Math.min(numPages, targetPage));
    const targetEl = document.getElementById(`pdf-page-${pageNum}`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
      setCurrentPage(pageNum);
      setPageInput(String(pageNum));
    }
  };

  const handlePageVisible = useCallback((pageNumber: number) => {
    setCurrentPage(pageNumber);
    setPageInput(String(pageNumber));
  }, []);

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(pageInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= numPages) {
      scrollToPage(parsed);
    } else {
      setPageInput(String(currentPage));
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.exitFullscreen) {
      void document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Pre-generate page numbers array
  const pagesList = useMemo(() => {
    return Array.from({ length: numPages }, (_, i) => i + 1);
  }, [numPages]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-500 min-h-[60vh] bg-white">
        <Loader2 className="size-10 animate-spin text-teal-600 mb-3" />
        <p className="text-sm font-semibold text-slate-800">Opening Digital Document...</p>
        <p className="text-xs text-slate-400 mt-1">Rendering high-resolution textbook pages</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="p-10 text-center max-w-md mx-auto my-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <p className="text-rose-600 font-bold text-sm mb-1.5">Error Loading Document</p>
        <p className="text-xs text-slate-500 mb-4">{errorMessage}</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.location.reload()}
          className="text-xs border-slate-300"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col w-full items-center select-none bg-[#f8fafc] min-h-screen"
      onContextMenu={(e) => {
        e.preventDefault();
        toast.warning("Protected Document: Right-click is restricted.");
      }}
    >
      {/* Print Suppression */}
      <style>{`
        @media print {
          body { display: none !important; }
        }
      `}</style>

      {/* ────────────────────────────────────────────────────────────────────────
          Sub-Header Reader Toolbar (Clean White Bar Matching Reference Image)
          ──────────────────────────────────────────────────────────────────────── */}
      <div className="sticky top-14 sm:top-16 z-30 flex w-full items-center justify-between border-b border-slate-200/90 bg-white/95 px-3 py-2 sm:px-6 backdrop-blur-md shadow-xs">
        {/* Left: Back button + Document Title & Course */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100 shrink-0 rounded-full"
              onClick={onBack}
              aria-label="Back to Notes"
            >
              <ArrowLeft className="size-4" />
            </Button>
          )}

          <div className="min-w-0 pr-2">
            <h2 className="truncate text-xs sm:text-sm font-bold text-slate-900 max-w-[180px] xs:max-w-xs sm:max-w-md lg:max-w-lg">
              {title}
            </h2>
            {courseInfo && (
              <p className="truncate text-[10px] sm:text-xs text-slate-500 font-medium">
                {courseInfo}
              </p>
            )}
          </div>
        </div>

        {/* Right: Compact Page Counter (< 3 / 28 >) & Fullscreen Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Previous Page Button */}
          <Button
            variant="ghost"
            size="icon"
            className="size-7 sm:size-8 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30"
            disabled={currentPage <= 1}
            onClick={() => scrollToPage(currentPage - 1)}
            aria-label="Previous Page"
          >
            <ChevronLeft className="size-4" />
          </Button>

          {/* Current Page / Total Pages Indicator */}
          <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1">
            <input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={() => {
                const parsed = parseInt(pageInput, 10);
                if (!isNaN(parsed) && parsed >= 1 && parsed <= numPages) {
                  scrollToPage(parsed);
                } else {
                  setPageInput(String(currentPage));
                }
              }}
              className="h-7 w-9 sm:w-11 rounded border border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-800 focus:border-teal-600 focus:bg-white focus:outline-hidden"
              aria-label="Page number"
            />
            <span className="text-xs font-semibold text-slate-500">/ {numPages}</span>
          </form>

          {/* Next Page Button */}
          <Button
            variant="ghost"
            size="icon"
            className="size-7 sm:size-8 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30"
            disabled={currentPage >= numPages}
            onClick={() => scrollToPage(currentPage + 1)}
            aria-label="Next Page"
          >
            <ChevronRight className="size-4" />
          </Button>

          {/* Fullscreen Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            className="size-7 sm:size-8 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 ml-1"
            onClick={toggleFullscreen}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </Button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          Continuous Vertical Reading Column (Like an Online Textbook)
          ──────────────────────────────────────────────────────────────────────── */}
      <main className="w-full flex-1 flex flex-col items-center px-2 py-4 sm:px-4 sm:py-6">
        <div
          ref={readingAreaRef}
          className="w-full max-w-4xl flex flex-col items-center"
        >
          {pagesList.map((pageNum) => (
            <PdfPageItem
              key={pageNum}
              pdfDoc={pdfDoc}
              pageNumber={pageNum}
              containerWidth={containerWidth}
              watermarkEnabled={watermarkEnabled}
              watermarkText={watermarkText}
              onVisible={handlePageVisible}
            />
          ))}
        </div>
      </main>

      {/* Reader Footer Notice */}
      <footer className="w-full border-t border-slate-200 bg-white py-3 px-4 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 text-teal-700 font-medium">
          <ShieldCheck className="size-4 text-teal-600" />
          <span>PharmaStudents Secure Reader • PCI Syllabus Aligned</span>
        </div>
        <p className="text-[11px] text-slate-400">
          Showing Page {currentPage} of {numPages} • Continuous Vertical View
        </p>
      </footer>
    </div>
  );
}
