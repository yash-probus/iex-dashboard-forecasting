import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Download, RefreshCw, X, AlertCircle, Share2, FileText, Image as ImageIcon } from "lucide-react";
import { toBlob } from "html-to-image";
import { toast } from "sonner";
import { SevenDayReportErrorBoundary } from "./SevenDayReportErrorBoundary";
import { useSevenDayReportData } from "./useSevenDayReportData";
import { computeSevenDayReport, type ToleranceOption } from "./reportCalculations";
import { ReportPage1, ReportPage2, ReportPage3, ReportPage4 } from "./ReportPages";
import { MODELS } from "../mockData";
import { createZipBlob } from "@/utils/zipUtils";

export interface SevenDayReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // "YYYY-MM-DD"
  selectedModel: string; // e.g. "3"
  market: string; // e.g. "GDAM"
  rtmType?: "dayahead" | "nowcast";
}

export function SevenDayReportModal({
  isOpen,
  onClose,
  selectedDate,
  selectedModel,
  market,
  rtmType = "dayahead",
}: SevenDayReportModalProps) {
  const [selectedTol, setSelectedTol] = useState<ToleranceOption["id"]>("abs_050");
  const [shareState, setShareState] = useState<"idle" | "preparing" | "ready" | "failed">("idle");
  const [singleDownloading, setSingleDownloading] = useState<number | null>(null);

  // References to the 4 fixed 1080x1350 px capture cards in the hidden stage
  const capturePageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const modelInfo = useMemo(() => {
    return MODELS.find((m) => m.id === selectedModel) || {
      id: selectedModel,
      name: `Model ${selectedModel}`,
      color: "var(--brand, #7C3AED)",
    };
  }, [selectedModel]);

  const cleanModel = useMemo(() => {
    return (modelInfo?.name || "Model").replace(/[^a-zA-Z0-9_-]/g, "_");
  }, [modelInfo]);

  const cleanMarket = useMemo(() => {
    const base = (market || "GDAM").replace(/[^a-zA-Z0-9_-]/g, "_");
    if (base.toUpperCase() === "RTM") return `RTM_${rtmType}`;
    return base;
  }, [market, rtmType]);

  const cleanDate = useMemo(() => {
    return (selectedDate || "2026-10-14").replace(/[^a-zA-Z0-9_-]/g, "_");
  }, [selectedDate]);

  const reportFileName = useMemo(() => {
    return `${cleanMarket}_7Day_Report_${cleanModel}_${cleanDate}`;
  }, [cleanMarket, cleanModel, cleanDate]);

  const { currentRows, priorRows, loading, error } = useSevenDayReportData(
    selectedDate,
    selectedModel,
    market,
    isOpen,
    rtmType
  );

  const reportData = useMemo(() => {
    if (!currentRows || currentRows.length === 0) return null;
    return computeSevenDayReport(
      currentRows,
      priorRows,
      selectedTol,
      modelInfo.name,
      market
    );
  }, [currentRows, priorRows, selectedTol, modelInfo.name, market]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && shareState !== "preparing") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, shareState]);

  // Prevent background body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const originalTitleRef = useRef<string>("");

  // Lock document.title to reportFileName while modal is open so PDF print uses the exact filename
  useEffect(() => {
    const titleEl = document.querySelector("title");

    if (isOpen) {
      if (!originalTitleRef.current) {
        originalTitleRef.current = document.title || "Prolt Operations";
      }
      document.title = reportFileName;
      if (titleEl) {
        titleEl.textContent = reportFileName;
      }
    } else {
      if (originalTitleRef.current) {
        document.title = originalTitleRef.current;
        if (titleEl) {
          titleEl.textContent = originalTitleRef.current;
        }
        originalTitleRef.current = "";
      }
    }
  }, [isOpen, reportFileName]);

  // Dedicated scoped @media print stylesheet injection & cleanup
  useEffect(() => {
    if (!isOpen) return;

    document.body.classList.add("seven-day-report-open");

    const styleEl = document.createElement("style");
    styleEl.id = "seven-day-report-print-css";
    styleEl.textContent = `
      @media print {
        @page {
          size: A4 portrait;
          margin: 10mm 10mm 12mm 10mm;
        }

        /* Enforce exact print colors and visible backgrounds */
        *, *::before, *::after {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
          box-sizing: border-box !important;
        }

        /* Scoped hiding: Hide the rest of the application outside the report portal */
        body.seven-day-report-open > *:not(#seven-day-report-portal) {
          display: none !important;
        }

        /* Global print overrides */
        html, body.seven-day-report-open {
          width: 100% !important;
          height: auto !important;
          min-height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          color: #0f172a !important;
          overflow: visible !important;
        }

        #seven-day-report-portal {
          position: static !important;
          display: block !important;
          width: 100% !important;
          height: auto !important;
          padding: 0 !important;
          margin: 0 !important;
          overflow: visible !important;
          background: transparent !important;
        }

        /* Hide modal backdrops, action buttons, tooltips, capture stages, close icons */
        .report-modal-backdrop,
        .report-modal-header,
        .report-capture-container,
        .report-page-divider,
        .no-print,
        .hide-in-print,
        button,
        [role="tooltip"],
        .recharts-tooltip-wrapper {
          display: none !important;
        }

        .report-modal-card {
          position: static !important;
          display: block !important;
          width: 100% !important;
          max-width: 100% !important;
          max-height: none !important;
          height: auto !important;
          border: none !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          background: transparent !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
        }

        .report-modal-body {
          display: block !important;
          width: 100% !important;
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
          padding: 0 !important;
          margin: 0 !important;
        }

        /* Structure into 3-4 logical print pages, A4 portrait */
        .report-print-page {
          page-break-after: always !important;
          break-after: page !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          min-height: 268mm !important;
          padding: 2mm 0 6mm 0 !important;
          margin: 0 !important;
          border: none !important;
          border-radius: 0 !important;
          background: #ffffff !important;
          color: #0f172a !important;
          box-shadow: none !important;
        }

        .report-print-page:last-child {
          page-break-after: auto !important;
          break-after: auto !important;
        }

        /* Use page-break-inside: avoid on every card/chart so nothing is cut in half */
        .avoid-break,
        .report-card,
        .report-print-page > div {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        .report-print-page * {
          text-rendering: optimizeLegibility !important;
        }
      }
    `;

    document.head.appendChild(styleEl);

    return () => {
      document.body.classList.remove("seven-day-report-open");
      const existing = document.getElementById("seven-day-report-print-css");
      if (existing) {
        existing.remove();
      }
    };
  }, [isOpen]);

  // A) Download PDF (Primary Action via browser print pipeline)
  const handleDownloadPdf = () => {
    if (!reportData) return;

    // Firmly set document.title and <title> tag text
    document.title = reportFileName;
    const titleEl = document.querySelector("title");
    if (titleEl) {
      titleEl.textContent = reportFileName;
    }

    toast.info(`Preparing print dialog... Default filename: ${reportFileName}.pdf`);

    // Use requestAnimationFrame to ensure browser DOM title is committed before print dialog opens
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.print();
      }, 60);
    });
  };

  // Helper to capture a single 1080x1350 card
  const captureCardBlob = async (node: HTMLElement, pageNum: number, isDark: boolean): Promise<Blob> => {
    const captureOptions = {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: isDark ? "#0B0F19" : "#FFFFFF",
      width: 1080,
      height: 1350,
      skipFonts: true,
      filter: (n: Node) => {
        if (n instanceof HTMLElement) {
          if (n.classList.contains("no-print") || n.classList.contains("hide-on-capture")) {
            return false;
          }
        }
        return true;
      },
      style: {
        animation: "none",
        transition: "none",
        backdropFilter: "none",
        WebkitBackdropFilter: "none",
      },
    };

    try {
      const blob = await toBlob(node, captureOptions);
      if (!blob) throw new Error("Empty blob generated");
      return blob;
    } catch (firstErr: any) {
      console.warn(`[ShareAsImages] Page ${pageNum} capture at pixelRatio 2 failed:`, firstErr);
      toast.info(`Page ${pageNum} failed, retrying at standard resolution...`);

      await new Promise((r) => setTimeout(r, 200));

      const fallbackBlob = await toBlob(node, {
        ...captureOptions,
        pixelRatio: 1,
      });

      if (!fallbackBlob) {
        throw new Error(`Failed to capture Page ${pageNum}`);
      }
      return fallbackBlob;
    }
  };

  // Helper to download an individual page directly
  const handleDownloadSinglePage = async (pageIndex: number) => {
    if (!reportData || singleDownloading !== null) return;
    setSingleDownloading(pageIndex);

    try {
      const isDark = document.documentElement.classList.contains("dark");
      const node = capturePageRefs.current[pageIndex - 1];
      if (!node) throw new Error(`Page ${pageIndex} container not found`);

      if (document.fonts && document.fonts.ready) {
        try {
          await document.fonts.ready;
        } catch {}
      }

      const blob = await captureCardBlob(node, pageIndex, isDark);
      const fileName = `${reportFileName}_page-${pageIndex}.png`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 20000);

      toast.success(`Downloaded Page ${pageIndex} (${fileName})`);
    } catch (err: any) {
      console.error(`Page ${pageIndex} download error:`, err);
      toast.error(`Could not download Page ${pageIndex}: ${err?.message || "Error"}`);
    } finally {
      setSingleDownloading(null);
    }
  };

  // B) Share as Images (Secondary Action for WhatsApp: 1080x1350 px cards)
  const handleShareImages = async () => {
    if (shareState === "preparing" || !reportData) return;

    setShareState("preparing");
    const isDark = document.documentElement.classList.contains("dark");

    try {
      // 1. Wait for web fonts to load
      if (document.fonts && document.fonts.ready) {
        try {
          await document.fonts.ready;
        } catch (fErr) {
          console.warn("[ShareAsImages] Font ready check warning:", fErr);
        }
      }

      // 2. Allow charts and micro-animations to settle
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 3. Collect capture page nodes (Page 1..4)
      const pageNodes = capturePageRefs.current.filter((n): n is HTMLDivElement => Boolean(n));
      if (pageNodes.length < 4) {
        throw new Error(`Expected 4 report pages, found ${pageNodes.length}`);
      }

      const capturedBlobs: Blob[] = [];

      // 4. Capture each page separately at pixelRatio 2 (with retry at pixelRatio 1)
      for (let i = 0; i < pageNodes.length; i++) {
        const pageNum = i + 1;
        const node = pageNodes[i];
        const blob = await captureCardBlob(node, pageNum, isDark);
        capturedBlobs.push(blob);
      }

      // 5. Detect mobile environment
      const isMobile =
        typeof navigator !== "undefined" &&
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );

      // On mobile devices with Web Share API support:
      if (isMobile && navigator.share && navigator.canShare) {
        const files: File[] = capturedBlobs.map((blob, idx) => {
          const fileName = `${reportFileName}_page-${idx + 1}.png`;
          return new File([blob], fileName, { type: "image/png" });
        });

        if (navigator.canShare({ files })) {
          try {
            await navigator.share({
              title: `${cleanMarket} 7-Day Performance Report - ${modelInfo.name}`,
              text: `7-Day ${cleanMarket} Performance Audit for ${modelInfo.name} (${reportData.startDate} to ${reportData.endDate})`,
              files,
            });
            setShareState("ready");
            toast.success("Shared 4 report pages successfully!");
            setTimeout(() => setShareState("idle"), 3000);
            return;
          } catch (shareErr: any) {
            if (shareErr.name === "AbortError") {
              setShareState("idle");
              return;
            }
            console.warn("navigator.share failed, fallback to file download:", shareErr);
          }
        }
      }

      // 6. On Desktop: Download ZIP archive containing all 4 images (prevents browser multiple-download blocking)
      const zipEntries = await Promise.all(
        capturedBlobs.map(async (blob, idx) => {
          const buffer = await blob.arrayBuffer();
          return {
            name: `${reportFileName}_page-${idx + 1}.png`,
            data: new Uint8Array(buffer),
          };
        })
      );

      const zipBlob = createZipBlob(zipEntries);
      const zipFileName = `${reportFileName}_Images.zip`;
      const zipUrl = URL.createObjectURL(zipBlob);
      const zipLink = document.createElement("a");
      zipLink.href = zipUrl;
      zipLink.download = zipFileName;
      document.body.appendChild(zipLink);
      zipLink.click();
      document.body.removeChild(zipLink);
      setTimeout(() => URL.revokeObjectURL(zipUrl), 30000);

      // 7. Also download individual PNGs with staggered delay so browser doesn't block them
      for (let i = 0; i < capturedBlobs.length; i++) {
        const blob = capturedBlobs[i];
        const fileName = `${reportFileName}_page-${i + 1}.png`;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 30000);

        if (i < capturedBlobs.length - 1) {
          await new Promise((r) => setTimeout(r, 450));
        }
      }

      setShareState("ready");
      toast.success(
        `Downloaded all 4 images! ZIP archive (${zipFileName}) + individual PNGs saved.`
      );
      setTimeout(() => setShareState("idle"), 3000);
    } catch (err: any) {
      console.error("[ShareAsImages] Error:", err);
      setShareState("failed");
      toast.error(err?.message || "Failed to capture report pages. Please try again.");
      setTimeout(() => setShareState("idle"), 3500);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div id="seven-day-report-portal">
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={shareState === "preparing" ? undefined : onClose}
              className="report-modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-md cursor-pointer"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              className="report-modal-card relative z-10 w-full max-w-6xl max-h-[90vh] flex flex-col rounded-3xl border border-border bg-card shadow-2xl overflow-hidden my-auto"
            >
              {/* Modal Header */}
              <div className="report-modal-header flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-3.5 bg-muted/20">
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                  <div className="size-2 rounded-full bg-primary animate-pulse" />
                  <h2 className="text-sm sm:text-base font-bold tracking-tight text-foreground md:text-lg">
                    7-Day Performance Report
                  </h2>
                  <span className="rounded-lg border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {modelInfo.name}
                  </span>
                  <span className="hidden sm:inline-block rounded-md border border-border bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {market} Market
                  </span>
                </div>

                {/* Actions: Download PDF (Primary) + Share as Images (Secondary) + Close */}
                <div className="flex items-center gap-2">
                  {/* Primary: Download PDF */}
                  <button
                    onClick={handleDownloadPdf}
                    disabled={loading || !reportData || shareState === "preparing"}
                    title={`Export sharp vector PDF via browser print pipeline (A4 Portrait) -> ${reportFileName}.pdf`}
                    className="inline-flex h-9 items-center gap-1.5 sm:gap-2 rounded-xl bg-primary px-3 sm:px-3.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileText className="size-3.5 shrink-0" />
                    <span>Download PDF</span>
                  </button>

                  {/* Secondary: Share as Images (with states: Preparing…, Ready ✓, Failed – try again) */}
                  <button
                    onClick={handleShareImages}
                    disabled={loading || !reportData || shareState === "preparing"}
                    title="Export 4 WhatsApp portrait cards (1080x1350 px) as ZIP archive and individual PNGs"
                    className={`inline-flex h-9 items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-3.5 text-xs font-semibold transition-all cursor-pointer ${
                      shareState === "ready"
                        ? "bg-emerald-600 text-white border border-emerald-600"
                        : shareState === "failed"
                        ? "bg-rose-600 text-white border border-rose-600"
                        : "border border-border bg-card text-foreground hover:bg-muted/80 shadow-xs"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {shareState === "preparing" ? (
                      <>
                        <RefreshCw className="size-3.5 animate-spin shrink-0 text-primary" />
                        <span>Preparing…</span>
                      </>
                    ) : shareState === "ready" ? (
                      <>
                        <Check className="size-3.5 shrink-0" />
                        <span>Ready ✓</span>
                      </>
                    ) : shareState === "failed" ? (
                      <>
                        <AlertCircle className="size-3.5 shrink-0" />
                        <span>Failed – try again</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="size-3.5 shrink-0 text-primary" />
                        <span className="hidden sm:inline">Share as Images</span>
                        <span className="sm:hidden">Share</span>
                      </>
                    )}
                  </button>

                  {/* Close Button */}
                  <button
                    onClick={onClose}
                    disabled={shareState === "preparing"}
                    aria-label="Close report"
                    className="grid size-9 place-items-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer disabled:opacity-50"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body / Scrollable Content with Structured Pages */}
              <div className="report-modal-body flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 md:p-6 space-y-6 sm:space-y-8">
                <SevenDayReportErrorBoundary onReset={() => window.location.reload()}>
                  {loading ? (
                    <div className="space-y-4 py-8">
                      <div className="h-20 w-full animate-pulse rounded-2xl bg-muted/40" />
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/40" />
                        ))}
                      </div>
                      <div className="h-64 w-full animate-pulse rounded-2xl bg-muted/40" />
                      <div className="h-48 w-full animate-pulse rounded-2xl bg-muted/40" />
                    </div>
                  ) : error ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[320px] rounded-2xl border border-border bg-card">
                      <div className="size-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
                        <AlertCircle className="size-6" />
                      </div>
                      <h3 className="text-base font-semibold text-foreground">7-Day Data Notice</h3>
                      <p className="mt-1 text-sm text-muted-foreground max-w-md">
                        {error}
                      </p>
                    </div>
                  ) : reportData ? (
                    <div className="space-y-6 sm:space-y-8">
                      {/* PAGE 1: Header + Verdict + KPIs + Daily Trend Chart */}
                      <section
                        className="report-print-page bg-card rounded-2xl border border-border p-5 sm:p-7 shadow-xs flex flex-col justify-between gap-5 avoid-break relative group"
                        data-page="1"
                      >
                        {/* Quick Page Download Button (Top Right of Card in UI) */}
                        <button
                          onClick={() => handleDownloadSinglePage(1)}
                          disabled={singleDownloading !== null || shareState === "preparing"}
                          title="Download Page 1 as PNG"
                          className="no-print absolute top-3 right-3 hidden group-hover:flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/50 hover:bg-muted px-2 py-1 rounded-lg border border-border/60 transition-colors"
                        >
                          {singleDownloading === 1 ? (
                            <RefreshCw className="size-3 animate-spin" />
                          ) : (
                            <ImageIcon className="size-3 text-primary" />
                          )}
                          <span>Download Page 1</span>
                        </button>

                        <ReportPage1
                          report={reportData}
                          modelInfo={modelInfo}
                          market={market}
                        />
                      </section>

                      {/* Visual separator in interactive view */}
                      <div className="report-page-divider no-print flex items-center justify-center gap-3 py-1">
                        <div className="h-px bg-border flex-1" />
                        <span className="text-[11px] font-mono font-semibold text-muted-foreground bg-muted/40 px-3 py-1 rounded-full border border-border/60">
                          Page 2 of 4 · Block Accuracy & Heatmap
                        </span>
                        <div className="h-px bg-border flex-1" />
                      </div>

                      {/* PAGE 2: Block Accuracy + Heatmap */}
                      <section
                        className="report-print-page bg-card rounded-2xl border border-border p-5 sm:p-7 shadow-xs flex flex-col justify-between gap-5 avoid-break relative group"
                        data-page="2"
                      >
                        {/* Quick Page Download Button */}
                        <button
                          onClick={() => handleDownloadSinglePage(2)}
                          disabled={singleDownloading !== null || shareState === "preparing"}
                          title="Download Page 2 as PNG"
                          className="no-print absolute top-3 right-3 hidden group-hover:flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/50 hover:bg-muted px-2 py-1 rounded-lg border border-border/60 transition-colors"
                        >
                          {singleDownloading === 2 ? (
                            <RefreshCw className="size-3 animate-spin" />
                          ) : (
                            <ImageIcon className="size-3 text-primary" />
                          )}
                          <span>Download Page 2</span>
                        </button>

                        <ReportPage2
                          report={reportData}
                          modelInfo={modelInfo}
                          market={market}
                          selectedTol={selectedTol}
                          onToleranceChange={setSelectedTol}
                        />
                      </section>

                      {/* Visual separator in interactive view */}
                      <div className="report-page-divider no-print flex items-center justify-center gap-3 py-1">
                        <div className="h-px bg-border flex-1" />
                        <span className="text-[11px] font-mono font-semibold text-muted-foreground bg-muted/40 px-3 py-1 rounded-full border border-border/60">
                          Page 3 of 4 · Operational Regimes & Bidding
                        </span>
                        <div className="h-px bg-border flex-1" />
                      </div>

                      {/* PAGE 3: Time-of-day + Bias Analysis + Bidding Impact */}
                      <section
                        className="report-print-page bg-card rounded-2xl border border-border p-5 sm:p-7 shadow-xs flex flex-col justify-between gap-5 avoid-break relative group"
                        data-page="3"
                      >
                        {/* Quick Page Download Button */}
                        <button
                          onClick={() => handleDownloadSinglePage(3)}
                          disabled={singleDownloading !== null || shareState === "preparing"}
                          title="Download Page 3 as PNG"
                          className="no-print absolute top-3 right-3 hidden group-hover:flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/50 hover:bg-muted px-2 py-1 rounded-lg border border-border/60 transition-colors"
                        >
                          {singleDownloading === 3 ? (
                            <RefreshCw className="size-3 animate-spin" />
                          ) : (
                            <ImageIcon className="size-3 text-primary" />
                          )}
                          <span>Download Page 3</span>
                        </button>

                        <ReportPage3
                          report={reportData}
                          modelInfo={modelInfo}
                          market={market}
                        />
                      </section>

                      {/* Visual separator in interactive view */}
                      <div className="report-page-divider no-print flex items-center justify-center gap-3 py-1">
                        <div className="h-px bg-border flex-1" />
                        <span className="text-[11px] font-mono font-semibold text-muted-foreground bg-muted/40 px-3 py-1 rounded-full border border-border/60">
                          Page 4 of 4 · Critical Deviations & Verification
                        </span>
                        <div className="h-px bg-border flex-1" />
                      </div>

                      {/* PAGE 4: Top 5 Worst / Best Blocks + Audit Disclaimer */}
                      <section
                        className="report-print-page bg-card rounded-2xl border border-border p-5 sm:p-7 shadow-xs flex flex-col justify-between gap-5 avoid-break relative group"
                        data-page="4"
                      >
                        {/* Quick Page Download Button */}
                        <button
                          onClick={() => handleDownloadSinglePage(4)}
                          disabled={singleDownloading !== null || shareState === "preparing"}
                          title="Download Page 4 as PNG"
                          className="no-print absolute top-3 right-3 hidden group-hover:flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/50 hover:bg-muted px-2 py-1 rounded-lg border border-border/60 transition-colors"
                        >
                          {singleDownloading === 4 ? (
                            <RefreshCw className="size-3 animate-spin" />
                          ) : (
                            <ImageIcon className="size-3 text-primary" />
                          )}
                          <span>Download Page 4</span>
                        </button>

                        <ReportPage4
                          report={reportData}
                          modelInfo={modelInfo}
                          market={market}
                        />
                      </section>
                    </div>
                  ) : null}
                </SevenDayReportErrorBoundary>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 
        Dedicated Hidden 1080x1350 px Capture Stage 
        Renders each page as a fixed-size card for WhatsApp export.
        Never visible, never printed, strictly used for pixel-perfect canvas extraction.
      */}
      {reportData && (
        <div
          aria-hidden="true"
          className="report-capture-container no-print select-none pointer-events-none fixed"
          style={{
            position: "fixed",
            left: "-10000px",
            top: "0",
            width: "1080px",
            zIndex: -9999,
          }}
        >
          {/* Card 1: 1080x1350 px */}
          <div
            ref={(el) => (capturePageRefs.current[0] = el)}
            className="report-capture-card bg-card text-foreground flex flex-col justify-between border border-border"
            style={{
              width: "1080px",
              height: "1350px",
              minHeight: "1350px",
              maxHeight: "1350px",
              boxSizing: "border-box",
              padding: "40px",
            }}
          >
            <ReportPage1
              report={reportData}
              modelInfo={modelInfo}
              market={market}
              isCapture={true}
            />
          </div>

          {/* Card 2: 1080x1350 px */}
          <div
            ref={(el) => (capturePageRefs.current[1] = el)}
            className="report-capture-card bg-card text-foreground flex flex-col justify-between border border-border"
            style={{
              width: "1080px",
              height: "1350px",
              minHeight: "1350px",
              maxHeight: "1350px",
              boxSizing: "border-box",
              padding: "40px",
            }}
          >
            <ReportPage2
              report={reportData}
              modelInfo={modelInfo}
              market={market}
              selectedTol={selectedTol}
              onToleranceChange={setSelectedTol}
              isCapture={true}
            />
          </div>

          {/* Card 3: 1080x1350 px */}
          <div
            ref={(el) => (capturePageRefs.current[2] = el)}
            className="report-capture-card bg-card text-foreground flex flex-col justify-between border border-border"
            style={{
              width: "1080px",
              height: "1350px",
              minHeight: "1350px",
              maxHeight: "1350px",
              boxSizing: "border-box",
              padding: "40px",
            }}
          >
            <ReportPage3
              report={reportData}
              modelInfo={modelInfo}
              market={market}
              isCapture={true}
            />
          </div>

          {/* Card 4: 1080x1350 px */}
          <div
            ref={(el) => (capturePageRefs.current[3] = el)}
            className="report-capture-card bg-card text-foreground flex flex-col justify-between border border-border"
            style={{
              width: "1080px",
              height: "1350px",
              minHeight: "1350px",
              maxHeight: "1350px",
              boxSizing: "border-box",
              padding: "40px",
            }}
          >
            <ReportPage4
              report={reportData}
              modelInfo={modelInfo}
              market={market}
              isCapture={true}
            />
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
