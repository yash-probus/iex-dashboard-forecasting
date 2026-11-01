import React from "react";
import { Copy, FileDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { RecommendationInput, RecommendationResult } from "./recommendationMock";
import { EmptyState } from "./EmptyState";
import { VerdictCard } from "./VerdictCard";
import { ComparisonCards, ComparisonChart } from "./ComparisonCards";
import { CostBreakdown } from "./CostBreakdown";

interface ResultPanelProps {
  result: RecommendationResult | null;
  input: RecommendationInput;
  loading: boolean;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading recommendation">
      <Skeleton className="h-36 rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

export function ResultPanel({ result, input, loading }: ResultPanelProps) {
  if (loading) return <LoadingSkeleton />;
  if (!result) return <EmptyState />;

  const copy = async () => {
    try {
      const s = `Market Recommendation — ${result.generatedAt}
${input.state} · ${input.category} · ${input.voltage} kV · ${input.todSlot} · IEX ₹${input.iexPrice}/kWh
Verdict: ${result.verdict} (${result.confidence}% confidence)
Landed cost ₹${result.iexLanded.toFixed(2)} | Discom ₹${result.discomTariff.toFixed(2)} vs IEX landed ₹${result.iexLanded.toFixed(2)} → ${
        result.savingPerUnit >= 0 ? "saving" : "extra cost"
      } ₹${Math.abs(result.savingPerUnit).toFixed(2)}/kWh (${Math.abs(result.savingPct)}%)`;
      await navigator.clipboard.writeText(s);
      toast.success("Summary copied to clipboard");
    } catch {
      toast.error("Failed to copy summary");
    }
  };

  return (
    <div className="space-y-4">
      <div className="fade-up flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Generated <span className="font-mono font-medium text-foreground">{result.generatedAt}</span> ·{" "}
          {input.state}, {input.voltage} kV
        </p>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={copy} className="cursor-pointer text-xs h-8">
            <Copy className="size-3.5 mr-1" /> Copy summary
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.print()}
            className="cursor-pointer text-xs h-8"
          >
            <FileDown className="size-3.5 mr-1" /> Export PDF
          </Button>
        </div>
      </div>
      <div className="fade-up">
        <VerdictCard result={result} />
      </div>
      <ComparisonCards result={result} />
      <ComparisonChart result={result} />
      <CostBreakdown result={result} />
    </div>
  );
}
