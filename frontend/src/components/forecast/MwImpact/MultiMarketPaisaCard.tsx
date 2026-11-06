import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Activity,
  Calendar,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Sliders,
  TrendingUp,
  Percent,
  Target,
  Zap,
  Info,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Share2,
} from "lucide-react";
import { format, subDays, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  MARKETS_CONFIG,
  MARKET_KEYS,
  calculateMarketPaisaStats,
  calculateSevenDayRollingTrend,
  generateFourMarketSummaryLines,
  fetchMarketForecastRows,
  fetchSevenDayMarketRows,
  type MarketKey,
  type MarketPaisaAnalysis,
  type SevenDayRollingTrend,
  UNITS_PER_MW_PER_BLOCK,
  BLOCKS_PER_DAY,
} from "./multiMarketPaisaCalculations";
import type { ForecastRow } from "../mockData";

export interface MultiMarketPaisaCardProps {
  selectedDate: string; // YYYY-MM-DD (e.g. 2026-10-19)
  selectedModel?: string; // e.g. "3"
  initialCapacityMw?: number; // e.g. 1.0
  onClose?: () => void;
}

const PAISA_PRESETS = [10, 15, 20, 25, 30, 50, 75, 100];

export const MultiMarketPaisaCard: React.FC<MultiMarketPaisaCardProps> = ({
  selectedDate,
  selectedModel = "3",
  initialCapacityMw = 1.0,
}) => {
  // Global Thresholds & Sizing
  const [thresholdPaisa, setThresholdPaisa] = useState<number>(20); // Default 20 Paise
  const [customPaisaInput, setCustomPaisaInput] = useState<string>("20");
  const [capacityMw, setCapacityMw] = useState<number>(initialCapacityMw || 1.0);
  const [customMwInput, setCustomMwInput] = useState<string>(String(initialCapacityMw || 1.0));

  // Per-Market Independent Date state (as drawn in user diagram):
  // DAM: Target Date (Same Day)
  // RTM: Yesterday (D-1) by default or Target Date
  // RTM(NC): Yesterday (D-1) by default or Target Date
  // GDAM: Target Date (Same Day)
  const [marketDates, setMarketDates] = useState<Record<MarketKey, string>>(() => {
    const target = selectedDate || format(new Date(), "yyyy-MM-dd");
    let yday = target;
    try {
      yday = format(subDays(parseISO(target), 1), "yyyy-MM-dd");
    } catch {
      yday = target;
    }
    return {
      DAM: target,
      RTM_DAYAHEAD: yday,
      RTM_NOWCAST: yday,
      GDAM: target,
    };
  });

  // Cached rows per market (target day)
  const [marketData, setMarketData] = useState<Record<MarketKey, ForecastRow[]>>({
    DAM: [],
    RTM_DAYAHEAD: [],
    RTM_NOWCAST: [],
    GDAM: [],
  });

  // Cached 7-day rolling rows per market
  const [sevenDayData, setSevenDayData] = useState<Record<MarketKey, ForecastRow[]>>({
    DAM: [],
    RTM_DAYAHEAD: [],
    RTM_NOWCAST: [],
    GDAM: [],
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sync dates when selectedDate prop changes
  useEffect(() => {
    if (selectedDate) {
      let yday = selectedDate;
      try {
        yday = format(subDays(parseISO(selectedDate), 1), "yyyy-MM-dd");
      } catch {}

      setMarketDates((prev) => ({
        ...prev,
        DAM: selectedDate,
        RTM_DAYAHEAD: prev.RTM_DAYAHEAD === yday ? yday : yday, // default to yesterday
        RTM_NOWCAST: prev.RTM_NOWCAST === yday ? yday : yday, // default to yesterday
        GDAM: selectedDate,
      }));
    }
  }, [selectedDate]);

  // Fetch all 4 markets data whenever dates or model change
  const fetchAllMarkets = async () => {
    setLoading(true);
    try {
      const promises = MARKET_KEYS.map(async (key) => {
        const d = marketDates[key];
        const [dayRows, sevenRows] = await Promise.all([
          fetchMarketForecastRows(key, d, selectedModel),
          fetchSevenDayMarketRows(key, d, selectedModel),
        ]);
        return { key, dayRows, sevenRows };
      });
      const results = await Promise.all(promises);
      const nextData: Record<MarketKey, ForecastRow[]> = {
        DAM: [],
        RTM_DAYAHEAD: [],
        RTM_NOWCAST: [],
        GDAM: [],
      };
      const nextSevenData: Record<MarketKey, ForecastRow[]> = {
        DAM: [],
        RTM_DAYAHEAD: [],
        RTM_NOWCAST: [],
        GDAM: [],
      };
      results.forEach((r) => {
        nextData[r.key] = r.dayRows;
        nextSevenData[r.key] = r.sevenRows;
      });
      setMarketData(nextData);
      setSevenDayData(nextSevenData);
    } catch (err) {
      console.error("[MultiMarketPaisaCard] Error fetching market data:", err);
      toast.error("Failed to load some market forecast datasets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllMarkets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketDates.DAM, marketDates.RTM_DAYAHEAD, marketDates.RTM_NOWCAST, marketDates.GDAM, selectedModel]);

  // Calculate statistics for all 4 markets
  const analyses = useMemo<Record<MarketKey, MarketPaisaAnalysis>>(() => {
    const res: Record<MarketKey, MarketPaisaAnalysis> = {} as any;
    MARKET_KEYS.forEach((key) => {
      res[key] = calculateMarketPaisaStats(
        marketData[key] || [],
        key,
        marketDates[key],
        capacityMw,
        thresholdPaisa
      );
    });
    return res;
  }, [marketData, marketDates, capacityMw, thresholdPaisa]);

  // Rolling 7-day trend for each of the 4 markets (embedded directly inside each market card)
  const sevenDayTrends = useMemo<Record<MarketKey, SevenDayRollingTrend>>(() => {
    const res: Record<MarketKey, SevenDayRollingTrend> = {} as any;
    MARKET_KEYS.forEach((key) => {
      res[key] = calculateSevenDayRollingTrend(
        sevenDayData[key] || [],
        marketDates[key],
        key,
        capacityMw,
        thresholdPaisa,
        selectedModel
      );
    });
    return res;
  }, [sevenDayData, marketDates, capacityMw, thresholdPaisa, selectedModel]);

  // Executive summary lines
  const summaryReport = useMemo(() => {
    return generateFourMarketSummaryLines(analyses);
  }, [analyses]);

  // Handlers for threshold & capacity
  const handlePresetPaisa = (val: number) => {
    setThresholdPaisa(val);
    setCustomPaisaInput(String(val));
  };

  const handleCustomPaisaChange = (valStr: string) => {
    setCustomPaisaInput(valStr);
    const num = parseFloat(valStr);
    if (!isNaN(num) && num > 0) {
      setThresholdPaisa(num);
    }
  };

  const handleCustomMwChange = (valStr: string) => {
    setCustomMwInput(valStr);
    const num = parseFloat(valStr);
    if (!isNaN(num) && num > 0) {
      setCapacityMw(num);
    }
  };

  const handleMarketDateChange = (key: MarketKey, newDate: string) => {
    setMarketDates((prev) => ({
      ...prev,
      [key]: newDate,
    }));
  };

  const handleSyncAllToDate = (target: string) => {
    setMarketDates({
      DAM: target,
      RTM_DAYAHEAD: target,
      RTM_NOWCAST: target,
      GDAM: target,
    });
    toast.success(`Synced all 4 markets to ${target}`);
  };

  const handleToggleRtmYesterday = (marketKey: "RTM_DAYAHEAD" | "RTM_NOWCAST" = "RTM_DAYAHEAD") => {
    const target = selectedDate || format(new Date(), "yyyy-MM-dd");
    let yday = target;
    try {
      yday = format(subDays(parseISO(target), 1), "yyyy-MM-dd");
    } catch {}

    const isCurrentlyYday = marketDates[marketKey] === yday;
    const nextDate = isCurrentlyYday ? target : yday;
    handleMarketDateChange(marketKey, nextDate);
    const label = marketKey === "RTM_NOWCAST" ? "RTM Nowcast" : "RTM Day-Ahead";
    toast.info(`${label} switched to ${isCurrentlyYday ? "Target Day (D)" : "Yesterday (D-1)"}: ${nextDate}`);
  };

  // Copy Summary text to Clipboard
  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryReport.fullSummaryText);
      setCopied(true);
      toast.success("Executive 4-Market Summary copied to clipboard!", {
        description: "You can now paste it directly into WhatsApp, Telegram, or Slack.",
      });
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      toast.error("Failed to copy summary to clipboard");
    }
  };

  const thresholdRs = thresholdPaisa / 100;
  const thresholdMwhRs = thresholdRs * 1000;

  return (
    <div
      ref={cardRef}
      className="rounded-2xl border-2 border-border/80 bg-card p-4 sm:p-6 shadow-xl transition-all space-y-6 text-foreground"
      id="four-market-paisa-summary-matrix"
    >
      {/* 1. Header Banner & Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/70 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <Sparkles className="size-4" />
            </span>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              4-Market Paisa Error Matrix & Executive Summary
            </h2>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
              Target: {selectedDate}
            </span>
            <span className="rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground font-mono">
              Model {selectedModel}
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Side-by-side compliance, MAE & volume impact across all 4 power markets.</span>
            <span className="hidden sm:inline text-muted-foreground/40">•</span>
            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
              <Zap className="size-3.5 text-amber-500" />
              1 MW Block = 250 kWh (0.25 MWh) · 96 Blocks = 24 MWh (24,000 kWh)
            </span>
          </p>
        </div>

        {/* Action Buttons: Copy / Refresh */}
        <div className="flex items-center gap-2 self-start lg:self-center">
          <button
            onClick={handleCopySummary}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-brand-gradient px-4 text-xs font-bold text-white shadow-brand hover:opacity-95 transition-all cursor-pointer active:scale-95"
            title="Copy WhatsApp/Slack summary text"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied to Clipboard!" : "Copy WhatsApp Summary"}
          </button>
          <button
            onClick={fetchAllMarkets}
            disabled={loading}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh all 4 markets data"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* 2. Top Controls: Custom Paisa Input, Presets, Capacity MW & Equivalent Indicator */}
      <div className="rounded-xl border border-border/70 bg-muted/20 p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Custom Paisa Input & Quick Presets */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Sliders className="size-4 text-primary" /> Error Threshold (Paisa):
            </span>

            {/* Direct Input */}
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="1"
                max="500"
                step="1"
                value={customPaisaInput}
                onChange={(e) => handleCustomPaisaChange(e.target.value)}
                className="h-8 w-20 rounded-lg border border-primary/50 bg-background px-2.5 text-center font-mono text-xs font-bold text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <span className="text-xs font-bold text-muted-foreground">Paise</span>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap items-center gap-1 bg-background rounded-lg border border-border/70 p-0.5 shadow-xs">
              {PAISA_PRESETS.map((p) => {
                const isActive = thresholdPaisa === p;
                return (
                  <button
                    key={p}
                    onClick={() => handlePresetPaisa(p)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-xs scale-102"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {p}p {p === 20 ? "(Default)" : ""}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Capacity MW Input */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">Portfolio Size:</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0.1"
                max="500"
                step="0.5"
                value={customMwInput}
                onChange={(e) => handleCustomMwChange(e.target.value)}
                className="h-8 w-18 rounded-lg border border-border/80 bg-background px-2 text-center font-mono text-xs font-bold text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-xs font-bold text-foreground">MW</span>
            </div>
            <div className="flex items-center gap-1 text-[11px]">
              {[1, 5, 10, 25].map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setCapacityMw(m);
                    setCustomMwInput(String(m));
                  }}
                  className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold cursor-pointer transition-colors ${
                    capacityMw === m
                      ? "border-primary bg-primary/10 text-primary font-bold"
                      : "border-border/70 bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {m}M
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Conversion Formula Callout (As shown in diary photo: 0.20 paisa -> kWh, ₹200 -> MW) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/50 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-300 font-bold">
              <span>{thresholdPaisa} Paisa / kWh</span>
              <ArrowRight className="size-3 text-emerald-500" />
              <span>₹{Math.round(thresholdMwhRs).toLocaleString()} / MWh</span>
              <span className="text-[10px] text-muted-foreground font-normal">(Equivalent Threshold)</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-blue-700 dark:text-blue-300 font-semibold">
              <Zap className="size-3 text-blue-500" />
              <span>1 Block = {capacityMw * UNITS_PER_MW_PER_BLOCK} kWh ({((capacityMw * UNITS_PER_MW_PER_BLOCK) / 1000).toFixed(2)} MWh)</span>
            </div>
          </div>

          {/* Quick Date Sync Action */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSyncAllToDate(selectedDate)}
              className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
            >
              Sync all markets to {selectedDate}
            </button>
          </div>
        </div>
      </div>

      {/* 3. The 4 Market Columns (Side-by-Side Grid as drawn in the notebook) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {MARKET_KEYS.map((key) => {
          const meta = MARKETS_CONFIG[key];
          const a = analyses[key];
          const isRtm = key === "RTM_DAYAHEAD" || key === "RTM_NOWCAST";
          const isTargetDate = a.date === selectedDate;

          return (
            <div
              key={key}
              className={`flex flex-col justify-between rounded-xl border-2 ${meta.borderClass} bg-background/80 p-4 shadow-sm transition-all relative overflow-hidden`}
            >
              {/* Top Accent Glow Bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: meta.colorHex }}
              />

              <div className="space-y-3 pt-1">
                {/* Column Header: Market Name & Date Selector */}
                <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2.5">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: meta.colorHex }}
                      />
                      <span className="font-extrabold text-sm sm:text-base tracking-tight text-foreground">
                        {meta.shortName}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block font-medium">
                      {meta.name}
                    </span>
                  </div>

                  {/* Date Tag Badge (Same Day / Yesterday) */}
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold tracking-tight border ${
                      isTargetDate
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400"
                    }`}
                  >
                    {isTargetDate ? "Same Day" : "Yesterday (D-1)"}
                  </span>
                </div>

                {/* Per-Market Custom Date Input (As drawn: "Date" in every column) */}
                <div className="flex items-center justify-between gap-1.5 bg-muted/30 rounded-lg p-1.5 border border-border/60 text-xs">
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Calendar className="size-3 text-primary" /> Date:
                  </span>
                  <input
                    type="date"
                    value={marketDates[key]}
                    onChange={(e) => handleMarketDateChange(key, e.target.value)}
                    className="h-7 rounded-md border border-border/80 bg-background px-2 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                  />
                  {isRtm && (
                    <button
                      onClick={() => handleToggleRtmYesterday(key as "RTM_DAYAHEAD" | "RTM_NOWCAST")}
                      title="Toggle between Yesterday (D-1) and Target Day (D)"
                      className="px-1.5 py-1 text-[10px] font-bold rounded border border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 cursor-pointer transition-colors"
                    >
                      D-1 / D
                    </button>
                  )}
                </div>

                {/* Metric 1: Total Blocks */}
                <div className="flex items-center justify-between py-1 text-xs border-b border-border/40">
                  <span className="text-muted-foreground font-medium">Total Blocks:</span>
                  <span className="font-bold text-foreground font-mono">
                    {a.slotsWithActual > 0 ? (
                      <>
                        <strong className="text-sm font-extrabold">{a.slotsWithActual}</strong>
                        <span className="text-muted-foreground text-[11px]"> / {a.totalSlots} Slots</span>
                      </>
                    ) : (
                      <span className="text-amber-500 font-semibold">Data Pending</span>
                    )}
                  </span>
                </div>

                {/* Metric 2: Blocks < Custom Paisa (The Primary Highlight from drawing: "Block < 20p") */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                      <ShieldCheck className="size-3.5 text-emerald-500" />
                      Block &lt; {thresholdPaisa}p
                    </span>
                    <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                      {a.withinCustomPct}%
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                      {a.withinCustomCount}
                      <span className="text-xs font-medium text-muted-foreground"> / {a.slotsWithActual}</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {a.withinEnergyMwh} MWh ({a.withinEnergyKwh.toLocaleString()} kWh)
                    </span>
                  </div>
                  {/* Progress visual bar */}
                  <div className="h-1.5 w-full rounded-full bg-emerald-500/20 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, a.withinCustomPct))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                    <span>Within ₹{thresholdRs.toFixed(2)}/kWh tolerance</span>
                    <span>Exceeding: <strong className="text-rose-500 font-bold">{a.exceedingCustomCount}</strong></span>
                  </div>
                </div>

                {/* Metric 3: MAE (Mean Absolute Error in kWh AND MWh) */}
                <div className="rounded-lg border border-border/70 bg-card p-2.5 space-y-1 shadow-2xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium flex items-center gap-1">
                      <Target className="size-3 text-rose-500" /> MAE (Mean Error):
                    </span>
                    <span className="font-extrabold text-foreground font-mono text-xs">
                      ₹{a.avgAbsDeltaRs} / kWh
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono border-t border-border/40 pt-1">
                    <span>In Paisa: <strong className="text-foreground">{a.avgAbsDeltaPaisa}p</strong></span>
                    <span className="text-primary font-bold">₹{a.maeMwhRs} / MWh</span>
                  </div>
                </div>

                {/* Metric 4: WMAPE % */}
                <div className="flex items-center justify-between rounded-lg border border-border/70 bg-card p-2.5 text-xs shadow-2xs">
                  <span className="text-muted-foreground font-medium flex items-center gap-1">
                    <Percent className="size-3 text-blue-500" /> WMAPE (%):
                  </span>
                  <span className={`font-black font-mono text-sm ${a.wmape < 5 ? "text-emerald-500" : a.wmape < 10 ? "text-amber-500" : "text-rose-500"}`}>
                    {a.wmape}%
                  </span>
                </div>

                {/* Metric 5: Energy & Financial Deviation (Dual kWh and MWh) */}
                <div className="rounded-lg border border-border/60 bg-muted/15 p-2 space-y-1 text-[11px]">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Total Energy:</span>
                    <span className="font-bold text-foreground font-mono">
                      {a.totalEnergyMwh} MWh ({a.totalEnergyKwh.toLocaleString()} kWh)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Abs Cost Deviation:</span>
                    <span className="font-bold text-foreground font-mono">
                      ₹{Math.round(a.totalAbsCostDeviationRs).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Net Financial Impact:</span>
                    <span className={`font-bold font-mono ${a.totalFinancialImpactRs >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                      {a.totalFinancialImpactRs >= 0 ? "+" : ""}₹{Math.round(a.totalFinancialImpactRs).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Metric 6: Mini 7-Day Rolling Trend (Embedded inside each market card) */}
                <div className="pt-2 border-t border-border/40 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1 uppercase tracking-wider text-[10px]">
                      <Activity className="size-3 text-primary" /> 7-Day Rolling
                    </span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                      Avg: {sevenDayTrends[key]?.overallAvgWithinPct}%
                    </span>
                  </div>

                  {/* 7 Slim Stacked Bars: Green bottom (< threshold), Red top (>= threshold) */}
                  <div className="h-28 flex items-end justify-between gap-1 px-1.5 py-1.5 rounded-lg bg-muted/20 border border-border/50">
                    {sevenDayTrends[key]?.days.map((d) => {
                      const greenPct = Math.min(100, Math.max(0, d.withinPct));
                      const redPct = Math.max(0, 100 - greenPct);

                      return (
                        <div
                          key={d.date}
                          className="flex-1 flex flex-col items-center justify-between h-full group cursor-pointer"
                          title={`${d.date} (${d.weekday}): ${d.withinCount}/96 within ${thresholdPaisa}p (${d.withinPct}%), ${d.exceedingCount} exceeding | MAE: ₹${d.avgAbsDeltaRs}/kWh`}
                        >
                          {/* Static x/96 label above bar */}
                          <span
                            className={`text-[8.5px] font-mono leading-none select-none text-center ${
                              d.isTargetDay
                                ? "font-bold text-primary"
                                : "text-muted-foreground group-hover:text-foreground"
                            }`}
                          >
                            {d.withinCount}
                            <span className="text-[7px] opacity-70">/96</span>
                          </span>

                          {/* Elongated Stacked Bar */}
                          <div
                            className={`w-full max-w-[14px] flex-1 my-1 flex flex-col justify-end rounded-xs overflow-hidden transition-all duration-150 group-hover:scale-105 ${
                              d.isTargetDay
                                ? "ring-1.5 ring-primary shadow-xs"
                                : "hover:ring-1 hover:ring-border"
                            }`}
                          >
                            {/* Red Portion (Top) */}
                            <div
                              style={{ height: `${redPct}%` }}
                              className="w-full bg-rose-500 hover:bg-rose-400 transition-all"
                            />
                            {/* Green Portion (Bottom) */}
                            <div
                              style={{ height: `${greenPct}%` }}
                              className="w-full bg-emerald-500 hover:bg-emerald-400 transition-all"
                            />
                          </div>

                          {/* Date Day Number below bar */}
                          <span
                            className={`text-[9px] font-mono leading-none select-none ${
                              d.isTargetDay
                                ? "font-black text-primary underline underline-offset-2"
                                : "text-muted-foreground group-hover:text-foreground"
                            }`}
                          >
                            {d.dayLabel.split(" ")[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom 7-Day Cumulative Week Summary (e.g. 519 / 672 Blocks within threshold) */}
              <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="size-3.5 text-emerald-500 shrink-0" />
                  <span>7-Day (&lt;{thresholdPaisa}p):</span>
                </span>
                <span className="font-mono text-foreground font-semibold flex items-center gap-1.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-black text-xs">
                    {sevenDayTrends[key]?.overallTotalWithinCount ?? 0}
                  </span>
                  <span className="text-muted-foreground text-[10px]">/ 672 blocks</span>
                  <span className="px-1.5 py-0.5 rounded font-black text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {sevenDayTrends[key]?.overallAvgWithinPct ?? 0}%
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Bottom Section: The 4 Executive Summary Lines (WhatsApp Ready) */}
      <div className="rounded-xl border-2 border-primary/25 bg-primary/5 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-primary/20 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-xs">
              4
            </span>
            <h3 className="font-extrabold text-sm sm:text-base text-foreground tracking-tight flex items-center gap-1.5">
              Executive Summary
            </h3>
          </div>
          <button
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer self-start sm:self-center"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied!" : "Copy Full Text"}
          </button>
        </div>

        {/* The 4 Human-Readable Lines */}
        <div className="space-y-2.5 text-xs sm:text-sm">
          {summaryReport.lines.map((item) => {
            const meta = MARKETS_CONFIG[item.marketKey];
            const a = analyses[item.marketKey];
            return (
              <div
                key={item.marketKey}
                className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-background/90 p-3 shadow-2xs hover:border-primary/40 transition-colors"
              >
                <span
                  className="mt-0.5 size-3 rounded-full shrink-0"
                  style={{ backgroundColor: meta.colorHex }}
                />
                <div className="flex-1 leading-relaxed">
                  <span className="font-black text-foreground mr-1.5">
                    {meta.shortName} [{a.date}]:
                  </span>
                  <span className="text-foreground/90">
                    Out of <strong className="font-extrabold text-foreground">{a.totalSlots} blocks</strong> ({a.slotsWithActual} cleared),{" "}
                    <strong className="font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      {a.withinCustomCount} blocks ({a.withinCustomPct}%)
                    </strong>{" "}
                    had price difference &lt; <strong className="font-bold text-foreground">{thresholdPaisa}p</strong> (₹{Math.round(thresholdMwhRs)}/MWh).
                    MAE: <strong className="font-bold text-foreground">₹{a.avgAbsDeltaRs}/kWh</strong> (₹{a.maeMwhRs}/MWh) · WMAPE: <strong className="font-bold text-foreground">{a.wmape}%</strong>.
                    Energy: <strong className="font-bold text-foreground">{a.withinEnergyMwh} MWh</strong> ({a.withinEnergyKwh.toLocaleString()} kWh) within tolerance out of {a.totalEnergyMwh} MWh total.
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Note with Formula & Attribution */}
        <div className="pt-2 border-t border-primary/15 flex flex-wrap items-center justify-between text-[11px] text-muted-foreground gap-2">
          <span className="flex items-center gap-1">
            <Info className="size-3 text-primary" />
            Formula: 1 Block (15 min) for 1 MW = 250 kWh · 96 Blocks = 24 MWh · 0.20 Rs/kWh = ₹200/MWh
          </span>
          <span className="font-semibold text-foreground/80">
            Prolt Operations · IEX Market Intelligence
          </span>
        </div>
      </div>
    </div>
  );
};
