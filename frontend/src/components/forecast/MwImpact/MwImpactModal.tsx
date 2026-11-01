import React, { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Download,
  Search,
  ArrowUp,
  ArrowDown,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  Layers,
  Sparkles,
  CalendarRange,
  RefreshCw,
  Clock,
  TrendingDown,
  TrendingUp,
  Activity,
  Sun,
  RotateCcw,
} from "lucide-react";
import { format, subDays, addDays, parseISO, differenceInDays } from "date-fns";
import { toast } from "sonner";
import { apiClient } from "@/api/client";
import { generateForecast, type ForecastRow } from "../mockData";
import {
  calculateMwImpactBlocks,
  summarizeMwImpact,
  type MwImpactBlock,
  type MetricMode,
  UNITS_PER_MW_PER_BLOCK,
  UNITS_PER_MW_PER_DAY,
  isBlockInTimeWindow,
  filterRowsByTimeWindow,
} from "./mwImpactCalculations";
import { MultiMarketPaisaCard } from "./MultiMarketPaisaCard";

export interface MwImpactModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD
  selectedModel: string; // e.g. "3"
  market: string; // e.g. "GDAM"
  rtmType?: "dayahead" | "nowcast";
  dayRows: ForecastRow[] | null;
}

type ViewDateMode = "single" | "moving_7day" | "range";
type FilterTab = "all" | "compliant" | "exceeding";
type SortField =
  | "date"
  | "timeBlock"
  | "forecastedMcp"
  | "actualMcp"
  | "priceDelta"
  | "errorPercent"
  | "costImpactRs"
  | "absCostDeviationRs";

const MW_PRESETS = [1, 2, 5, 10, 25];
const PAISA_PRESETS = [
  { label: "20p (₹0.20)", value: 0.20 },
  { label: "25p (₹0.25)", value: 0.25 },
  { label: "50p (₹0.50)", value: 0.50 },
  { label: "75p (₹0.75)", value: 0.75 },
  { label: "₹1.00", value: 1.00 },
  { label: "₹1.50", value: 1.50 },
];
const PERCENT_PRESETS = [3, 5, 10, 15];

