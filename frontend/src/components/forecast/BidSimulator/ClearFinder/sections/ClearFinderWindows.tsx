import React, { useState } from "react";
import { Clock, CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import type { ClearFinderWindow, ClearLikelihood } from "../clearFinderCalculations";

interface ClearFinderWindowsProps {
  windows: ClearFinderWindow[];
}

export const ClearFinderWindows: React.FC<ClearFinderWindowsProps> = ({ windows }) => {
  const [filter, setFilter] = useState<"all" | "sure_clear" | "likely_clear" | "recommended">("recommended");

  const filtered = windows.filter((w) => {
    if (filter === "all") return true;
    if (filter === "recommended") return w.likelihood === "sure_clear" || w.likelihood === "likely_clear";
    return w.likelihood === filter;
  });

  const sureWindows = windows.filter((w) => w.likelihood === "sure_clear");
  const sureHours = sureWindows.reduce((sum, w) => sum + w.durationHours, 0);

  const likelyWindows = windows.filter((w) => w.likelihood === "likely_clear");
  const likelyHours = likelyWindows.reduce((sum, w) => sum + w.durationHours, 0);

  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            Continuous Operational Clearing Windows
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sure Clear: <strong className="text-foreground">{sureHours.toFixed(1)} hrs</strong> across {sureWindows.length} window{sureWindows.length !== 1 ? "s" : ""} · Likely: <strong className="text-foreground">{likelyHours.toFixed(1)} hrs</strong> across {likelyWindows.length} window{likelyWindows.length !== 1 ? "s" : ""}.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-muted/40 p-1 text-xs">
          <button
            onClick={() => setFilter("recommended")}
            className={`rounded-md px-2.5 py-0.5 font-semibold transition-colors cursor-pointer ${
              filter === "recommended" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Recommended ({windows.filter((w) => w.likelihood === "sure_clear" || w.likelihood === "likely_clear").length})
          </button>
          <button
            onClick={() => setFilter("sure_clear")}
            className={`rounded-md px-2.5 py-0.5 font-semibold transition-colors cursor-pointer ${
              filter === "sure_clear" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sure ({sureWindows.length})
          </button>
          <button
            onClick={() => setFilter("likely_clear")}
            className={`rounded-md px-2.5 py-0.5 font-semibold transition-colors cursor-pointer ${
              filter === "likely_clear" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Likely ({likelyWindows.length})
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`rounded-md px-2.5 py-0.5 font-semibold transition-colors cursor-pointer ${
              filter === "all" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({windows.length})
          </button>
        </div>
      </div>

      {/* Windows Badges Grid */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((win, idx) => {
          const isSure = win.likelihood === "sure_clear";
          const isLikely = win.likelihood === "likely_clear";
          const isRisky = win.likelihood === "risky";
          const isOut = win.likelihood === "will_not_clear";

          let borderStyle = "border-border/60 bg-muted/30";
          let badgeStyle = "bg-muted text-muted-foreground";

          if (isSure) {
            borderStyle = "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10";
            badgeStyle = "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30";
          } else if (isLikely) {
            borderStyle = "border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/10";
            badgeStyle = "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30";
          } else if (isRisky) {
            borderStyle = "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10";
            badgeStyle = "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30";
          } else if (isOut) {
            borderStyle = "border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10";
            badgeStyle = "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30";
          }

          return (
            <div
              key={idx}
              className={`flex items-center justify-between rounded-xl border p-3 transition-all ${borderStyle}`}
            >
              <div className="flex items-center gap-2.5">
                {isSure && <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />}
                {isLikely && <span className="size-2.5 rounded-full bg-sky-500 shrink-0 ml-1" />}
                {isRisky && <ShieldAlert className="size-4 shrink-0 text-amber-500" />}
                {isOut && <XCircle className="size-4 shrink-0 text-rose-500" />}

                <div>
                  <div className="text-xs font-bold text-foreground">
                    {win.startTime} – {win.endTime}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {win.blockCount} blocks · {win.durationHours} hrs
                  </div>
                </div>
              </div>

              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeStyle}`}>
                {win.likelihood.replace(/_/g, " ")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
