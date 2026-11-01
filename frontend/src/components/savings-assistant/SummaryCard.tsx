import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { formatCurrency } from "@/lib/calculatorUtils";

interface SummaryCardProps {
  actualPaid: number;
  proltSuggested: number;
  savings: number;
  savingsPercent: number;
  oaShare: number;
}

interface MetricRowProps {
  label: string;
  value: string;
  tooltip: string;
  highlight?: boolean;
  positive?: boolean;
}

function MetricRow({ label, value, tooltip, highlight, positive }: MetricRowProps) {
  return (
    <div className={`
      flex items-center justify-between py-3 
      ${highlight ? 'bg-accent/5 -mx-4 px-4 rounded-lg' : ''}
    `}>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{label}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="w-4 h-4 text-muted-foreground/50 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-sm">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <span className={`
        font-mono font-semibold text-lg
        ${highlight && positive ? 'text-success' : ''}
        ${highlight && !positive ? 'text-destructive' : ''}
      `}>
        {value}
      </span>
    </div>
  );
}

export function SummaryCard({ actualPaid, proltSuggested, savings, savingsPercent, oaShare }: SummaryCardProps) {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Cost Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <MetricRow
          label="Actual Amount Paid"
          value={formatCurrency(actualPaid)}
          tooltip="Total money you actually paid for the selected period, including DISCOM billed charges and any OA settlement charges extracted from uploaded bills."
        />
        
        <div className="border-t border-dashed" />
        
        <MetricRow
          label="Prolt Suggested Amount"
          value={formatCurrency(proltSuggested)}
          tooltip="Model's estimated cost if you had followed Prolt's per-slot recommendations (OA for slots predicted cheaper than DISCOM), including OA regulatory charges and DISCOM fixed/ToD charges."
        />
        
        <div className="border-t border-dashed" />
        
        <MetricRow
          label="Potential Savings"
          value={`${formatCurrency(savings)} (${savingsPercent}%)`}
          tooltip="The difference between what you paid and what Prolt suggests, adjusted for 90% prediction accuracy."
          highlight
          positive={savings > 0}
        />
        
        <div className="border-t border-dashed" />
        
        <MetricRow
          label="Suggested OA Share"
          value={`${oaShare}%`}
          tooltip="Percentage of your consumption that Prolt recommends sourcing from Open Access based on predicted price advantages."
        />
      </CardContent>
    </Card>
  );
}
