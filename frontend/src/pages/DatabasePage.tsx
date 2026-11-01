import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  useTheme,
  alpha,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  TablePagination,
} from '@mui/material';
import {
  Cloud as CloudIcon,
  Download as DownloadIcon,
  ErrorOutline as ErrorOutlineIcon,
} from '@mui/icons-material';
import { apiClient } from '../api/client';

import AllIndiaDemandView from './database/AllIndiaDemandView';
import StateWiseDemandView from './database/StateWiseDemandView';
import { formatOverviewDate } from '../utils/date';
import GenerationDataView from './database/GenerationDataView';
import HolidayCalendarView from './database/HolidayCalendarView';
import CityStateView from './database/CityStateView';
import { State, City } from 'country-state-city';
import DateRangePicker from '../components/common/DateRangePicker';

interface WeatherDataRow {
  date: string;
  timeStr?: string;
  maxTemp: number;
  minTemp: number;
  windSpeed: number;
  relativeHumidity: number;
  precipitationProb: number;
  precipitationSum: number;
  sunshineDuration: number;
  sunrise: string;
  sunset: string;
  isActual: boolean;
}

interface StateDemand {
  name: string;
  demand: number;
  unit: string;
}

export default function DatabasePage() {
  const theme = useTheme();
  const location = useLocation();
  const path = location.pathname;
  

  const showNpp = path.includes('/all-india-demand');
  const showGeneration = path.includes('/generation-data');
  const showDateRange = showNpp || showGeneration;
  const showStateWise = path.includes('/state-wise-demand');
  const showWeatherForecast = path.includes('/weather/forecast');
  const showWeatherHistorical = path.includes('/weather/historical');
  const showWeather = showWeatherForecast || showWeatherHistorical;
  const showHolidayCalendar = path.includes('/holiday-calendar');
  const showCityState = path.includes('/city-state-data');
  
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherDataRow[] | null>(null);
  const navigate = useNavigate();
  const weatherTab = showWeatherHistorical ? 'historical' : 'forecast';

  // Load all states in India (IN)
  const allStates = React.useMemo(() => {
    return State.getStatesOfCountry('IN').sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const [selectedStateCode, setSelectedStateCode] = useState<string>(() => {
    const delhi = allStates.find(s => s.name === 'Delhi' || s.isoCode === 'DL');
    return delhi?.isoCode || allStates[0]?.isoCode || '';
  });

  const allCitiesInState = React.useMemo(() => {
    if (!selectedStateCode) return [];
    return City.getCitiesOfState('IN', selectedStateCode).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedStateCode]);

  const [selectedCityName, setSelectedCityName] = useState<string>(() => {
    const defaultCity = allCitiesInState.find(c => c.name === 'New Delhi') || allCitiesInState[0];
    return defaultCity?.name || '';
  });

  useEffect(() => {
    if (allCitiesInState.length > 0) {
      const hasNewDelhi = allCitiesInState.find(c => c.name === 'New Delhi');
      setSelectedCityName(hasNewDelhi ? 'New Delhi' : allCitiesInState[0].name);
    } else {
      setSelectedCityName('');
    }
  }, [selectedStateCode, allCitiesInState]);

  const activeCityObj = allCitiesInState.find(c => c.name === selectedCityName);
  const activeLat = activeCityObj?.latitude ? parseFloat(activeCityObj.latitude) : undefined;
  const activeLon = activeCityObj?.longitude ? parseFloat(activeCityObj.longitude) : undefined;



  const [allIndiaDemand, setAllIndiaDemand] = useState<any>(null);
  const [stateWiseDemand, setStateWiseDemand] = useState<any>(null);
  const [generationData, setGenerationData] = useState<any>(null);
  
  const getTodayDateString = () => {
    const now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  };

  const getCurrentTimeString = () => {
    const now = new Date();
    // Round down to nearest 15 mins
    const minutes = Math.floor(now.getMinutes() / 15) * 15;
    return String(now.getHours()).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
  };

  const formatDateStr = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return formatOverviewDate(date);
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedTime, setSelectedTime] = useState<string>(getCurrentTimeString());

  // For NPP View, we use a date range — default to last 7 days
  // Historical data is available from Sep 2025 onwards (NPP API limitation)
  const [nppStartDate, setNppStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [nppEndDate, setNppEndDate] = useState<string>(getTodayDateString());

  const [genStartDate, setGenStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [genEndDate, setGenEndDate] = useState<string>(getTodayDateString());
  const [genSelectedSource, setGenSelectedSource] = useState<string>('all');

  // Weather view date range
  const [weatherStartDate, setWeatherStartDate] = useState<string>(() => {
    const today = new Date();
    if (showWeatherHistorical) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      return thirtyDaysAgo.toISOString().split('T')[0];
    } else {
      return today.toISOString().split('T')[0];
    }
  });
  const [weatherEndDate, setWeatherEndDate] = useState<string>(() => {
    const today = new Date();
    if (showWeatherHistorical) {
      return today.toISOString().split('T')[0];
    } else {
      const thirtyDaysAhead = new Date();
      thirtyDaysAhead.setDate(today.getDate() + 30);
      return thirtyDaysAhead.toISOString().split('T')[0];
    }
  });
  const [weatherPage, setWeatherPage] = useState(0);
  const [weatherRowsPerPage, setWeatherRowsPerPage] = useState(10);

  useEffect(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    if (weatherTab === 'historical') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      const startStr = thirtyDaysAgo.toISOString().split('T')[0];
      setWeatherStartDate(startStr);
      setWeatherEndDate(todayStr);
      setCommittedWeatherStartDate(startStr);
      setCommittedWeatherEndDate(todayStr);
    } else {
      // Forecast: show next 30 days by default
      const thirtyDaysAhead = new Date();
      thirtyDaysAhead.setDate(today.getDate() + 30);
      const endStr = thirtyDaysAhead.toISOString().split('T')[0];
      setWeatherStartDate(todayStr);
      setWeatherEndDate(endStr);
      setCommittedWeatherStartDate(todayStr);
      setCommittedWeatherEndDate(endStr);
    }
  }, [weatherTab]);

  const [exportOpen, setExportOpen] = useState(false);
  const [exportDataset, setExportDataset] = useState<string>(() => {
    if (path.includes('/weather')) return 'weather_forecast';
    if (path.includes('/state-wise-demand')) return 'state';
    return 'npp';
  });
  const [exportStartDate, setExportStartDate] = useState('2024-07-01');
  const [exportEndDate, setExportEndDate] = useState(getTodayDateString());

  const handleDownloadCsv = () => {
    const url = `${apiClient.defaults.baseURL || 'http://localhost:3000/api'}/database/export/csv?dataset=${exportDataset}&startDate=${exportStartDate}&endDate=${exportEndDate}`;
    window.open(url, '_blank');
    setExportOpen(false);
  };

  const fetchData = async () => {
    if (showHolidayCalendar || showCityState) {
      setLoading(false);
      setErrorMsg(null);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      if (showWeather) {
        // Prevent querying future dates for historical weather or past dates for forecast when tabs switch.
        // The date-adjusting useEffect will run immediately after and trigger the correct API call.
        const todayStr = new Date().toISOString().split('T')[0];
        if (weatherTab === 'historical' && committedWeatherEndDate > todayStr) {
          setLoading(false);
          return;
        }
        if (weatherTab === 'forecast' && committedWeatherStartDate < todayStr) {
          setLoading(false);
          return;
        }

        const latParam = committedLat != null ? `&latitude=${committedLat}` : '';
        const lonParam = committedLon != null ? `&longitude=${committedLon}` : '';
        const weatherRes = await apiClient.get(`/database/weather?type=${weatherTab}&startDate=${committedWeatherStartDate}&endDate=${committedWeatherEndDate}${latParam}${lonParam}`);
        if (weatherRes.data?.success && weatherRes.data?.data) {
          setWeatherData(weatherRes.data.data);
        } else {
          console.error("weatherRes missing data", weatherRes);
        }
      }

      if (showNpp || showStateWise) {
        const demandRes = await apiClient.get(`/database/demand?date=${selectedDate}&time=${selectedTime}&startDate=${committedNppStartDate}&endDate=${committedNppEndDate}`);
        if (demandRes.data?.success) {
          setAllIndiaDemand(demandRes.data.data.allIndiaDemand);
          setStateWiseDemand(demandRes.data.data.stateWiseDemand);
        } else {
          console.error("demandRes missing data", demandRes);
        }
      }

      if (showGeneration) {
        const genRes = await apiClient.get(`/database/generation?date=${selectedDate}&startDate=${committedGenStartDate}&endDate=${committedGenEndDate}`);
        if (genRes.data?.success) {
          setGenerationData(genRes.data.data);
        } else {
          console.error("genRes missing data", genRes);
        }
      }


    } catch (err: any) {
      console.error('Error fetching database data:', err);
      setErrorMsg(err.message || 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const [committedNppStartDate, setCommittedNppStartDate] = useState(nppStartDate);
  const [committedNppEndDate, setCommittedNppEndDate] = useState(nppEndDate);
 
  const [committedGenStartDate, setCommittedGenStartDate] = useState(genStartDate);
  const [committedGenEndDate, setCommittedGenEndDate] = useState(genEndDate);

  const [committedWeatherStartDate, setCommittedWeatherStartDate] = useState(weatherStartDate);
  const [committedWeatherEndDate, setCommittedWeatherEndDate] = useState(weatherEndDate);
  const [committedLat, setCommittedLat] = useState<number | undefined>(activeLat);
  const [committedLon, setCommittedLon] = useState<number | undefined>(activeLon);

  useEffect(() => {
    if (activeLat != null && committedLat === undefined) {
      setCommittedLat(activeLat);
    }
    if (activeLon != null && committedLon === undefined) {
      setCommittedLon(activeLon);
    }
  }, [activeLat, activeLon]);
 
  const checkDateRange = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = e.getTime() - s.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 31;
  };
 
  const handleNppSubmit = () => {
    if (!checkDateRange(nppStartDate, nppEndDate)) {
      alert('You can only select a maximum of 31 days.');
      return;
    }
    setCommittedNppStartDate(nppStartDate);
    setCommittedNppEndDate(nppEndDate);
  };
 
  const handleGenSubmit = () => {
    if (!checkDateRange(genStartDate, genEndDate)) {
      alert('You can only select a maximum of 31 days.');
      return;
    }
    setCommittedGenStartDate(genStartDate);
    setCommittedGenEndDate(genEndDate);
  };

  const handleWeatherSubmit = () => {
    if (!checkDateRange(weatherStartDate, weatherEndDate)) {
      alert('You can only select a maximum of 31 days.');
      return;
    }
    setWeatherPage(0);
    setCommittedWeatherStartDate(weatherStartDate);
    setCommittedWeatherEndDate(weatherEndDate);
    setCommittedLat(activeLat);
    setCommittedLon(activeLon);
  };
 
  useEffect(() => {
    fetchData();
  }, [selectedDate, selectedTime, committedNppStartDate, committedNppEndDate, committedGenStartDate, committedGenEndDate, committedWeatherStartDate, committedWeatherEndDate, committedLat, committedLon, weatherTab, path]);

  return (
    <Box
      className="animate-fade-in-up"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        height: 'auto',
        minHeight: 0,
        pb: 4,
      }}
    >
      {(!showDateRange && !showHolidayCalendar && !showWeather && !showCityState && !showStateWise) && (
        <Box sx={{ mb: 5, display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', flexWrap: 'wrap', gap: 3 }}>
          <Box 
          className="glass"
          sx={{ 
            display: 'flex', 
            gap: 2, 
            p: 2, 
            borderRadius: 3,
            alignItems: 'flex-end',
            flexWrap: 'wrap'
          }}
        >

            <>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</Typography>
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min="2024-04-01"
                  max="2026-06-30"
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    outline: 'none',
                    fontFamily: 'inherit',
                    fontSize: '0.875rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    color: '#0F172A',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#EA580C'}
                  onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
                />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time</Typography>
                <input 
                  type="time" 
                  value={selectedTime}
                  step="900"
                  onChange={(e) => setSelectedTime(e.target.value)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    outline: 'none',
                    fontFamily: 'inherit',
                    fontSize: '0.875rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    color: '#0F172A',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#EA580C'}
                  onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
                />
              </Box>
            </>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<DownloadIcon />} 
            onClick={() => setExportOpen(true)}
            sx={{ 
              ml: { xs: 0, sm: 2 }, 
              height: '42px', 
              borderRadius: '10px',
            }}
          >
            Export CSV
          </Button>
        </Box>
        </Box>
      )}


      <Dialog open={exportOpen} onClose={() => setExportOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Export Historical Data (CSV)</DialogTitle>
        <DialogContent dividers sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Dataset</InputLabel>
              <Select
                value={exportDataset}
                label="Dataset"
                onChange={(e) => setExportDataset(e.target.value as string)}
              >
                <MenuItem value="npp">All India Demand (NPP)</MenuItem>
                <MenuItem value="generation">Generation Data</MenuItem>
                <MenuItem value="state">State Wise Demand</MenuItem>
                <MenuItem value="weather_forecast">Weather Forecasted Data (15-Minutely)</MenuItem>
                <MenuItem value="weather_historical">Weather Historical Data (Daily)</MenuItem>
              </Select>
            </FormControl>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>Start Date</Typography>
                <input 
                  type="date" 
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '4px', border: '1px solid #C4C4C4', outline: 'none', fontFamily: 'inherit', fontSize: '1rem', boxSizing: 'border-box' }}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>End Date</Typography>
                <input 
                  type="date" 
                  value={exportEndDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '4px', border: '1px solid #C4C4C4', outline: 'none', fontFamily: 'inherit', fontSize: '1rem', boxSizing: 'border-box' }}
                />
              </Box>
            </Box>
            
            {exportDataset === 'state' && (
              <Box sx={{ bgcolor: '#FFFBEB', p: 2, borderRadius: 1, border: '1px solid #FEF08A' }}>
                <Typography variant="body2" color="#92400E">
                  <strong>Warning:</strong> Exporting the entire 2-year State Demand dataset will generate over 2.6 million rows (~150MB). Microsoft Excel has a hard limit of 1,048,576 rows. Consider exporting in 6-month chunks.
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, px: 3 }}>
          <Button onClick={() => setExportOpen(false)} color="inherit" sx={{ textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
          <Button onClick={handleDownloadCsv} variant="contained" color="primary" sx={{ textTransform: 'none', fontWeight: 600 }}>Download CSV</Button>
        </DialogActions>
      </Dialog>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 10 }}>
          <CircularProgress />
        </Box>
      ) : errorMsg ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 10, gap: 2 }}>
          <ErrorOutlineIcon sx={{ fontSize: 48, color: 'error.main' }} />
          <Typography variant="h6" color="error.main" fontWeight={600}>Failed to load data</Typography>
          <Typography variant="body2" color="text.secondary">{errorMsg}</Typography>
          <Button variant="outlined" color="primary" onClick={fetchData}>Retry</Button>
        </Box>
      ) : (
        <>
          {/* NPP Demand Section */}
          {showNpp && (
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  flexDirection: 'column',
                  flexGrow: 1,
                  bgcolor: 'background.paper',
                  overflow: 'hidden'
                }}
              >
                <CardContent sx={{ p: { xs: 2, md: 4 }, display: 'flex', flexDirection: 'column', gap: 4, flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                      <Typography variant="h4" fontWeight="700" color="text.primary">
                        Real Time Demand Met Data
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        View real-time and historical all India power demand data.
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, fontWeight: 600, textTransform: 'uppercase' }}>Select Date Range</Typography>
                        <DateRangePicker 
                          startDate={nppStartDate}
                          endDate={nppEndDate}
                          onChange={(start, end) => {
                            setNppStartDate(start);
                            setNppEndDate(end);
                          }}
                        />
                      </Box>
                      <Button
                        variant="contained"
                        onClick={handleNppSubmit}
                        sx={{
                          height: '42px',
                          px: 3,
                          borderRadius: '10px',
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          boxShadow: 'none',
                          '&:hover': { boxShadow: 'none' },
                        }}
                      >
                        Submit
                      </Button>
                    </Box>
                  </Box>
                  
                  <AllIndiaDemandView 
                    data={allIndiaDemand} 
                    startDate={nppStartDate} 
                    endDate={nppEndDate} 
                    onStartDateChange={setNppStartDate} 
                    onEndDateChange={setNppEndDate} 
                    onExport={() => { 
                      const url = `${apiClient.defaults.baseURL || 'http://localhost:3000/api'}/database/export/csv?dataset=npp&startDate=${committedNppStartDate}&endDate=${committedNppEndDate}`;
                      window.open(url, '_blank');
                    }}
                  />
                </CardContent>
              </Card>
          )}

          {/* NPP Generation Section */}
          {showGeneration && (
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  flexDirection: 'column',
                  flexGrow: 1,
                  bgcolor: 'background.paper',
                  overflow: 'hidden'
                }}
              >
                <CardContent sx={{ p: { xs: 2, md: 4 }, display: 'flex', flexDirection: 'column', gap: 4, flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                      <Typography variant="h4" fontWeight="700" color="text.primary">
                        Real Time Generation Data
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        View real-time and historical generation data for various fuel types.
                      </Typography>
                      {/* Latest Time Badge Removed */}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, fontWeight: 600, textTransform: 'uppercase', opacity: 0 }}>Select Source</Typography>
                        <FormControl size="small" sx={{ minWidth: 200 }}>
                          <Select
                            value={genSelectedSource}
                            onChange={(e) => setGenSelectedSource(e.target.value)}
                            sx={{
                              borderRadius: '8px',
                              height: '42px',
                              bgcolor: '#FFF',
                              fontSize: '0.875rem',
                              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E2E8F0' }
                            }}
                          >
                            <MenuItem value="all">All Sources</MenuItem>
                            <MenuItem value="thermal">Thermal</MenuItem>
                            <MenuItem value="gas">Gas</MenuItem>
                            <MenuItem value="nuclear">Nuclear</MenuItem>
                            <MenuItem value="hydro">Hydro</MenuItem>
                            <MenuItem value="wind">Wind</MenuItem>
                            <MenuItem value="solar">Solar</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, fontWeight: 600, textTransform: 'uppercase' }}>Select Date Range</Typography>
                        <DateRangePicker 
                          startDate={genStartDate}
                          endDate={genEndDate}
                          onChange={(start, end) => {
                            setGenStartDate(start);
                            setGenEndDate(end);
                          }}
                        />
                      </Box>
                      <Button
                        variant="contained"
                        onClick={handleGenSubmit}
                        sx={{
                          height: '42px',
                          px: 3,
                          borderRadius: '10px',
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          boxShadow: 'none',
                          '&:hover': { boxShadow: 'none' },
                        }}
                      >
                        Submit
                      </Button>
                    </Box>
                  </Box>
                  
                  <GenerationDataView 
                    data={generationData} 
                    startDate={genStartDate} 
                    endDate={genEndDate} 
                    onStartDateChange={setGenStartDate} 
                    onEndDateChange={setGenEndDate} 
                    selectedSource={genSelectedSource}
                    onSourceChange={setGenSelectedSource}
                    onExport={() => { 
                      const url = `${apiClient.defaults.baseURL || 'http://localhost:3000/api'}/database/export/csv?dataset=generation&startDate=${committedGenStartDate}&endDate=${committedGenEndDate}`;
                      window.open(url, '_blank');
                    }}
                  />
                </CardContent>
              </Card>
          )}

          {/* State Wise Demand Section */}
          {showStateWise && (
            <StateWiseDemandView data={stateWiseDemand} />
          )}

          {/* Weather Data Section */}
          {showWeather && (
            <Card
              elevation={0}
              sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                flexGrow: 1,
                bgcolor: 'background.paper',
                overflow: 'hidden'
              }}
            >
              <CardContent sx={{ p: { xs: 2, md: 4 }, display: 'flex', flexDirection: 'column', gap: 4, flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    <Typography variant="h4" fontWeight="700" color="text.primary">
                      {weatherTab === 'forecast' ? 'Forecasted Weather Data' : 'Historical Weather Data'} ({selectedCityName || 'New Delhi'})
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {weatherTab === 'forecast' 
                        ? '16-day rolling 15-minutely forecast. Updates every hour. Source: Open-Meteo.'
                        : 'Historical daily actuals from the last 2 years. Updates every day. Source: Open-Meteo Archive.'}
                    </Typography>
                  </Box>
                  {/* State, City & Date range controls */}
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, fontWeight: 600, textTransform: 'uppercase' }}>State</Typography>
                      <Select
                        size="small"
                        value={selectedStateCode}
                        onChange={(e) => setSelectedStateCode(e.target.value)}
                        sx={{
                          borderRadius: '10px',
                          height: '42px',
                          minWidth: 140,
                          bgcolor: '#FFF',
                          fontSize: '0.875rem',
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E2E8F0' }
                        }}
                      >
                        {allStates.map((state) => (
                          <MenuItem key={state.isoCode} value={state.isoCode}>
                            {state.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, fontWeight: 600, textTransform: 'uppercase' }}>City</Typography>
                      <Select
                        size="small"
                        value={selectedCityName}
                        onChange={(e) => setSelectedCityName(e.target.value)}
                        sx={{
                          borderRadius: '10px',
                          height: '42px',
                          minWidth: 140,
                          bgcolor: '#FFF',
                          fontSize: '0.875rem',
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E2E8F0' }
                        }}
                      >
                        {allCitiesInState.map((city) => (
                          <MenuItem key={city.name} value={city.name}>
                            {city.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, fontWeight: 600, textTransform: 'uppercase' }}>Select Date Range</Typography>
                      <DateRangePicker 
                        startDate={weatherStartDate}
                        endDate={weatherEndDate}
                        onChange={(start, end) => {
                          setWeatherStartDate(start);
                          setWeatherEndDate(end);
                        }}
                      />
                    </Box>
                    <Button
                      variant="contained"
                      onClick={handleWeatherSubmit}
                      sx={{
                        height: '42px',
                        px: 3,
                        borderRadius: '10px',
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        boxShadow: 'none',
                        '&:hover': { boxShadow: 'none' },
                      }}
                    >
                      Submit
                    </Button>
                    <Button
                      variant="outlined"
                      color="primary"
                      startIcon={<DownloadIcon />}
                      onClick={() => {
                        const dataset = weatherTab === 'forecast' ? 'weather_forecast' : 'weather_historical';
                        const latParam = committedLat != null ? `&latitude=${committedLat}` : '';
                        const lonParam = committedLon != null ? `&longitude=${committedLon}` : '';
                        const url = `${apiClient.defaults.baseURL || 'http://localhost:3000/api'}/database/export/csv?dataset=${dataset}&startDate=${committedWeatherStartDate}&endDate=${committedWeatherEndDate}${latParam}${lonParam}`;
                        window.open(url, '_blank');
                      }}
                      sx={{
                        height: '42px',
                        px: 3,
                        borderRadius: '10px',
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                      }}
                    >
                      Export CSV
                    </Button>
                  </Box>
                </Box>

                {weatherData && weatherData.length > 0 ? (
                  <Box sx={{ width: '100%', overflow: 'hidden' }}>
                    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '10px', flexGrow: 1, maxHeight: 600 }}>
                      <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>Date</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>Max Temp (°C)</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>Min Temp (°C)</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>Humidity (%)</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>Precip. Prob (%)</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>Precip. (mm)</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>Sunshine (hrs)</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>Sunrise</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>Sunset</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>Wind Speed (km/h)</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(() => {
                          const filteredData = weatherData.filter((row: WeatherDataRow) => {
                            if (weatherTab === 'forecast') {
                              return !row.isActual;
                            } else {
                              return row.isActual;
                            }
                          });
                          const paginatedData = filteredData.slice(weatherPage * weatherRowsPerPage, weatherPage * weatherRowsPerPage + weatherRowsPerPage);
                          
                          return paginatedData.map((row: WeatherDataRow, i: number) => (
                            <TableRow key={i} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#F9FAFB' } }}>
                              <TableCell align="center">
                                {(() => {
                                  const d = new Date(row.date);
                                  const datePart = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
                                  if (row.timeStr) {
                                    const [hr, min] = row.timeStr.split(':');
                                    const hour = parseInt(hr, 10);
                                    const ampm = hour >= 12 ? 'PM' : 'AM';
                                    const h = hour % 12 || 12;
                                    return `${datePart} ${String(h).padStart(2, '0')}:${min} ${ampm}`;
                                  }
                                  return datePart;
                                })()}
                              </TableCell>
                              <TableCell align="center">{row.maxTemp != null ? row.maxTemp.toFixed(1) : '-'}</TableCell>
                              <TableCell align="center">{row.minTemp != null ? row.minTemp.toFixed(1) : '-'}</TableCell>
                              <TableCell align="center">{row.relativeHumidity != null ? Math.round(row.relativeHumidity) : '-'}</TableCell>
                              <TableCell align="center">{row.precipitationProb != null ? Math.round(row.precipitationProb) : '-'}</TableCell>
                              <TableCell align="center">{row.precipitationSum != null ? row.precipitationSum.toFixed(1) : '-'}</TableCell>
                              <TableCell align="center">{row.sunshineDuration != null ? row.sunshineDuration.toFixed(1) : '-'}</TableCell>
                              <TableCell align="center">{row.sunrise || '-'}</TableCell>
                              <TableCell align="center">{row.sunset || '-'}</TableCell>
                              <TableCell align="center">{row.windSpeed != null ? row.windSpeed.toFixed(1) : '-'}</TableCell>
                              <TableCell align="center">
                                <Box sx={{ 
                                  display: 'inline-block',
                                  px: 1, py: 0.5, 
                                  borderRadius: 1, 
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold',
                                  color: row.isActual ? '#15803D' : '#C2410C',
                                  bgcolor: row.isActual ? '#DCFCE7' : '#FFEDD5'
                                }}>
                                  {row.isActual ? 'Actual' : 'Forecast'}
                                </Box>
                              </TableCell>
                            </TableRow>
                          ));
                        })()}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    component="div"
                    count={weatherData.filter((r) => weatherTab === 'forecast' ? !r.isActual : r.isActual).length}
                    rowsPerPage={weatherRowsPerPage}
                    page={weatherPage}
                    onPageChange={(e, newPage) => setWeatherPage(newPage)}
                    onRowsPerPageChange={(e) => {
                      setWeatherRowsPerPage(parseInt(e.target.value, 10));
                      setWeatherPage(0);
                    }}
                  />
                </Box>
                ) : (
                  <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                    No weather data available for the selected date range.
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}

          {/* Holiday Calendar Section */}
          {showHolidayCalendar && (
              <HolidayCalendarView />
          )}

          {/* City & State Data Section */}
          {showCityState && (
              <CityStateView />
          )}

        </>
      )}
    </Box>
  );
}
