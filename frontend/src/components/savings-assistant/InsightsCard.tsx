import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Lightbulb, Clock, Calendar, TrendingUp, ArrowRight, HelpCircle } from "lucide-react";
import { InsightData } from "./types";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";

interface InsightsCardProps {
  peakHours: string;
  peakMonth: string;
  peakMonthPercent: number;
  peakRate: number;
  offPeakRate: number;
  shiftablePercent: number;
  oaRecommendedPercent: number;
  monthlyData?: { month: string; spend: number }[];
}

// Mini Heatmap for peak hours visualization
function PeakHoursHeatmap({ peakHours }: { peakHours: string }) {
  // Generate 24-hour grid with intensity based on typical peak patterns
  const hourData = Array.from({ length: 24 }, (_, hour) => {
    let intensity = 0.2; // Base off-peak
    if (hour >= 6 && hour <= 10) intensity = 0.9; // Morning peak
    if (hour >= 17 && hour <= 21) intensity = 0.95; // Evening peak
    if (hour >= 10 && hour <= 16) intensity = 0.3; // Mid-day solar
    if (hour >= 22 || hour <= 5) intensity = 0.15; // Night off-peak
    return { hour, intensity };
  });

  return (
    <div className="mt-3">
      <div className="flex gap-0.5">
        {hourData.map(({ hour, intensity }) => (
          <Tooltip key={hour}>
            <TooltipTrigger asChild>
              <div
                className="w-3 h-8 rounded-sm cursor-help transition-transform hover:scale-110"
                style={{
                  backgroundColor: `hsl(175 55% ${100 - intensity * 50}%)`,
                  opacity: 0.5 + intensity * 0.5,
                }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{String(hour).padStart(2, '0')}:00 - {intensity > 0.7 ? 'Peak' : intensity > 0.4 ? 'Normal' : 'Off-peak'}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>00:00</span>
        <span>12:00</span>
        <span>24:00</span>
      </div>
    </div>
  );
}

// Mini bar chart for monthly spend
function MonthlySpendChart({ data }: { data: { month: string; spend: number }[] }) {
  const maxSpend = Math.max(...data.map(d => d.spend));
  
  return (
    <div className="h-20 mt-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 9 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis hide />
          <Bar dataKey="spend" radius={[2, 2, 0, 0]}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.spend === maxSpend ? 'hsl(var(--accent))' : 'hsl(var(--muted-foreground) / 0.3)'} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Rate comparison visualization
function RateComparisonViz({ peakRate, offPeakRate }: { peakRate: number; offPeakRate: number }) {
  const ratio = peakRate / offPeakRate;
  
  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Peak</span>
            <span className="font-mono">₹{peakRate.toFixed(2)}/kWh</span>
          </div>
          <div className="h-2 rounded-full bg-destructive/30 overflow-hidden">
            <div 
              className="h-full bg-destructive rounded-full transition-all" 
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Off-Peak</span>
            <span className="font-mono">₹{offPeakRate.toFixed(2)}/kWh</span>
          </div>
          <div className="h-2 rounded-full bg-success/30 overflow-hidden">
            <div 
              className="h-full bg-success rounded-full transition-all" 
              style={{ width: `${(1 / ratio) * 100}%` }}
            />
          </div>
        </div>
      </div>
      <p className="text-xs text-center text-muted-foreground">
        Peak rates are <span className="font-semibold text-foreground">{ratio.toFixed(1)}×</span> higher than off-peak
      </p>
    </div>
  );
}

export function InsightsCard({
  peakHours,
  peakMonth,
  peakMonthPercent,
  peakRate,
  offPeakRate,
  shiftablePercent,
  oaRecommendedPercent,
  monthlyData,
}: InsightsCardProps) {
  // Default monthly data if not provided
  const defaultMonthlyData = [
    { month: 'Jan', spend: 45000 },
    { month: 'Feb', spend: 42000 },
    { month: 'Mar', spend: 48000 },
    { month: 'Apr', spend: 52000 },
    { month: 'May', spend: 68000 },
    { month: 'Jun', spend: 72000 },
    { month: 'Jul', spend: 75000 },
    { month: 'Aug', spend: 71000 },
    { month: 'Sep', spend: 58000 },
    { month: 'Oct', spend: 49000 },
    { month: 'Nov', spend: 44000 },
    { month: 'Dec', spend: 46000 },
  ];

  const insights: InsightData[] = [
    {
      type: 'peak-hours',
      title: 'Peak Hours Identified',
      description: `Your highest consumption is between ${peakHours} on weekdays.`,
      suggestion: `Shift ${shiftablePercent}% of non-critical loads to 10:00–16:00 for lower rates.`,
    },
    {
      type: 'peak-months',
      title: 'Peak Month Analysis',
      description: `${peakMonth} accounts for ${peakMonthPercent}% of your annual spend.`,
      suggestion: 'Plan maintenance shutdowns during high-cost months.',
    },
    {
      type: 'cost-consumption',
      title: 'Cost vs Consumption',
      description: `Peak hours cost ₹${peakRate.toFixed(2)}/kWh versus ₹${offPeakRate.toFixed(2)} in off-peak.`,
      suggestion: `Prolt suggests OA for ${oaRecommendedPercent}% of monthly slots.`,
    },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'peak-hours': return <Clock className="w-5 h-5" />;
      case 'peak-months': return <Calendar className="w-5 h-5" />;
      case 'cost-consumption': return <TrendingUp className="w-5 h-5" />;
      default: return <Lightbulb className="w-5 h-5" />;
    }
  };

  const getVisualization = (type: string) => {
    switch (type) {
      case 'peak-hours': 
        return <PeakHoursHeatmap peakHours={peakHours} />;
      case 'peak-months': 
        return <MonthlySpendChart data={monthlyData || defaultMonthlyData} />;
      case 'cost-consumption': 
        return <RateComparisonViz peakRate={peakRate} offPeakRate={offPeakRate} />;
      default: 
        return null;
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-warning" />
          What Your Bills Tell Us
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Auto-generated insights from your consumption and billing data
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.map((insight, index) => (
          <div
            key={index}
            className="p-4 bg-muted/30 rounded-lg space-y-2 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                {getIcon(insight.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground">{insight.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {insight.description}
                </p>
              </div>
            </div>
            
            {/* Mini Visualization */}
            {getVisualization(insight.type)}
            
            <div className="flex items-center gap-2 text-sm text-accent pt-2 border-t border-border/50">
              <ArrowRight className="w-4 h-4" />
              <span>{insight.suggestion}</span>
            </div>
          </div>
        ))}

        {/* AI Suggestion Cards */}
        <div className="p-4 bg-gradient-to-r from-accent/5 to-success/5 border border-accent/20 rounded-lg">
          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-accent" />
            AI Recommendations
          </h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3 p-2 bg-background/50 rounded-lg">
              <span className="w-6 h-6 rounded-full bg-success/20 text-success flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
              <div>
                <p className="text-foreground">Shift {shiftablePercent}% of load to ToD Slot 3</p>
                <p className="text-xs text-muted-foreground">Could save ~₹{Math.round((peakRate - offPeakRate) * 1000)}/month</p>
              </div>
            </li>
            <li className="flex items-start gap-3 p-2 bg-background/50 rounded-lg">
              <span className="w-6 h-6 rounded-full bg-success/20 text-success flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
              <div>
                <p className="text-foreground">Avoid OA during 18:00–22:00 hours</p>
                <p className="text-xs text-muted-foreground">Typically higher landed price in evening peak</p>
              </div>
            </li>
            <li className="flex items-start gap-3 p-2 bg-background/50 rounded-lg">
              <span className="w-6 h-6 rounded-full bg-success/20 text-success flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
              <div>
                <p className="text-foreground">Prolt suggests OA for {oaRecommendedPercent}% of consumption</p>
                <p className="text-xs text-muted-foreground">Optimal mix based on price patterns</p>
              </div>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
