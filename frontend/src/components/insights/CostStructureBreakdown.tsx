import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PieChart, HelpCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from "recharts";
import { generateCostBreakdown, CostBreakdownItem } from "@/lib/insightsUtils";
import { formatCurrency } from "@/lib/calculatorUtils";

interface CostStructureBreakdownProps {
  totalBill: number;
  discomOnly?: boolean;
}

export function CostStructureBreakdown({ totalBill, discomOnly = false }: CostStructureBreakdownProps) {
  const breakdown = generateCostBreakdown(totalBill, discomOnly);
  const total = breakdown.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <PieChart className="w-5 h-5 text-accent" />
          Where Your Money Went This Month
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Breakdown of all charges in your electricity bill
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {breakdown.map((item, index) => {
            const percentage = ((item.value / total) * 100).toFixed(1);
            return (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-sm" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-foreground">{item.name}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">{item.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{percentage}%</span>
                    <span className="font-medium w-20 text-right">{formatCurrency(item.value)}</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: item.color
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total Bill</span>
          <span className="text-xl font-bold">{formatCurrency(total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
