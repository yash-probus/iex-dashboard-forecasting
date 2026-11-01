import React, { useState, useEffect, useMemo } from "react";
import {
  Activity,
  Calendar,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Info,
  Zap,
  ArrowRight,
  ChevronRight,
  Layers,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  MARKETS_CONFIG,
  MARKET_KEYS,
  calculateSevenDayRollingTrend,
  fetchSevenDayMarketRows,
  type MarketKey,
  type SevenDayRollingTrend,
  type DailyPaisaBarData,
  UNITS_PER_MW_PER_BLOCK,
  BLOCKS_PER_DAY,
} from "./multiMarketPaisaCalculations";
import type { ForecastRow } from "../mockData";

export interface SevenDayRollingPaisaChartProps {
  targetDate: string; // YYYY-MM-DD
  thresholdPaisa: number; // e.g. 20
  capacityMw: number; // e.g. 1.0
  selectedModel?: string;
  initialMarket?: MarketKey;
}

export const SevenDayRollingPaisaChart: React.FC<SevenDayRollingPaisaChartProps> = ({
  targetDate,
  thresholdPaisa = 20,
  capacityMw = 1.0,
  selectedModel = "3",
  initialMarket = "DAM",
}) => {
  const [activeMarket, setActiveMarket] = useState<MarketKey>(initialMarket);
  const [hoveredDay, setHoveredDay] = useState<DailyPaisaBarData | null>(null);
  const [cache, setCache] = useState<Record<string, ForecastRow[]>>({});
  const [loading, setLoading] = useState<boolean>(false);

  const cacheKey = `${activeMarket}-${targetDate}-${selectedModel}`;

  // Fetch 7-day data when activeMarket, targetDate, or model changes
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      if (cache[cacheKey]) return;

      setLoading(true);
      try {
        const rows = await fetchSevenDayMarketRows(activeMarket, targetDate, selectedModel);
        if (!isCancelled) {
          setCache((prev) => ({ ...prev, [cacheKey]: rows }));
        }
      } catch (err) {
        console.error("[SevenDayRollingPaisaChart] Error fetching 7-day rows:", err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [activeMarket, targetDate, selectedModel, cacheKey, cache]);

  // Calculate 7-day rolling statistics
  const trendData = useMemo<SevenDayRollingTrend>(() => {
    const rows = cache[cacheKey] || [];
    return calculateSevenDayRollingTrend(
      rows,
      targetDate,
      activeMarket,
      capacityMw,
      thresholdPaisa,
      selectedModel
    );
  }, [cache, cacheKey, targetDate, activeMarket, capacityMw, thresholdPaisa, selectedModel]);

  const activeMeta = MARKETS_CONFIG[activeMarket];
  const thresholdRs = thresholdPaisa / 100;
  const thresholdMwhRs = thresholdRs * 1000;

  return (
    <div className="rounded-xl border-2 border-border/70 bg-background/95 p-4 sm:p-5 shadow-sm space-y-4">
      {/* 1. Header & Market Selector Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="flex size-7 items-center justify-center rounded-lg border text-xs shadow-2xs"
              style={{
                backgroundColor: `${activeMeta.colorHex}15`,
                borderColor: `${activeMeta.colorHex}35`,
                color: activeMeta.colorHex,
              }}
            >
              <Activity className="size-4" />
            </span>
            <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-foreground flex items-center gap-2">
              7-Day Rolling Tolerance Trend
              <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">
                ({trendData.startDate} → {trendData.endDate})
              </span>
            </h3>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              &lt; {thresholdPaisa}p (₹{Math.round(thresholdMwhRs)}/MWh)
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1.5">
            <span>Rolling 7 days: previous 6 days + target day. Green = within tolerance, Red = exceeding tolerance.</span>
          </p>
        </div>

        {/* Market Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-1 bg-muted/30 p-1 rounded-xl border border-border/70 shadow-2xs self-start lg:self-center">
          {MARKET_KEYS.map((key) => {
            const meta = MARKETS_CONFIG[key];
            const isSelected = activeMarket === key;
            return (
              <button
                key={key}
                onClick={() => setActiveMarket(key)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-background text-foreground shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                }`}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: meta.colorHex }}
                />
                <span>{meta.shortName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Rolling 7-Day Performance KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        {/* KPI 1: 7-Day Avg Compliance */}
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5 space-y-0.5">
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
            <ShieldCheck className="size-3 text-emerald-500" /> 7-Day Compliance Avg:
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
              {trendData.overallAvgWithinPct}%
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">
              {trendData.overallTotalWithinCount} / {trendData.overallTotalClearedSlots} Blocks
            </span>
          </div>
        </div>

        {/* KPI 2: 7-Day Avg MAE */}
        <div className="rounded-lg border border-border/70 bg-card p-2.5 space-y-0.5">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <TrendingUp className="size-3 text-rose-500" /> 7-Day Avg MAE:
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-base sm:text-lg font-black text-foreground font-mono tracking-tight">
              ₹{trendData.overallAvgMaeRs} <span className="text-xs font-medium text-muted-foreground">/kWh</span>
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">
              {trendData.overallAvgMaePaisa}p
            </span>
          </div>
        </div>

        {/* KPI 3: 7-Day Avg WMAPE */}
        <div className="rounded-lg border border-border/70 bg-card p-2.5 space-y-0.5">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <Zap className="size-3 text-blue-500" /> 7-Day Avg WMAPE:
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-base sm:text-lg font-black text-foreground font-mono tracking-tight">
              {trendData.overallWmape}%
            </span>
            <span className="text-[10px] text-muted-foreground">Weighted error</span>
          </div>
        </div>

        {/* KPI 4: 7-Day Compliant Volume */}
        <div className="rounded-lg border border-border/70 bg-card p-2.5 space-y-0.5">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <Zap className="size-3 text-amber-500" /> Volume in Tolerance:
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-base sm:text-lg font-black text-foreground font-mono tracking-tight">
              {trendData.overallWithinEnergyMwh} <span className="text-xs font-medium text-muted-foreground">MWh</span>
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">
              of {trendData.overallTotalEnergyMwh} MWh
            </span>
          </div>
        </div>
      </div>

      {/* 3. The 7-Day Stacked Bar Graph (As drawn in the photo!) */}
      <div className="rounded-xl border border-border/80 bg-muted/15 p-4 sm:p-5 relative overflow-hidden">
        {/* Graph Legend & Status */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-border/50 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-foreground">Graph Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-gradient-to-t from-emerald-600 to-emerald-500 border border-emerald-400/40" />
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                Green (G): Blocks &lt; {thresholdPaisa}p ({trendData.days.reduce((acc, d) => acc + d.withinCount, 0)} Total)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-gradient-to-t from-rose-600 to-rose-500 border border-rose-400/40" />
              <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                Red (R): Blocks &gt;= {thresholdPaisa}p ({trendData.days.reduce((acc, d) => acc + d.exceedingCount, 0)} Total)
              </span>
            </div>
          </div>

          <div className="text-[11px] font-mono text-muted-foreground">
            Total Height = 96 Blocks / Day (100%)
          </div>
        </div>

        {/* The 7 Stacked Bars Container */}
        <div className="relative pt-4 pb-2">
          {/* Subtle horizontal gridlines (0, 24, 48, 72, 96) */}
          <div className="absolute inset-0 top-4 bottom-14 pointer-events-none flex flex-col justify-between opacity-30">
            <div className="border-b border-dashed border-border flex items-center justify-between">
              <span className="text-[9px] font-mono text-muted-foreground pl-1">96 Blocks (100%)</span>
            </div>
            <div className="border-b border-dashed border-border flex items-center justify-between">
              <span className="text-[9px] font-mono text-muted-foreground pl-1">72 Blocks (75%)</span>
            </div>
            <div className="border-b border-dashed border-border flex items-center justify-between">
              <span className="text-[9px] font-mono text-muted-foreground pl-1">48 Blocks (50%)</span>
            </div>
            <div className="border-b border-dashed border-border flex items-center justify-between">
              <span className="text-[9px] font-mono text-muted-foreground pl-1">24 Blocks (25%)</span>
            </div>
            <div className="border-b border-border" />
          </div>

          {/* 7 Bars Grid */}
          <div className="grid grid-cols-7 gap-2 sm:gap-4 relative z-10 h-64 sm:h-72 items-end px-2">
            {trendData.days.map((day, idx) => {
              const isTarget = day.isTargetDay;
              const isHovered = hoveredDay?.date === day.date;
              const greenHeightPct = Math.min(100, Math.max(0, day.withinPct));
              const redHeightPct = Math.max(0, 100 - greenHeightPct);

              return (
                <div
                  key={day.date}
                  className="flex flex-col items-center h-full justify-end group cursor-pointer"
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  {/* Top Badge: Compliant % */}
                  <div
                    className={`text-[10px] sm:text-xs font-black font-mono mb-1.5 transition-transform ${
                      isHovered ? "scale-110 text-primary" : "text-foreground"
                    }`}
                  >
                    {day.withinPct}%
                  </div>

                  {/* The Stacked Bar Column */}
                  <div
                    className={`w-full max-w-[56px] h-full flex flex-col justify-end rounded-lg overflow-hidden border transition-all duration-200 ${
                      isTarget
                        ? "border-primary ring-2 ring-primary/60 shadow-lg shadow-primary/20 scale-102"
                        : "border-border/80 hover:border-foreground/40 shadow-xs"
                    }`}
                  >
                    {/* Top Segment: RED (Exceeding Tolerance) */}
                    <div
                      style={{ height: `${redHeightPct}%` }}
                      className="w-full bg-gradient-to-t from-rose-600 to-rose-500 relative flex items-center justify-center transition-all duration-500 group-hover:brightness-110"
                      title={`${day.date}: ${day.exceedingCount} blocks exceeding ${thresholdPaisa}p (${day.exceedingPct}%)`}
                    >
                      {redHeightPct >= 10 && (
                        <div className="text-[9px] sm:text-[10px] font-bold text-white/95 font-mono flex flex-col items-center leading-none">
                          <span className="opacity-80 text-[8px] font-black">R</span>
                          <span>{day.exceedingCount}</span>
                        </div>
                      )}
                    </div>

                    {/* Divider Line */}
                    {redHeightPct > 0 && greenHeightPct > 0 && (
                      <div className="w-full h-0.5 bg-black/30" />
                    )}

                    {/* Bottom Segment: GREEN (Within Tolerance) */}
                    <div
                      style={{ height: `${greenHeightPct}%` }}
                      className="w-full bg-gradient-to-t from-emerald-600 to-emerald-500 relative flex items-center justify-center transition-all duration-500 group-hover:brightness-110"
                      title={`${day.date}: ${day.withinCount} blocks within ${thresholdPaisa}p (${day.withinPct}%)`}
                    >
                      {greenHeightPct >= 10 && (
                        <div className="text-[9px] sm:text-[10px] font-bold text-white font-mono flex flex-col items-center leading-none">
                          <span className="opacity-80 text-[8px] font-black">G</span>
                          <span>{day.withinCount}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Day & Date Label */}
                  <div className="mt-2 text-center select-none">
                    <span className="block text-[11px] font-bold text-foreground font-mono">
                      {day.dayLabel}
                    </span>
                    <span
                      className={`block text-[10px] uppercase font-bold tracking-tight ${
                        isTarget
                          ? "text-primary font-black"
                          : "text-muted-foreground font-medium"
                      }`}
                    >
                      {day.weekday}
                    </span>
                    {isTarget && (
                      <span className="inline-block mt-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 px-1 py-0.2 text-[8px] font-black uppercase tracking-wider">
                        Target
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive Hover Card (Appears dynamically below/in the chart) */}
        {hoveredDay && (
          <div className="mt-3 p-3 rounded-lg border border-primary/30 bg-card shadow-md flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in-50 duration-150">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary" />
              <span className="font-extrabold text-foreground">
                {activeMeta.shortName} · {hoveredDay.date} ({hoveredDay.weekday})
                {hoveredDay.isTargetDay ? " [Target Day]" : ""}:
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                ✓ Green (In Tolerance): {hoveredDay.withinCount} / {hoveredDay.clearedSlots} ({hoveredDay.withinPct}%) · {hoveredDay.withinEnergyMwh} MWh
              </span>
              <span className="text-rose-500 font-bold">
                ✗ Red (Exceeding): {hoveredDay.exceedingCount} Blocks ({hoveredDay.exceedingPct}%)
              </span>
              <span className="text-foreground">
                MAE: ₹{hoveredDay.avgAbsDeltaRs}/kWh ({hoveredDay.avgAbsDeltaPaisa}p) · ₹{hoveredDay.maeMwhRs}/MWh
              </span>
              <span className="text-blue-500 font-bold">
                WMAPE: {hoveredDay.wmape}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
