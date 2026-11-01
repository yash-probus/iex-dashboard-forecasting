import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, ComposedChart
} from "recharts";

interface ConsumptionPatternProps {
  dailyData?: { day: number; consumption: number }[];
  monthLabel?: string;
}

export function ConsumptionPattern({
  dailyData,
  monthLabel = "October 2024",
}: ConsumptionPatternProps) {
  // Generate default data if not provided
  const defaultData = Array.from({ length: 30 }, (_, i) => {
    const isWeekend = (i + 1) % 7 === 0 || (i + 1) % 7 === 6;
    const baseConsumption = isWeekend ? 600 : 900;
    const variation = Math.random() * 200 - 100;
    return {
      day: i + 1,
      consumption: Math.round(baseConsumption + variation),
    };
  });
  
  const data = dailyData || defaultData;
  const avgConsumption = Math.round(data.reduce((sum, d) => sum + d.consumption, 0) / data.length);
  const maxConsumption = Math.max(...data.map(d => d.consumption));
  const minConsumption = Math.min(...data.map(d => d.consumption));

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="w-5 h-5 text-accent" />
          Your Daily Energy Pattern
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Day-by-day consumption for {monthLabel}
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="day" 
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => value % 5 === 0 ? value : ''}
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                label={{ value: 'kWh', angle: -90, position: 'insideLeft', fontSize: 10 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => [`${value} kWh`, 'Consumption']}
                labelFormatter={(label) => `Day ${label}`}
              />
              <Area 
                type="monotone" 
                dataKey="consumption" 
                fill="hsl(var(--chart-1))" 
                fillOpacity={0.2}
                stroke="hsl(var(--chart-1))" 
                strokeWidth={2}
              />
              {/* Average line */}
              <Line 
                type="monotone"
                dataKey={() => avgConsumption}
                stroke="hsl(var(--accent))"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                name="Average"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="p-3 bg-muted/30 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Average</p>
            <p className="text-lg font-semibold">{avgConsumption} kWh</p>
          </div>
          <div className="p-3 bg-success/10 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Minimum</p>
            <p className="text-lg font-semibold text-success">{minConsumption} kWh</p>
          </div>
          <div className="p-3 bg-destructive/10 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Maximum</p>
            <p className="text-lg font-semibold text-destructive">{maxConsumption} kWh</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
