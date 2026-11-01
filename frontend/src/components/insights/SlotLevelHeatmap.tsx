import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Grid3X3 } from "lucide-react";

interface SlotLevelHeatmapProps {
  month?: number;
  avgConsumption?: number;
}

// Correlogram-style price level categories
const priceLevels = ['Low', 'Medium', 'High', 'Peak'] as const;
type PriceLevel = typeof priceLevels[number];

function getPriceLevelColor(level: PriceLevel, intensity: number): string {
  const alpha = Math.min(0.3 + intensity * 0.7, 1);
  switch (level) {
    case 'Low': return `hsla(142, 55%, 50%, ${alpha})`; // Green
    case 'Medium': return `hsla(48, 96%, 53%, ${alpha})`; // Yellow
    case 'High': return `hsla(25, 95%, 53%, ${alpha})`; // Orange
    case 'Peak': return `hsla(0, 72%, 51%, ${alpha})`; // Red
  }
}

function getPriceLevelForHour(hour: number, month: number): PriceLevel {
  // Summer months (Apr-Sep) have different peak hours
  const isSummer = month >= 4 && month <= 9;
  
  if (isSummer) {
    // Summer: Peak during afternoon (14-17), high during evening (18-22)
    if (hour >= 14 && hour <= 17) return 'Peak';
    if (hour >= 18 && hour <= 22) return 'High';
    if (hour >= 6 && hour <= 10) return 'Medium';
    return 'Low';
  } else {
    // Winter: Peak during evening (18-21), high during morning (7-10)
    if (hour >= 18 && hour <= 21) return 'Peak';
    if (hour >= 7 && hour <= 10) return 'High';
    if (hour >= 11 && hour <= 17) return 'Medium';
    return 'Low';
  }
}

function getConsumptionIntensity(hour: number, avgConsumption: number): number {
  // Simulated consumption pattern: higher during working hours
  const baseIntensity = avgConsumption / 24000;
  if (hour >= 9 && hour <= 18) return Math.min(baseIntensity * 1.5, 1);
  if (hour >= 6 && hour <= 8 || hour >= 19 && hour <= 22) return Math.min(baseIntensity * 1.2, 1);
  return Math.min(baseIntensity * 0.6, 1);
}

export function SlotLevelHeatmap({ 
  month = 10, 
  avgConsumption = 1000 
}: SlotLevelHeatmapProps) {
  // Generate correlogram data: Hours (0-23) vs Price Levels
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  // Calculate correlation between each hour and price level
  const correlogramData = hours.map(hour => {
    const priceLevel = getPriceLevelForHour(hour, month);
    const intensity = getConsumptionIntensity(hour, avgConsumption);
    
    return {
      hour,
      priceLevel,
      intensity,
      consumption: Math.round(avgConsumption / 24 * (0.5 + intensity)),
      price: priceLevel === 'Peak' ? 7.5 : priceLevel === 'High' ? 5.5 : priceLevel === 'Medium' ? 4.0 : 2.8,
    };
  });

  // Group hours by price level for the correlogram view
  const groupedByLevel = priceLevels.map(level => ({
    level,
    hours: correlogramData.filter(d => d.priceLevel === level),
    totalHours: correlogramData.filter(d => d.priceLevel === level).length,
  }));

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Grid3X3 className="w-5 h-5 text-accent" />
          High-Price & Low-Price Hours
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Hours categorized by price level with consumption intensity
        </p>
      </CardHeader>
      <CardContent>
        {/* Correlogram Grid */}
        <div className="space-y-3">
          {groupedByLevel.map(({ level, hours, totalHours }) => (
            <div key={level} className="flex items-center gap-3">
              <div className="w-16 text-sm font-medium text-muted-foreground">
                {level}
                <span className="text-xs block text-muted-foreground/70">
                  ({totalHours}h)
                </span>
              </div>
              <div className="flex-1 flex gap-1 flex-wrap">
                {hours.map(({ hour, intensity, consumption, price }) => (
                  <Tooltip key={hour}>
                    <TooltipTrigger asChild>
                      <div 
                        className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-mono cursor-help transition-transform hover:scale-110 hover:z-10 border border-border/30"
                        style={{ 
                          backgroundColor: getPriceLevelColor(level, intensity),
                          color: intensity > 0.6 ? 'white' : 'inherit'
                        }}
                      >
                        {String(hour).padStart(2, '0')}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs space-y-1">
                        <p className="font-medium">{String(hour).padStart(2, '0')}:00 - {String(hour).padStart(2, '0')}:59</p>
                        <p>Price Level: <span className="font-semibold">{level}</span></p>
                        <p>Est. Rate: ₹{price.toFixed(2)}/kWh</p>
                        <p>Consumption: ~{consumption} kWh</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-2">Color intensity = consumption level</p>
          <div className="flex items-center gap-4 text-xs flex-wrap">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(142 55% 50%)' }} />
              <span>Low (₹2-3/kWh)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(48 96% 53%)' }} />
              <span>Medium (₹4-5/kWh)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(25 95% 53%)' }} />
              <span>High (₹5-6/kWh)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(0 72% 51%)' }} />
              <span>Peak (₹7+/kWh)</span>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="mt-4 p-3 bg-success/10 rounded-lg">
          <p className="text-sm text-success font-medium">💡 Optimization Tip</p>
          <p className="text-xs text-muted-foreground mt-1">
            Shift {groupedByLevel.find(g => g.level === 'Peak')?.totalHours || 0}h of peak-hour consumption to low-price hours (midnight-6AM) to maximize OA savings.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
