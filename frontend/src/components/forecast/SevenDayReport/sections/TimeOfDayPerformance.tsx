import React from "react";
import { Moon, Sunrise, Sun, Sunset } from "lucide-react";
import type { SevenDayReportData } from "../reportCalculations";

interface Props {
  report: SevenDayReportData;
}

export function TimeOfDayPerformance({ report }: Props) {
  const getSegmentIcon = (name: string) => {
    switch (name) {
      case "Night Base":
        return <Moon className="size-4 text-indigo-400" />;
      case "Morning Ramp":
        return <Sunrise className="size-4 text-amber-500" />;
      case "Solar Dip":
        return <Sun className="size-4 text-amber-400" />;
      case "Evening Peak":
      default:
        return <Sunset className="size-4 text-rose-500" />;
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">Time-of-Day Segment Performance</h3>
        <p className="text-xs text-muted-foreground">
          Performance metrics segmented across operational grid regimes to pinpoint diurnal accuracy shifts
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {report.todSegments.map((seg) => {
          const hasData = seg.evaluatedBlocks > 0 && seg.wmape !== null;
          const clearanceRate = seg.evaluatedBlocks > 0 ? +((seg.compliantBlocks / seg.evaluatedBlocks) * 100).toFixed(1) : 0;

          return (
            <div
              key={seg.name}
              className="rounded-xl border border-border bg-muted/15 p-4 transition-all hover:border-border/80"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div className="grid size-7 place-items-center rounded-lg bg-card border border-border/60">
                    {getSegmentIcon(seg.name)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">{seg.name}</h4>
                    <span className="text-[10px] text-muted-foreground">{seg.period}</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">{seg.blockRange}</span>
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">WMAPE</span>
                  <span className="font-mono text-base font-bold text-indigo-500">
                    {hasData ? `${seg.wmape}%` : "Pending"}
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">MAE</span>
                  <span className="font-mono text-xs font-semibold text-rose-500">
                    {hasData ? `₹${seg.mae}/kWh` : "—"}
                  </span>
                </div>

                <div className="flex items-baseline justify-between text-[11px]">
                  <span className="text-muted-foreground">Forecast vs Actual</span>
                  <span className="font-mono text-muted-foreground">
                    ₹{seg.avgForecast} / {seg.avgActual !== null ? `₹${seg.avgActual}` : "—"}
                  </span>
                </div>

                <div className="pt-2 border-t border-border/40">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Block Clearance</span>
                    <span className="font-bold text-foreground">{clearanceRate}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        clearanceRate >= 85 ? "bg-teal-500" : clearanceRate >= 70 ? "bg-indigo-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${clearanceRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
