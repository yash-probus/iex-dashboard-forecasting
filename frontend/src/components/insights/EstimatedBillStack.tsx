import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/calculatorUtils";

interface EstimatedBillStackProps {
  energyCharges: number;
  fixedCharges: number;
  todCharges: number;
  monthLabel?: string;
}

export function EstimatedBillStack({
  energyCharges,
  fixedCharges,
  todCharges,
  monthLabel = "This Month",
}: EstimatedBillStackProps) {
  const total = energyCharges + fixedCharges + todCharges;
  
  const data = [
    { name: 'Energy', value: energyCharges, color: 'hsl(175 55% 40%)' },
    { name: 'Fixed', value: fixedCharges, color: 'hsl(217 55% 50%)' },
    { name: 'ToD Adj.', value: todCharges, color: 'hsl(142 55% 50%)' },
  ];

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Receipt className="w-5 h-5 text-accent" />
          Your Estimated Bill for {monthLabel}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Breakdown by charge type based on your ToD inputs
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 20, right: 80 }}>
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
                <LabelList 
                  dataKey="value" 
                  position="right" 
                  formatter={(value: number) => formatCurrency(value)}
                  style={{ fontSize: 11, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Percentage breakdown */}
        <div className="flex gap-2 mt-4">
          {data.map((item, index) => (
            <div 
              key={index}
              className="flex-1 p-3 rounded-lg text-center"
              style={{ backgroundColor: `${item.color}20` }}
            >
              <p className="text-xs text-muted-foreground">{item.name}</p>
              <p className="text-sm font-semibold" style={{ color: item.color }}>
                {((item.value / total) * 100).toFixed(0)}%
              </p>
            </div>
          ))}
        </div>
        
        {/* Total */}
        <div className="mt-4 p-4 bg-accent/10 rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium">Estimated Total</span>
          <span className="text-2xl font-bold text-accent">{formatCurrency(total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
