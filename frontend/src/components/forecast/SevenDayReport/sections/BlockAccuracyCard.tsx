import React from "react";
import { CheckCircle2, Sliders } from "lucide-react";
import { TOLERANCE_OPTIONS, type SevenDayReportData, type ToleranceOption } from "../reportCalculations";

interface Props {
  report: SevenDayReportData;
  selectedTolerance: ToleranceOption["id"];
  onToleranceChange: (tol: ToleranceOption["id"]) => void;
  isCapture?: boolean;
}

export function BlockAccuracyCard({ report, selectedTolerance, onToleranceChange, isCapture = false }: Props) {
  const { withinCount, totalCount, pct, byDay } = report.toleranceCompliance;
  const currentTolLabel = TOLERANCE_OPTIONS.find((opt) => opt.id === selectedTolerance)?.label || "±₹0.50/kWh";

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm avoid-break">
      {/* Header with Tolerance selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Block Accuracy & Tolerance</h3>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
              {withinCount} / {totalCount} Blocks
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Share of 15-minute delivery blocks that cleared within price tolerance
          </p>
        </div>

        {/* Tolerance Badge (Print & Clean WhatsApp Capture mode) */}
        {isCapture ? (
          <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-1 text-xs font-semibold text-foreground">
            <Sliders className="size-3 text-primary" />
            <span>Tolerance: <strong>{currentTolLabel}</strong></span>
          </div>
        ) : (
          <>
            {/* Interactive Selector (hidden in print) */}
            <div className="no-print flex items-center gap-1.5 rounded-xl border border-border bg-muted/30 p-1">
              <span className="flex items-center gap-1 pl-2 text-[11px] font-medium text-muted-foreground">
                <Sliders className="size-3" /> Tol:
              </span>
              {TOLERANCE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => onToleranceChange(opt.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    selectedTolerance === opt.id
                      ? "bg-card text-foreground shadow-xs border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {/* Static Badge visible ONLY when printing */}
            <div className="hidden print:flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-1 text-xs font-semibold text-foreground">
              <Sliders className="size-3 text-primary" />
              <span>Tolerance: <strong>{currentTolLabel}</strong></span>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Large Radial / Donut Gauge */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-3 rounded-xl bg-muted/20 border border-border/50 text-center">
          <div className="relative size-32">
            <svg className="size-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                className="text-muted/40"
                strokeWidth="10"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                className="text-teal-500 transition-all duration-700 ease-out"
                strokeWidth="10"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - pct / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-mono text-2xl font-extrabold tracking-tight text-foreground">{pct}%</span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Cleared</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{withinCount}</span> of {totalCount} intervals cleared within selected boundary
          </div>
        </div>

        {/* Per-Day Breakdown Bars */}
        <div className="md:col-span-8 space-y-2.5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Daily Clearance Breakdown
          </div>
          {byDay.map((day) => (
            <div key={day.date} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{day.dayLabel}</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  <strong>{day.within}</strong>/{day.total} ({day.pct}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    day.pct >= 85 ? "bg-teal-500" : day.pct >= 70 ? "bg-indigo-500" : "bg-amber-500"
                  }`}
                  style={{ width: `${day.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
