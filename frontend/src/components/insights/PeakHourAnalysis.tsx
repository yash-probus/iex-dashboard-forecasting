import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, ArrowRight } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from "recharts";

interface PeakHourAnalysisProps {
  hourlyData?: { hour: number; usage: number; cost: number }[];
}

export function PeakHourAnalysis({ hourlyData }: PeakHourAnalysisProps) {
  // Generate default hourly data if not provided
  const defaultData = Array.from({ length: 24 }, (_, hour) => {
    let usage = 50;
    let costMultiplier = 1;
    
    // Morning peak
    if (hour >= 6 && hour < 10) {
      usage = 80 + Math.random() * 30;
      costMultiplier = 1.3;
    }
    // Midday
    else if (hour >= 10 && hour < 17) {
      usage = 60 + Math.random() * 20;
      costMultiplier = 1.0;
    }
    // Evening peak
    else if (hour >= 17 && hour < 22) {
      usage = 100 + Math.random() * 40;
      costMultiplier = 1.5;
    }
    // Night
    else {
      usage = 30 + Math.random() * 20;
      costMultiplier = 0.7;
    }
    
    return {
      hour,
      usage: Math.round(usage),
      cost: Math.round(usage * costMultiplier * 6.5),
    };
  });
  
  const data = hourlyData || defaultData;
  
  // Find most expensive hours
  const sortedByExpense = [...data].sort((a, b) => b.cost - a.cost);
  const topExpensiveHours = sortedByExpense.slice(0, 3);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5 text-accent" />
          Your Most Expensive Hours to Consume
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Bubble size represents usage volume, color represents cost
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="hour" 
                type="number" 
                domain={[0, 23]}
                tick={{ fontSize: 10 }}
                tickFormatter={(hour) => `${String(hour).padStart(2, '0')}:00`}
                ticks={[0, 6, 12, 18, 23]}
              />
              <YAxis 
                dataKey="usage" 
                type="number"
                tick={{ fontSize: 10 }}
                label={{ value: 'kWh', angle: -90, position: 'insideLeft', fontSize: 10 }}
              />
              <ZAxis dataKey="cost" range={[50, 400]} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'usage') return [`${value} kWh`, 'Usage'];
                  if (name === 'cost') return [`₹${value}`, 'Cost'];
                  return [value, name];
                }}
                labelFormatter={(hour) => `${String(hour).padStart(2, '0')}:00`}
              />
              <Scatter 
                data={data} 
                fill="hsl(var(--chart-1))"
                fillOpacity={0.6}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        
        {/* Top expensive hours */}
        <div className="mt-4">
          <p className="text-sm font-medium mb-2">Most Expensive Hours:</p>
          <div className="flex gap-2 flex-wrap">
            {topExpensiveHours.map((hour, index) => (
              <div 
                key={index}
                className="px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-lg"
              >
                <p className="text-sm font-medium text-destructive">
                  {String(hour.hour).padStart(2, '0')}:00
                </p>
                <p className="text-xs text-muted-foreground">
                  ₹{hour.cost} | {hour.usage} kWh
                </p>
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-muted/30 rounded-lg flex items-center gap-3">
          <ArrowRight className="w-5 h-5 text-accent flex-shrink-0" />
          <p className="text-sm">
            Avoid high consumption during <span className="font-semibold text-destructive">17:00-22:00</span> to reduce costs.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
