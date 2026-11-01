import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { 
  PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";

interface ToDBehaviorProps {
  tod1: number;
  tod2: number;
  tod3: number;
  tod4: number;
}

export function ToDBehavior({ tod1, tod2, tod3, tod4 }: ToDBehaviorProps) {
  const total = tod1 + tod2 + tod3 + tod4;
  
  const pieData = [
    { name: 'TOD1 (06-17h)', value: tod1, color: 'hsl(175 55% 40%)' },
    { name: 'TOD2 (17-23h)', value: tod2, color: 'hsl(0 72% 51%)' },
    { name: 'TOD3 (23-06h)', value: tod3, color: 'hsl(142 55% 50%)' },
    { name: 'TOD4 (Peak)', value: tod4, color: 'hsl(25 95% 53%)' },
  ].filter(d => d.value > 0);
  
  // Generate hourly timeline
  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    let consumption = 0;
    // Distribute ToD consumption across hours
    if (hour >= 6 && hour < 17) consumption = tod1 / 11; // TOD1
    else if (hour >= 17 && hour < 23) consumption = tod2 / 6; // TOD2
    else if (hour >= 23 || hour < 6) consumption = tod3 / 7; // TOD3
    // TOD4 peaks overlay
    if ((hour >= 19 && hour < 21) && tod4 > 0) consumption += tod4 / 2;
    
    return { hour: `${String(hour).padStart(2, '0')}:00`, consumption: Math.round(consumption) };
  });
  
  // Find dominant ToD
  const maxTod = pieData.reduce((prev, curr) => curr.value > prev.value ? curr : prev, pieData[0]);
  const maxPercent = total > 0 ? ((maxTod.value / total) * 100).toFixed(0) : 0;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5 text-accent" />
          When You Use Most of Your Energy
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Time-of-Day consumption distribution
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          {/* Donut Chart */}
          <div>
            <p className="text-sm text-muted-foreground mb-2 text-center">ToD Distribution</p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    dataKey="value"
                    label={({ value }) => `${((value / total) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value} kWh`} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-2 text-xs mt-2">
              {pieData.map((item, index) => (
                <div key={index} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded" style={{ backgroundColor: item.color }} />
                  <span>{item.name.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Timeline Chart */}
          <div>
            <p className="text-sm text-muted-foreground mb-2 text-center">Hourly Pattern</p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="hour" 
                    tick={{ fontSize: 8 }}
                    tickFormatter={(h) => h.split(':')[0]}
                    interval={5}
                  />
                  <YAxis hide />
                  <Tooltip 
                    formatter={(value: number) => [`${value} kWh`, 'Consumption']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="consumption" 
                    fill="hsl(var(--chart-1))" 
                    fillOpacity={0.3}
                    stroke="hsl(var(--chart-1))" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        {/* Insight */}
        <div className="mt-4 p-3 bg-accent/10 rounded-lg text-center">
          <p className="text-sm">
            Most of your usage is in <span className="font-semibold text-accent">{maxTod.name}</span> ({maxPercent}%)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
