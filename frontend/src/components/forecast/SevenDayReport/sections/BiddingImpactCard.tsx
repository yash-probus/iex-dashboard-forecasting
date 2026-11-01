import React from "react";
import { ShieldCheck, AlertCircle, Info, Zap } from "lucide-react";
import type { SevenDayReportData } from "../reportCalculations";

interface Props {
  report: SevenDayReportData;
}

export function BiddingImpactCard({ report }: Props) {
  const { safeBlocks, safePct, riskyBlocks, riskyPct, estimatedExposure, primaryRiskTimeOfDay, assumptionText } =
    report.biddingImpact;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Bidding & Execution Impact Simulation</h3>
            <span className="rounded bg-teal-500/10 px-2 py-0.5 text-[11px] font-bold text-teal-500">
              {safePct}% Clearance Safety
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Simulated market dispatch analysis assuming bids are indexed to model forecast
          </p>
        </div>
        <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-teal-500/10 text-teal-500">
          <Zap className="size-4" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-4">
        {/* Safe Blocks */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="size-4" />
            <span>Optimal Clearance Window</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-bold text-foreground">{safeBlocks}</span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">({safePct}%)</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Blocks where forecasted price clears bids comfortably within tolerance limits.
          </p>
        </div>

        {/* Risky Blocks */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <AlertCircle className="size-4" />
            <span>Execution Risk Window</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-bold text-foreground">{riskyBlocks}</span>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">({riskyPct}%)</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Blocks outside tolerance threshold subject to partial clearance or higher slippage.
          </p>
        </div>

        {/* Exposure Estimate */}
        <div className="rounded-xl border border-border bg-muted/20 p-3.5">
          <div className="text-xs font-semibold text-muted-foreground">
            Avg Clearing Deviation
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-mono text-2xl font-bold text-foreground">₹{estimatedExposure}</span>
            <span className="text-xs text-muted-foreground">/kWh</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Primary volatility window: <strong className="text-foreground">{primaryRiskTimeOfDay}</strong>
          </p>
        </div>
      </div>

      {/* Explicit Assumption Callout */}
      <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/25 px-3 py-2.5 text-xs text-muted-foreground">
        <Info className="size-4 shrink-0 text-muted-foreground mt-0.5" />
        <span>
          <strong className="text-foreground">Methodology & Assumption: </strong>
          {assumptionText}
        </span>
      </div>
    </div>
  );
}
