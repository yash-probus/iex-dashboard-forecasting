import React from "react";
import { ArrowDown, ArrowUp, Gauge, Percent, Target, TrendingUp } from "lucide-react";
import type { SevenDayReportData } from "../reportCalculations";

interface Props {
  report: SevenDayReportData;
}

export function KpiGrid({ report }: Props) {
  // Delta helper: for error metrics, lower is better (delta < 0 = green improvement)
  const renderErrorDelta = (delta: number | null, unit = "%") => {
    if (delta === null) return <span className="text-[11px] text-muted-foreground">vs prev 7d: —</span>;
    const isImproved = delta <= 0;
    const absVal = Math.abs(delta);
    return (
      <span
        className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${
          isImproved ? "text-emerald-500" : "text-rose-500"
        }`}
      >
        {isImproved ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />}
        {absVal.toFixed(2)}{unit} vs prev 7d
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {/* 7-Day WMAPE */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-border/80">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">7-Day Avg WMAPE</span>
          <div className="grid size-7 place-items-center rounded-lg bg-indigo-500/10 text-indigo-500">
            <Percent className="size-3.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
            {report.wmape !== null ? `${report.wmape}%` : "Pending"}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2">
          {renderErrorDelta(report.wmapeDelta, "%")}
        </div>
      </div>

      {/* 7-Day MAE */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-border/80">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">7-Day Mean Abs Error (MAE)</span>
          <div className="grid size-7 place-items-center rounded-lg bg-rose-500/10 text-rose-500">
            <Target className="size-3.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
            {report.mae !== null ? `₹${report.mae}` : "Pending"}
          </span>
          <span className="text-xs text-muted-foreground">/kWh</span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2">
          {renderErrorDelta(report.maeDelta, "₹")}
        </div>
      </div>

      {/* Avg Forecast vs Actual MCP */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-border/80">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Avg MCP (7-Day)</span>
          <div className="grid size-7 place-items-center rounded-lg bg-teal-500/10 text-teal-500">
            <TrendingUp className="size-3.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Forecast</div>
            <span className="font-mono text-xl font-bold text-foreground">₹{report.avgForecast}</span>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Actual</div>
            <span className="font-mono text-xl font-bold text-teal-500">
              {report.avgActual !== null ? `₹${report.avgActual}` : "Pending"}
            </span>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
          <span>Spread: {report.avgActual !== null ? `₹${Math.abs(report.avgForecast - report.avgActual).toFixed(2)}` : "—"}</span>
          <span>{report.evaluatedRowsCount} settled</span>
        </div>
      </div>

      {/* Confidence Score */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-border/80">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Model Certainty Score</span>
          <div className="grid size-7 place-items-center rounded-lg bg-amber-500/10 text-amber-500">
            <Gauge className="size-3.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
            {report.confidence.toFixed(1)}%
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
          <span>Evaluated Model:</span>
          <span className="font-semibold text-foreground">{report.modelName}</span>
        </div>
      </div>
    </div>
  );
}
