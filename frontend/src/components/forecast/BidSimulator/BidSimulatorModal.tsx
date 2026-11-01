import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Printer,
  Share2,
  Download,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { toBlob } from "html-to-image";
import { createZipBlob, type ZipFileEntry } from "@/utils/zipUtils";
import type { ForecastRow } from "../mockData";
import { generateForecast } from "../mockData";
import { runClearFinder } from "./ClearFinder/clearFinderCalculations";
import { ClearFinderSection } from "./ClearFinder/ClearFinderSection";
import { ClearFinderErrorBoundary } from "./ClearFinder/ClearFinderErrorBoundary";
import { ClearFinderPage1, ClearFinderPage2 } from "./BidSimulatorPages";

interface BidSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  selectedModel: string;
  market: string;
  dayRows: ForecastRow[] | null;
}

export const BidSimulatorModal: React.FC<BidSimulatorModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  selectedModel,
  market,
  dayRows,
}) => {
  const [isExportingImages, setIsExportingImages] = useState(false);

  // Hidden capture refs for WhatsApp 1080x1350 image export
  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);

  // Fallback to generating forecast rows if dayRows is not provided
  const rows = useMemo(() => {
    if (dayRows && dayRows.length > 0) return dayRows;
    return generateForecast(selectedDate, selectedModel);
  }, [dayRows, selectedDate, selectedModel]);

  // Escape key listener to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when open
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

  // Clear Finder result for export pages
  const exportResult = useMemo(() => {
    return runClearFinder(rows);
  }, [rows]);

  const reportFileName = `${market}_ClearFinder_${selectedDate}`;

  // Print PDF handler
  const handlePrintPdf = () => {
    window.print();
  };

  // WhatsApp 1080x1350 image export handler
  const handleExportImages = async () => {
    if (!page1Ref.current || !page2Ref.current) {
      toast.error("Export pages are still preparing. Please try again.");
      return;
    }

    setIsExportingImages(true);
    const toastId = toast.loading("Generating 1080x1350 Clear Finder images for WhatsApp...");

    const capturePage = async (el: HTMLElement, pageNum: number): Promise<Blob> => {
      try {
        const b = await toBlob(el, {
          pixelRatio: 2,
          quality: 0.95,
          cacheBust: true,
          width: 1080,
          height: 1350,
          style: {
            transform: "scale(1)",
            transformOrigin: "top left",
          },
        });
        if (b) return b;
      } catch (err) {
        console.warn(`[ClearFinder] Page ${pageNum} capture at 2x failed, retrying at 1x:`, err);
      }

      const fallback = await toBlob(el, {
        pixelRatio: 1,
        quality: 0.9,
        width: 1080,
        height: 1350,
      });
      if (!fallback) throw new Error(`Failed to capture Page ${pageNum}`);
      return fallback;
    };

    try {
      const p1Blob = await capturePage(page1Ref.current, 1);
      const p2Blob = await capturePage(page2Ref.current, 2);

      const p1Buffer = await p1Blob.arrayBuffer();
      const p2Buffer = await p2Blob.arrayBuffer();

      const zipEntries: ZipFileEntry[] = [
        { name: `${reportFileName}_Page1_Summary.png`, data: new Uint8Array(p1Buffer) },
        { name: `${reportFileName}_Page2_Windows.png`, data: new Uint8Array(p2Buffer) },
      ];

      const zipBlob = createZipBlob(zipEntries);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportFileName}_WhatsApp_Pages.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Downloaded 2 high-res WhatsApp pages (ZIP)", { id: toastId });
    } catch (err) {
      console.error("[ClearFinder] Export images failed:", err);
      toast.error("Failed to generate export images. Please try Print PDF instead.", {
        id: toastId,
      });
    } finally {
      setIsExportingImages(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Dedicated Print Media Stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #clearfinder-print-container,
          #clearfinder-print-container * {
            visibility: visible !important;
          }
          #clearfinder-print-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            display: block !important;
          }
          .clearfinder-print-page {
            page-break-after: always !important;
            page-break-inside: avoid !important;
            width: 100% !important;
            min-height: 100vh !important;
            padding: 24px !important;
            box-sizing: border-box !important;
            background: white !important;
            color: black !important;
          }
          .clearfinder-print-page:last-child {
            page-break-after: avoid !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Main Interactive Modal Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 print:hidden">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
          onClick={onClose}
        />

        {/* Modal Window */}
        <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col rounded-3xl border border-border/80 bg-background/95 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200 overflow-hidden">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-muted/20 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-foreground">
                    {market} Bid Simulator — Clear Finder
                  </h2>
                  <span className="rounded-full bg-teal-500/15 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                    Forecast-Only Intelligence
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Forecast Date: <strong className="text-foreground">{selectedDate}</strong> · Model:{" "}
                  <strong className="text-foreground">{selectedModel}</strong> · 96 Blocks
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrintPdf}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-xs"
                title="Print or Save as PDF"
              >
                <Printer className="h-3.5 w-3.5 text-teal-500" />
                <span className="hidden sm:inline">Download</span> PDF
              </button>

              <button
                type="button"
                onClick={handleExportImages}
                disabled={isExportingImages}
                className="inline-flex items-center gap-1.5 rounded-xl border border-teal-500/40 bg-teal-500/10 px-3 py-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:bg-teal-500/20 transition-colors shadow-xs disabled:opacity-50"
                title="Download 1080x1350 WhatsApp pages as ZIP"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Share as</span> Images
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ml-1"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <ClearFinderErrorBoundary>
              <ClearFinderSection
                rows={rows}
                market={market}
                selectedDate={selectedDate}
              />
            </ClearFinderErrorBoundary>
          </div>
        </div>
      </div>

      {/* Hidden Offscreen Render Container for 1080x1350 WhatsApp Images & PDF Print */}
      <div
        id="clearfinder-print-container"
        className="fixed -left-[99999px] top-0 pointer-events-none opacity-0"
        aria-hidden="true"
      >
        <div ref={page1Ref} className="clearfinder-print-page">
          <ClearFinderPage1
            result={exportResult}
            market={market}
            selectedDate={selectedDate}
            selectedModel={selectedModel}
            isCapture={true}
          />
        </div>
        <div ref={page2Ref} className="clearfinder-print-page">
          <ClearFinderPage2
            result={exportResult}
            market={market}
            selectedDate={selectedDate}
            selectedModel={selectedModel}
            isCapture={true}
          />
        </div>
      </div>
    </>
  );
};
