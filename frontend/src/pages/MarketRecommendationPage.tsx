import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Button, 
  CircularProgress, 
  Alert,
  Tooltip,
  Chip,
  IconButton,
  LinearProgress,
  alpha
} from '@mui/material';
import { 
  PriceCheck as PriceCheckIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  CalendarToday as CalendarTodayIcon,
  Info as InfoIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { Zap, Award, Sparkles, TrendingUp, Activity } from 'lucide-react';
import DateRangePicker from '../components/common/DateRangePicker';
import ActionButton from '../components/common/ActionButton';
import { useTheme } from '../components/ThemeProvider';
import apiClient from '../api/apiClient';
import './MarketRecommendationPage.css';

interface HistoryRecord {
  date: string;
  dam: number | null;
  rtm: number | null;
  gdam: number | null;
}

interface SlotData {
  tod: string;
  season: string;
  prediction: string;
  savings: number;
  history: HistoryRecord[];
  dam_mean: number;
  rtm_mean: number;
  gdam_mean: number;
}

interface DayResult {
  date: string;
  slots: SlotData[];
}

export default function MarketRecommendationPage() {
  const { isDark } = useTheme();

  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getDaysAheadStr = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const tomorrowStr = getDaysAheadStr(1);
  const endForecastStr = getDaysAheadStr(7);

  // States
  const [startDate, setStartDate] = useState<string>(tomorrowStr);
  const [endDate, setEndDate] = useState<string>(tomorrowStr);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<DayResult[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);

  const fetchPredictions = async (start: string, end: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/forecast/market-selection?startDate=${start}&endDate=${end}`);
      if (response.data && response.data.success && response.data.data.results) {
        const data = response.data.data.results;
        if (data.length === 0) {
          throw new Error('No forecasting data returned for the selected date range.');
        }
        setResults(data);
        setCurrentPageIndex(0);
      } else {
        throw new Error(response.data?.message || 'Failed to fetch predictions from server.');
      }
    } catch (err: any) {
      console.error('[MarketRecommendationPage] Fetch error:', err);
      setError(err.message || 'Failed to load market recommendation data. Please ensure backend services are running.');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial Fetch
  useEffect(() => {
    fetchPredictions(tomorrowStr, tomorrowStr);
  }, []);

  const handleSearch = () => {
    fetchPredictions(startDate, endDate);
  };

  const handlePrevDay = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
    }
  };

  const handleNextDay = () => {
    if (currentPageIndex < results.length - 1) {
      setCurrentPageIndex(prev => prev + 1);
    }
  };

  // Format YYYY-MM-DD to DD-MM-YYYY (Day)
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = days[dateObj.getDay()];
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}-${parts[1]}-${parts[0]} (${dayName})`;
  };

  // Calculations for current day's summary
  const currentDayData = results[currentPageIndex];
  
  const summary = useMemo(() => {
    if (!currentDayData) return null;

    const todSlots = currentDayData.slots.filter(s => s.tod.startsWith('TOD'));
    const marketSavings: Record<string, number> = { 'DAM': 0, 'RTM': 0, 'GDAM': 0 };
    let totalDailySavings = 0;

    todSlots.forEach(slot => {
      if (marketSavings[slot.prediction] !== undefined) {
        marketSavings[slot.prediction] += slot.savings;
      }
      totalDailySavings += slot.savings;
    });

    let bestMarket = 'DAM';
    let maxMarketSavings = -1;
    for (const m in marketSavings) {
      if (marketSavings[m] > maxMarketSavings) {
        maxMarketSavings = marketSavings[m];
        bestMarket = m;
      }
    }

    // Confidence heuristic
    let confidence = 35 + (totalDailySavings / 1000) * 55;
    if (confidence > 98.5) confidence = 98.5;
    if (confidence < 35) confidence = 35;

    let confText = 'Low';
    let confColor = '#EF4444'; // Red
    if (confidence > 75) {
      confText = 'High';
      confColor = '#10B981'; // Green
    } else if (confidence > 55) {
      confText = 'Medium';
      confColor = '#F59E0B'; // Orange
    }

    return {
      bestMarket,
      totalDailySavings,
      confidence,
      confText,
      confColor
    };
  }, [currentDayData]);

  // TOD configurations for display
  const todDetails: Record<string, { time: string; type: string; color: string; bg: string }> = {
    'TOD-1': { time: '05:00-10:00', type: 'Off Peak', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
    'TOD-2': { time: '10:00-19:00', type: 'Normal', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)' },
    'TOD-3': { time: '19:00-03:00', type: 'Peak', color: '#F43F5E', bg: 'rgba(244, 63, 94, 0.12)' },
    'TOD-4': { time: '03:00-05:00', type: 'Normal', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)' },
    'RTC':   { time: '00:00-24:00', type: 'Round The Clock', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)' }
  };

  const markets = ['RTM', 'DAM', 'GDAM'];
  const marketKeys: ('rtm' | 'dam' | 'gdam')[] = ['rtm', 'dam', 'gdam'];

  // Format currency
  const formatCurrency = (val: number | null | undefined) => {
    return val != null && val > 0 ? `₹${val.toFixed(1)}` : 'N/A';
  };

  return (
    <Box sx={{ position: 'relative', minHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Moving Background Blobs */}
      <div className="mrf-background-mesh">
        <div className="mrf-mesh-blob mrf-blob-1"></div>
        <div className="mrf-mesh-blob mrf-blob-2"></div>
        <div className="mrf-mesh-blob mrf-blob-3"></div>
      </div>

      {/* Header section */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2.5,
        zIndex: 2,
        position: 'relative'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ 
            color: '#10B981', 
            backgroundColor: alpha('#10B981', isDark ? 0.2 : 0.1),
            border: `1px solid ${alpha('#10B981', 0.25)}`,
            p: 1.5,
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 20px ${alpha('#10B981', 0.2)}`
          }}>
            <PriceCheckIcon fontSize="medium" />
          </Box>
          <Box>
            <Typography variant="h1" sx={{ 
              color: isDark ? '#F8FAFC' : '#001356', 
              fontWeight: 800, 
              fontSize: { xs: '22px', sm: '26px' }, 
              letterSpacing: '-0.6px', 
              mb: 0.25 
            }}>
              Market Recommendation
            </Typography>
            <Typography variant="body2" sx={{ color: isDark ? '#94A3B8' : '#64748B' }}>
              AI-driven daily recommendations across DAM, RTM, and GDAM to optimize procurement costs.
            </Typography>
          </Box>
        </Box>

        {/* Date Filter & Search */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box className="mrf-picker-container">
            <Typography variant="caption" sx={{ color: isDark ? '#94A3B8' : '#64748B', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Forecast Range:
            </Typography>
            <DateRangePicker 
              startDate={startDate}
              endDate={endDate}
              onChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
              minDate={tomorrowStr}
              maxDate={endForecastStr}
              maxDays={7}
            />
            <Button 
              variant="contained" 
              onClick={handleSearch}
              sx={{ 
                bgcolor: '#10B981', 
                color: '#fff',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: '10px',
                px: 2.75,
                py: 0.75,
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                '&:hover': { bgcolor: '#059669', boxShadow: '0 6px 18px rgba(16, 185, 129, 0.45)' }
              }}
            >
              Submit
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Main Content Area */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', zIndex: 2 }}>
          <CircularProgress sx={{ color: '#10B981' }} size={50} />
        </Box>
      ) : error ? (
        <Box sx={{ zIndex: 2 }}>
          <Alert severity="error" variant="filled" sx={{ borderRadius: 3, py: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>Error Fetching Recommendation</Typography>
            <Typography variant="body2">{error}</Typography>
          </Alert>
        </Box>
      ) : currentDayData ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, zIndex: 2 }}>
          
          {/* Day Switcher Toolbar */}
          <Paper className="mrf-glass-card" sx={{ p: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button 
              variant="outlined"
              startIcon={<ChevronLeftIcon />}
              onClick={handlePrevDay}
              disabled={currentPageIndex === 0}
              sx={{ 
                color: isDark ? '#F8FAFC' : '#0F172A', 
                borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)', 
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '13px',
                borderRadius: '10px',
                '&:hover': { 
                  borderColor: '#10B981', 
                  bgcolor: alpha('#10B981', 0.08) 
                }
              }}
            >
              Previous Day
            </Button>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box sx={{ 
                p: 0.75, 
                borderRadius: 2, 
                bgcolor: alpha('#10B981', isDark ? 0.2 : 0.1), 
                color: '#10B981',
                display: 'flex',
                alignItems: 'center'
              }}>
                <CalendarTodayIcon sx={{ fontSize: 18 }} />
              </Box>
              <Typography variant="h5" sx={{ 
                fontWeight: 800, 
                color: isDark ? '#F8FAFC' : '#0F172A', 
                fontSize: { xs: '15px', sm: '17px' },
                letterSpacing: '-0.3px',
                fontFamily: 'var(--font-mono, monospace)'
              }}>
                Predictions for: {formatDisplayDate(currentDayData.date)}
              </Typography>
            </Box>

            <Button 
              variant="outlined"
              endIcon={<ChevronRightIcon />}
              onClick={handleNextDay}
              disabled={currentPageIndex === results.length - 1}
              sx={{ 
                color: isDark ? '#F8FAFC' : '#0F172A', 
                borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)', 
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '13px',
                borderRadius: '10px',
                '&:hover': { 
                  borderColor: '#10B981', 
                  bgcolor: alpha('#10B981', 0.08) 
                }
              }}
            >
              Next Day
            </Button>
          </Paper>

          {/* Daily Summary Enterprise KPI Cards (3 Grid) */}
          {summary && (
            <Grid container spacing={2}>
              {/* Card 1: Recommended Market */}
              <Grid item xs={12} md={4}>
                <Paper className="mrf-glass-card" sx={{ p: 2.5, minHeight: 135, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="caption" sx={{ color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, fontSize: '11px' }}>
                      Recommended Daily Market
                    </Typography>
                    <Box sx={{ 
                      width: 34, 
                      height: 34, 
                      borderRadius: 2, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      bgcolor: summary.bestMarket === 'RTM' ? alpha('#8B5CF6', 0.15) : summary.bestMarket === 'DAM' ? alpha('#3B82F6', 0.15) : alpha('#10B981', 0.15),
                      color: summary.bestMarket === 'RTM' ? '#8B5CF6' : summary.bestMarket === 'DAM' ? '#3B82F6' : '#10B981'
                    }}>
                      <Award size={18} />
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="h2" sx={{ 
                      fontWeight: 900, 
                      fontSize: '32px',
                      color: summary.bestMarket === 'RTM' ? '#8B5CF6' : summary.bestMarket === 'DAM' ? '#3B82F6' : '#10B981',
                      letterSpacing: '-0.8px',
                      fontFamily: 'var(--font-mono, monospace)'
                    }}>
                      {summary.bestMarket}
                    </Typography>
                    <Chip 
                      label="Optimal Settlement"
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '10px',
                        fontWeight: 700,
                        bgcolor: alpha(summary.bestMarket === 'RTM' ? '#8B5CF6' : summary.bestMarket === 'DAM' ? '#3B82F6' : '#10B981', 0.12),
                        color: summary.bestMarket === 'RTM' ? '#8B5CF6' : summary.bestMarket === 'DAM' ? '#3B82F6' : '#10B981',
                        border: `1px solid ${alpha(summary.bestMarket === 'RTM' ? '#8B5CF6' : summary.bestMarket === 'DAM' ? '#3B82F6' : '#10B981', 0.25)}`
                      }}
                    />
                  </Box>

                  <Typography variant="caption" sx={{ color: isDark ? '#64748B' : '#94A3B8', fontSize: '11px', mt: 1 }}>
                    Highest algorithmic arbitrage & procurement minimization
                  </Typography>
                </Paper>
              </Grid>

              {/* Card 2: Estimated Daily Savings */}
              <Grid item xs={12} md={4}>
                <Paper className="mrf-glass-card" sx={{ p: 2.5, minHeight: 135, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="caption" sx={{ color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, fontSize: '11px' }}>
                      Total Est. Daily Savings
                    </Typography>
                    <Box sx={{ 
                      width: 34, 
                      height: 34, 
                      borderRadius: 2, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      bgcolor: alpha('#10B981', 0.15),
                      color: '#10B981'
                    }}>
                      <Zap size={18} />
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <Typography variant="h2" sx={{ 
                      fontWeight: 900, 
                      fontSize: '32px',
                      color: isDark ? '#10B981' : '#059669', 
                      letterSpacing: '-0.8px',
                      fontFamily: 'var(--font-mono, monospace)'
                    }}>
                      ₹{summary.totalDailySavings.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </Typography>
                    <Typography variant="body2" sx={{ color: isDark ? '#94A3B8' : '#64748B', fontWeight: 700, fontSize: '13px' }}>
                      / MWh
                    </Typography>
                  </Box>

                  <Typography variant="caption" sx={{ color: isDark ? '#64748B' : '#94A3B8', fontSize: '11px', mt: 1 }}>
                    Cumulative spread delta across all scheduled TOD periods
                  </Typography>
                </Paper>
              </Grid>

              {/* Card 3: Model Confidence */}
              <Grid item xs={12} md={4}>
                <Paper className="mrf-glass-card" sx={{ p: 2.5, minHeight: 135, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="caption" sx={{ color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, fontSize: '11px' }}>
                        Model Confidence
                      </Typography>
                      <Tooltip title="Confidence score based on the separation spread of pricing predictions across markets.">
                        <InfoIcon sx={{ fontSize: 14, color: isDark ? '#64748B' : '#94A3B8', cursor: 'pointer' }} />
                      </Tooltip>
                    </Box>
                    <Box sx={{ 
                      width: 34, 
                      height: 34, 
                      borderRadius: 2, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      bgcolor: alpha(summary.confColor, 0.15),
                      color: summary.confColor
                    }}>
                      <Sparkles size={18} />
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="h2" sx={{ 
                      fontWeight: 900, 
                      fontSize: '32px',
                      color: summary.confColor, 
                      letterSpacing: '-0.8px',
                      fontFamily: 'var(--font-mono, monospace)'
                    }}>
                      {summary.confidence.toFixed(1)}%
                    </Typography>
                    <Chip 
                      label={`${summary.confText} Certainty`}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '10px',
                        fontWeight: 700,
                        bgcolor: alpha(summary.confColor, 0.12),
                        color: summary.confColor,
                        border: `1px solid ${alpha(summary.confColor, 0.25)}`
                      }}
                    />
                  </Box>

                  <Box sx={{ mt: 1 }}>
                    <LinearProgress 
                      variant="determinate"
                      value={summary.confidence}
                      sx={{
                        height: 5,
                        borderRadius: 2,
                        bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 2,
                          bgcolor: summary.confColor,
                          background: `linear-gradient(90deg, #10B981, ${summary.confColor})`
                        }
                      }}
                    />
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* Detailed Strategy Matrix Table */}
          <Paper className="mrf-glass-card" sx={{ p: { xs: 2, sm: 3 }, overflowX: 'auto' }}>
            <table className="mrf-matrix-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', width: '110px', fontSize: '0.85rem', fontWeight: 800, color: isDark ? '#94A3B8' : '#475569' }}>
                    MARKET
                  </th>
                  {currentDayData.slots.map((slot) => {
                    const details = todDetails[slot.tod] || { time: '', type: '', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.12)' };
                    return (
                      <th key={slot.tod}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, pb: 0.5 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: isDark ? '#F8FAFC' : '#0F172A', fontSize: '14px', letterSpacing: '-0.2px' }}>
                            {slot.tod}
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', color: isDark ? '#94A3B8' : '#64748B', fontWeight: 600, fontSize: '11px', fontFamily: 'var(--font-mono, monospace)' }}>
                            {details.time}
                          </Typography>
                          <Chip 
                            label={details.type}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '9.5px',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              bgcolor: details.bg,
                              color: details.color,
                              border: `1px solid ${alpha(details.color, 0.3)}`
                            }}
                          />
                        </Box>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {markets.map((market, mIdx) => {
                  const mKey = marketKeys[mIdx];
                  const marketColor = market === 'RTM' ? '#8B5CF6' : market === 'DAM' ? '#3B82F6' : '#10B981';

                  return (
                    <tr key={market}>
                      <td className="mrf-row-header">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 1 }}>
                          <Box sx={{ 
                            px: 1.25, 
                            py: 0.5, 
                            borderRadius: 1.5, 
                            bgcolor: alpha(marketColor, isDark ? 0.2 : 0.1),
                            color: marketColor,
                            fontWeight: 900,
                            fontSize: '13px',
                            fontFamily: 'var(--font-mono, monospace)',
                            border: `1px solid ${alpha(marketColor, 0.3)}`,
                            display: 'inline-block'
                          }}>
                            {market}
                          </Box>
                        </Box>
                      </td>
                      {currentDayData.slots.map((slot) => {
                        const isRecommended = slot.prediction === market;
                        
                        // Render mini-history values
                        const renderMiniHistory = () => {
                          if (!slot.history || slot.history.length === 0) {
                            return <tr><td colSpan={2} style={{ textAlign: 'center', color: isDark ? '#64748B' : '#94A3B8' }}>No data</td></tr>;
                          }

                          return slot.history.map((day) => {
                            // Find low, mid, high among dam, rtm, gdam for color coding
                            const prices = [
                              { m: 'dam', p: day.dam },
                              { m: 'rtm', p: day.rtm },
                              { m: 'gdam', p: day.gdam }
                            ].filter(x => x.p != null && x.p > 0);

                            let minPrice = Infinity;
                            let maxPrice = -Infinity;
                            if (prices.length > 0) {
                              minPrice = Math.min(...prices.map(x => x.p!));
                              maxPrice = Math.max(...prices.map(x => x.p!));
                            }

                            const dayPrice = day[mKey];
                            let colorClass = 'mrf-price-med';
                            if (dayPrice == null || dayPrice === 0) colorClass = 'mrf-price-na';
                            else if (dayPrice === minPrice) colorClass = 'mrf-price-low';
                            else if (dayPrice === maxPrice) colorClass = 'mrf-price-high';

                            // Format history date from YYYY-MM-DD to DD-MM (Short)
                            const formatHistoryDate = (dStr: string) => {
                              const parts = dStr.split('-');
                              if (parts.length !== 3) return dStr;
                              return `${parts[2]}/${parts[1]}`;
                            };

                            return (
                              <tr key={day.date}>
                                <td>{formatHistoryDate(day.date)}</td>
                                <td className={colorClass}>{formatCurrency(dayPrice)}</td>
                              </tr>
                            );
                          });
                        };

                        const cellClass = isRecommended 
                          ? `mrf-matrix-cell recommended-${market.toLowerCase()}` 
                          : 'mrf-matrix-cell';

                        const rollMean = slot[`${mKey}_mean` as keyof SlotData] as number;

                        return (
                          <td key={slot.tod} className={cellClass}>
                            <Box className="cell-content">
                              {/* Recommended Star Badge */}
                              <Box sx={{ minHeight: '24px', display: 'flex', alignItems: 'center' }}>
                                {isRecommended ? (
                                  <Box 
                                    className={`mrf-badge mrf-badge-${market.toLowerCase()}`}
                                  >
                                    <StarIcon sx={{ fontSize: 12 }} />
                                    <span>Recommended</span>
                                  </Box>
                                ) : (
                                  <Box sx={{ height: '20px' }} />
                                )}
                              </Box>

                              {/* Est Savings */}
                              <Box sx={{ minHeight: '18px', display: 'flex', alignItems: 'center' }}>
                                {isRecommended && slot.savings > 0 ? (
                                  <Typography className="mrf-savings-conf">
                                    Savings: ₹{slot.savings.toFixed(1)}
                                  </Typography>
                                ) : (
                                  <Box sx={{ height: '14px' }} />
                                )}
                              </Box>

                              {/* Mini History Table */}
                              <table className="mrf-mini-history">
                                <tbody>
                                  {renderMiniHistory()}
                                </tbody>
                              </table>

                              {/* 7D Average */}
                              <Box className="mrf-mean-row">
                                <span>7D Avg:</span>
                                <span className="mrf-mean-val">{formatCurrency(rollMean)}</span>
                              </Box>
                            </Box>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Paper>
        </Box>
      ) : (
        <Box sx={{ zIndex: 2 }}>
          <Alert severity="info" variant="filled" sx={{ borderRadius: 3 }}>
            <Typography variant="body1">Select a valid date range to view predictions.</Typography>
          </Alert>
        </Box>
      )}
    </Box>
  );
}
