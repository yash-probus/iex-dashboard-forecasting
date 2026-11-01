import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip as MuiTooltip,
  Paper,
  Button,
  useTheme as useMuiTheme,
  alpha
} from '@mui/material';
import {
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Layers,
  BarChart3,
  Calendar,
  Zap,
  Activity
} from 'lucide-react';
import { Timeline as TimelineIcon } from '@mui/icons-material';
import { useTheme } from '../ThemeProvider';

export interface ForecastDataPoint {
  date: string;
  hour?: string;
  timeBlock: string;
  intervalNumber?: number;
  purchaseBid?: number;
  sellBid?: number;
  mcv?: number;
  fsv?: number;
  mcp?: number | null;
  actualMcp?: number | null;
  mcpDayahead?: number | null;
  mcpNowcast?: number | null;
  priceRange?: string;
  confidence?: string | number;
  demand?: number | null;
  actualDemand?: number | null;
  generation?: number | null;
  actualGeneration?: number | null;
  SOLAR?: number;
  WIND?: number;
  HYDRO?: number;
  NUCLEAR?: number;
  THERMAL?: number;
  GAS?: number;
  [key: string]: any;
}

interface ForecastMarketVisualizerProps {
  title: string;
  subtitle?: string;
  data: ForecastDataPoint[];
  dateRangeLabel: string;
  interval?: '15min' | 'hourly' | 'daily';
  accentColor?: string;
  isPrice?: boolean;
  isDemand?: boolean;
  isGeneration?: boolean;
  subType?: string;
  rtmForecastType?: 'both' | 'dayahead' | 'nowcast';
}