export const MwImpactModal: React.FC<MwImpactModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  selectedModel,
  market,
  rtmType = "dayahead",
  dayRows,
}) => {
  // View switch: 4-Market Paisa Matrix (photo view) vs Single Market Deep Dive
  const [modalView, setModalView] = useState<"four_market" | "single_market">("four_market");

  // Capacity state
  const [capacityMw, setCapacityMw] = useState<number>(1.0);
  const [customMwInput, setCustomMwInput] = useState<string>("1");

  // Date Range state
  const [dateMode, setDateMode] = useState<ViewDateMode>("single");
  const [startDate, setStartDate] = useState<string>(() => {
    try {
      return format(subDays(parseISO(selectedDate || "2026-10-15"), 6), "yyyy-MM-dd");
    } catch {
      return "2026-10-09";
    }
  });
  const [endDate, setEndDate] = useState<string>(selectedDate || "2026-10-15");
  const [rangeRows, setRangeRows] = useState<ForecastRow[] | null>(null);
  const [isFetchingRange, setIsFetchingRange] = useState<boolean>(false);
  const [rangeFetchError, setRangeFetchError] = useState<string | null>(null);

  // Threshold & Metric Mode state (50 paise default as requested by Sir!)
  const [metricMode, setMetricMode] = useState<MetricMode>("price_delta");
  const [priceThresholdRs, setPriceThresholdRs] = useState<number>(0.50); // 50 paise
  const [customPriceThresholdInput, setCustomPriceThresholdInput] = useState<string>("0.50");
  const [errorPercentThreshold, setErrorPercentThreshold] = useState<number>(5.0); // 5%

  // Time Slot / Trading Hours Filter state (Solar Hours 07:00 - 19:00, etc.)
  type TimePreset = "all" | "solar" | "solar_core" | "evening_peak" | "custom";
  const [timePreset, setTimePreset] = useState<TimePreset>("all");
  const [startTime, setStartTime] = useState<string>("00:00");
  const [endTime, setEndTime] = useState<string>("24:00");

  // View & Filter states
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("timeBlock");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [hoveredBlock, setHoveredBlock] = useState<MwImpactBlock | null>(null);
  const [showDayBreakdown, setShowDayBreakdown] = useState<boolean>(true);

  // Active request ref to avoid race conditions
  const activeReqRef = useRef<number>(0);

  // Sync date when prop changes
  useEffect(() => {
    if (selectedDate) {
      setEndDate(selectedDate);
      try {
        setStartDate(format(subDays(parseISO(selectedDate), 6), "yyyy-MM-dd"));
      } catch {}
    }
  }, [selectedDate]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Fetch custom date range from API
  const fetchDateRange = async (start: string, end: string) => {
    if (!start || !end) return;
    if (start > end) {
      toast.error("Start Date cannot be after End Date.");
      return;
    }

    const reqId = ++activeReqRef.current;
    setIsFetchingRange(true);
    setRangeFetchError(null);

    try {
      const rtmParam = market.toLowerCase() === "rtm" ? `&rtmType=${rtmType}` : "";
      const res = await apiClient.get(
        `/forecast/price?market=${market.toLowerCase()}&startDate=${start}&endDate=${end}&interval=15min&model=Model${selectedModel}${rtmParam}`
      );

      if (reqId !== activeReqRef.current) return;

      if (res.data?.success && Array.isArray(res.data.data?.intervals)) {
        const intervals = res.data.data.intervals;
        const mapped: ForecastRow[] = intervals.map((row: any, idx: number) => {
          let mcpVal: number = 0;
          if (row.mcp !== null && row.mcp !== undefined && !isNaN(Number(row.mcp))) {
            mcpVal = Number(row.mcp);
          } else if (market.toUpperCase() === "RTM") {
            if (rtmType === "nowcast") {
              mcpVal = (row.mcpNowcast !== null && row.mcpNowcast !== undefined && !isNaN(Number(row.mcpNowcast)))
                ? Number(row.mcpNowcast)
                : 0;
            } else {
              mcpVal = (row.mcpDayahead !== null && row.mcpDayahead !== undefined && !isNaN(Number(row.mcpDayahead)))
                ? Number(row.mcpDayahead)
                : 0;
            }
          } else if (row.mcpDayahead !== null && row.mcpDayahead !== undefined && !isNaN(Number(row.mcpDayahead))) {
            mcpVal = Number(row.mcpDayahead);
          } else if (row.mcpNowcast !== null && row.mcpNowcast !== undefined && !isNaN(Number(row.mcpNowcast))) {
            mcpVal = Number(row.mcpNowcast);
          }

          let actVal: number | null = null;
          if (row.actualMcp !== null && row.actualMcp !== undefined && row.actualMcp !== "" && !isNaN(Number(row.actualMcp))) {
            actVal = Number(row.actualMcp);
          }

          let tb = row.timeBlock || "";
          if (tb.includes("-") && !tb.includes(" - ")) {
            const [s, e] = tb.split("-");
            tb = `${s.trim()} - ${e.trim()}`;
          } else if (!tb) {
            const sH = String(Math.floor((idx * 15) / 60)).padStart(2, "0");
            const sM = String((idx * 15) % 60).padStart(2, "0");
            const eH = String(Math.floor(((idx + 1) * 15) / 60)).padStart(2, "0");
            const eM = String(((idx + 1) * 15) % 60).padStart(2, "0");
            tb = `${sH}:${sM} - ${eH}:${eM}`;
          }

          return {
            date: row.date || end,
            hour: String(row.hour || String(Math.floor(idx / 4) + 1).padStart(2, "0")),
            timeBlock: tb,
            forecastedMcp: +mcpVal.toFixed(2),
            actualMcp: actVal !== null ? +actVal.toFixed(2) : null,
            priceMin: 0,
            priceMax: 10,
            confidence: Number(row.confidence) || 80,
          };
        });

        if (mapped.length > 0) {
          setRangeRows(mapped);
        } else {
          setRangeRows(getFallbackRangeRows(start, end));
        }
      } else {
        setRangeRows(getFallbackRangeRows(start, end));
      }
    } catch (err: any) {
      if (reqId === activeReqRef.current) {
        console.error("[MwImpactModal] Date range fetch error, using fallback data:", err);
        setRangeRows(getFallbackRangeRows(start, end));
      }
    } finally {
      if (reqId === activeReqRef.current) {
        setIsFetchingRange(false);
      }
    }
  };

  // Fallback row generator helper for range mode
  const getFallbackRangeRows = (start: string, end: string): ForecastRow[] => {
    const list: ForecastRow[] = [];
    try {
      let curr = parseISO(start);
      const endD = parseISO(end);
      while (curr <= endD) {
        const dStr = format(curr, "yyyy-MM-dd");
        list.push(...generateForecast(dStr, selectedModel));
        curr = addDays(curr, 1);
      }
    } catch (e) {
      console.warn("[MwImpactModal] Fallback range generation error:", e);
    }
    return list;
  };

  // 7-Day Moving Average selector helper: calculates the rolling 7-day window ending on selectedDate
  const handleSelect7DayMovingAverage = () => {
    setDateMode("moving_7day");
    const end = selectedDate || format(new Date(), "yyyy-MM-dd");
    let start = end;
    try {
      start = format(subDays(parseISO(end), 6), "yyyy-MM-dd");
    } catch {
      start = "2026-10-10";
    }
    setStartDate(start);
    setEndDate(end);
    fetchDateRange(start, end);
  };

  // Trigger fetch when switching to range or moving_7day mode
  useEffect(() => {
    if (isOpen && (dateMode === "range" || dateMode === "moving_7day")) {
      if (dateMode === "moving_7day") {
        const end = selectedDate || format(new Date(), "yyyy-MM-dd");
        const start = format(subDays(parseISO(end), 6), "yyyy-MM-dd");
        setStartDate(start);
        setEndDate(end);
        fetchDateRange(start, end);
      } else if (!rangeRows && !isFetchingRange) {
        fetchDateRange(startDate, endDate);
      }
    }
  }, [isOpen, dateMode, selectedDate]);

  // Is time filter active (not full 24h)
  const isTimeFilterActive = useMemo(() => {
    return (
      timePreset !== "all" ||
      startTime !== "00:00" ||
      (endTime !== "24:00" && endTime !== "23:59")
    );
  }, [timePreset, startTime, endTime]);

  // Number of slots in a single 96-slot day that match the current time filter
  const filteredDailySlotsCount = useMemo(() => {
    if (!isTimeFilterActive) return 96;
    let count = 0;
    for (let b = 0; b < 96; b++) {
      const sH = String(Math.floor((b * 15) / 60)).padStart(2, "0");
      const sM = String((b * 15) % 60).padStart(2, "0");
      const eH = String(Math.floor(((b + 1) * 15) / 60)).padStart(2, "0");
      const eM = String(((b + 1) * 15) % 60).padStart(2, "0");
      const tb = `${sH}:${sM} - ${eH}:${eM}`;
      if (isBlockInTimeWindow(tb, startTime, endTime)) {
        count++;
      }
    }
    return count || 1;
  }, [isTimeFilterActive, startTime, endTime]);

  // Time preset selector helper
  const handleSelectTimePreset = (preset: TimePreset) => {
    setTimePreset(preset);
    if (preset === "all") {
      setStartTime("00:00");
      setEndTime("24:00");
    } else if (preset === "solar") {
      setStartTime("07:00");
      setEndTime("19:00");
    } else if (preset === "solar_core") {
      setStartTime("09:00");
      setEndTime("17:00");
    } else if (preset === "evening_peak") {
      setStartTime("17:00");
      setEndTime("23:00");
    }
  };

  const handleCustomTimeChange = (newStart: string, newEnd: string) => {
    setStartTime(newStart);
    setEndTime(newEnd);
    if (newStart === "00:00" && (newEnd === "24:00" || newEnd === "23:59")) {
      setTimePreset("all");
    } else if (newStart === "07:00" && newEnd === "19:00") {
      setTimePreset("solar");
    } else if (newStart === "09:00" && newEnd === "17:00") {
      setTimePreset("solar_core");
    } else if (newStart === "17:00" && newEnd === "23:00") {
      setTimePreset("evening_peak");
    } else {
      setTimePreset("custom");
    }
  };

  // Determine active dataset rows
  const activeRows = useMemo(() => {
    let raw: ForecastRow[] = [];
    if (dateMode === "range" || dateMode === "moving_7day") {
      if (rangeRows && rangeRows.length > 0) raw = rangeRows;
      else raw = getFallbackRangeRows(startDate, endDate);
    } else if (dayRows && dayRows.length > 0) {
      raw = dayRows;
    } else {
      raw = generateForecast(selectedDate || format(new Date(), "yyyy-MM-dd"), selectedModel);
    }

    if (isTimeFilterActive) {
      return filterRowsByTimeWindow(raw, startTime, endTime);
    }
    return raw;
  }, [
    dateMode,
    rangeRows,
    dayRows,
    selectedDate,
    selectedModel,
    startDate,
    endDate,
    isTimeFilterActive,
    startTime,
    endTime,
  ]);

  // Calculated blocks based on chosen thresholds and capacity
  const blocks = useMemo(() => {
    return calculateMwImpactBlocks(
      activeRows,
      capacityMw,
      priceThresholdRs,
      metricMode,
      errorPercentThreshold
    );
  }, [activeRows, capacityMw, priceThresholdRs, metricMode, errorPercentThreshold]);

  // Calculated executive summary
  const summary = useMemo(() => {
    return summarizeMwImpact(
      blocks,
      capacityMw,
      priceThresholdRs,
      metricMode,
      errorPercentThreshold
    );
  }, [blocks, capacityMw, priceThresholdRs, metricMode, errorPercentThreshold]);

  // Handlers for quick presets
  const handlePresetMw = (val: number) => {
    setCapacityMw(val);
    setCustomMwInput(String(val));
  };

  const handleCustomMwChange = (valStr: string) => {
    setCustomMwInput(valStr);
    const num = parseFloat(valStr);
    if (!isNaN(num) && num > 0) {
      setCapacityMw(num);
    }
  };

  const handlePresetPaisa = (val: number) => {
    setPriceThresholdRs(val);
    setCustomPriceThresholdInput(val.toFixed(2));
  };

  const handleCustomPriceThresholdChange = (valStr: string) => {
    setCustomPriceThresholdInput(valStr);
    const num = parseFloat(valStr);
    if (!isNaN(num) && num >= 0) {
      setPriceThresholdRs(num);
    }
  };

  const handleQuickRange = (days: number) => {
    const end = endDate || selectedDate || format(new Date(), "yyyy-MM-dd");
    try {
      const start = format(subDays(parseISO(end), days - 1), "yyyy-MM-dd");
      setStartDate(start);
      fetchDateRange(start, end);
    } catch {}
  };

  // Filter & sort
  const filteredBlocks = useMemo(() => {
    return blocks.filter((b) => {
      if (activeTab === "compliant" && b.isCompliant !== true) return false;
      if (activeTab === "exceeding" && b.isCompliant !== false) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          b.timeBlock.toLowerCase().includes(q) ||
          b.hour.toLowerCase().includes(q) ||
          (b.date && b.date.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [blocks, activeTab, search]);

  const sortedBlocks = useMemo(() => {
    return [...filteredBlocks].sort((a, b) => {
      let va: any = a[sortField];
      let vb: any = b[sortField];

      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;

      if (sortField === "date" || sortField === "timeBlock") {
        return sortDir === "asc"
          ? String(va).localeCompare(String(vb))
          : String(vb).localeCompare(String(va));
      }

      return sortDir === "asc" ? Number(va) - Number(vb) : Number(vb) - Number(va);
    });
  }, [filteredBlocks, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  // CSV Export (Multi-day or Single day)
  const handleExportCsv = () => {
    const headers = [
      "Date",
      "Time Block",
      "Hour",
      "Forecast MCP (Rs/kWh)",
      "Actual MCP (Rs/kWh)",
      "Price Delta (Rs/kWh)",
      "Abs Delta (Rs/kWh)",
      "Error (%)",
      "Compliance Status",
      `Capacity (MW)`,
      "Energy (kWh)",
      "Cost Impact (Rs)",
      "Abs Cost Deviation (Rs)",
    ];

    const thresholdLabel =
      metricMode === "price_delta"
        ? `≤ ₹${priceThresholdRs.toFixed(2)} (${Math.round(priceThresholdRs * 100)}p)`
        : `< ${errorPercentThreshold}%`;

    const csvRows = sortedBlocks.map((b) => [
      b.date || selectedDate,
      b.timeBlock,
      b.hour,
      b.forecastedMcp.toFixed(2),
      b.actualMcp !== null ? b.actualMcp.toFixed(2) : "Pending",
      b.priceDelta !== null ? b.priceDelta.toFixed(2) : "Pending",
      b.absPriceDelta !== null ? b.absPriceDelta.toFixed(2) : "Pending",
      b.errorPercent !== null ? `${b.errorPercent.toFixed(2)}%` : "Pending",
      b.isCompliant === true
        ? `Compliant (${thresholdLabel})`
        : b.isCompliant === false
        ? `Exceeding (${thresholdLabel})`
        : "No Actual",
      capacityMw,
      b.blockKwh,
      b.costImpactRs !== null ? b.costImpactRs.toFixed(2) : "Pending",
      b.absCostDeviationRs !== null ? b.absCostDeviationRs.toFixed(2) : "Pending",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateTag = dateMode === "range" ? `${startDate}_to_${endDate}` : selectedDate;
    const timeTag = isTimeFilterActive ? `_${startTime.replace(":", "")}-${endTime.replace(":", "")}` : "";
    const rtmSuffix = market.toUpperCase() === "RTM" ? `_${rtmType}` : "";
    link.setAttribute(
      "download",
      `${market}${rtmSuffix}_MW_Price_Diff_${capacityMw}MW${timeTag}_${dateTag}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export downloaded successfully!");
  };

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  const thresholdDisplay =
    metricMode === "price_delta"
      ? `≤ ₹${priceThresholdRs.toFixed(2)} (${Math.round(priceThresholdRs * 100)} Paisa)`
      : `< ${errorPercentThreshold}% Error`;

  const totalDaysCount =
    dateMode === "range"
      ? Math.max(1, differenceInDays(parseISO(endDate), parseISO(startDate)) + 1)
      : 1;

  const marketBadgeText = market.toUpperCase() === "RTM" 
    ? `RTM (${rtmType === "nowcast" ? "Nowcast" : "Day Ahead"})` 
    : market;

  return createPortal(
    <div id="mw-impact-modal-portal" className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/85 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 flex h-[90vh] max-h-[920px] w-full max-w-7xl flex-col rounded-3xl border border-border/80 bg-background/95 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200 overflow-hidden text-foreground my-auto">
        {/* Header */}
        <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <Zap className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                  MW Price Difference & Error Impact Analyzer
                </h2>
                <span className="rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {marketBadgeText}
                </span>
                <span className="rounded-md border border-border/80 bg-background px-2 py-0.5 text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                  <Calendar className="size-3" />
                  {dateMode === "moving_7day"
                    ? `7-Day Moving Window (${startDate} → ${endDate})`
                    : dateMode === "range"
                    ? `${startDate} → ${endDate} (${totalDaysCount} Days)`
                    : selectedDate}
                </span>
                {isTimeFilterActive && (
                  <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-mono text-amber-600 dark:text-amber-400 flex items-center gap-1 font-semibold">
                    <Clock className="size-3" />
                    {startTime} → {endTime} ({filteredDailySlotsCount} slots/day)
                  </span>
                )}
                <span className="rounded-md border border-border/80 bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                  Model {selectedModel}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                MWh volume conversion (<strong className="text-foreground">{capacityMw} MW</strong> = 250 kWh/slot · 24,000 kWh/day), customizable date range & Paisa/Rupee error filter.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={handleExportCsv}
              title="Export complete report as CSV"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/80 bg-background px-3 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer shadow-xs"
            >
              <Download className="size-3.5" /> Export Report (CSV)
            </button>
            <button
              onClick={onClose}
              title="Close modal (Esc)"
              className="flex size-8 items-center justify-center rounded-lg border border-border/70 bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Sub-header Navigation Tabs: 4-Market Paisa Matrix vs Single Market Deep Dive */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-muted/20 px-5 py-2.5 shrink-0">
          <div className="flex items-center gap-1.5 bg-background rounded-xl border border-border/80 p-1 shadow-xs">
            <button
              onClick={() => setModalView("four_market")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                modalView === "four_market"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Sparkles className="size-3.5" />
              4-Market Paisa Summary Matrix (Photo View)
            </button>
            <button
              onClick={() => setModalView("single_market")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                modalView === "single_market"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Layers className="size-3.5" />
              Single Market Detailed Analysis ({marketBadgeText})
            </button>
          </div>

          <span className="text-[11px] text-muted-foreground hidden sm:inline font-medium">
            {modalView === "four_market"
              ? "📸 Ready for Group Screenshot · DAM, RTM, RTM-NC, GDAM"
              : `📊 Detailed 96 slots, solar filters & export for ${marketBadgeText}`}
          </span>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {modalView === "four_market" ? (
            <MultiMarketPaisaCard
              selectedDate={selectedDate}
              selectedModel={selectedModel}
              initialCapacityMw={capacityMw}
            />
          ) : (
            <>
              {/* Top Control Panel: Date Mode & Date Range Selector */}
          <div className="rounded-xl border border-border/70 bg-muted/15 p-3.5 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Date Mode Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <CalendarRange className="size-4 text-primary" /> Date Mode:
                </span>
                <div className="flex items-center gap-1 bg-background rounded-lg border border-border/70 p-0.5 shadow-xs">
                  <button
                    onClick={() => setDateMode("single")}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      dateMode === "single"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    Single Day ({selectedDate})
                  </button>
                  <button
                    onClick={handleSelect7DayMovingAverage}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                      dateMode === "moving_7day"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <Activity className="size-3.5" />
                    7-Day Moving Avg
                  </button>
                  <button
                    onClick={() => setDateMode("range")}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      dateMode === "range"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    Custom Date Range
                  </button>
                </div>
              </div>

              {/* Quick Range Shortcuts (shown when in Range mode) */}
              {dateMode === "range" && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground font-semibold">Shortcuts:</span>
                  <div className="flex items-center gap-1">
                    {[
                      { label: "3 Days", days: 3 },
                      { label: "7 Days", days: 7 },
                      { label: "14 Days", days: 14 },
                      { label: "30 Days", days: 30 },
                    ].map((sc) => (
                      <button
                        key={sc.days}
                        onClick={() => handleQuickRange(sc.days)}
                        className="px-2 py-1 text-[11px] font-semibold rounded-md border border-border/70 bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                      >
                        {sc.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Date Pickers (when Range Mode active) */}
            {dateMode === "range" && (
              <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-border/50 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground font-medium">Start Date:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-8 rounded-lg border border-border/80 bg-background px-2.5 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground font-medium">End Date:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-8 rounded-lg border border-border/80 bg-background px-2.5 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                  />
                </div>

                <button
                  onClick={() => fetchDateRange(startDate, endDate)}
                  disabled={isFetchingRange}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-gradient px-3.5 font-semibold text-white shadow-brand hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`size-3.5 ${isFetchingRange ? "animate-spin" : ""}`} />
                  {isFetchingRange ? "Loading Report..." : "Apply Date Range"}
                </button>

                {rangeFetchError && (
                  <span className="text-[11px] text-rose-500 font-medium">
                    {rangeFetchError}
                  </span>
                )}
              </div>
            )}

            {/* Time Slot / Trading Hours Filter */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pt-2.5 border-t border-border/50 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Clock className="size-4 text-primary" /> Trading Hours / Time Slot:
                </span>
                <div className="flex flex-wrap items-center gap-1 bg-background rounded-lg border border-border/70 p-0.5 shadow-xs">
                  <button
                    onClick={() => handleSelectTimePreset("all")}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      timePreset === "all"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    All Day (24h)
                  </button>
                  <button
                    onClick={() => handleSelectTimePreset("solar")}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                      timePreset === "solar"
                        ? "bg-amber-500 text-white shadow-xs font-extrabold"
                        : "text-amber-600 dark:text-amber-400 hover:text-foreground hover:bg-amber-500/10"
                    }`}
                    title="07:00 - 19:00 (48 Slots) - Daytime solar & high-activity trading hours"
                  >
                    <Sun className="size-3" />
                    Solar Hours (07:00 - 19:00)
                  </button>
                  <button
                    onClick={() => handleSelectTimePreset("solar_core")}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      timePreset === "solar_core"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                    title="09:00 - 17:00 (32 Slots) - Peak solar generation"
                  >
                    Solar Core (09:00 - 17:00)
                  </button>
                  <button
                    onClick={() => handleSelectTimePreset("evening_peak")}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      timePreset === "evening_peak"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                    title="17:00 - 23:00 (24 Slots) - Evening transition & peak spikes"
                  >
                    Evening Peak (17:00 - 23:00)
                  </button>
                  <button
                    onClick={() => handleSelectTimePreset("custom")}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      timePreset === "custom"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    Custom Time
                  </button>
                </div>
              </div>

              {/* Custom Time Pickers & Slot Info Badge */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground font-medium">From:</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => handleCustomTimeChange(e.target.value, endTime)}
                    className="h-8 rounded-lg border border-border/80 bg-background px-2 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground font-medium">To:</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => handleCustomTimeChange(startTime, e.target.value)}
                    className="h-8 rounded-lg border border-border/80 bg-background px-2 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                  />
                </div>

                <span className="rounded-lg border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-mono font-bold text-primary flex items-center gap-1">
                  <Sparkles className="size-3" />
                  {filteredDailySlotsCount} / 96 Slots/Day ({(filteredDailySlotsCount * 250 * capacityMw).toLocaleString()} kWh/day)
                </span>

                {isTimeFilterActive && (
                  <button
                    onClick={() => handleSelectTimePreset("all")}
                    title="Reset to Full Day (96 Slots)"
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-border/70 bg-background px-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    <RotateCcw className="size-3" /> Full Day
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 7-Day Moving Window Hero Banner */}
          {dateMode === "moving_7day" && (
            <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-background to-emerald-500/10 p-3.5 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
                      <Activity className="size-4 animate-pulse" />
                    </span>
                    <h3 className="text-sm font-bold text-foreground">
                      Rolling 7-Day Moving Window ({startDate} → {endDate})
                    </h3>
                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      Auto-Rolling Trailing 7 Days
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-0 md:pl-9">
                    Moving average of slots within <strong className="text-foreground">{thresholdDisplay}</strong> tolerance{isTimeFilterActive ? <> for <strong className="text-foreground">{startTime} → {endTime}</strong> ({filteredDailySlotsCount} slots/day)</> : ""}. As new days clear, older days drop off automatically.
                  </p>
                </div>

                <div className="flex items-center gap-3 pl-0 md:pl-0 border-t md:border-t-0 pt-2 md:pt-0 border-border/50">
                  <div className="text-right">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      7D Accuracy
                    </div>
                    <div className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                      {summary.compliantSlots.pctOfTotalBlocks}%
                    </div>
                  </div>
                  <div className="h-7 w-px bg-border/60" />
                  <div className="text-right">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Daily Compliant Slots
                    </div>
                    <div className="text-base font-black font-mono text-foreground">
                      {(summary.compliantSlots.count / Math.max(1, summary.daySummaries.length)).toFixed(1)}{" "}
                      <span className="text-[11px] font-normal text-muted-foreground">/ {filteredDailySlotsCount}</span>
                    </div>
                  </div>
                  <div className="h-7 w-px bg-border/60" />
                  <div className="text-right">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Daily Safe Volume
                    </div>
                    <div className="text-base font-black font-mono text-foreground">
                      {Math.round(summary.compliantSlots.totalKwh / Math.max(1, summary.daySummaries.length)).toLocaleString()}{" "}
                      <span className="text-[10px] font-normal text-muted-foreground">kWh</span>
                    </div>
                  </div>
                  <div className="h-7 w-px bg-border/60" />
                  <div className="text-right">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Daily Avg Variance
                    </div>
                    <div className="text-base font-black font-mono text-foreground">
                      ₹{Math.round(summary.compliantSlots.absCostDeviationRs / Math.max(1, summary.daySummaries.length)).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Control Bar 2: Capacity (MW) & Price Error Threshold (Paisa / Rupees) */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/15 p-3.5 shadow-xs">
            {/* MW Selector */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Layers className="size-4 text-primary" /> Capacity (MW):
              </span>
              <div className="flex items-center gap-1 bg-background rounded-lg border border-border/70 p-0.5 shadow-xs">
                {MW_PRESETS.map((val) => (
                  <button
                    key={val}
                    onClick={() => handlePresetMw(val)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      capacityMw === val
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {val} MW
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 pl-1">
                <span className="text-[11px] text-muted-foreground font-medium">Custom:</span>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={customMwInput}
                    onChange={(e) => handleCustomMwChange(e.target.value)}
                    className="h-7 w-18 rounded-md border border-border/80 bg-background px-2 text-xs font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="ml-1 text-[11px] text-muted-foreground font-semibold">MW</span>
                </div>
              </div>
            </div>

            {/* Threshold Selector (Sir's request: Paisa / Rupees Threshold filter) */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1">
                Cost Error Filter:
              </span>

              {/* Mode switch */}
              <div className="flex items-center gap-0.5 bg-background rounded-md border border-border/70 p-0.5 text-[11px]">
                <button
                  onClick={() => setMetricMode("price_delta")}
                  className={`px-2 py-0.5 font-bold rounded-xs transition-colors cursor-pointer ${
                    metricMode === "price_delta"
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  ₹ / Paisa
                </button>
                <button
                  onClick={() => setMetricMode("percentage")}
                  className={`px-2 py-0.5 font-bold rounded-xs transition-colors cursor-pointer ${
                    metricMode === "percentage"
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  % Error
                </button>
              </div>

              {/* Paisa Presets */}
              {metricMode === "price_delta" ? (
                <div className="flex items-center gap-1">
                  {PAISA_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => handlePresetPaisa(p.value)}
                      className={`px-2 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                        priceThresholdRs === p.value
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "border border-border/70 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}

                  <div className="flex items-center gap-1 pl-1">
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      value={customPriceThresholdInput}
                      onChange={(e) => handleCustomPriceThresholdChange(e.target.value)}
                      className="h-7 w-16 rounded-md border border-border/80 bg-background px-2 text-xs font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <span className="text-[11px] text-muted-foreground font-semibold">₹</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  {PERCENT_PRESETS.map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setErrorPercentThreshold(pct)}
                      className={`px-2 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                        errorPercentThreshold === pct
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "border border-border/70 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      &lt; {pct}%
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3 Executive KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Card 1: Compliant Slots (Within Threshold) */}
            <div className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-background to-emerald-500/10 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3" /> {thresholdDisplay} (High Accuracy)
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {summary.compliantSlots.pctOfTotalBlocks}% of Period
                </span>
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono tracking-tight text-foreground">
                  {summary.compliantSlots.count}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  / {summary.blocksWithActual} Slots
                </span>
              </div>

              <div className="mt-3.5 space-y-1.5 text-xs border-t border-emerald-500/20 pt-2.5">
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Energy ({capacityMw} MW):</span>
                  <span className="font-mono font-bold text-foreground">
                    {summary.compliantSlots.totalKwh.toLocaleString()} kWh
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Avg Forecast vs Actual:</span>
                  <span className="font-mono font-bold text-foreground">
                    ₹{summary.compliantSlots.avgForecastMcp} / ₹{summary.compliantSlots.avgActualMcp}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Avg Price Delta / Error:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{Math.abs(summary.compliantSlots.avgPriceDeltaRs).toFixed(3)} ({summary.compliantSlots.avgErrorPct}%)
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground pt-1 border-t border-border/40">
                  <span>Total Financial Deviation:</span>
                  <span className="font-mono font-bold text-foreground">
                    ₹{summary.compliantSlots.absCostDeviationRs.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Exceeding Slots */}
            <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-background to-amber-500/10 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="size-3" /> Exceeding Slots (&gt; {metricMode === "price_delta" ? `₹${priceThresholdRs.toFixed(2)}` : `${errorPercentThreshold}%`})
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {summary.exceedingSlots.pctOfTotalBlocks}% of Period
                </span>
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono tracking-tight text-foreground">
                  {summary.exceedingSlots.count}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  / {summary.blocksWithActual} Slots
                </span>
              </div>

              <div className="mt-3.5 space-y-1.5 text-xs border-t border-amber-500/20 pt-2.5">
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Energy ({capacityMw} MW):</span>
                  <span className="font-mono font-bold text-foreground">
                    {summary.exceedingSlots.totalKwh.toLocaleString()} kWh
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Avg Forecast vs Actual:</span>
                  <span className="font-mono font-bold text-foreground">
                    ₹{summary.exceedingSlots.avgForecastMcp} / ₹{summary.exceedingSlots.avgActualMcp}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Avg Price Delta / Error:</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    ₹{Math.abs(summary.exceedingSlots.avgPriceDeltaRs).toFixed(3)} ({summary.exceedingSlots.avgErrorPct}%)
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground pt-1 border-t border-border/40">
                  <span>Total Financial Deviation:</span>
                  <span className="font-mono font-bold text-foreground">
                    ₹{summary.exceedingSlots.absCostDeviationRs.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Total Period Impact */}
            <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 border border-primary/30 px-2 py-0.5 text-[11px] font-bold text-primary">
                  <Sparkles className="size-3" /> Period Total ({capacityMw} MW)
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {summary.totalBlocks} Slots {dateMode === "range" ? `(${totalDaysCount} Days)` : ""}
                </span>
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <span
                  className={`text-2xl font-black font-mono tracking-tight ${
                    summary.fullDayNetImpactRs > 0
                      ? "text-rose-500"
                      : summary.fullDayNetImpactRs < 0
                      ? "text-emerald-500"
                      : "text-foreground"
                  }`}
                >
                  {summary.fullDayNetImpactRs > 0 ? "+₹" : "₹"}
                  {Math.abs(summary.fullDayNetImpactRs).toLocaleString()}
                </span>
                <span className="text-[11px] text-muted-foreground font-medium">
                  {summary.fullDayNetImpactRs < 0
                    ? "Net Savings (Actual was cheaper)"
                    : summary.fullDayNetImpactRs > 0
                    ? "Extra Cost (Actual was higher)"
                    : "Zero Variance"}
                </span>
              </div>

              <div className="mt-3.5 space-y-1.5 text-xs border-t border-primary/20 pt-2.5">
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Period Energy:</span>
                  <span className="font-mono font-bold text-foreground">
                    {summary.fullDayTotalKwh.toLocaleString()} kWh
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Overall WMAPE:</span>
                  <span className="font-mono font-bold text-primary">
                    {summary.fullDayWmape}%
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Avg Price (F vs A):</span>
                  <span className="font-mono font-bold text-foreground">
                    ₹{summary.fullDayAvgForecastMcp} / ₹{summary.fullDayAvgActualMcp}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground pt-1 border-t border-border/40">
                  <span>Total Abs Deviation (₹):</span>
                  <span className="font-mono font-bold text-foreground">
                    ₹{summary.fullDayAbsDeviationRs.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Day Breakdown Table (Shown when date range has > 1 day) */}
          {summary.daySummaries.length > 1 && (
            <div className="rounded-xl border border-border/70 bg-card p-3.5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <CalendarRange className="size-4 text-primary" /> Day-by-Day Accuracy & Financial Report ({summary.daySummaries.length} Days)
                </span>
                <button
                  onClick={() => setShowDayBreakdown(!showDayBreakdown)}
                  className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                >
                  {showDayBreakdown ? "Hide Days" : "Show Days"}
                </button>
              </div>

              {showDayBreakdown && (
                <div className="overflow-x-auto rounded-lg border border-border/60">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border/60 bg-muted/40 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2 text-center">Compliant Slots ({thresholdDisplay})</th>
                        <th className="px-3 py-2 text-right">Energy (kWh)</th>
                        <th className="px-3 py-2 text-right">Avg Forecast (₹)</th>
                        <th className="px-3 py-2 text-right">Avg Actual (₹)</th>
                        <th className="px-3 py-2 text-right">Net Savings/Cost (₹)</th>
                        <th className="px-3 py-2 text-right">Abs Deviation (₹)</th>
                        <th className="px-3 py-2 text-center">WMAPE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-medium">
                      {summary.daySummaries.map((d) => (
                        <tr key={d.date} className="hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-2 font-mono font-bold text-foreground">
                            {d.date}
                          </td>
                          <td className="px-3 py-2 text-center font-mono">
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                              {d.compliantCount} / {d.slotsWithActual} ({d.compliantPct}%)
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                            {d.totalKwh.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-semibold text-foreground">
                            ₹{d.avgForecastMcp.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-semibold text-foreground">
                            ₹{d.avgActualMcp.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold">
                            <span
                              className={
                                d.netCostImpactRs < 0
                                  ? "text-emerald-500"
                                  : d.netCostImpactRs > 0
                                  ? "text-rose-500"
                                  : "text-muted-foreground"
                              }
                            >
                              {d.netCostImpactRs < 0
                                ? `₹${Math.abs(d.netCostImpactRs).toFixed(1)} Saved`
                                : d.netCostImpactRs > 0
                                ? `+₹${d.netCostImpactRs.toFixed(1)} Cost`
                                : "₹0.0"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-foreground">
                            ₹{d.absCostDeviationRs.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-center font-mono font-bold text-primary">
                            {d.wmape.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-primary/40 bg-muted/60 font-bold text-foreground">
                      <tr>
                        <td className="px-3 py-2 font-mono text-primary flex items-center gap-1.5">
                          <Activity className="size-3.5 text-primary" />
                          {dateMode === "moving_7day" ? "7-Day Moving Avg" : "Period Daily Avg"}
                        </td>
                        <td className="px-3 py-2 text-center font-mono text-emerald-600 dark:text-emerald-400">
                          {(summary.compliantSlots.count / Math.max(1, summary.daySummaries.length)).toFixed(1)} / {filteredDailySlotsCount} ({summary.compliantSlots.pctOfTotalBlocks}%)
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                          {Math.round(summary.compliantSlots.totalKwh / Math.max(1, summary.daySummaries.length)).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          ₹{summary.fullDayAvgForecastMcp.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          ₹{summary.fullDayAvgActualMcp.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {summary.fullDayNetImpactRs < 0
                            ? `₹${Math.abs(Math.round(summary.fullDayNetImpactRs / Math.max(1, summary.daySummaries.length))).toLocaleString()} Saved/d`
                            : summary.fullDayNetImpactRs > 0
                            ? `+₹${Math.round(summary.fullDayNetImpactRs / Math.max(1, summary.daySummaries.length)).toLocaleString()} Cost/d`
                            : "₹0"}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-foreground">
                          ₹{Math.round(summary.fullDayAbsDeviationRs / Math.max(1, summary.daySummaries.length)).toLocaleString()}/d
                        </td>
                        <td className="px-3 py-2 text-center font-mono text-primary">
                          {summary.fullDayWmape.toFixed(2)}%
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Table Toolbar & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/70">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === "all"
                    ? "bg-background text-foreground shadow-xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Slots ({summary.totalBlocks})
              </button>
              <button
                onClick={() => setActiveTab("compliant")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "compliant"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs"
                    : "text-muted-foreground hover:text-emerald-500"
                }`}
              >
                <CheckCircle2 className="size-3" /> Within {thresholdDisplay} ({summary.compliantSlots.count})
              </button>
              <button
                onClick={() => setActiveTab("exceeding")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "exceeding"
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs"
                    : "text-muted-foreground hover:text-amber-500"
                }`}
              >
                <AlertTriangle className="size-3" /> Exceeding Slots ({summary.exceedingSlots.count})
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search slot or date..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8.5 w-full sm:w-56 rounded-lg border border-border/70 bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
              />
            </div>
          </div>

          {/* Detail Table */}
          <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/60 bg-muted/40 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                <tr>
                  {dateMode === "range" && (
                    <th
                      onClick={() => handleSort("date")}
                      className="cursor-pointer px-3.5 py-2.5 hover:text-foreground"
                    >
                      <div className="flex items-center gap-1">
                        Date
                        {sortField === "date" &&
                          (sortDir === "asc" ? (
                            <ArrowUp className="size-3 text-primary" />
                          ) : (
                            <ArrowDown className="size-3 text-primary" />
                          ))}
                      </div>
                    </th>
                  )}
                  <th
                    onClick={() => handleSort("timeBlock")}
                    className="cursor-pointer px-3.5 py-2.5 hover:text-foreground"
                  >
                    <div className="flex items-center gap-1">
                      Time Block
                      {sortField === "timeBlock" &&
                        (sortDir === "asc" ? (
                          <ArrowUp className="size-3 text-primary" />
                        ) : (
                          <ArrowDown className="size-3 text-primary" />
                        ))}
                    </div>
                  </th>
                  <th className="px-3.5 py-2.5">Compliance Status</th>
                  <th
                    onClick={() => handleSort("forecastedMcp")}
                    className="cursor-pointer px-3.5 py-2.5 text-right hover:text-foreground"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Forecast (₹/kWh)
                      {sortField === "forecastedMcp" &&
                        (sortDir === "asc" ? (
                          <ArrowUp className="size-3 text-primary" />
                        ) : (
                          <ArrowDown className="size-3 text-primary" />
                        ))}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("actualMcp")}
                    className="cursor-pointer px-3.5 py-2.5 text-right hover:text-foreground"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Actual (₹/kWh)
                      {sortField === "actualMcp" &&
                        (sortDir === "asc" ? (
                          <ArrowUp className="size-3 text-primary" />
                        ) : (
                          <ArrowDown className="size-3 text-primary" />
                        ))}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("priceDelta")}
                    className="cursor-pointer px-3.5 py-2.5 text-right hover:text-foreground"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Price Delta (₹)
                      {sortField === "priceDelta" &&
                        (sortDir === "asc" ? (
                          <ArrowUp className="size-3 text-primary" />
                        ) : (
                          <ArrowDown className="size-3 text-primary" />
                        ))}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("errorPercent")}
                    className="cursor-pointer px-3.5 py-2.5 text-center hover:text-foreground"
                  >
                    <div className="flex items-center justify-center gap-1">
                      Error %
                      {sortField === "errorPercent" &&
                        (sortDir === "asc" ? (
                          <ArrowUp className="size-3 text-primary" />
                        ) : (
                          <ArrowDown className="size-3 text-primary" />
                        ))}
                    </div>
                  </th>
                  <th className="px-3.5 py-2.5 text-right">Energy (kWh)</th>
                  <th
                    onClick={() => handleSort("costImpactRs")}
                    className="cursor-pointer px-3.5 py-2.5 text-right hover:text-foreground"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Cost Impact (₹)
                      {sortField === "costImpactRs" &&
                        (sortDir === "asc" ? (
                          <ArrowUp className="size-3 text-primary" />
                        ) : (
                          <ArrowDown className="size-3 text-primary" />
                        ))}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("absCostDeviationRs")}
                    className="cursor-pointer px-3.5 py-2.5 text-right hover:text-foreground"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Abs Deviation (₹)
                      {sortField === "absCostDeviationRs" &&
                        (sortDir === "asc" ? (
                          <ArrowUp className="size-3 text-primary" />
                        ) : (
                          <ArrowDown className="size-3 text-primary" />
                        ))}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-medium">
                {sortedBlocks.length > 0 ? (
                  sortedBlocks.map((b, idx) => (
                    <tr
                      key={`${b.date || ""}-${b.timeBlock}-${idx}`}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {dateMode === "range" && (
                        <td className="px-3.5 py-2.5 font-mono text-xs text-muted-foreground font-semibold">
                          {b.date}
                        </td>
                      )}

                      <td className="px-3.5 py-2.5 font-mono text-xs font-semibold text-foreground">
                        {b.timeBlock}
                      </td>

                      <td className="px-3.5 py-2.5">
                        {b.isCompliant === true ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-2.5" /> Within {metricMode === "price_delta" ? `₹${priceThresholdRs.toFixed(2)}` : `${errorPercentThreshold}%`}
                          </span>
                        ) : b.isCompliant === false ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="size-2.5" /> Exceeds {metricMode === "price_delta" ? `₹${priceThresholdRs.toFixed(2)}` : `${errorPercentThreshold}%`}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">
                            Pending Actual
                          </span>
                        )}
                      </td>

                      <td className="px-3.5 py-2.5 text-right font-mono text-xs font-bold text-foreground">
                        ₹{b.forecastedMcp.toFixed(2)}
                      </td>

                      <td className="px-3.5 py-2.5 text-right font-mono text-xs font-bold text-foreground">
                        {b.actualMcp !== null ? `₹${b.actualMcp.toFixed(2)}` : "—"}
                      </td>

                      <td className="px-3.5 py-2.5 text-right font-mono text-xs font-semibold">
                        {b.priceDelta !== null ? (
                          <span
                            className={
                              b.priceDelta > 0
                                ? "text-rose-500"
                                : b.priceDelta < 0
                                ? "text-emerald-500"
                                : "text-muted-foreground"
                            }
                          >
                            {b.priceDelta > 0 ? "+" : ""}₹{b.priceDelta.toFixed(2)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="px-3.5 py-2.5 text-center font-mono text-xs font-semibold">
                        {b.errorPercent !== null ? (
                          <span
                            className={
                              b.errorPercent < 5.0
                                ? "text-emerald-600 dark:text-emerald-400 font-bold"
                                : b.errorPercent <= 10.0
                                ? "text-amber-600 dark:text-amber-400 font-bold"
                                : "text-rose-600 dark:text-rose-400 font-bold"
                            }
                          >
                            {b.errorPercent.toFixed(2)}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="px-3.5 py-2.5 text-right font-mono text-xs text-muted-foreground">
                        {b.blockKwh.toLocaleString()}
                      </td>

                      <td className="px-3.5 py-2.5 text-right font-mono text-xs font-bold">
                        {b.costImpactRs !== null ? (
                          <span
                            className={
                              b.costImpactRs > 0
                                ? "text-rose-500"
                                : b.costImpactRs < 0
                                ? "text-emerald-500"
                                : "text-foreground"
                            }
                          >
                            {b.costImpactRs > 0 ? "+" : ""}₹
                            {b.costImpactRs.toFixed(2)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="px-3.5 py-2.5 text-right font-mono text-xs font-bold text-foreground">
                        {b.absCostDeviationRs !== null
                          ? `₹${b.absCostDeviationRs.toFixed(2)}`
                          : "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={dateMode === "range" ? 10 : 9}
                      className="py-8 text-center text-muted-foreground"
                    >
                      {isFetchingRange
                        ? "Loading data for selected date range..."
                        : "No time slots match the current filter."}
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Table Footer Summary */}
              {sortedBlocks.length > 0 && (
                <tfoot className="border-t-2 border-border/70 bg-muted/30 font-bold text-xs text-foreground">
                  <tr>
                    <td className="px-3.5 py-2.5 font-mono" colSpan={dateMode === "range" ? 2 : 1}>
                      Total ({sortedBlocks.length} Slots)
                    </td>
                    <td className="px-3.5 py-2.5 text-muted-foreground">—</td>
                    <td className="px-3.5 py-2.5 text-right font-mono">
                      ₹
                      {(
                        sortedBlocks.reduce((acc, b) => acc + b.forecastedMcp, 0) /
                        sortedBlocks.length
                      ).toFixed(2)}{" "}
                      avg
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono">
                      ₹
                      {(
                        sortedBlocks.reduce((acc, b) => acc + (b.actualMcp ?? 0), 0) /
                        (sortedBlocks.filter((b) => b.actualMcp !== null).length || 1)
                      ).toFixed(2)}{" "}
                      avg
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-muted-foreground">
                      —
                    </td>
                    <td className="px-3.5 py-2.5 text-center font-mono">
                      {(
                        sortedBlocks.reduce((acc, b) => acc + (b.errorPercent ?? 0), 0) /
                        (sortedBlocks.filter((b) => b.errorPercent !== null).length || 1)
                      ).toFixed(2)}
                      % avg
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono">
                      {sortedBlocks
                        .reduce((acc, b) => acc + b.blockKwh, 0)
                        .toLocaleString()}{" "}
                      kWh
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-foreground font-black">
                      ₹
                      {sortedBlocks
                        .reduce((acc, b) => acc + (b.costImpactRs ?? 0), 0)
                        .toFixed(2)}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-foreground font-black">
                      ₹
                      {sortedBlocks
                        .reduce((acc, b) => acc + (b.absCostDeviationRs ?? 0), 0)
                        .toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
