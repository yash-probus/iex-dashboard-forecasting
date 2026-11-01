import { TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/calculatorUtils";

interface ResultsBannerProps {
  savings: number;
  savingsPercent: number;
}

export function ResultsBanner({ savings, savingsPercent }: ResultsBannerProps) {
  const hasSavings = savings > 0;

  return (
    <div
      className={`
        p-6 rounded-xl flex items-center justify-between
        ${hasSavings 
          ? 'bg-success/10 border border-success/20' 
          : 'bg-destructive/10 border border-destructive/20'
        }
      `}
    >
      <div className="flex items-center gap-4">
        <div className={`
          w-12 h-12 rounded-full flex items-center justify-center
          ${hasSavings ? 'bg-success/20' : 'bg-destructive/20'}
        `}>
          {hasSavings ? (
            <TrendingUp className="w-6 h-6 text-success" />
          ) : (
            <TrendingDown className="w-6 h-6 text-destructive" />
          )}
        </div>
        <div>
          <p className={`text-sm font-medium ${hasSavings ? 'text-success' : 'text-destructive'}`}>
            {hasSavings ? 'Potential Savings Identified' : 'No Savings Found'}
          </p>
          <p className={`text-3xl font-bold ${hasSavings ? 'text-success' : 'text-destructive'}`}>
            {hasSavings ? formatCurrency(savings) : '₹0'}
          </p>
        </div>
      </div>
      
      {hasSavings && (
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Savings Rate</p>
          <p className="text-2xl font-bold text-success">{savingsPercent}%</p>
        </div>
      )}
    </div>
  );
}
