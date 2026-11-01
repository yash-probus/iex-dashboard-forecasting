import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Award, AlertTriangle } from "lucide-react";
import type { SevenDayReportData } from "../reportCalculations";

interface Props {
  report: SevenDayReportData;
}

export function DailyTrendChart({ report }: Props) {
  const chartData = report.dailySummaries.map((d) => ({
    date: d.date,
    dayLabel: d.dayLabel,
    wmape: d.wmape ?? 0,
    mae: d.mae ?? 0,
    avgForecast: d.avgForecast,
    avgActual: d.avgActual,
    isBestDay: d.isBestDay,
    isWorstDay: d.isWorstDay,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    return (
      <div className="rounded-xl border border-border bg-card/95 p-3 text-xs shadow-lg backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-1.5 font-semibold text-foreground">
          <span>{item.dayLabel}</span>
          {item.isBestDay && (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
              ★ Best Day
            </span>
          )}
          {item.isWorstDay && (
            <span className="inline-flex items-center gap-1 text-[10px] text-rose-500 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded">
              Worst Day
            </span>
          )}
        </div>
        <div className="mt-2 space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">WMAPE:</span>
            <span className="font-mono font-bold text-indigo-500">{item.wmape ? `${item.wmape}%` : "Pending"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">MAE:</span>
            <span className="font-mono font-bold text-rose-500">{item.mae ? `₹${item.mae}/kWh` : "Pending"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Avg Forecast:</span>
            <span className="font-mono text-foreground">₹{item.avgForecast}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Avg Actual:</span>
            <span className="font-mono text-teal-500">{item.avgActual !== null ? `₹${item.avgActual}` : "Pending"}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">7-Day Daily Accuracy Trend</h3>
          <p className="text-xs text-muted-foreground">Daily WMAPE (%) and MAE (₹/kWh) progression across the delivery window</p>
        </div>

        {/* Best & Worst Day callouts */}
        <div className="flex flex-wrap items-center gap-2">
          {report.bestDay && (
            <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-xs text-emerald-600 dark:text-emerald-400">
              <Award className="size-3.5" />
              <span>Best: <strong>{report.bestDay.dayLabel}</strong> ({report.bestDay.wmape}%)</span>
            </div>
          )}
          {report.worstDay && (
            <div className="flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 px-2.5 py-1 text-xs text-rose-600 dark:text-rose-400">
              <AlertTriangle className="size-3.5" />
              <span>Worst: <strong>{report.worstDay.dayLabel}</strong> ({report.worstDay.wmape}%)</span>
            </div>
          )}
        </div>
      </div>

      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
            <XAxis dataKey="dayLabel" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} unit="%" />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} unit="₹" />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
              formatter={(value) => <span className="text-foreground">{value}</span>}
            />
            <Bar
              yAxisId="left"
              dataKey="wmape"
              name="WMAPE (%)"
              fill="#6366F1"
              radius={[4, 4, 0, 0]}
              maxBarSize={36}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="mae"
              name="MAE (₹/kWh)"
              stroke="#F43F5E"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#F43F5E", strokeWidth: 1.5, stroke: "#fff" }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
