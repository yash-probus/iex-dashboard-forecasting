import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from "recharts";
import { HelpCircle, TrendingDown } from "lucide-react";
import { DayWiseData } from "./types";
import { formatCurrency } from "@/lib/calculatorUtils";

interface DayWiseChartProps {
  data: DayWiseData[];
  onDayClick: (day: string) => void;
  totalSavings: number;
  oaUnits: number;
  discomUnits: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const actual = payload.find((p: any) => p.dataKey === 'actualPaid')?.value || 0;
    const suggested = payload.find((p: any) => p.dataKey === 'proltSuggested')?.value || 0;
    const saving = actual - suggested;
    
    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Actual Paid:</span>
            <span className="font-mono">{formatCurrency(actual)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Prolt Suggested:</span>
            <span className="font-mono">{formatCurrency(suggested)}</span>
          </div>
          {saving > 0 && (
            <div className="flex justify-between gap-4 pt-1 border-t text-success">
              <span>Potential Saving:</span>
              <span className="font-mono font-medium">{formatCurrency(saving)}</span>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">Click to view slot breakdown</p>
      </div>
    );
  }
  return null;
};

export function DayWiseChart({ data, onDayClick, totalSavings, oaUnits, discomUnits }: DayWiseChartProps) {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Day-Wise Breakdown of OA Costing</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total Potential Savings</p>
            <p className="text-xl font-bold text-success">{formatCurrency(totalSavings)}</p>
          </div>
          <div className="text-center border-x border-border">
            <p className="text-sm text-muted-foreground">OA Units</p>
            <p className="text-xl font-bold">{oaUnits.toLocaleString('en-IN')} kWh</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">DISCOM Units</p>
            <p className="text-xl font-bold">{discomUnits.toLocaleString('en-IN')} kWh</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              onClick={(e) => e?.activeLabel && onDayClick(e.activeLabel)}
              margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="day" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                className="text-muted-foreground"
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend 
                content={({ payload }) => (
                  <div className="flex items-center justify-center gap-6 mt-4">
                    {payload?.map((entry: any) => (
                      <div key={entry.value} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-sm" 
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          {entry.value === 'actualPaid' ? 'Actual Amount Paid' : 'Prolt Suggested Amount'}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-3 h-3 text-muted-foreground/50 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">
                                {entry.value === 'actualPaid' 
                                  ? "Total money you actually paid for that day (includes DISCOM billed charges + any OA settlement charges extracted from uploaded bills)."
                                  : "Model's estimated day cost if you had followed Prolt's per-slot recommendations (OA for slots predicted cheaper than DISCOM), including OA regulatory charges and DISCOM fixed/ToD charges."
                                }
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              />
              <Bar 
                dataKey="actualPaid" 
                fill="hsl(142 69% 58% / 0.6)" 
                radius={[4, 4, 0, 0]}
                cursor="pointer"
              />
              <Bar 
                dataKey="proltSuggested" 
                fill="hsl(142 76% 36%)" 
                radius={[4, 4, 0, 0]}
                cursor="pointer"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
