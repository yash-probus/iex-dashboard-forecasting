import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from "recharts";
import { formatCurrency } from "@/lib/calculatorUtils";

interface EstimatedSavingsBarProps {
  actualBill: number;
  possibleBill: number;
  monthLabel?: string;
}

export function EstimatedSavingsBar({
  actualBill,
  possibleBill,
  monthLabel = "This Month",
}: EstimatedSavingsBarProps) {
  const savings = actualBill - possibleBill;
  const savingsPercent = ((savings / actualBill) * 100).toFixed(1);
  
  const data = [
    { name: 'Actual Bill', value: actualBill, fill: 'hsl(0 72% 51%)' },
    { name: 'Possible Bill', value: possibleBill, fill: 'hsl(142 55% 50%)' },
  ];

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-accent" />
          What You Could Have Saved in {monthLabel}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Comparison of actual vs optimized energy costs
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 20, right: 60 }}>
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={40}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
                <LabelList 
                  dataKey="value" 
                  position="right" 
                  formatter={(value: number) => formatCurrency(value)}
                  style={{ fontSize: 12, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Savings highlight */}
        <div className="mt-4 p-4 bg-success/10 border border-success/30 rounded-lg text-center">
          <p className="text-sm text-muted-foreground mb-1">Potential Savings</p>
          <p className="text-3xl font-bold text-success">{formatCurrency(savings)}</p>
          <p className="text-sm text-success">{savingsPercent}% reduction possible</p>
        </div>
        
        <div className="mt-4 p-3 bg-muted/30 rounded-lg flex items-center gap-3">
          <ArrowRight className="w-5 h-5 text-accent flex-shrink-0" />
          <p className="text-sm">
            With optimal OA timing, you could save <span className="font-semibold text-success">{formatCurrency(savings)}</span> per month.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
