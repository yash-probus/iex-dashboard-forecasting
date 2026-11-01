import React from "react";
import { ArrowUpRight, ArrowDownRight, Scale } from "lucide-react";
import type { SevenDayReportData } from "../reportCalculations";

interface Props {
  report: SevenDayReportData;
}

export function BiasAnalysisCard({ report }: Props) {
  const { overCount, overPct, underCount, underPct, exactCount, exactPct, avgBias, interpretation } = report.bias;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Forecast Bias & Skew Analysis</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                Math.abs(avgBias) <= 0.08
                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                  : avgBias > 0
                  ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                  : "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
              }`}
            >
              {avgBias > 0 ? `+₹${avgBias}/kWh (Over)` : avgBias < 0 ? `-₹${Math.abs(avgBias)}/kWh (Under)` : "Neutral (±0.00)"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Evaluates directional tendencies (bullish vs bearish bias) to inform optimal bidding positioning
          </p>
        </div>
        <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Scale className="size-4" />
        </div>
      </div>

      {/* Segmented Distribution Bar */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-medium text-amber-500">
            <ArrowUpRight className="size-3.5" /> Over-Forecast: <strong>{overCount}</strong> ({overPct}%)
          </span>
          <span className="font-medium text-muted-foreground">
            Exact (±0.05): <strong>{exactCount}</strong> ({exactPct}%)
          </span>
          <span className="flex items-center gap-1.5 font-medium text-indigo-500">
            <ArrowDownRight className="size-3.5" /> Under-Forecast: <strong>{underCount}</strong> ({underPct}%)
          </span>
        </div>

        <div className="h-3 w-full rounded-full overflow-hidden flex bg-muted/50 p-0.5">
          <div
            className="h-full bg-amber-500 rounded-l-full transition-all duration-500"
            style={{ width: `${overPct}%` }}
            title={`Over-Forecast: ${overPct}%`}
          />
          <div
            className="h-full bg-emerald-500/80 transition-all duration-500"
            style={{ width: `${exactPct}%` }}
            title={`Exact Match: ${exactPct}%`}
          />
          <div
            className="h-full bg-indigo-500 rounded-r-full transition-all duration-500"
            style={{ width: `${underPct}%` }}
            title={`Under-Forecast: ${underPct}%`}
          />
        </div>
      </div>

      {/* Plain-English Trading Interpretation */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Bidding Interpretation: </strong>
        {interpretation}
      </div>
    </div>
  );
}
