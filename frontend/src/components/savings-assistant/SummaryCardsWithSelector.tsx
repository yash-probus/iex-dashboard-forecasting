import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/calculatorUtils";
import { Skeleton } from "@/components/ui/skeleton";

interface SummaryCardsWithSelectorProps {
  totalActualCost: number;
  totalRecCost: number;
  totalSavings: number;
  savingsPercent: number;
  totalUnits: number;
  monthDetails?: any;
  loading?: boolean;
}

export function SummaryCardsWithSelector({
  totalActualCost,
  totalRecCost,
  totalSavings,
  savingsPercent,
  totalUnits,
  monthDetails,
  loading = false,
}: SummaryCardsWithSelectorProps) {
  // Display in kWh (units are already in kWh)
  const formattedUnits = totalUnits;

  if (loading) {
    return (
      <div className="grid md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4 space-y-2">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-8 w-full" />
            {i === 3 && <Skeleton className="h-3 w-1/3" />}
            {i === 4 && <Skeleton className="h-3 w-1/3" />}
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-4 gap-4">
      <Card className="p-4 border-destructive/30">
        <p className="text-xs text-muted-foreground mb-1">Actual Spend</p>
        <p className="text-2xl font-bold text-destructive">
          {formatCurrency(totalActualCost)}
        </p>
      </Card>
      <Card className="p-4 border-success/30">
        <p className="text-xs text-muted-foreground mb-1">
          Prolt Optimized Spend
        </p>
        <p className="text-2xl font-bold text-success">
          {formatCurrency(totalRecCost)}
        </p>
      </Card>
      <Card className="p-4 border-success/50 bg-success/5">
        <p className="text-xs text-muted-foreground mb-1">
          Prolt Projected Savings
        </p>
        <p className="text-2xl font-bold text-success">
          {formatCurrency(totalSavings)}
        </p>
        <p className="text-xs text-success">{savingsPercent}% reduction</p>
      </Card>
      <Card className="p-4">
        <p className="text-xs text-muted-foreground mb-1">Total Units</p>
        <p className="text-2xl font-bold">{formattedUnits}</p>
        <p className="text-xs text-muted-foreground">kWh analyzed</p>
      </Card>
    </div>
  );
}
