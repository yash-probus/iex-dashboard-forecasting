import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeftRight, ArrowRight } from "lucide-react";
import { calculateShiftabilityIndex } from "@/lib/insightsUtils";

interface ShiftabilityGaugeProps {
  tod1: number;
  tod2: number;
  tod3: number;
  tod4: number;
}

export function ShiftabilityGauge({ tod1, tod2, tod3, tod4 }: ShiftabilityGaugeProps) {
  const score = calculateShiftabilityIndex(tod1, tod2, tod3, tod4);
  
  // Determine flexibility level
  let level: 'Low' | 'Medium' | 'High' = 'Medium';
  let levelColor = 'hsl(48 96% 53%)';
  if (score < 40) {
    level = 'Low';
    levelColor = 'hsl(0 72% 51%)';
  } else if (score > 65) {
    level = 'High';
    levelColor = 'hsl(142 55% 50%)';
  }
  
  // Calculate rotation for gauge needle (0-100 maps to -135 to 135 degrees)
  const needleRotation = -135 + (score / 100) * 270;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-accent" />
          How Much of Your Load Is Shiftable?
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Flexibility index based on ToD distribution
        </p>
      </CardHeader>
      <CardContent className="pb-4">
        {/* Gauge SVG */}
        <div className="flex justify-center">
          <svg viewBox="0 0 200 110" className="w-full max-w-[240px]">
            {/* Background arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="14"
              strokeLinecap="round"
            />
            {/* Colored segments */}
            <path
              d="M 20 100 A 80 80 0 0 1 60 35"
              fill="none"
              stroke="hsl(0 72% 51%)"
              strokeWidth="14"
              strokeLinecap="round"
            />
            <path
              d="M 60 35 A 80 80 0 0 1 140 35"
              fill="none"
              stroke="hsl(48 96% 53%)"
              strokeWidth="14"
            />
            <path
              d="M 140 35 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="hsl(142 55% 50%)"
              strokeWidth="14"
              strokeLinecap="round"
            />
            {/* Center */}
            <circle cx="100" cy="100" r="6" fill="hsl(var(--foreground))" />
            {/* Needle */}
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="40"
              stroke="hsl(var(--foreground))"
              strokeWidth="3"
              strokeLinecap="round"
              transform={`rotate(${needleRotation} 100 100)`}
              className="transition-all duration-1000"
            />
          </svg>
        </div>
        
        {/* Score display - below gauge */}
        <div className="text-center -mt-2">
          <p className="text-3xl font-bold" style={{ color: levelColor }}>
            {score}
          </p>
          <p className="text-xs text-muted-foreground">out of 100</p>
        </div>
        
        {/* Level badges */}
        <div className="flex justify-center gap-2 mt-3">
          {['Low', 'Medium', 'High'].map((lvl) => (
            <div 
              key={lvl}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                lvl === level 
                  ? 'bg-foreground text-background scale-105' 
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {lvl}
            </div>
          ))}
        </div>
        
        {/* Insight */}
        <div className="mt-4 p-2.5 bg-accent/10 rounded-lg flex items-center gap-2">
          <ArrowRight className="w-4 h-4 text-accent flex-shrink-0" />
          <p className="text-xs">
            Your load flexibility is <span className="font-semibold" style={{ color: levelColor }}>{level}</span>. 
            {level === 'High' && ' Great potential for load shifting.'}
            {level === 'Medium' && ' Some optimization opportunities exist.'}
            {level === 'Low' && ' Review which loads can shift to off-peak.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
