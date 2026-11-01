import React, { useState } from "react";
import type { HourlyHeatmapCell, SevenDayReportData } from "../reportCalculations";

interface Props {
  report: SevenDayReportData;
}

export function ErrorHeatmap({ report }: Props) {
  const [hoveredCell, setHoveredCell] = useState<{
    date: string;
    dayLabel: string;
    cell: HourlyHeatmapCell;
    x: number;
    y: number;
  } | null>(null);

  const getCellClass = (status: HourlyHeatmapCell["status"]) => {
    switch (status) {
      case "great":
        return "bg-emerald-500/30 hover:bg-emerald-500/60 border-emerald-500/30 text-emerald-950 dark:text-emerald-100";
      case "good":
        return "bg-teal-500/30 hover:bg-teal-500/60 border-teal-500/30 text-teal-950 dark:text-teal-100";
      case "moderate":
        return "bg-amber-500/40 hover:bg-amber-500/70 border-amber-500/40 text-amber-950 dark:text-amber-100";
      case "poor":
        return "bg-rose-500/50 hover:bg-rose-500/80 border-rose-500/50 text-rose-950 dark:text-rose-100";
      case "none":
      default:
        return "bg-muted/30 border-transparent text-muted-foreground opacity-50";
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm relative">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">Hourly Absolute Error Heatmap</h3>
          <p className="text-xs text-muted-foreground">7 Days (rows) × 24 Delivery Hours (columns), color-coded by absolute error</p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-medium">Error Scale:</span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2.5 rounded-sm bg-emerald-500/40 border border-emerald-500/40" /> ≤₹0.25
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2.5 rounded-sm bg-teal-500/40 border border-teal-500/40" /> ₹0.25–0.60
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2.5 rounded-sm bg-amber-500/50 border border-amber-500/50" /> ₹0.60–1.20
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2.5 rounded-sm bg-rose-500/60 border border-rose-500/60" /> &gt;₹1.20
          </span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[680px]">
          {/* Header row: hours 00 to 23 */}
          <div className="flex items-center gap-1 mb-1 text-[10px] font-mono text-muted-foreground">
            <div className="w-16 shrink-0 font-sans font-semibold">Date</div>
            <div className="flex-1 grid grid-cols-24 gap-1">
              {Array.from({ length: 24 }, (_, i) => (
                <div key={i} className="text-center font-mono">
                  {i % 3 === 0 ? String(i).padStart(2, "0") : "·"}
                </div>
              ))}
            </div>
          </div>

          {/* Rows: each day */}
          <div className="space-y-1">
            {report.heatmapRows.map((row) => (
              <div key={row.date} className="flex items-center gap-1">
                <div className="w-16 shrink-0 text-xs font-medium text-foreground truncate" title={row.date}>
                  {row.dayLabel}
                </div>
                <div className="flex-1 grid grid-cols-24 gap-1">
                  {row.cells.map((cell) => (
                    <div
                      key={cell.hour}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredCell({
                          date: row.date,
                          dayLabel: row.dayLabel,
                          cell,
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                        });
                      }}
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`h-6 rounded-md border text-[9px] font-mono flex items-center justify-center transition-all cursor-pointer ${getCellClass(
                        cell.status
                      )}`}
                    >
                      {cell.absError !== null ? cell.absError.toFixed(1) : "—"}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredCell && (
        <div
          className="no-print hide-on-capture pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-xl border border-border bg-card/95 p-3 text-xs shadow-xl backdrop-blur-md"
          style={{ left: hoveredCell.x, top: hoveredCell.y - 8 }}
        >
          <div className="border-b border-border/60 pb-1 font-semibold text-foreground">
            {hoveredCell.dayLabel} · Hour {hoveredCell.cell.hour} ({hoveredCell.cell.timeRange})
          </div>
          <div className="mt-1.5 space-y-1 font-mono">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground font-sans">Forecast:</span>
              <span className="font-bold text-foreground">₹{hoveredCell.cell.forecast}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground font-sans">Actual:</span>
              <span className="font-bold text-teal-500">
                {hoveredCell.cell.actual !== null ? `₹${hoveredCell.cell.actual}` : "Pending"}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground font-sans">Abs Error:</span>
              <span className="font-bold text-rose-500">
                {hoveredCell.cell.absError !== null ? `₹${hoveredCell.cell.absError}` : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground font-sans">% Error:</span>
              <span className="font-bold text-indigo-500">
                {hoveredCell.cell.pctError !== null ? `${hoveredCell.cell.pctError}%` : "—"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
