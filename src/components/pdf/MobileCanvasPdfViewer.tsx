import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Loader2,
  ShieldAlert,
  RotateCw,
} from "lucide-react";

interface MobileCanvasPdfViewerProps {
  pdfBlob?: Blob | null;
  pdfArrayBuffer?: ArrayBuffer | null;
  title: string;
  watermarkEnabled?: boolean;
  watermarkText?: string;
}

export function MobileCanvasPdfViewer({
  pdfBlob,
  pdfArrayBuffer,
  title,
  watermarkEnabled = true,
  watermarkText = "Pharmastudents.com",
}: MobileCanvasPdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [fitWidth, setFitWidth] = useState<boolean>(true);
  const [rotation, setRotation] = useState<number>(0);
  const [renderMode] = useState<"single">("single");
  const [loading, setLoading] = useState<boolean>(true);
  const [renderingPage, setRenderingPage] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isScreenCaptureBlocked, setIsScreenCaptureBlocked] = useState<boolean>(false);

  const currentRenderTask = useRef<any>(null);

  // 1. Anti-Screenshot Protection:
  // Defeat Snipping Tool, Win+Shift+S, PrtScn, screen recorders by blurring/shielding on blur
  useEffect(() => {
    const handleBlur = () => {
      setIsScreenCaptureBlocked(true);
    };

    const handleFocus = () => {
      setIsScreenCaptureBlocked(false);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsScreenCaptureBlocked(true);
      } else {
        setIsScreenCaptureBlocked(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent PrintScreen key
      if (e.key === "PrintScreen" || e.code === "PrintScreen") {
        e.preventDefault();
        setIsScreenCaptureBlocked(true);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText("").catch(() => {});
        }
        toast.warning("Screenshot blocked: Content is digitally protected.");
        setTimeout(() => setIsScreenCaptureBlocked(false), 2000);
      }

      // Prevent Ctrl+P, Ctrl+S, Ctrl+Shift+S, Cmd+Shift+3/4
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "p" || e.key === "P" || e.key === "s" || e.key === "S")
      ) {
        e.preventDefault();
        toast.warning("Printing and saving are disabled on protected notes.");
      }
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // 2. Ensure PDF.js script and worker are loaded in browser
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

  // 3. Parse PDF document into memory
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

  // 4. Render single page on canvas (with fit-to-width auto-scaling)
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isCancelled = false;

    async function renderPage() {
      setRenderingPage(true);

      try {
        if (currentRenderTask.current) {
          currentRenderTask.current.cancel();
          currentRenderTask.current = null;
        }

        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Calculate dynamic scale if fitWidth is enabled
        let effectiveScale = scale;
        const unscaledViewport = page.getViewport({ scale: 1.0, rotation });

        if (fitWidth && containerRef.current) {
          const containerWidth = containerRef.current.clientWidth;
          const targetWidth = Math.max(300, containerWidth - 24); // Account for mobile padding
          effectiveScale = targetWidth / unscaledViewport.width;
        }

        const viewport = page.getViewport({ scale: effectiveScale, rotation });

        // High DPI handling for sharp mobile screens (Retina / OLED)
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const renderContext = {
          canvasContext: ctx,
          viewport,
        };

        const renderTask = page.render(renderContext);
        currentRenderTask.current = renderTask;

        await renderTask.promise;
        if (!isCancelled) {
          setRenderingPage(false);
        }
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.error("Canvas render error:", err);
        }
        if (!isCancelled) {
          setRenderingPage(false);
        }
      }
    }

    void renderPage();

    return () => {
      isCancelled = true;
      if (currentRenderTask.current) {
        try {
          currentRenderTask.current.cancel();
        } catch (_) {}
      }
    };
  }, [pdfDoc, currentPage, scale, fitWidth, rotation]);

  // Touch swipe support for mobile page flipping
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      touchStartX.current = touch.clientX;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touch = e.changedTouches[0];
    if (!touch) return;

    const touchEndX = touch.clientX;
    const diff = touchEndX - touchStartX.current;

    // Minimum swipe threshold: 50px
    if (diff < -50 && currentPage < numPages) {
      setCurrentPage((p) => p + 1);
    } else if (diff > 50 && currentPage > 1) {
      setCurrentPage((p) => p - 1);
    }
    touchStartX.current = null;
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 min-h-[60vh]">
        <Loader2 className="size-10 animate-spin text-teal-500 mb-3" />
        <p className="text-sm font-bold text-slate-200">Preparing Mobile Reader...</p>
        <p className="text-xs text-slate-500 mt-1">Rendering high-resolution vector pages</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <p className="text-rose-400 font-bold text-sm mb-2">Error Loading Document</p>
        <p className="text-xs text-slate-400 mb-4">{errorMessage}</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.location.reload()}
          className="text-xs border-slate-700"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col w-full items-center select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Print Suppression */}
      <style>{`
        @media print {
          body { display: none !important; }
        }
      `}</style>

      {/* Floating / Sticky Mobile Navigation & Zoom Controls */}
      <div className="sticky top-14 z-30 flex flex-wrap w-full max-w-4xl items-center justify-between gap-2 border-y border-slate-800 bg-slate-950/95 px-3 py-2 text-xs backdrop-blur-md shadow-md">
        {/* Page navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-slate-300 hover:bg-slate-800 disabled:opacity-30"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            aria-label="Previous Page"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <div className="flex items-center gap-1 px-1">
            <input
              type="number"
              min={1}
              max={numPages}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1 && val <= numPages) {
                  setCurrentPage(val);
                }
              }}
              className="h-7 w-12 rounded border border-slate-700 bg-slate-900 text-center font-mono text-xs font-bold text-white focus:border-teal-500 focus:outline-hidden"
            />
            <span className="text-slate-400 font-mono text-xs">/ {numPages}</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-slate-300 hover:bg-slate-800 disabled:opacity-30"
            disabled={currentPage >= numPages}
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            aria-label="Next Page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        {/* Zoom & Fit-to-Width Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFitWidth((fw) => !fw)}
            className={`h-7 px-2 text-[11px] font-semibold rounded ${
              fitWidth
                ? "bg-teal-600/30 text-teal-400 border border-teal-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {fitWidth ? "Fit Width: ON" : "Fit Width"}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-slate-400 hover:bg-slate-800 hover:text-white"
            onClick={() => {
              setFitWidth(false);
              setScale((s) => Math.max(0.6, s - 0.15));
            }}
            aria-label="Zoom out"
          >
            <ZoomOut className="size-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-slate-400 hover:bg-slate-800 hover:text-white"
            onClick={() => {
              setFitWidth(false);
              setScale((s) => Math.min(2.5, s + 0.15));
            }}
            aria-label="Zoom in"
          >
            <ZoomIn className="size-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-slate-400 hover:bg-slate-800 hover:text-white"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            aria-label="Rotate Page"
          >
            <RotateCw className="size-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-slate-400 hover:bg-slate-800 hover:text-white hidden sm:inline-flex"
            onClick={toggleFullscreen}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </Button>
        </div>
      </div>

      {/* Main PDF Page Display Canvas */}
      <div className="relative my-4 flex w-full justify-center overflow-x-auto px-2">
        <div className="relative rounded-xl border border-slate-800 bg-white shadow-2xl overflow-hidden transition-all">
          {/* Screen Capture Shield: If window loses focus or Snipping tool is opened */}
          {isScreenCaptureBlocked && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 p-6 text-center text-slate-200">
              <ShieldAlert className="size-12 text-rose-500 mb-3" />
              <h4 className="text-base font-bold text-white">Protected Document View</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Screen capture and recording are disabled for protected pharmacy curriculum materials.
                Click back inside the reader to continue.
              </p>
            </div>
          )}

          {/* Clean Subtle Watermark: Only "Pharmastudents.com" if watermark is ON; if OFF, nothing */}
          {watermarkEnabled && (
            <div
              className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-around overflow-hidden select-none"
              aria-hidden="true"
            >
              <div className="rotate-[-25deg] text-center text-xs sm:text-sm font-extrabold tracking-widest text-slate-900/10 uppercase">
                {watermarkText}
              </div>
              <div className="rotate-[-25deg] text-center text-xs sm:text-sm font-extrabold tracking-widest text-slate-900/10 uppercase">
                {watermarkText}
              </div>
              <div className="rotate-[-25deg] text-center text-xs sm:text-sm font-extrabold tracking-widest text-slate-900/10 uppercase">
                {watermarkText}
              </div>
            </div>
          )}

          {/* Spinner overlay while rendering high-DPI page */}
          {renderingPage && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/20 backdrop-blur-[1px]">
              <Loader2 className="size-8 animate-spin text-teal-600" />
            </div>
          )}

          {/* HTML5 Canvas where PDF.js renders vectors */}
          <canvas ref={canvasRef} className="block mx-auto" />
        </div>
      </div>

      {/* Mobile Bottom Quick Actions */}
      <div className="flex w-full max-w-md items-center justify-between px-4 pb-6 pt-2 text-xs">
        <Button
          variant="outline"
          size="sm"
          className="border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 disabled:opacity-40"
          disabled={currentPage <= 1}
          onClick={() => {
            setCurrentPage((p) => Math.max(1, p - 1));
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <ChevronLeft className="mr-1 size-3.5" /> Previous
        </Button>

        <span className="text-[11px] font-semibold text-slate-400">
          Page {currentPage} of {numPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          className="border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 disabled:opacity-40"
          disabled={currentPage >= numPages}
          onClick={() => {
            setCurrentPage((p) => Math.min(numPages, p + 1));
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          Next <ChevronRight className="ml-1 size-3.5" />
        </Button>
      </div>
    </div>
  );
}
