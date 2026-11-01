import React, { useState } from "react";
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Check,
  X,
  Info,
} from "lucide-react";
import type { ClearFinderBlock, ClearLikelihood, BidType } from "../clearFinderCalculations";

interface ClearFinderTimelineProps {
  blocks: ClearFinderBlock[];
  bidPrice: number;
  bidType: BidType;
}

const LIKELIHOOD_COLORS: Record<ClearLikelihood, string> = {
  sure_clear: "bg-emerald-500 hover:bg-emerald-400",
  likely_clear: "bg-sky-500 hover:bg-sky-400",
  risky: "bg-amber-500 hover:bg-amber-400",
  will_not_clear: "bg-rose-500 hover:bg-rose-400",
  no_data: "bg-muted-foreground/30 hover:bg-muted-foreground/50",
};

export const ClearFinderTimeline: React.FC<ClearFinderTimelineProps> = ({
  blocks,
  bidPrice,
  bidType,
}) => {
  const [hovered, setHovered] = useState<ClearFinderBlock | null>(null);

  // Group into 24 hours of 4 intervals each (for 96 blocks)
  const displayBlocks = blocks.slice(0, 96);
  const hours = Array.from({ length: 24 }, (_, h) => {
    return displayBlocks.slice(h * 4, h * 4 + 4);
  });

  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              24-Hour Clearing Likelihood Ribbon (96 Blocks)
            </h3>
            <p className="text-xs text-muted-foreground">
              Hover or tap any 15-minute cell to inspect the "Why this label?" pass/fail breakdown.
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="h-3 w-3 rounded-sm bg-emerald-500" />
            <span className="text-muted-foreground">Sure Clear</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span className="h-3 w-3 rounded-sm bg-sky-500" />
            <span className="text-muted-foreground">Likely Clear</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span className="h-3 w-3 rounded-sm bg-amber-500" />
            <span className="text-muted-foreground">Risky</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span className="h-3 w-3 rounded-sm bg-rose-500" />
            <span className="text-muted-foreground">Will Not Clear</span>
          </div>
        </div>
      </div>

      {/* 24 Hour blocks ribbon */}
      <div className="grid grid-cols-12 sm:grid-cols-24 gap-1 pt-1">
        {hours.map((hourBlocks, hIdx) => {
          const hourLabel = String(hIdx).padStart(2, "0");
          return (
            <div key={hIdx} className="flex flex-col gap-1">
              <span className="text-[10px] text-center font-mono text-muted-foreground">
                {hourLabel}
              </span>
              <div className="grid grid-cols-2 gap-0.5">
                {hourBlocks.map((b) => {
                  const isHovered = hovered?.timeBlock === b.timeBlock;
                  const colorClass = LIKELIHOOD_COLORS[b.likelihood] || "bg-muted";
                  return (
                    <button
                      key={b.timeBlock}
                      type="button"
                      onMouseEnter={() => setHovered(b)}
                      onClick={() => setHovered(b)}
                      className={`h-6 w-full rounded-sm transition-all cursor-pointer ${colorClass} ${
                        isHovered ? "ring-2 ring-foreground scale-110 z-10" : ""
                      }`}
                      aria-label={`${b.timeBlock}: ${b.likelihood}`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* "Why this label?" Detail Box */}
      <div className="mt-2 min-h-[92px] rounded-xl border border-border/60 bg-muted/20 p-4 transition-all">
        {hovered ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-foreground">
                  {hovered.timeBlock}
                </span>
                <span className="text-xs text-muted-foreground">
                  (Hour {hovered.hour})
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${
                    hovered.likelihood === "sure_clear"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : hovered.likelihood === "likely_clear"
                      ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30"
                      : hovered.likelihood === "risky"
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                      : hovered.likelihood === "will_not_clear"
                      ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {hovered.likelihood.replace(/_/g, " ")}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span>
                  Forecast:{" "}
                  <strong className="text-foreground">
                    ₹{hovered.forecastedMcp.toFixed(2)}
                  </strong>
                </span>
                <span>
                  Range:{" "}
                  <strong className="text-foreground">
                    {hovered.priceMin !== null && hovered.priceMax !== null
                      ? `₹${hovered.priceMin.toFixed(2)} – ₹${hovered.priceMax.toFixed(2)}`
                      : "No data"}
                  </strong>
                </span>
                <span>
                  Confidence:{" "}
                  <strong className="text-foreground">
                    {hovered.confidence !== null ? `${hovered.confidence.toFixed(1)}%` : "N/A"}
                  </strong>
                </span>
                <span className="text-[11px] font-medium text-teal-600 dark:text-teal-400">
                  Target Bid: ₹{bidPrice.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Why This Label? 3 Pass/Fail Criteria Cards */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <HelpCircle className="h-3 w-3 text-teal-500" />
                Why this label? (Pass / Fail Criteria Evaluation)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {/* 1. Forecast Check */}
                <div
                  className={`flex items-start gap-2 rounded-lg border p-2 ${
                    hovered.whyExplanation.forecastCheck.passed
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-rose-500/30 bg-rose-500/5"
                  }`}
                >
                  <div
                    className={`mt-0.5 rounded-full p-0.5 ${
                      hovered.whyExplanation.forecastCheck.passed
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                    }`}
                  >
                    {hovered.whyExplanation.forecastCheck.passed ? (
                      <Check className="h-2.5 w-2.5" />
                    ) : (
                      <X className="h-2.5 w-2.5" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">
                      {hovered.whyExplanation.forecastCheck.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Actual: {hovered.whyExplanation.forecastCheck.actualText} (Req:{" "}
                      {hovered.whyExplanation.forecastCheck.requirementText})
                    </div>
                  </div>
                </div>

                {/* 2. Range Check */}
                <div
                  className={`flex items-start gap-2 rounded-lg border p-2 ${
                    hovered.whyExplanation.rangeCheck.passed
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-amber-500/30 bg-amber-500/5"
                  }`}
                >
                  <div
                    className={`mt-0.5 rounded-full p-0.5 ${
                      hovered.whyExplanation.rangeCheck.passed
                        ? "bg-emerald-500 text-white"
                        : "bg-amber-500 text-white"
                    }`}
                  >
                    {hovered.whyExplanation.rangeCheck.passed ? (
                      <Check className="h-2.5 w-2.5" />
                    ) : (
                      <X className="h-2.5 w-2.5" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">
                      {hovered.whyExplanation.rangeCheck.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {hovered.whyExplanation.rangeCheck.actualText} (Req:{" "}
                      {hovered.whyExplanation.rangeCheck.requirementText})
                    </div>
                  </div>
                </div>

                {/* 3. Confidence Check */}
                <div
                  className={`flex items-start gap-2 rounded-lg border p-2 ${
                    hovered.whyExplanation.confidenceCheck.passed
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-amber-500/30 bg-amber-500/5"
                  }`}
                >
                  <div
                    className={`mt-0.5 rounded-full p-0.5 ${
                      hovered.whyExplanation.confidenceCheck.passed
                        ? "bg-emerald-500 text-white"
                        : "bg-amber-500 text-white"
                    }`}
                  >
                    {hovered.whyExplanation.confidenceCheck.passed ? (
                      <Check className="h-2.5 w-2.5" />
                    ) : (
                      <X className="h-2.5 w-2.5" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">
                      {hovered.whyExplanation.confidenceCheck.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {hovered.whyExplanation.confidenceCheck.actualText} (Req:{" "}
                      {hovered.whyExplanation.confidenceCheck.requirementText})
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px] text-muted-foreground border-t border-border/30">
                <span>
                  <strong>Safety buffer used:</strong> ₹{hovered.whyExplanation.safetyBufferUsed.toFixed(2)}/kWh ({hovered.whyExplanation.confidenceLevel.toUpperCase()} confidence)
                </span>
                <span className="italic">
                  {hovered.whyExplanation.ruleExplanation}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between py-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Info className="h-4 w-4 text-teal-500" />
              Hover over or tap any cell in the 96-block ribbon to inspect the "Why this label?" pass/fail checklist.
            </span>
            <span className="font-semibold text-foreground">
              {bidType.toUpperCase()} Bid: ₹{bidPrice.toFixed(2)}/kWh
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
