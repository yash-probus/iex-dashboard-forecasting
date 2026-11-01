import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge, ArrowRight } from "lucide-react";
import { calculateLoadUtilization } from "@/lib/insightsUtils";
import { formatCurrency } from "@/lib/calculatorUtils";

interface SanctionedLoadGaugeProps {
  sanctionedLoad: number; // MW
  estimatedMaxDemand: number; // MW
  fixedChargePerUnit: number;
}

export function SanctionedLoadGauge({
  sanctionedLoad,
  estimatedMaxDemand,
  fixedChargePerUnit,
}: SanctionedLoadGaugeProps) {
  const { utilization, status } = calculateLoadUtilization(estimatedMaxDemand, sanctionedLoad);
  
  const statusColors = {
    under: { main: 'hsl(48 96% 53%)', text: 'text-yellow-500' },
    optimal: { main: 'hsl(142 55% 50%)', text: 'text-success' },
    over: { main: 'hsl(0 72% 51%)', text: 'text-destructive' },
  };
  
  const statusLabels = {
    under: 'Underutilized',
    optimal: 'Optimal',
    over: 'Near Limit',
  };
  
  // Calculate needle rotation (-90 to 90 degrees for 0-100%)
  const needleRotation = -90 + (utilization / 100) * 180;
  
  // Fixed charge calculation
  const monthlyFixedCharge = sanctionedLoad * 1000 * fixedChargePerUnit; // Convert MW to kW

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Gauge className="w-5 h-5 text-accent" />
          Are You Paying Too Much Fixed Charge?
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Sanctioned load utilization analysis
        </p>
      </CardHeader>
      <CardContent className="pb-4">
        {/* Gauge SVG */}
        <div className="flex justify-center">
          <svg viewBox="0 0 200 105" className="w-full max-w-[220px]">
            {/* Gray arc (unused) */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="12"
              strokeLinecap="round"
            />
            {/* Colored arc (utilization) */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke={statusColors[status].main}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${utilization * 2.51} 251`}
              className="transition-all duration-1000"
            />
            {/* Center point */}
            <circle cx="100" cy="100" r="5" fill="hsl(var(--foreground))" />
            {/* Needle */}
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="35"
              stroke="hsl(var(--foreground))"
              strokeWidth="2.5"
              strokeLinecap="round"
              transform={`rotate(${needleRotation} 100 100)`}
              className="transition-all duration-1000"
            />
          </svg>
        </div>
        
        {/* Percentage label - below gauge */}
        <div className="text-center -mt-1">
          <p className={`text-2xl font-bold ${statusColors[status].text}`}>
            {utilization}%
          </p>
          <p className={`text-xs ${statusColors[status].text}`}>
            {statusLabels[status]}
          </p>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="p-2.5 bg-muted/30 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Sanctioned Load</p>
            <p className="text-base font-semibold">{sanctionedLoad} MW</p>
          </div>
          <div className="p-2.5 bg-muted/30 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Est. Max Demand</p>
            <p className="text-base font-semibold">{estimatedMaxDemand.toFixed(2)} MW</p>
          </div>
          <div className="p-2.5 bg-muted/30 rounded-lg text-center col-span-2">
            <p className="text-xs text-muted-foreground">Monthly Fixed Charge</p>
            <p className="text-base font-semibold">{formatCurrency(monthlyFixedCharge)}</p>
            <p className="text-xs text-muted-foreground">@ ₹{fixedChargePerUnit}/kVA</p>
          </div>
        </div>
        
        {/* Insight */}
        {status === 'under' && (
          <div className="mt-3 p-2.5 bg-yellow-500/10 rounded-lg flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            <p className="text-xs">
              You are <span className="font-semibold">underutilizing by {100 - utilization}%</span>. 
              Consider reducing sanctioned load to save on fixed charges.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
