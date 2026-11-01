import React from "react";
import { Award, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import type { SevenDayReportData } from "../reportCalculations";

interface Props {
  report: SevenDayReportData;
}

export function VerdictBanner({ report }: Props) {
  const getIcon = () => {
    switch (report.rating) {
      case "Excellent":
        return <Award className="size-5 text-emerald-500" />;
      case "Good":
        return <ShieldCheck className="size-5 text-teal-500" />;
      case "Average":
        return <CheckCircle2 className="size-5 text-amber-500" />;
      case "Poor":
      default:
        return <AlertTriangle className="size-5 text-rose-500" />;
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-card via-card to-muted/20 p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className={`mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl border ${report.ratingBg}`}>
            {getIcon()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                7-Day Model Verdict
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${report.ratingBg} ${report.ratingColor}`}
              >
                {report.rating} Rating
              </span>
              <span className="text-[11px] text-muted-foreground">
                (7-Day WMAPE: {report.wmape !== null ? `${report.wmape}%` : "Pending"})
              </span>
            </div>
            <p className="mt-1 text-sm font-medium leading-relaxed text-foreground">
              {report.verdictSummary}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 border-t border-border pt-2 text-[11px] text-muted-foreground sm:border-t-0 sm:pt-0">
          <span className="rounded bg-muted/60 px-2 py-1 font-mono">
            {report.totalRows} Blocks ({report.startDate} to {report.endDate})
          </span>
        </div>
      </div>
    </div>
  );
}
