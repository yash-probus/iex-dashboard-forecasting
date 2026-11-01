import React from "react";
import { CheckCircle2, ShieldAlert, Sparkles, TrendingUp, AlertTriangle, XCircle } from "lucide-react";
import type { ClearFinderResult } from "../clearFinderCalculations";

interface ClearFinderHeroProps {
  result: ClearFinderResult;
}

export const ClearFinderHero: React.FC<ClearFinderHeroProps> = ({ result }) => {
  const {
    bidPrice,
    bidType,
    strictness,
    totalBlocks,
    sureClearCount,
    sureClearPct,
    likelyClearCount,
    likelyClearPct,
    riskyCount,
    riskyPct,
    willNotClearCount,
    willNotClearPct,
    summaryRecommendation,
  } = result;

  const totalBidable = sureClearCount + likelyClearCount;
  const bidablePct = totalBlocks > 0 ? +((totalBidable / totalBlocks) * 100).toFixed(1) : 0;

  // Ring circumference for SVG (r = 40, circumference = 2 * PI * 40 ≈ 251.3)
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const sureOffset = circumference - (sureClearPct / 100) * circumference;
  const bidableOffset = circumference - (bidablePct / 100) * circumference;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-teal-500/30 bg-gradient-to-br from-card/90 via-card/70 to-teal-500/5 p-6 shadow-md backdrop-blur-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Headline & Ring */}
        <div className="flex items-center gap-5">
          {/* Animated SVG Donut Ring */}
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-muted/30"
                strokeWidth="9"
                fill="none"
              />
              {/* Likely ring */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-sky-500/40 transition-all duration-1000 ease-out"
                strokeWidth="9"
                strokeDasharray={circumference}
                strokeDashoffset={bidableOffset}
                strokeLinecap="round"
                fill="none"
              />
              {/* Sure ring */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-emerald-500 transition-all duration-1000 ease-out"
                strokeWidth="9"
                strokeDasharray={circumference}
                strokeDashoffset={sureOffset}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-xl font-extrabold tracking-tight text-foreground">
                {sureClearCount}
              </span>
              <span className="text-[10px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">
                Sure
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/15 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 border border-teal-500/30">
                <Sparkles className="h-3 w-3" />
                Clear Finder
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold capitalize text-muted-foreground">
                {bidType} Bid @ ₹{bidPrice.toFixed(2)}/kWh
              </span>
              <span className="rounded-full bg-accent/60 px-2 py-0.5 text-[11px] font-medium text-accent-foreground capitalize">
                Strictness: {strictness}
              </span>
            </div>

            <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
              At ₹{bidPrice.toFixed(2)}:{" "}
              <span className="text-emerald-600 dark:text-emerald-400">
                {sureClearCount} Sure Clear
              </span>
              ,{" "}
              <span className="text-sky-600 dark:text-sky-400">
                {likelyClearCount} Likely Clear
              </span>
              ,{" "}
              <span className="text-amber-600 dark:text-amber-400">
                {riskyCount} Risky
              </span>
              ,{" "}
              <span className="text-rose-600 dark:text-rose-400">
                {willNotClearCount} Will Not Clear
              </span>{" "}
              <span className="text-muted-foreground font-normal text-sm">
                out of {totalBlocks} blocks
              </span>
            </h2>

            <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <TrendingUp className="h-3.5 w-3.5 text-teal-500 shrink-0" />
              {summaryRecommendation}
            </p>
          </div>
        </div>

        {/* Right: KPI Summary Cards */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:gap-3">
          {/* Sure Clear */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center transition-all hover:border-emerald-500/40">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Sure Clear
            </div>
            <div className="mt-1 text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
              {sureClearCount}
            </div>
            <div className="text-[10px] text-muted-foreground font-medium">
              {sureClearPct}% of day
            </div>
          </div>

          {/* Likely Clear */}
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-center transition-all hover:border-sky-500/40">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Likely Clear
            </div>
            <div className="mt-1 text-2xl font-black tracking-tight text-sky-600 dark:text-sky-400">
              {likelyClearCount}
            </div>
            <div className="text-[10px] text-muted-foreground font-medium">
              {likelyClearPct}% of day
            </div>
          </div>

          {/* Risky */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center transition-all hover:border-amber-500/40">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              Risky
            </div>
            <div className="mt-1 text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400">
              {riskyCount}
            </div>
            <div className="text-[10px] text-muted-foreground font-medium">
              {riskyPct}% of day
            </div>
          </div>

          {/* Will Not Clear */}
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-center transition-all hover:border-rose-500/40">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              <XCircle className="h-3.5 w-3.5" />
              Will Not Clear
            </div>
            <div className="mt-1 text-2xl font-black tracking-tight text-rose-600 dark:text-rose-400">
              {willNotClearCount}
            </div>
            <div className="text-[10px] text-muted-foreground font-medium">
              {willNotClearPct}% of day
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
