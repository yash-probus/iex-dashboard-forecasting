import React from "react";
import { BarChart3, Download, RefreshCw, SlidersHorizontal, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Market } from "./mockData";

interface ForecastHeaderProps {
  market: Market;
  lastUpdated: string;
  onExport: () => void;
  onRecalculate: () => void;
  recalculating: boolean;
  onOpenSevenDayReport?: () => void;
  onOpenBidSimulator?: () => void;
  onOpenMwImpact?: () => void;
}

export function ForecastHeader({
  market,
  lastUpdated,
  onExport,
  onRecalculate,
  recalculating,
  onOpenSevenDayReport,
  onOpenBidSimulator,
  onOpenMwImpact,
}: ForecastHeaderProps) {
  return (
    <header className="flex flex-col gap-4 pb-6 pt-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight md:text-[28px] text-foreground">{market} Forecast</h1>
          <span className="rounded-md border border-gdam/25 bg-gdam/10 px-2 py-0.5 text-[11px] font-semibold tracking-wider text-gdam">
            {market}
          </span>
          <span className="num text-[11px] text-muted-foreground">Updated {lastUpdated}</span>
        </div>
        <p className="mt-1.5 truncate text-sm text-muted-foreground">Forecasted MCP and volumes for the Day-Ahead and Real-Time markets.</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {onOpenMwImpact && (
          <button
            onClick={onOpenMwImpact}
            title="Analyze 15-min slot price difference, MW financial impact & error distribution"
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border bg-card px-3.5 text-[13px] font-medium transition-colors hover:bg-muted text-foreground cursor-pointer hover:border-emerald-500/50 shadow-xs"
          >
            <Zap className="size-4 text-emerald-500" /> MW Price Impact
          </button>
        )}
        {onOpenBidSimulator && (
          <button
            onClick={onOpenBidSimulator}
            title="Open bid simulator"
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border bg-card px-3.5 text-[13px] font-medium transition-colors hover:bg-muted text-foreground cursor-pointer hover:border-primary/40 shadow-xs"
          >
            <SlidersHorizontal className="size-4 text-primary" /> Bid Simulator
          </button>
        )}
        {onOpenSevenDayReport && (
          <button
            onClick={onOpenSevenDayReport}
            title="View 7-day model performance report"
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border bg-card px-3.5 text-[13px] font-medium transition-colors hover:bg-muted text-foreground cursor-pointer hover:border-primary/40 shadow-xs"
          >
            <BarChart3 className="size-4 text-primary" /> 7-Day Performance Report
          </button>
        )}
        <button
          onClick={onExport}
          title="Export forecast (E)"
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border bg-card px-3.5 text-[13px] font-medium transition-colors hover:bg-muted text-foreground cursor-pointer"
        >
          <Download className="size-4" /> Export Forecast
        </button>
        <button
          onClick={onRecalculate}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-brand-gradient px-3.5 text-[13px] font-semibold text-white shadow-brand transition-transform hover:-translate-y-px cursor-pointer"
        >
          <RefreshCw className={cn("size-4", recalculating && "animate-spin")} /> Recalculate
        </button>
      </div>
    </header>
  );
}
