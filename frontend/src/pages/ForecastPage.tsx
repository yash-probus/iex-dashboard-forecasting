import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { addDays, format, parseISO } from "date-fns";
import { Gauge, Percent, Target, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "../lib/utils";
import { DualKpiCard, KpiCard } from "../components/forecast/KpiCard";
import { BlockTolerancePanel } from "../components/forecast/BlockTolerancePanel";
import { ForecastChart } from "../components/forecast/ForecastChart";
import { ForecastTable } from "../components/forecast/ForecastTable";
import { ForecastHeader } from "../components/forecast/ForecastHeader";
import { ForecastFilterBar } from "../components/forecast/ForecastFilterBar";
import { Skeleton } from "../components/ui/skeleton";
import { useForecastData } from "../hooks/useForecastData";
import { useAvailableDates } from "../hooks/useAvailableDates";
import type { ForecastRow, Interval, Market } from "../components/forecast/mockData";
import { SevenDayReportModal } from "../components/forecast/SevenDayReport/SevenDayReportModal";
import { BidSimulatorModal } from "../components/forecast/BidSimulator/BidSimulatorModal";
import { BidSimulatorErrorBoundary } from "../components/forecast/BidSimulator/BidSimulatorErrorBoundary";
import { MwImpactModal } from "../components/forecast/MwImpact/MwImpactModal";
import { MwImpactErrorBoundary } from "../components/forecast/MwImpact/MwImpactErrorBoundary";
import "../components/forecast/forecast.css";

function exportCsv(rows: ForecastRow[], name: string) {
  const head = "Date,Hour,Time Block,Forecasted MCP,Actual MCP,Price Min,Price Max,Confidence";
  const body = rows.map((r) => [
    r.date,
    r.hour,
    r.timeBlock,
    r.forecastedMcp,
    r.actualMcp !== null && r.actualMcp !== undefined ? r.actualMcp : "N/A",
    r.priceMin,
    r.priceMax,
    r.confidence,
  ].join(","));
  const blob = new Blob([[head, ...body].join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ForecastPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  // Sync market with URL route
  const getInitialMarket = (): Market => {
    if (path.includes("/rtm")) return "RTM";
    if (path.includes("/dam")) return "DAM";
    return "GDAM";
  };

  const getInitialRtmType = (): "dayahead" | "nowcast" => {
    if (path.includes("nowcast")) return "nowcast";
    return "dayahead";
  };

  const getInitialModel = (): string => {
    if (path.includes("/rtm")) return "4";
    return "3";
  };

  const [market, setMarket] = useState<Market>(getInitialMarket);
  const [rtmType, setRtmType] = useState<"dayahead" | "nowcast">(getInitialRtmType);
  const { dates, latestDate, maxDate, minDate } = useAvailableDates(market);

  const getInitialDate = () => {
    try {
      return format(new Date(), "yyyy-MM-dd");
    } catch {
      return "2026-10-12";
    }
  };

  const [date, setDate] = useState(getInitialDate);
  const [model, setModel] = useState<string>(getInitialModel);
  const [interval, setInterval] = useState<Interval>("15m");
  const [nonce, setNonce] = useState(0);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [updated, setUpdated] = useState("13:10:18 IST");
  const [scrolled, setScrolled] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isBidSimulatorOpen, setIsBidSimulatorOpen] = useState(false);
  const [isMwImpactOpen, setIsMwImpactOpen] = useState(false);

  const exportRef = useRef<() => void>(() => {});
  const { rows, kpis, loading } = useForecastData(date, model, interval, nonce, market, rtmType);

  // Sync date when availableDates load
  useEffect(() => {
    if (dates.length > 0) {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      if (dates.includes(todayStr) && date !== todayStr) {
        setDate(todayStr);
      } else if (!dates.includes(date) && latestDate) {
        setDate(latestDate);
      }
    }
  }, [dates, latestDate]);

  // Sync market and rtmType when URL pathname changes
  useEffect(() => {
    if (path.includes("/rtm")) {
      if (market !== "RTM") {
        setMarket("RTM");
        setModel("4");
      }
      const nextType = path.includes("nowcast") ? "nowcast" : "dayahead";
      if (rtmType !== nextType) setRtmType(nextType);
    } else if (path.includes("/dam") && market !== "DAM") {
      setMarket("DAM");
      if (model === "4") setModel("3");
    } else if (path.includes("/gdam") && market !== "GDAM") {
      setMarket("GDAM");
      if (model === "4") setModel("3");
    }
  }, [path, market, model, rtmType]);

  const handleRtmTypeChange = (newType: "dayahead" | "nowcast") => {
    setRtmType(newType);
    navigate(`/forecast/price/rtm/${newType}`);
  };

  useEffect(() => {
    if (rows) setUpdated(format(new Date(), "HH:mm:ss 'IST'"));
  }, [rows]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 120);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Keyboard shortcuts: ←/→ change date, E exports. Ignored while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || t.closest("input, textarea, [role=listbox], [role=dialog]")) return;
      if (e.key === "ArrowLeft") {
        try {
          setDate((d) => format(addDays(parseISO(d), -1), "yyyy-MM-dd"));
        } catch {}
      } else if (e.key === "ArrowRight") {
        try {
          setDate((d) => format(addDays(parseISO(d), 1), "yyyy-MM-dd"));
        } catch {}
      } else if (e.key.toLowerCase() === "e") {
        exportRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isToday = (() => {
    try {
      return date === format(new Date(), "yyyy-MM-dd");
    } catch {
      return false;
    }
  })();

  const spark = (k: keyof ForecastRow) => {
    const raw = (rows ?? []).filter((_, i) => i % 4 === 0).map((r) => r[k]);
    const hasValues = raw.some((v) => v !== null && v !== undefined && !isNaN(Number(v)));
    return hasValues ? raw.map((v) => (v !== null && v !== undefined ? Number(v) : 0)) : undefined;
  };
  const errSpark = (() => {
    const hasActuals = (rows ?? []).some((r) => r.actualMcp !== null && r.actualMcp !== undefined && !isNaN(r.actualMcp));
    if (!hasActuals) return undefined;
    return (rows ?? []).filter((_, i) => i % 4 === 0).map((r) => (r.actualMcp !== null && r.actualMcp !== undefined ? Math.abs(r.forecastedMcp - r.actualMcp) : 0));
  })();
  const doExport = () => rows && exportCsv(rows, `${market}-forecast-${date}-m${model}-${interval}`);
  exportRef.current = doExport;

  return (
    <div className="forecast-scope min-h-screen w-full pb-12 transition-colors duration-200">
      <ForecastHeader
        market={market}
        lastUpdated={updated}
        onExport={doExport}
        onRecalculate={() => setNonce((n) => n + 1)}
        recalculating={loading}
        onOpenSevenDayReport={() => setIsReportOpen(true)}
        onOpenBidSimulator={() => setIsBidSimulatorOpen(true)}
        onOpenMwImpact={() => setIsMwImpactOpen(true)}
      />

      <ForecastFilterBar
        date={date}
        onDate={setDate}
        model={model}
        onModel={setModel}
        interval={interval}
        onInterval={setInterval}
        scrolled={scrolled}
        availableDates={dates}
        maxDate={maxDate}
        minDate={minDate}
        market={market}
      />

      {/* Bento KPI grid: two wide price cards, three compact quality cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-12">
        {loading || !kpis ? (
          [6, 6, 4, 4, 4].map((s, i) => (
            <Skeleton
              key={i}
              className={
                s === 6
                  ? "h-[176px] rounded-2xl sm:col-span-2 xl:col-span-6 bg-card"
                  : "h-[176px] rounded-2xl xl:col-span-4 bg-card"
              }
            />
          ))
        ) : (
          <>
            <DualKpiCard
              className="sm:col-span-2 xl:col-span-6"
              label="Average MCP"
              icon={TrendingUp}
              tint="violet"
              forecast={kpis.avgF}
              actual={kpis.avgA}
              spark={spark("forecastedMcp")}
              delay={0}
            />
            <DualKpiCard
              className="sm:col-span-2 xl:col-span-6"
              label="Minimum MCP"
              icon={TrendingDown}
              tint="teal"
              forecast={kpis.minF}
              actual={kpis.minA}
              spark={spark("actualMcp")}
              delay={60}
            />
            <KpiCard
              className="xl:col-span-4"
              label="MAE"
              icon={Target}
              tint="rose"
              value={kpis.mae}
              prefix="₹"
              hint="Mean absolute error"
              spark={errSpark}
              delay={120}
            />
            <KpiCard
              className="xl:col-span-4"
              label="WMAPE"
              icon={Percent}
              tint="blue"
              value={kpis.wmape}
              suffix="%"
              hint="Weighted MAPE"
              spark={errSpark}
              delay={180}
            />
            <KpiCard
              className="sm:col-span-2 xl:col-span-4"
              label="Confidence"
              icon={Gauge}
              tint="amber"
              value={kpis.confidence}
              ring
              hint="Model certainty score"
              delay={240}
            />
          </>
        )}
      </div>

      {!loading && rows && rows.length === 0 ? (
        <div className="mb-6 rounded-2xl border bg-card p-10 text-center shadow-sm">
          <h3 className="text-base font-semibold text-foreground">No Forecast Records in Database</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            No price forecast records were found for {date} in {market}.
            Please select an available date from the calendar.
          </p>
        </div>
      ) : (
        <>
          {/* Block Error Tolerance & Bidding Window (Wide Dropdown Panel) */}
          {loading || !rows ? (
            <Skeleton className="mb-6 h-[64px] rounded-2xl bg-card" />
          ) : (
            <BlockTolerancePanel rows={rows} defaultTolerance={10} />
          )}

          {/* RTM Forecast Subtype Selector (Dayahead Only vs Nowcast Only) */}
          {market === "RTM" && (
            <div className="mb-4 flex items-center justify-center gap-6 py-2">
              <label 
                onClick={() => handleRtmTypeChange("dayahead")}
                className="flex items-center gap-2 cursor-pointer text-sm font-medium text-foreground select-none"
              >
                <input
                  type="radio"
                  name="rtmForecastType"
                  checked={rtmType === "dayahead"}
                  onChange={() => handleRtmTypeChange("dayahead")}
                  className="size-4 text-primary accent-primary cursor-pointer"
                />
                <span className={cn(rtmType === "dayahead" ? "font-bold text-primary" : "text-muted-foreground")}>
                  Dayahead Only
                </span>
              </label>

              <label 
                onClick={() => handleRtmTypeChange("nowcast")}
                className="flex items-center gap-2 cursor-pointer text-sm font-medium text-foreground select-none"
              >
                <input
                  type="radio"
                  name="rtmForecastType"
                  checked={rtmType === "nowcast"}
                  onChange={() => handleRtmTypeChange("nowcast")}
                  className="size-4 text-primary accent-primary cursor-pointer"
                />
                <span className={cn(rtmType === "nowcast" ? "font-bold text-primary" : "text-muted-foreground")}>
                  Nowcast Only
                </span>
              </label>
            </div>
          )}

          <div className="space-y-6">
            {loading || !rows ? (
              <>
                <Skeleton className="h-[520px] rounded-2xl bg-card" />
                <Skeleton className="h-[400px] rounded-2xl bg-card" />
              </>
            ) : (
              <>
                <ForecastChart
                  rows={rows}
                  date={date}
                  market={market === "RTM" ? `RTM (${rtmType === "nowcast" ? "Nowcast" : "Day Ahead"})` : market}
                  highlight={highlight}
                  isToday={isToday}
                />
                <ForecastTable
                  rows={rows}
                  market={market === "RTM" ? `RTM (${rtmType === "nowcast" ? "Nowcast" : "Day Ahead"})` : market}
                  highlight={highlight}
                  onHighlight={setHighlight}
                  onExport={doExport}
                />
              </>
            )}
          </div>
        </>
      )}

      {/* 7-Day Model Performance Report Modal */}
      <SevenDayReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        selectedDate={date}
        selectedModel={model}
        market={market}
        rtmType={rtmType}
      />

      {/* Bid Simulator Modal */}
      <BidSimulatorErrorBoundary>
        <BidSimulatorModal
          isOpen={isBidSimulatorOpen}
          onClose={() => setIsBidSimulatorOpen(false)}
          selectedDate={date}
          selectedModel={model}
          market={market}
          dayRows={rows}
        />
      </BidSimulatorErrorBoundary>

      {/* MW Price Difference & Impact Modal */}
      <MwImpactErrorBoundary>
        <MwImpactModal
          isOpen={isMwImpactOpen}
          onClose={() => setIsMwImpactOpen(false)}
          selectedDate={date}
          selectedModel={model}
          market={market}
          rtmType={rtmType}
          dayRows={rows}
        />
      </MwImpactErrorBoundary>
    </div>
  );
}
