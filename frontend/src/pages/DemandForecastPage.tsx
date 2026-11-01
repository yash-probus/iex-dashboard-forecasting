import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format, parseISO, addDays } from 'date-fns';
import {
  Activity,
  Zap,
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  Download,
  RefreshCw,
  Search,
  Building2,
  LineChart as LineIcon,
  BarChart3,
  AreaChart as AreaIcon,
  Gauge,
  Layers,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  SlidersHorizontal,
  FileSpreadsheet
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea
} from 'recharts';
import { apiClient } from '../api/client';
import { exportToCSV } from '../utils/export';
import { cn } from '../lib/utils';
import '../components/forecast/forecast.css';

interface IntervalRow {
  date: string;
  hour: string;
  timeBlock: string;
  intervalNumber?: number;
  demand?: number;
  actualDemand?: number | null;
  meterNo?: string | number;
  generation?: number;
  actualGeneration?: number | null;
  NUCLEAR?: number;
  THERMAL?: number;
  WIND?: number;
  GAS?: number;
  HYDRO?: number;
  SOLAR?: number;
  [key: string]: any;
}

interface AnalyticsMetrics {
  averageDemand?: number;
  maxDemand?: number;
  minDemand?: number;
  totalEnergyKwh?: number;
  mape?: string | number;
  mae?: string | number;
  wmape?: string | number;
}

