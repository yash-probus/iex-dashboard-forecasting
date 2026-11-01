import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, ArrowRight } from "lucide-react";
import { 
  PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from "recharts";

interface OADISCOMMixProps {
  actualOaPercent: number;
  actualDiscomPercent: number;
  recommendedOaPercent: number;
  maxOaAllowed: number; // Category-based cap
  monthlyTrend?: { month: string; actual: number; recommended: number }[];
}

export function OADISCOMMix({
  actualOaPercent,
  actualDiscomPercent,
  recommendedOaPercent,
  maxOaAllowed,
  monthlyTrend,
}: OADISCOMMixProps) {
  // Current mix pie data
  const currentPieData = [
    { name: 'OA', value: actualOaPercent },
    { name: 'DISCOM', value: actualDiscomPercent },
  ];
  
  // Recommended mix pie data (capped by maxOaAllowed)
  const cappedRecommended = Math.min(recommendedOaPercent, maxOaAllowed);
  const recommendedPieData = [
    { name: 'OA', value: cappedRecommended },
    { name: 'DISCOM', value: 100 - cappedRecommended },
  ];
  
  const COLORS_CURRENT = ['hsl(217 55% 50%)', 'hsl(142 55% 65%)']; // Blue for OA (actual), green for DISCOM
  const COLORS_RECOMMENDED = ['hsl(142 55% 40%)', 'hsl(142 55% 70%)']; // Green shades for recommended
  
  const defaultTrend = [
    { month: 'Oct', actual: 0, recommended: cappedRecommended },
    { month: 'Nov', actual: 0, recommended: cappedRecommended },
    { month: 'Dec', actual: 0, recommended: cappedRecommended },
  ];
  
  const trendData = monthlyTrend || defaultTrend;
  const oaDifference = cappedRecommended - actualOaPercent;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-accent" />
          Your Energy Mix (Actual vs Ideal)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Compare your current OA usage with the optimal mix
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          {/* Current Mix Donut Chart */}
          <div>
            <p className="text-sm text-muted-foreground mb-2 text-center">Current Mix (How You Pay)</p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={currentPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    dataKey="value"
                    label={({ value }) => `${value}%`}
                    labelLine={false}
                  >
                    {currentPieData.map((_, index) => (
                      <Cell key={`cell-current-${index}`} fill={COLORS_CURRENT[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-xs mt-2">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS_CURRENT[0] }} />
                <span>OA ({actualOaPercent}%)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS_CURRENT[1] }} />
                <span>DISCOM ({actualDiscomPercent}%)</span>
              </div>
            </div>
          </div>
          
          {/* Prolt Optimized Mix Donut Chart */}
          <div>
            <p className="text-sm text-muted-foreground mb-2 text-center">Prolt Optimized Mix</p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={recommendedPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    dataKey="value"
                    label={({ value }) => `${value}%`}
                    labelLine={false}
                  >
                    {recommendedPieData.map((_, index) => (
                      <Cell key={`cell-rec-${index}`} fill={COLORS_RECOMMENDED[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-xs mt-2">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS_RECOMMENDED[0] }} />
                <span className="text-success">OA ({cappedRecommended}%)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS_RECOMMENDED[1] }} />
                <span>DISCOM ({100 - cappedRecommended}%)</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* OA Optimization Note */}
        <p className="text-xs text-muted-foreground text-center mt-3">
          Prolt maximizes OA purchase in slots where OA is cheaper than DISCOM
        </p>
          
        {/* Trend Chart - Now removed since we have dual pie charts */}
        
        {/* Insight */}
        <div className="mt-4 p-3 bg-accent/10 rounded-lg flex items-center gap-3">
          <ArrowRight className="w-5 h-5 text-accent flex-shrink-0" />
          <p className="text-sm">
            {actualOaPercent === 0 ? (
              <>You are currently <span className="font-semibold text-foreground">not using OA</span>. Adopting {cappedRecommended}% OA share could significantly reduce your costs.</>
            ) : (
              <>You <span className="font-semibold text-foreground">under-utilized OA by {oaDifference}%</span>. Increasing OA share to {cappedRecommended}% could reduce costs.</>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