export default function ForecastMarketVisualizer({
  title,
  subtitle,
  data,
  dateRangeLabel,
  interval = '15min',
  accentColor = '#8B5CF6',
  isPrice = true,
  isDemand = false,
  isGeneration = false,
  subType = 'dam',
  rtmForecastType = 'both'
}: ForecastMarketVisualizerProps) {
  const { isDark } = useTheme();
  const muiTheme = useMuiTheme();

  // Series visibility toggles
  const [showForecast, setShowForecast] = useState(true);
  const [showActual, setShowActual] = useState(true);
  const [showCorridor, setShowCorridor] = useState(true);
  const [showVolume, setShowVolume] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Slot horizon window filter: 'all' | 'morning' | 'solar' | 'evening' | 'night'
  const [timeHorizon, setTimeHorizon] = useState<'all' | 'morning' | 'solar' | 'evening' | 'night'>('all');

  // Process data with numeric cleanliness, corridor bounds, and horizon slicing
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    let filtered = [...data];

    // Filter by time horizon if in 15min interval
    if (interval === '15min' && timeHorizon !== 'all') {
      filtered = filtered.filter((d, idx) => {
        const slot = d.intervalNumber !== undefined ? d.intervalNumber : idx + 1;
        // 96 slots in a day:
        // Morning: 04:00 - 09:00 (Slots 17 - 36)
        // Solar: 09:00 - 16:00 (Slots 37 - 64)
        // Evening Peak: 16:00 - 22:00 (Slots 65 - 88)
        // Night: 22:00 - 04:00 (Slots 89 - 96 and 1 - 16)
        if (timeHorizon === 'morning') return slot >= 17 && slot <= 36;
        if (timeHorizon === 'solar') return slot >= 37 && slot <= 64;
        if (timeHorizon === 'evening') return slot >= 65 && slot <= 88;
        if (timeHorizon === 'night') return slot > 88 || slot <= 16;
        return true;
      });
    }

    return filtered.map((d, index) => {
      const slotNum = d.intervalNumber ?? index + 1;
      const displayLabel = d.timeBlock || (d.hour ? `${d.hour}:00` : d.date);

      // Parse priceRange e.g. "9.7 - 10.0"
      let rangeMin: number | null = null;
      let rangeMax: number | null = null;
      let rangeSpread: number | null = null;

      if (d.priceRange && typeof d.priceRange === 'string' && d.priceRange.includes('-')) {
        const parts = d.priceRange.split('-').map(p => parseFloat(p.trim()));
        if (!isNaN(parts[0]) && !isNaN(parts[1])) {
          let p0 = parts[0];
          let p1 = parts[1];
          // Critical unit alignment: GdamMcpForecast stores priceRange in Rs/MWh (e.g. 9650 - 10000).
          // Convert to Rs/kWh (e.g. 9.65 - 10.00) so it matches MCP units (Rs/kWh) and does not distort Y-axis!
          if (p0 > 50 || p1 > 50) {
            p0 = p0 / 1000.0;
            p1 = p1 / 1000.0;
          }
          rangeMin = parseFloat(p0.toFixed(2));
          rangeMax = parseFloat(p1.toFixed(2));
          rangeSpread = Math.max(0, parseFloat((rangeMax - rangeMin).toFixed(2)));
        }
      }

      // Fallback for RTM dayahead / nowcast range
      if (subType === 'rtm' && (!rangeMin || !rangeMax)) {
        const pr = rtmForecastType === 'dayahead'
          ? (d.priceRangeDayahead || d.priceRange)
          : rtmForecastType === 'nowcast'
          ? (d.priceRangeNowcast || d.priceRange)
          : (d.priceRangeDayahead || d.priceRangeNowcast || d.priceRange);
        if (pr && typeof pr === 'string' && pr.includes('-')) {
          const parts = pr.split('-').map(p => parseFloat(p.trim()));
          if (!isNaN(parts[0]) && !isNaN(parts[1])) {
            let p0 = parts[0];
            let p1 = parts[1];
            if (p0 > 50 || p1 > 50) {
              p0 = p0 / 1000.0;
              p1 = p1 / 1000.0;
            }
            rangeMin = parseFloat(p0.toFixed(2));
            rangeMax = parseFloat(p1.toFixed(2));
            rangeSpread = Math.max(0, parseFloat((rangeMax - rangeMin).toFixed(2)));
          }
        }
      }

      // Safe numeric conversions
      const mcp = d.mcp !== null && d.mcp !== undefined ? Number(d.mcp) : null;
      const actualMcp = d.actualMcp !== null && d.actualMcp !== undefined ? Number(d.actualMcp) : null;
      const mcpDayahead = d.mcpDayahead !== null && d.mcpDayahead !== undefined ? Number(d.mcpDayahead) : null;
      const mcpNowcast = d.mcpNowcast !== null && d.mcpNowcast !== undefined ? Number(d.mcpNowcast) : null;

      const demand = d.demand !== null && d.demand !== undefined ? Number(d.demand) : null;
      const actualDemand = d.actualDemand !== null && d.actualDemand !== undefined ? Number(d.actualDemand) : null;

      const generation = d.generation !== null && d.generation !== undefined ? Number(d.generation) : null;
      const actualGeneration = d.actualGeneration !== null && d.actualGeneration !== undefined ? Number(d.actualGeneration) : null;

      const mcv = d.mcv !== null && d.mcv !== undefined ? Number(d.mcv) : 0;
      const purchaseBid = d.purchaseBid !== null && d.purchaseBid !== undefined ? Number(d.purchaseBid) : 0;
      const sellBid = d.sellBid !== null && d.sellBid !== undefined ? Number(d.sellBid) : 0;

      // Calculate spread / delta
      let delta = null;
      let deltaPercent = null;
      if (mcp !== null && actualMcp !== null) {
        delta = parseFloat((actualMcp - mcp).toFixed(2));
        if (mcp > 0) {
          deltaPercent = parseFloat(((delta / mcp) * 100).toFixed(1));
        }
      }

      // Safe corridor coordinates for Recharts stacked Area (guaranteed finite numbers to prevent stack calculation crashes)
      const safeRangeMin = rangeMin !== null ? rangeMin : (mcp ?? actualMcp ?? 0);
      const safeRangeSpread = rangeSpread !== null ? rangeSpread : 0;

      return {
        ...d,
        slotNum,
        displayLabel,
        mcp,
        actualMcp,
        mcpDayahead,
        mcpNowcast,
        demand,
        actualDemand,
        generation,
        actualGeneration,
        rangeMin,
        rangeMax,
        rangeSpread,
        safeRangeMin,
        safeRangeSpread,
        mcv,
        purchaseBid,
        sellBid,
        delta,
        deltaPercent
      };
    });
  }, [data, interval, timeHorizon]);

  // Compute robust, safe finite numeric domain for Y-Axis
  const { yMin, yMax, maxVolume, peakForecast, troughForecast } = useMemo(() => {
    let minVal = Infinity;
    let maxVal = -Infinity;
    let maxVol = 0;
    let peak = -Infinity;
    let trough = Infinity;

    processedData.forEach(row => {
      const candidates: number[] = [];

      if (isGeneration) {
        if (typeof row.generation === 'number') candidates.push(row.generation);
        if (typeof row.actualGeneration === 'number') candidates.push(row.actualGeneration);
      } else if (isDemand) {
        if (typeof row.demand === 'number') candidates.push(row.demand);
        if (typeof row.actualDemand === 'number') candidates.push(row.actualDemand);
      } else {
        // Price
        if (subType === 'rtm') {
          if (typeof row.mcpDayahead === 'number') candidates.push(row.mcpDayahead);
          if (typeof row.mcpNowcast === 'number') candidates.push(row.mcpNowcast);
          if (typeof row.actualMcp === 'number') candidates.push(row.actualMcp);
        } else {
          if (typeof row.mcp === 'number') candidates.push(row.mcp);
          if (typeof row.actualMcp === 'number') candidates.push(row.actualMcp);
        }
        if (typeof row.rangeMin === 'number') candidates.push(row.rangeMin);
        if (typeof row.rangeMax === 'number') candidates.push(row.rangeMax);
      }

      candidates.forEach(v => {
        if (!isNaN(v)) {
          minVal = Math.min(minVal, v);
          maxVal = Math.max(maxVal, v);
        }
      });

      // Volume tracking
      if (typeof row.mcv === 'number') maxVol = Math.max(maxVol, row.mcv);
      if (typeof row.purchaseBid === 'number') maxVol = Math.max(maxVol, row.purchaseBid);
      if (typeof row.sellBid === 'number') maxVol = Math.max(maxVol, row.sellBid);

      // Peak & Trough of forecast or actual
      const fVal = (row.mcp ?? row.mcpDayahead ?? row.demand ?? row.generation) ?? (row.actualMcp ?? row.actualDemand ?? row.actualGeneration);
      if (typeof fVal === 'number' && !isNaN(fVal)) {
        peak = Math.max(peak, fVal);
        trough = Math.min(trough, fVal);
      }
    });

    if (minVal === Infinity || maxVal === -Infinity) {
      return { yMin: 0, yMax: 15, maxVolume: 100, peakForecast: 0, troughForecast: 0 };
    }

    const span = maxVal - minVal;
    const padding = span === 0 ? Math.max(1, maxVal * 0.15) : Math.max(0.5, span * 0.12);

    return {
      yMin: Math.max(0, parseFloat((minVal - padding).toFixed(2))),
      yMax: parseFloat((maxVal + padding).toFixed(2)),
      maxVolume: Math.max(100, Math.ceil(maxVol * 1.25)),
      peakForecast: peak === -Infinity ? 0 : peak,
      troughForecast: trough === Infinity ? 0 : trough
    };
  }, [processedData, isGeneration, isDemand, subType]);

  // Telemetry presence guards
  const hasCorridorData = useMemo(() => {
    return processedData.some(
      d => typeof d.rangeMin === 'number' && typeof d.rangeSpread === 'number' && d.rangeSpread > 0
    );
  }, [processedData]);

  const hasForecastData = useMemo(() => {
    return processedData.some(d => {
      const v = isGeneration ? d.generation : isDemand ? d.demand : (subType === 'rtm' ? (d.mcpDayahead ?? d.mcpNowcast) : d.mcp);
      return typeof v === 'number' && !isNaN(v) && v > 0;
    });
  }, [processedData, isGeneration, isDemand, subType]);

  const hasActualData = useMemo(() => {
    return processedData.some(d => {
      const v = isGeneration ? d.actualGeneration : isDemand ? d.actualDemand : d.actualMcp;
      return typeof v === 'number' && !isNaN(v) && v > 0;
    });
  }, [processedData, isGeneration, isDemand]);

  // Unit string
  const unitLabel = useMemo(() => {
    if (isGeneration) return 'MW';
    if (isDemand) return subType === 'consumer' ? 'kVA' : 'MW';
    return '₹/kWh';
  }, [isGeneration, isDemand, subType]);

  // Formatter for Y-Axis
  const formatYAxisTick = (val: number) => {
    if (isGeneration || isDemand) {
      if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
      return `${Math.round(val)}`;
    }
    return `₹${val.toFixed(1)}`;
  };

  // Custom Futuristic Glassmorphic HUD Tooltip
  const CustomHUDTooltip = ({ active, payload, label }: any) => {
    try {
      if (!active || !payload || !payload.length) return null;

      const rowData = payload[0]?.payload as ForecastDataPoint & {
        slotNum?: number;
        delta?: number;
        deltaPercent?: number;
      };

      if (!rowData) return null;

      const conf = rowData.confidence ? String(rowData.confidence) : null;
      const slotNumber = rowData.slotNum ?? '?';
      const timeText = rowData.timeBlock || label;
      const fPrice = rowData.mcp ?? (subType === 'rtm' ? (rowData.mcpDayahead ?? rowData.mcpNowcast) : null);
      const aPrice = rowData.actualMcp;
      const diff = rowData.delta;
      const diffPct = rowData.deltaPercent;
      const rangeText = (rowData.rangeMin !== null && rowData.rangeMin !== undefined && rowData.rangeMax !== null && rowData.rangeMax !== undefined && (rowData.rangeSpread ?? 0) > 0)
        ? `₹${rowData.rangeMin.toFixed(2)} - ₹${rowData.rangeMax.toFixed(2)}`
        : (rowData.priceRange && rowData.priceRange !== 'N/A' ? (rowData.priceRange.startsWith('₹') ? rowData.priceRange : `₹${rowData.priceRange}`) : null);

    return (
      <Box
        sx={{
          bgcolor: isDark ? 'rgba(10, 16, 30, 0.94)' : 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(16px)',
          border: '1px solid',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(139, 92, 246, 0.25)',
          borderRadius: 2.5,
          p: 2,
          boxShadow: isDark
            ? '0 20px 40px -10px rgba(0, 0, 0, 0.7), 0 0 25px rgba(139, 92, 246, 0.18)'
            : '0 20px 35px -8px rgba(139, 92, 246, 0.18), 0 4px 12px rgba(0, 0, 0, 0.05)',
          minWidth: 260,
          pointerEvents: 'none'
        }}
      >
        {/* Header: Slot Badge & Time */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1.25, mb: 1.25, borderBottom: '1px solid', borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: 1,
                bgcolor: alpha(accentColor, isDark ? 0.2 : 0.12),
                color: accentColor,
                fontWeight: 700,
                fontSize: '11px',
                fontFamily: 'var(--font-mono, monospace)'
              }}
            >
              SLOT #{String(slotNumber).padStart(2, '0')}
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 700, color: isDark ? '#F8FAFC' : '#0F172A', fontFamily: 'var(--font-mono, monospace)', fontSize: '13px' }}>
              {timeText}
            </Typography>
          </Box>
          {conf && (
            <Chip
              label={`Conf ${conf}`}
              size="small"
              sx={{
                height: 20,
                fontSize: '10px',
                fontWeight: 700,
                bgcolor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                color: '#10B981',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}
            />
          )}
        </Box>

        {/* Metrics Grid */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* Forecast Metric */}
          {fPrice !== null && fPrice !== undefined && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: accentColor, boxShadow: `0 0 8px ${accentColor}` }} />
                <Typography variant="caption" sx={{ color: isDark ? '#94A3B8' : '#64748B', fontWeight: 600 }}>
                  Forecasted Price
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 800, color: isDark ? '#FFF' : '#0F172A', fontFamily: 'var(--font-mono, monospace)' }}>
                ₹{fPrice.toFixed(2)}
                <Typography component="span" variant="caption" sx={{ color: isDark ? '#64748B' : '#94A3B8', ml: 0.5, fontSize: '10px' }}>
                  /kWh
                </Typography>
              </Typography>
            </Box>
          )}

          {/* Actual Realized Metric */}
          {aPrice !== null && aPrice !== undefined && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10B981', boxShadow: '0 0 8px #10B981' }} />
                <Typography variant="caption" sx={{ color: isDark ? '#94A3B8' : '#64748B', fontWeight: 600 }}>
                  Actual Realized
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 800, color: '#10B981', fontFamily: 'var(--font-mono, monospace)' }}>
                ₹{aPrice.toFixed(2)}
                <Typography component="span" variant="caption" sx={{ color: isDark ? '#64748B' : '#94A3B8', ml: 0.5, fontSize: '10px' }}>
                  /kWh
                </Typography>
              </Typography>
            </Box>
          )}

          {/* Demand or Generation specific metrics */}
          {isDemand && rowData.demand !== null && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: accentColor }} />
                <Typography variant="caption" sx={{ color: isDark ? '#94A3B8' : '#64748B', fontWeight: 600 }}>
                  Forecasted Demand
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 800, color: isDark ? '#FFF' : '#0F172A', fontFamily: 'var(--font-mono, monospace)' }}>
                {Number(rowData.demand).toLocaleString('en-IN')} {unitLabel}
              </Typography>
            </Box>
          )}

          {/* Variance / Spread Indicator */}
          {typeof diff === 'number' && !isNaN(diff) && (
            <Box
              sx={{
                mt: 0.5,
                pt: 1,
                borderTop: '1px dashed',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Typography variant="caption" sx={{ color: isDark ? '#94A3B8' : '#64748B', fontWeight: 600 }}>
                Spread (Actual - Forecast)
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono, monospace)',
                    color: Math.abs(diff) <= 0.3 ? '#10B981' : diff > 0 ? '#F59E0B' : '#3B82F6'
                  }}
                >
                  {diff >= 0 ? `+₹${diff.toFixed(2)}` : `-₹${Math.abs(diff).toFixed(2)}`}
                  {typeof diffPct === 'number' && !isNaN(diffPct) && ` (${diffPct > 0 ? '+' : ''}${diffPct}%)`}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Expected Corridor */}
          {rangeText && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: isDark ? '#64748B' : '#94A3B8', fontSize: '11px' }}>
                95% Expected Corridor
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, color: accentColor, fontFamily: 'var(--font-mono, monospace)', fontSize: '11px' }}>
                {rangeText}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    );
    } catch (err) {
      console.warn("HUD Tooltip rendering error:", err);
      return null;
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.75 },
        borderRadius: 3.5,
        border: '1px solid',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.09)' : 'rgba(226, 232, 240, 0.9)',
        bgcolor: isDark ? 'rgba(14, 20, 34, 0.85)' : '#FFFFFF',
        backdropFilter: 'blur(20px)',
        boxShadow: isDark
          ? '0 12px 30px -10px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          : '0 10px 25px -8px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        width: '100%',
        minHeight: { xs: 520, sm: 560 },
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* Top Ambient Glow Gradient */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: '10%',
          right: '10%',
          height: '2px',
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          opacity: 0.8,
          pointerEvents: 'none'
        }}
      />

      {/* Header Bar */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          mb: 2.5
        }}
      >
        {/* Title & Metadata */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2.5,
              bgcolor: alpha(accentColor, isDark ? 0.2 : 0.1),
              border: `1px solid ${alpha(accentColor, 0.3)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: accentColor,
              boxShadow: `0 0 16px ${alpha(accentColor, 0.2)}`
            }}
          >
            <Activity size={22} />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: '16px', sm: '19px' },
                  fontWeight: 800,
                  letterSpacing: '-0.4px',
                  color: isDark ? '#F8FAFC' : '#001356'
                }}
              >
                {title}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: isDark ? '#94A3B8' : '#64748B', display: 'block', mt: 0.25 }}>
              {subtitle || `96-block predictive resolution with 95% confidence corridor for ${dateRangeLabel}`}
            </Typography>
            {!hasForecastData && hasActualData && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#10B981', boxShadow: '0 0 6px #10B981' }} />
                <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 600, fontSize: '11px' }}>
                  Realized settlement curve active. Archival forecast ingestion sync pending for selected date.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Action Controls & Legend Toggles */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
          {/* Quick Slot Horizon Jumpers */}
          {interval === '15min' && (
            <Box
              sx={{
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                p: 0.5,
                borderRadius: 2,
                border: '1px solid',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                gap: 0.5
              }}
            >
              {[
                { id: 'all', label: 'All 96 Slots' },
                { id: 'morning', label: 'Morning (04-09h)' },
                { id: 'solar', label: 'Solar (09-16h)' },
                { id: 'evening', label: 'Evening (16-22h)' },
                { id: 'night', label: 'Night (22-04h)' }
              ].map(h => (
                <Button
                  key={h.id}
                  size="small"
                  onClick={() => setTimeHorizon(h.id as any)}
                  sx={{
                    px: 1.25,
                    py: 0.25,
                    minWidth: 'auto',
                    fontSize: '11px',
                    fontWeight: timeHorizon === h.id ? 700 : 500,
                    textTransform: 'none',
                    borderRadius: 1.5,
                    color: timeHorizon === h.id ? '#FFF' : isDark ? '#94A3B8' : '#64748B',
                    bgcolor: timeHorizon === h.id ? accentColor : 'transparent',
                    '&:hover': {
                      bgcolor: timeHorizon === h.id ? accentColor : isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)'
                    }
                  }}
                >
                  {h.label}
                </Button>
              ))}
            </Box>
          )}

          {/* Series Visibility Toggles */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            {/* Forecast toggle */}
            {hasForecastData && (
              <Chip
                onClick={() => setShowForecast(!showForecast)}
                label="Forecasted"
                size="small"
                sx={{
                  height: 26,
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  bgcolor: showForecast ? alpha(accentColor, isDark ? 0.25 : 0.15) : 'transparent',
                  color: showForecast ? accentColor : isDark ? '#64748B' : '#94A3B8',
                  border: '1px solid',
                  borderColor: showForecast ? alpha(accentColor, 0.4) : isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                }}
              />
            )}

            {/* Actual toggle */}
            {hasActualData && (
              <Chip
                onClick={() => setShowActual(!showActual)}
                label="Actual Realized"
                size="small"
                sx={{
                  height: 26,
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  bgcolor: showActual ? (isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.12)') : 'transparent',
                  color: showActual ? '#10B981' : isDark ? '#64748B' : '#94A3B8',
                  border: '1px solid',
                  borderColor: showActual ? 'rgba(16, 185, 129, 0.4)' : isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                }}
              />
            )}

            {/* Confidence corridor toggle (price only) */}
            {isPrice && hasCorridorData && (
              <Chip
                onClick={() => setShowCorridor(!showCorridor)}
                label="Confidence Band"
                size="small"
                sx={{
                  height: 26,
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  bgcolor: showCorridor ? (isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)') : 'transparent',
                  color: showCorridor ? '#6366F1' : isDark ? '#64748B' : '#94A3B8',
                  border: '1px solid',
                  borderColor: showCorridor ? 'rgba(99, 102, 241, 0.35)' : isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                }}
              />
            )}
          </Box>
        </Box>
      </Box>

      {/* Main Chart Canvas Container - GUARANTEED HEIGHT & RESPONSIVENESS */}
      {processedData.length === 0 ? (
        <Box sx={{ py: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', flexGrow: 1 }}>
          <Activity size={42} style={{ opacity: 0.3, marginBottom: 12, color: accentColor }} />
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, color: isDark ? '#F8FAFC' : '#0F172A' }}>
            No Forecast Intervals Available
          </Typography>
          <Typography variant="body2" sx={{ color: isDark ? '#94A3B8' : '#64748B', maxWidth: 420 }}>
            No trajectory data could be retrieved for {dateRangeLabel}. Please choose another market date or refresh.
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            width: '100%',
            height: { xs: 390, sm: 430 },
            minHeight: { xs: 390, sm: 430 },
            position: 'relative',
            display: 'block',
            flexGrow: 1
          }}
        >
          <ResponsiveContainer width="100%" height="100%" minHeight={380}>
            <ComposedChart
              data={processedData}
              margin={{ top: 15, right: 25, left: 0, bottom: 10 }}
            >
              <defs>
                {/* Primary Forecast Gradient */}
                <linearGradient id="forecastNeonGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accentColor} stopOpacity={0.45} />
                  <stop offset="50%" stopColor={accentColor} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={accentColor} stopOpacity={0.0} />
                </linearGradient>

                {/* Corridor Ribbon Gradient */}
                <linearGradient id="corridorRibbonGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accentColor} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={accentColor} stopOpacity={0.04} />
                </linearGradient>

                {/* Actual Curve Gradient */}
                <linearGradient id="actualEmeraldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>

                {/* Volume Column Gradient */}
                <linearGradient id="volumeBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.1} />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)'}
              />

              {/* X-Axis */}
              <XAxis
                dataKey="displayLabel"
                tickLine={false}
                axisLine={{ stroke: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)' }}
                tick={{
                  fontSize: 11,
                  fill: isDark ? '#94A3B8' : '#64748B',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: 500
                }}
                interval={interval === '15min' ? (timeHorizon === 'all' ? 7 : 3) : 2}
                dy={8}
              />

              {/* Primary Y-Axis (Price / Demand / Generation) */}
              <YAxis
                yAxisId="primaryAxis"
                domain={[yMin, yMax]}
                tickFormatter={formatYAxisTick}
                tickLine={false}
                axisLine={false}
                width={52}
                tick={{
                  fontSize: 11,
                  fill: isDark ? '#94A3B8' : '#64748B',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: 600
                }}
              />

              {/* Optional Volume Y-Axis */}
              {showVolume && (
                <YAxis
                  yAxisId="volumeAxis"
                  orientation="right"
                  domain={[0, maxVolume]}
                  tickFormatter={(v) => `${Math.round(v)} MW`}
                  tickLine={false}
                  axisLine={false}
                  width={55}
                  tick={{
                    fontSize: 10,
                    fill: '#3B82F6',
                    fontFamily: 'var(--font-mono, monospace)'
                  }}
                />
              )}

              {/* Interactive HUD Tooltip */}
              <RechartsTooltip content={<CustomHUDTooltip />} />

              {/* Volume Bars (if toggled) */}
              {showVolume && (
                <Bar
                  yAxisId="volumeAxis"
                  dataKey="mcv"
                  name="Market Clearing Volume (MCV)"
                  fill="url(#volumeBarGrad)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={8}
                />
              )}

              {/* Confidence Corridor Band (Price only, if valid corridor data exists) */}
              {isPrice && showCorridor && hasCorridorData && (
                <>
                  <Area
                    yAxisId="primaryAxis"
                    type="monotone"
                    dataKey="safeRangeMin"
                    stackId="confidenceBand"
                    stroke="none"
                    fill="transparent"
                    legendType="none"
                    connectNulls={true}
                    isAnimationActive={false}
                  />
                  <Area
                    yAxisId="primaryAxis"
                    type="monotone"
                    dataKey="safeRangeSpread"
                    stackId="confidenceBand"
                    name="95% Confidence Corridor"
                    stroke={alpha(accentColor, 0.3)}
                    strokeDasharray="2 2"
                    fill="url(#corridorRibbonGrad)"
                    connectNulls={true}
                    isAnimationActive={false}
                  />
                </>
              )}

              {/* Demand Mode */}
              {isDemand && (
                <>
                  {showForecast && hasForecastData && (
                    <Area
                      yAxisId="primaryAxis"
                      type="monotone"
                      dataKey="demand"
                      name="Forecasted Demand"
                      stroke={accentColor}
                      strokeWidth={2.5}
                      fill="url(#forecastNeonGrad)"
                      dot={false}
                      connectNulls={true}
                      activeDot={{ r: 5, fill: accentColor, stroke: '#FFF', strokeWidth: 2 }}
                    />
                  )}
                  {showActual && (
                    <Area
                      yAxisId="primaryAxis"
                      type="monotone"
                      dataKey="actualDemand"
                      name="Actual Demand"
                      stroke="#10B981"
                      strokeWidth={2.2}
                      fill={!hasForecastData ? "url(#actualEmeraldGrad)" : "none"}
                      dot={false}
                      activeDot={{ r: 5, fill: '#10B981', stroke: '#FFF', strokeWidth: 2 }}
                      connectNulls={true}
                    />
                  )}
                </>
              )}

              {/* Generation Mode */}
              {isGeneration && (
                <>
                  {showForecast && hasForecastData && (
                    <Line
                      yAxisId="primaryAxis"
                      type="monotone"
                      dataKey="generation"
                      name="Total Forecasted Gen"
                      stroke={accentColor}
                      strokeWidth={2.5}
                      dot={false}
                      connectNulls={true}
                      activeDot={{ r: 5, fill: accentColor, stroke: '#FFF', strokeWidth: 2 }}
                    />
                  )}
                  {showActual && (
                    <Area
                      yAxisId="primaryAxis"
                      type="monotone"
                      dataKey="actualGeneration"
                      name="Actual Generation"
                      stroke="#10B981"
                      strokeWidth={2.2}
                      fill={!hasForecastData ? "url(#actualEmeraldGrad)" : "none"}
                      dot={false}
                      activeDot={{ r: 5, fill: '#10B981', stroke: '#FFF', strokeWidth: 2 }}
                      connectNulls={true}
                    />
                  )}
                </>
              )}

              {/* Standard Price Mode (DAM & GDAM) */}
              {isPrice && subType !== 'rtm' && (
                <>
                  {showForecast && hasForecastData && (
                    <Area
                      yAxisId="primaryAxis"
                      type="monotone"
                      dataKey="mcp"
                      name="Forecasted MCP"
                      stroke={accentColor}
                      strokeWidth={2.5}
                      fill="url(#forecastNeonGrad)"
                      dot={false}
                      connectNulls={true}
                      activeDot={{
                        r: 5,
                        fill: accentColor,
                        stroke: isDark ? '#0E1422' : '#FFFFFF',
                        strokeWidth: 2
                      }}
                    />
                  )}
                  {showActual && (
                    <Area
                      yAxisId="primaryAxis"
                      type="monotone"
                      dataKey="actualMcp"
                      name="Actual Realized MCP"
                      stroke="#10B981"
                      strokeWidth={2.4}
                      fill={!hasForecastData ? "url(#actualEmeraldGrad)" : "none"}
                      dot={false}
                      activeDot={{
                        r: 5,
                        fill: '#10B981',
                        stroke: isDark ? '#0E1422' : '#FFFFFF',
                        strokeWidth: 2
                      }}
                      connectNulls={true}
                    />
                  )}
                </>
              )}

              {/* RTM Price Mode (Dayahead vs Nowcast vs Actual) */}
              {isPrice && subType === 'rtm' && (
                <>
                  {(rtmForecastType === 'both' || rtmForecastType === 'dayahead') && showForecast && hasForecastData && (
                    <Line
                      yAxisId="primaryAxis"
                      type="monotone"
                      dataKey="mcpDayahead"
                      name="Dayahead Forecast"
                      stroke="#3B82F6"
                      strokeWidth={2.2}
                      dot={false}
                      activeDot={{ r: 5, fill: '#3B82F6', stroke: '#FFF', strokeWidth: 2 }}
                      connectNulls={true}
                    />
                  )}
                  {(rtmForecastType === 'both' || rtmForecastType === 'nowcast') && showForecast && hasForecastData && (
                    <Area
                      yAxisId="primaryAxis"
                      type="monotone"
                      dataKey="mcpNowcast"
                      name="Nowcast Forecast"
                      stroke={accentColor}
                      strokeWidth={2.4}
                      fill="url(#forecastNeonGrad)"
                      dot={false}
                      activeDot={{ r: 5, fill: accentColor, stroke: '#FFF', strokeWidth: 2 }}
                      connectNulls={true}
                    />
                  )}
                  {showActual && (
                    <Area
                      yAxisId="primaryAxis"
                      type="monotone"
                      dataKey="actualMcp"
                      name="Actual Realized"
                      stroke="#10B981"
                      strokeWidth={2.2}
                      fill={!hasForecastData ? "url(#actualEmeraldGrad)" : "none"}
                      dot={false}
                      activeDot={{ r: 5, fill: '#10B981', stroke: '#FFF', strokeWidth: 2 }}
                      connectNulls={true}
                    />
                  )}
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
      )}

      {/* Quick Statistics Terminal Footer */}
      <Box
        sx={{
          mt: 2,
          pt: 1.5,
          borderTop: '1px solid',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.06)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp size={14} style={{ color: accentColor }} />
            <Typography variant="caption" sx={{ color: isDark ? '#94A3B8' : '#64748B', fontWeight: 600 }}>
              {hasForecastData ? 'Peak Forecast:' : 'Peak Realized:'}{' '}
              <Typography component="span" variant="caption" sx={{ color: isDark ? '#F8FAFC' : '#0F172A', fontWeight: 800, fontFamily: 'var(--font-mono, monospace)' }}>
                {isPrice ? `₹${peakForecast.toFixed(2)}` : `${peakForecast.toLocaleString('en-IN')} ${unitLabel}`}
              </Typography>
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingDown size={14} style={{ color: '#06B6D4' }} />
            <Typography variant="caption" sx={{ color: isDark ? '#94A3B8' : '#64748B', fontWeight: 600 }}>
              {hasForecastData ? 'Trough Forecast:' : 'Trough Realized:'}{' '}
              <Typography component="span" variant="caption" sx={{ color: isDark ? '#F8FAFC' : '#0F172A', fontWeight: 800, fontFamily: 'var(--font-mono, monospace)' }}>
                {isPrice ? `₹${troughForecast.toFixed(2)}` : `${troughForecast.toLocaleString('en-IN')} ${unitLabel}`}
              </Typography>
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Layers size={14} style={{ color: '#10B981' }} />
            <Typography variant="caption" sx={{ color: isDark ? '#94A3B8' : '#64748B', fontWeight: 600 }}>
              Intervals Loaded:{' '}
              <Typography component="span" variant="caption" sx={{ color: '#10B981', fontWeight: 800, fontFamily: 'var(--font-mono, monospace)' }}>
                {processedData.length} of {data.length} Blocks
              </Typography>
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="caption" sx={{ color: isDark ? '#64748B' : '#94A3B8', fontSize: '11px' }}>
            Model Algorithm: <strong style={{ color: isDark ? '#CBD5E1' : '#475569' }}>LightGBM Ensemble + Prophet v2.4</strong>
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}