export default function DemandForecastPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  // Determine subType from URL route
  const isConsumer = path.includes('/forecast/demand/consumer');
  const isAllIndia = path.includes('/forecast/demand/all-india');
  const isGeneration = path.includes('/forecast/generation');

  const subType = isConsumer ? 'consumer' : isAllIndia ? 'all-india' : 'npp';
  const unitLabel = isConsumer ? 'kVA' : 'MW';
  const energyUnitLabel = isConsumer ? 'kWh' : 'MWh';

  const title = isConsumer
    ? 'Consumer Demand Forecast'
    : isAllIndia
    ? 'All India Grid Demand Forecast'
    : 'NPP Generation Forecast';

  const subtitle = isConsumer
    ? 'High-resolution apparent energy load curves and consumer peak demand intelligence.'
    : isAllIndia
    ? 'National and regional power demand telemetry and load forecast modeling.'
    : 'Forecasted solar, wind, hydro, thermal, and nuclear generation output across India.';

  const [date, setDate] = useState<string>('');
  const [model, setModel] = useState<'Model 1' | 'Model 2'>('Model 1');
  const [interval, setInterval] = useState<'15min' | 'hourly' | 'daily'>('15min');
  const [meterFilter, setMeterFilter] = useState<string>('all');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [data, setData] = useState<IntervalRow[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsMetrics>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Chart state
  const [chartView, setChartView] = useState<'area' | 'line' | 'bar'>('area');
  const [showForecast, setShowForecast] = useState<boolean>(true);
  const [showActual, setShowActual] = useState<boolean>(true);

  // Table state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(24);
  const [currentPage, setCurrentPage] = useState<number>(0);

  // 1. Fetch available dates for this specific forecast type
  useEffect(() => {
    let isCancelled = false;
    const fetchDates = async () => {
      try {
        const res = await apiClient.get(`/forecast/dates?market=${subType}`);
        if (!isCancelled && res.data && res.data.success) {
          const dates: string[] = res.data.data || [];
          setAvailableDates(dates);
          if (dates.length > 0) {
            setDate(dates[0]); // Default to latest available date in database
          } else {
            setDate(format(new Date(), 'yyyy-MM-dd'));
          }
        }
      } catch (err) {
        console.error('Failed to fetch available dates:', err);
        if (!isCancelled) {
          setDate(format(new Date(), 'yyyy-MM-dd'));
        }
      }
    };

    fetchDates();
    return () => { isCancelled = true; };
  }, [subType]);

  // 2. Fetch Forecast Data whenever date, model, or interval changes
  const fetchData = async () => {
    if (!date) return;
    setLoading(true);
    setError(null);

    try {
      const modelParam = model === 'Model 1' ? 'Model1' : 'Model2';
      const endpoint = isGeneration
        ? `/forecast/generation?startDate=${date}&endDate=${date}&interval=${interval}&model=${modelParam}`
        : `/forecast/demand?type=${subType}&startDate=${date}&endDate=${date}&interval=${interval}&model=${modelParam}`;

      const res = await apiClient.get(endpoint);
      if (res.data && res.data.success) {
        const rawIntervals: IntervalRow[] = res.data.data.intervals || [];
        setData(rawIntervals);
        setAnalytics(res.data.data.analytics || {});
      } else {
        setError('No forecast data returned for the selected parameters.');
      }
    } catch (err: any) {
      console.error('Error fetching demand forecast:', err);
      setError(err.response?.data?.message || err.message || 'Unable to connect to forecast server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (date) {
      fetchData();
    }
  }, [date, model, interval, subType]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Date navigation handlers
  const handleShiftDate = (days: number) => {
    if (!date) return;
    try {
      const cur = parseISO(date);
      const nextDate = format(addDays(cur, days), 'yyyy-MM-dd');
      setDate(nextDate);
    } catch (e) {
      console.error(e);
    }
  };

  // Detect meters if multiple meter streams are present (e.g. 5 meters in consumer dataset)
  const availableMeters = useMemo(() => {
    if (!isConsumer || data.length === 0) return [];
    // If the data has explicit meterNo
    const meters = new Set<string>();
    data.forEach((r, idx) => {
      if (r.meterNo) {
        meters.add(String(r.meterNo));
      } else if (data.length > 96) {
        // Repeated intervals indicate multiple meters (e.g. 480 / 96 = 5)
        const meterIndex = Math.floor(idx / 96) + 1;
        meters.add(`Meter ${meterIndex}`);
      }
    });
    return Array.from(meters);
  }, [data, isConsumer]);

  // Filtered rows based on Meter selection
  const processedData = useMemo(() => {
    if (!isConsumer || meterFilter === 'all' || availableMeters.length === 0) {
      return data;
    }
    const targetIdx = parseInt(meterFilter.replace(/\D/g, ''), 10);
    if (!isNaN(targetIdx) && data.length > 96) {
      const start = (targetIdx - 1) * 96;
      return data.slice(start, start + 96);
    }
    return data;
  }, [data, meterFilter, isConsumer, availableMeters]);

  // Computed summary KPIs
  const computedMetrics = useMemo(() => {
    if (processedData.length === 0) {
      return {
        avg: analytics.averageDemand ?? 0,
        min: analytics.minDemand ?? 0,
        max: analytics.maxDemand ?? 0,
        totalEnergy: analytics.totalEnergyKwh ?? 0,
        mae: analytics.mae ?? 'N/A',
        wmape: analytics.wmape ?? 'N/A',
      };
    }

    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    let actualSum = 0;
    let countActual = 0;
    let absDiffSum = 0;

    processedData.forEach((r) => {
      const d = Number(r.demand ?? r.generation ?? 0);
      sum += d;
      if (d < min) min = d;
      if (d > max) max = d;

      const act = r.actualDemand ?? r.actualGeneration;
      if (act !== null && act !== undefined && !isNaN(Number(act))) {
        const a = Number(act);
        actualSum += a;
        countActual++;
        absDiffSum += Math.abs(a - d);
      }
    });

    const avg = processedData.length > 0 ? sum / processedData.length : 0;
    const mae = countActual > 0 ? (absDiffSum / countActual).toFixed(2) : (analytics.mae ?? 'N/A');
    const wmape = actualSum > 0 ? `${((absDiffSum / actualSum) * 100).toFixed(2)}%` : (analytics.wmape ?? 'N/A');

    return {
      avg: Number(avg.toFixed(2)),
      min: min === Infinity ? 0 : Number(min.toFixed(2)),
      max: max === -Infinity ? 0 : Number(max.toFixed(2)),
      totalEnergy: analytics.totalEnergyKwh ?? Math.round(sum * 0.25),
      mae,
      wmape,
    };
  }, [processedData, analytics]);

  // Chart data formatting
  const chartData = useMemo(() => {
    // If aggregate/distinct timeBlocks are needed:
    const map = new Map<string, { timeBlock: string; forecast: number; actual: number | null; count: number }>();
    processedData.forEach((r) => {
      const tb = r.timeBlock || `Slot ${r.intervalNumber || 1}`;
      const f = Number(r.demand ?? r.generation ?? 0);
      const a = r.actualDemand !== null && r.actualDemand !== undefined ? Number(r.actualDemand) : null;

      if (!map.has(tb)) {
        map.set(tb, { timeBlock: tb, forecast: f, actual: a, count: 1 });
      } else {
        const item = map.get(tb)!;
        item.forecast += f;
        if (a !== null) {
          item.actual = (item.actual ?? 0) + a;
        }
        item.count += 1;
      }
    });

    return Array.from(map.values()).map((item) => ({
      timeBlock: item.timeBlock,
      forecast: Number((item.forecast / (meterFilter === 'all' && isConsumer && availableMeters.length > 0 ? 1 : 1)).toFixed(2)),
      actual: item.actual !== null ? Number((item.actual).toFixed(2)) : null,
    }));
  }, [processedData, meterFilter, isConsumer, availableMeters]);

  // Table filtering and pagination
  const tableRows = useMemo(() => {
    let rows = processedData;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.timeBlock?.toLowerCase().includes(q) ||
          r.hour?.toString().includes(q) ||
          r.date?.includes(q)
      );
    }
    return rows;
  }, [processedData, searchQuery]);

  const totalPages = Math.ceil(tableRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = currentPage * pageSize;
    return tableRows.slice(start, start + pageSize);
  }, [tableRows, currentPage, pageSize]);

  // Export to CSV
  const handleExportCSV = () => {
    const filename = `${subType}_Demand_Forecast_${date}`;
    const columns = [
      { field: 'date', headerName: 'Date' },
      { field: 'hour', headerName: 'Hour' },
      { field: 'timeBlock', headerName: 'Time Block' },
      { field: 'demand', headerName: `Forecasted ${isConsumer ? 'Apparent Energy (kVA)' : 'Demand (MW)'}` },
      { field: 'actualDemand', headerName: `Actual ${isConsumer ? 'Apparent Energy (kVA)' : 'Demand (MW)'}` },
    ];
    exportToCSV(processedData, filename, columns);
  };

  return (
    <div className="forecast-scope mx-auto max-w-[1600px] space-y-6 p-4 md:p-6 lg:p-8">
      {/* 1. Header Section */}
      <header className="flex flex-col gap-4 border-b border-border/60 pb-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400 ring-1 ring-teal-500/30">
            {isConsumer ? <Building2 className="size-6" /> : <LineIcon className="size-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">{title}</h1>
              <span className="rounded-full bg-teal-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-teal-600 dark:text-teal-400 border border-teal-500/20">
                Live Model
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={cn("size-3.5", (loading || refreshing) && "animate-spin text-teal-500")} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={processedData.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:from-teal-500 hover:to-emerald-500 disabled:opacity-50"
          >
            <Download className="size-3.5" />
            <span>Export Forecast</span>
          </button>
        </div>
      </header>

      {/* 2. Modern Filter Bar */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Selector with quick Previous / Next navigation */}
          <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-background/50 p-1">
            <button
              onClick={() => handleShiftDate(-1)}
              className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              title="Previous Day"
            >
              <ChevronLeft className="size-4" />
            </button>

            <div className="flex items-center gap-2 px-2.5">
              <CalendarIcon className="size-3.5 text-teal-500" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={() => handleShiftDate(1)}
              className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              title="Next Day"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* Available Dates Dropdown (Fast jumper) */}
          {availableDates.length > 0 && (
            <select
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border border-border/80 bg-background/50 px-3 py-2 text-xs font-medium text-foreground focus:outline-none cursor-pointer"
              title="Jump to date with recorded data"
            >
              <option value="" disabled>Saved Data Dates ({availableDates.length})</option>
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {d} {d === date ? '(Active)' : ''}
                </option>
              ))}
            </select>
          )}

          {/* Model Selector */}
          <div className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-background/50 px-3 py-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground">Model:</span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
            >
              <option value="Model 1">Model 1 (Baseline)</option>
              <option value="Model 2">Model 2 (Ensemble)</option>
            </select>
          </div>

          {/* Meter Selector (Consumer specific) */}
          {isConsumer && availableMeters.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-background/50 px-3 py-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground">Meter:</span>
              <select
                value={meterFilter}
                onChange={(e) => setMeterFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
              >
                <option value="all">All Meters Combined</option>
                {availableMeters.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}

          {/* Interval Selector */}
          <div className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-background/50 px-3 py-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground">Interval:</span>
            <select
              value={interval}
              onChange={(e) => setInterval(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
            >
              <option value="15min">15 Min Blocks</option>
              <option value="hourly">Hourly Aggregated</option>
              <option value="daily">Daily Summary</option>
            </select>
          </div>
        </div>
      </section>

      {/* 3. KPI Summary Grid */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* KPI 1: Average */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="label-caps">Avg {isConsumer ? 'Apparent Energy' : 'Demand'}</span>
            <div className="grid size-9 place-items-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Activity className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="num text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {computedMetrics.avg.toLocaleString('en-IN')}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">{unitLabel}</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Mean interval dispatch</p>
          </div>
        </div>

        {/* KPI 2: Minimum */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="label-caps">Min {isConsumer ? 'Apparent Energy' : 'Demand'}</span>
            <div className="grid size-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingDown className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="num text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {computedMetrics.min.toLocaleString('en-IN')}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">{unitLabel}</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Trough baseload level</p>
          </div>
        </div>

        {/* KPI 3: Maximum */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="label-caps">Peak {isConsumer ? 'Apparent Energy' : 'Demand'}</span>
            <div className="grid size-9 place-items-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="num text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {computedMetrics.max.toLocaleString('en-IN')}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">{unitLabel}</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Maximum contract spike</p>
          </div>
        </div>

        {/* KPI 4: Total Energy */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="label-caps">Estimated Total Energy</span>
            <div className="grid size-9 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Zap className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="num text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {computedMetrics.totalEnergy.toLocaleString('en-IN')}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">{energyUnitLabel}</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Cumulative 24-hr energy</p>
          </div>
        </div>

        {/* KPI 5: MAE & WMAPE Accuracy */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="label-caps">Model Accuracy</span>
            <div className="grid size-9 place-items-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Gauge className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">MAE: </span>
                <span className="num font-bold text-foreground">{computedMetrics.mae}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">WMAPE: </span>
                <span className="num font-bold text-teal-600 dark:text-teal-400">{computedMetrics.wmape}</span>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">Historical forecast error</p>
          </div>
        </div>
      </section>

      {/* 4. Demand Forecast Graph View */}
      <section className="rounded-2xl border border-border/60 bg-card p-5 md:p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              {title} — Graph View
            </h2>
            <span className="num inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
              <CalendarIcon className="size-3" /> {date || 'Current Date'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Visibility Toggle Chips */}
            <button
              onClick={() => setShowForecast((prev) => !prev)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-medium transition",
                showForecast
                  ? "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300"
                  : "border-border/60 text-muted-foreground opacity-60"
              )}
            >
              <span className="size-2 rounded-full bg-teal-500" />
              <span>Forecasted {isConsumer ? 'Apparent Energy' : 'Demand'}</span>
            </button>

            <button
              onClick={() => setShowActual((prev) => !prev)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-medium transition",
                showActual
                  ? "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                  : "border-border/60 text-muted-foreground opacity-60"
              )}
            >
              <span className="size-2 rounded-full bg-blue-500" />
              <span>Actual {isConsumer ? 'Apparent Energy' : 'Demand'}</span>
            </button>

            {/* Chart Style Switcher */}
            <div className="ml-2 flex items-center rounded-xl border border-border/80 bg-background/50 p-0.5">
              <button
                onClick={() => setChartView('area')}
                className={cn("rounded-lg p-1.5 transition", chartView === 'area' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                title="Area Chart"
              >
                <AreaIcon className="size-4" />
              </button>
              <button
                onClick={() => setChartView('line')}
                className={cn("rounded-lg p-1.5 transition", chartView === 'line' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                title="Line Chart"
              >
                <LineIcon className="size-4" />
              </button>
              <button
                onClick={() => setChartView('bar')}
                className={cn("rounded-lg p-1.5 transition", chartView === 'bar' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                title="Bar Chart"
              >
                <BarChart3 className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Chart Rendering */}
        <div className="h-[360px] w-full">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <RefreshCw className="size-6 animate-spin text-teal-500" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Building2 className="size-10 text-muted-foreground/40" />
              <p className="mt-2 text-sm font-medium text-muted-foreground">No interval records found for {date}</p>
              <p className="text-xs text-muted-foreground/70">Select an active date from the saved dates dropdown</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                <defs>
                  <linearGradient id="forecastAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#14B8A6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/40" />
                <XAxis
                  dataKey="timeBlock"
                  tickLine={false}
                  axisLine={{ stroke: 'currentColor', className: 'text-border/60' }}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  className="text-muted-foreground"
                  interval={Math.max(1, Math.floor(chartData.length / 12))}
                  tickFormatter={(val) => val?.slice(0, 5) || val}
                />
                <YAxis
                  tickLine={false}
                  axisLine={{ stroke: 'currentColor', className: 'text-border/60' }}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  className="text-muted-foreground"
                  tickFormatter={(val) => `${val} ${unitLabel}`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-xl border border-border/80 bg-card/95 p-3 shadow-xl backdrop-blur-md">
                        <p className="mb-1 text-xs font-semibold text-foreground">{label}</p>
                        {payload.map((entry: any, i: number) => (
                          <div key={i} className="flex items-center justify-between gap-4 text-xs">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
                              {entry.name}:
                            </span>
                            <span className="font-mono font-bold text-foreground">
                              {entry.value !== null && entry.value !== undefined ? `${entry.value} ${unitLabel}` : 'N/A'}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />

                {/* Forecast Curve */}
                {showForecast && chartView === 'area' && (
                  <Area
                    type="monotone"
                    dataKey="forecast"
                    name={`Forecasted ${unitLabel}`}
                    stroke="#14B8A6"
                    strokeWidth={2}
                    fill="url(#forecastAreaGrad)"
                    dot={false}
                    activeDot={{ r: 5, fill: '#14B8A6' }}
                  />
                )}
                {showForecast && chartView === 'line' && (
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    name={`Forecasted ${unitLabel}`}
                    stroke="#14B8A6"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                )}
                {showForecast && chartView === 'bar' && (
                  <Bar
                    dataKey="forecast"
                    name={`Forecasted ${unitLabel}`}
                    fill="#14B8A6"
                    radius={[4, 4, 0, 0]}
                  />
                )}

                {/* Actual Curve */}
                {showActual && (
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name={`Actual ${unitLabel}`}
                    stroke="#3B82F6"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                    connectNulls
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* 5. Demand Forecast Tabular View */}
      <section className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 p-4 md:p-5">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              {title} — Tabular View
            </h2>
            <p className="text-xs text-muted-foreground">Detailed 15-minute load register for {date}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search slot..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 rounded-xl border border-border/80 bg-background/50 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>

            {/* Page Size */}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(0);
              }}
              className="h-8 rounded-xl border border-border/80 bg-background/50 px-2.5 text-xs text-foreground focus:outline-none cursor-pointer"
            >
              <option value={12}>12 rows</option>
              <option value={24}>24 rows</option>
              <option value={48}>48 rows</option>
              <option value={96}>96 rows</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/60 bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Hour</th>
                <th className="px-4 py-3">Time Block</th>
                <th className="px-4 py-3 text-right">Forecasted {isConsumer ? 'Apparent Energy' : 'Demand'}</th>
                <th className="px-4 py-3 text-right">Actual {isConsumer ? 'Apparent Energy' : 'Demand'}</th>
                <th className="px-4 py-3 text-right">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="mx-auto size-5 animate-spin text-teal-500" />
                    <span className="mt-2 block">Loading slot telemetry...</span>
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    No intervals match your filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, idx) => {
                  const fVal = Number(row.demand ?? row.generation ?? 0);
                  const aVal = row.actualDemand !== null && row.actualDemand !== undefined ? Number(row.actualDemand) : null;
                  const delta = aVal !== null ? (fVal - aVal).toFixed(2) : null;

                  return (
                    <tr key={idx} className="transition hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-medium text-foreground">{row.date}</td>
                      <td className="px-4 py-2.5 font-mono text-muted-foreground">{row.hour}</td>
                      <td className="px-4 py-2.5 font-mono font-medium text-foreground">{row.timeBlock}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-teal-600 dark:text-teal-400">
                        {fVal.toFixed(2)} {unitLabel}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                        {aVal !== null ? `${aVal.toFixed(2)} ${unitLabel}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">
                        {delta !== null ? (
                          <span className={cn("inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold", Number(delta) >= 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400")}>
                            {Number(delta) >= 0 ? `+${delta}` : delta} {unitLabel}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-border/60 px-4 py-3 text-xs text-muted-foreground">
          <span>
            Showing {tableRows.length > 0 ? currentPage * pageSize + 1 : 0} to{' '}
            {Math.min((currentPage + 1) * pageSize, tableRows.length)} of {tableRows.length} intervals
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="rounded-lg border border-border/80 px-2.5 py-1 text-xs font-semibold text-foreground transition hover:bg-muted disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-mono text-xs">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="rounded-lg border border-border/80 px-2.5 py-1 text-xs font-semibold text-foreground transition hover:bg-muted disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
