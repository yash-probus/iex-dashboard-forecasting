import React from "react";
import { ArrowDownRight, ArrowUpRight, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RecommendationResult } from "./recommendationMock";

export function VerdictCard({ result }: { result: RecommendationResult }) {
  const tone =
    result.verdict === "BUY FROM IEX"
      ? "positive"
      : result.verdict === "PARTIAL SHIFT"
        ? "warning"
        : "negative";

  const Icon =
    tone === "positive" ? ArrowDownRight : tone === "warning" ? Scale : ArrowUpRight;

  const r = 30;
  const c = 2 * Math.PI * r;

  const toneText = {
    positive: "text-positive",
    warning: "text-warning",
    negative: "text-negative",
  }[tone];

  const toneChip = {
    positive: "border-positive/30 bg-positive/10 text-positive",
    warning: "border-warning/30 bg-warning/10 text-warning",
    negative: "border-negative/30 bg-negative/10 text-negative",
  }[tone];

  return (
    <div className="card-surface relative overflow-hidden p-6 bg-card">
      <div className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex items-center justify-between gap-6">
        <div className="min-w-0 space-y-3">
          <span className="label-caps block">Verdict</span>
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-lg font-semibold tracking-tight sm:text-xl",
              toneChip,
            )}
          >
            <Icon className="size-5 shrink-0" /> {result.verdict}
          </div>
          <p className="max-w-md text-sm text-muted-foreground">{result.reason}</p>
        </div>

        <div className="relative grid size-20 shrink-0 place-items-center">
          <svg viewBox="0 0 72 72" className="absolute inset-0 -rotate-90">
            <circle cx="36" cy="36" r={r} fill="none" stroke="var(--border, #E2E8F0)" strokeWidth="6" />
            <circle
              cx="36"
              cy="36"
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              className={cn(toneText, "transition-[stroke-dashoffset] duration-1000 ease-out")}
              strokeDasharray={c}
              strokeDashoffset={c * (1 - result.confidence / 100)}
            />
          </svg>
          <div className="text-center">
            <div className="font-mono text-lg font-semibold tabular-nums text-foreground">
              {result.confidence}%
            </div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">conf.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
