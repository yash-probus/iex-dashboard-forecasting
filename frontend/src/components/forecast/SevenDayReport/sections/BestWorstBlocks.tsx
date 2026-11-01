import React from "react";
import { CheckCircle, AlertTriangle } from "lucide-react";
import type { SevenDayReportData } from "../reportCalculations";

interface Props {
  report: SevenDayReportData;
}

export function BestWorstBlocks({ report }: Props) {
  const { topWorstBlocks, topBestBlocks } = report;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Top 5 Worst Blocks */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="grid size-6 place-items-center rounded-md bg-rose-500/10 text-rose-500">
            <AlertTriangle className="size-3.5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Top 5 Deviations (Worst Blocks)</h4>
            <p className="text-[11px] text-muted-foreground">Highest absolute variance between model and clearing price</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground">
                <th className="pb-2 font-medium">Date & Time Block</th>
                <th className="pb-2 text-right font-medium">Forecast</th>
                <th className="pb-2 text-right font-medium">Actual</th>
                <th className="pb-2 text-right font-medium">Error (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {topWorstBlocks.map((b, idx) => (
                <tr key={`${b.date}_${b.timeBlock}_${idx}`} className="hover:bg-muted/30">
                  <td className="py-2">
                    <span className="font-medium text-foreground">{b.date}</span>
                    <span className="ml-2 font-mono text-[11px] text-muted-foreground">{b.timeBlock}</span>
                  </td>
                  <td className="py-2 text-right font-mono text-foreground">₹{b.forecast.toFixed(2)}</td>
                  <td className="py-2 text-right font-mono text-muted-foreground">₹{b.actual.toFixed(2)}</td>
                  <td className="py-2 text-right">
                    <span className="inline-block rounded bg-rose-500/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-rose-600 dark:text-rose-400">
                      +₹{b.absError.toFixed(2)} ({b.pctError}%)
                    </span>
                  </td>
                </tr>
              ))}
              {topWorstBlocks.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-muted-foreground">
                    No deviation data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top 5 Best Blocks */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="grid size-6 place-items-center rounded-md bg-emerald-500/10 text-emerald-500">
            <CheckCircle className="size-3.5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Top 5 Precision Matches (Best Blocks)</h4>
            <p className="text-[11px] text-muted-foreground">Closest alignment to market clearing price</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground">
                <th className="pb-2 font-medium">Date & Time Block</th>
                <th className="pb-2 text-right font-medium">Forecast</th>
                <th className="pb-2 text-right font-medium">Actual</th>
                <th className="pb-2 text-right font-medium">Error (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {topBestBlocks.map((b, idx) => (
                <tr key={`${b.date}_${b.timeBlock}_${idx}`} className="hover:bg-muted/30">
                  <td className="py-2">
                    <span className="font-medium text-foreground">{b.date}</span>
                    <span className="ml-2 font-mono text-[11px] text-muted-foreground">{b.timeBlock}</span>
                  </td>
                  <td className="py-2 text-right font-mono text-foreground">₹{b.forecast.toFixed(2)}</td>
                  <td className="py-2 text-right font-mono text-muted-foreground">₹{b.actual.toFixed(2)}</td>
                  <td className="py-2 text-right">
                    <span className="inline-block rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{b.absError.toFixed(2)} ({b.pctError}%)
                    </span>
                  </td>
                </tr>
              ))}
              {topBestBlocks.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-muted-foreground">
                    No precision data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
