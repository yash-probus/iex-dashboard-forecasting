import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, PieChart, Pie, AreaChart, Area } from 'recharts';
import {
  FormControlLabel, Switch, Radio, RadioGroup, FormControl, FormLabel, Divider,
  Box, Typography, Button, alpha, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, IconButton, Alert, Snackbar,
  Grid, Card, CardContent, Tabs, Tab, Table, TableBody, TableCell, TableHead, TableRow,
  CircularProgress, MenuItem, Paper, Tooltip as MuiTooltip, InputAdornment, OutlinedInput, Stack,
  Accordion, AccordionSummary, AccordionDetails, Select
} from '@mui/material';
import {
  Calculate as CalculateIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  LightbulbOutlined as LightbulbIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  PlayArrow as PlayIcon,
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  LocationOn as LocationIcon,
  ElectricBolt as ElectricBoltIcon,
  Category as CategoryIcon,
  Bolt as BoltIcon,
  Speed as SpeedIcon,
  Business as BusinessIcon,
  ArrowForward as ArrowForwardIcon,
  FileDownload as FileDownloadIcon,
  BarChart as BarChartIcon,
  History as HistoryIcon,
  InfoOutlined as InfoOutlinedIcon,
  Search as SearchIcon,
  ArrowRightAlt as ArrowRightAltIcon,
  CalendarMonth as CalendarIcon
} from '@mui/icons-material';
import { SlotWiseMarketHeatmap } from '../components/dashboard/SlotWiseMarketHeatmap';
import { DynamicSlotWiseMarketHeatmap } from '../components/dashboard/DynamicSlotWiseMarketHeatmap';

import { OverallVisualAnalytics } from '../components/dashboard/OverallVisualAnalytics';
import { Dashboard } from '../components/dashboard/Dashboard';
import TableContainer, { ColumnDefinition } from '../components/dashboard/TableContainer';
import EmptyTableState from '../components/dashboard/EmptyTableState';
import DateRangePicker from '../components/common/DateRangePicker';
import {
  fetchSavingsEntries,
  createSavingsEntry,
  updateSavingsEntry,
  deleteSavingsEntry,
  calculateSavings,
  calculateMarketDecision,
  SavingsCalculatorEntry,
  CalculationResult,
  CalculationSlotDetail,
  MarketDecisionResult,
  exportSavingsExcel,
  exportDemandShiftExcel,
  fetchDemandShiftInsights,
  DemandShiftInsightsResult,
  fetchEntryHistory,
  fetchClientOverview,
  ClientOverviewResult
} from '../api/savingsCalculator.api';

import EnergyInsightsExplorer from '../components/insights/EnergyInsightsExplorer';
import { exportToCSV } from '../utils/export';
import { getResourceData } from '../api/resourceCenter.api';
import { STATE_TARIFF_MOCK_DATA } from './resource-center/mockData/stateTariff.mock';
import { DISCOM_LIST_MOCK_DATA } from './resource-center/mockData/discomList.mock';

type DialogMode = 'create' | 'edit' | 'view' | null;

import { useAuth } from '../contexts/AuthContext';

import { useNavigate } from 'react-router-dom';

const getChanges = (current: any, previous: any) => {
  if (!previous) return [];
  const changes: { label: string, old: any, new: any }[] = [];
  const fields = [
    { key: 'clientName', label: 'Client', isNumeric: false },
    { key: 'industryName', label: 'Industry', isNumeric: false },
    { key: 'address', label: 'Address', isNumeric: false },
    { key: 'stateCode', label: 'State', isNumeric: false },
    { key: 'discom', label: 'Discom', isNumeric: false },
    { key: 'consumerCategory', label: 'Category', isNumeric: false },
    { key: 'voltageLevel', label: 'Voltage', isNumeric: false },
    { key: 'sanctionedLoadKw', label: 'Load (kW)', isNumeric: true },
    { key: 'proltMargin', label: 'PROLT Margin', isNumeric: true },
    { key: 'traderMargin', label: 'Trader Margin', isNumeric: true },
    { key: 'meteringCharges', label: 'Metering Charges', isNumeric: true },
    { key: 'consultancyFee', label: 'Consultancy Fee', isNumeric: true },
    { key: 'probusPlatformFee', label: 'Platform Fee', isNumeric: true },
    { key: 'applyElectricityDuty', label: 'Electricity Duty', isNumeric: false },
    { key: 'billedDemandKv', label: 'Billed Demand (kV)', isNumeric: true },
    { key: 'powerFactor', label: 'Power Factor', isNumeric: true },
    { key: 'arrearAmount', label: 'Arrear Amount', isNumeric: true },
    { key: 'currentLpsc', label: 'Current LPSC', isNumeric: true }
  ];

  fields.forEach(f => {
    let valCurr = current[f.key];
    let valPrev = previous[f.key];

    if (f.isNumeric) {
      const numCurr = valCurr !== undefined && valCurr !== null && valCurr !== '' ? Number(valCurr) : null;
      const numPrev = valPrev !== undefined && valPrev !== null && valPrev !== '' ? Number(valPrev) : null;

      const isBothNull = numCurr === null && numPrev === null;
      const isOneNull = numCurr === null || numPrev === null;

      if (!isBothNull && (isOneNull || numCurr !== numPrev)) {
        changes.push({
          label: f.label,
          old: valPrev !== null && valPrev !== undefined && valPrev !== '' ? valPrev : 'None',
          new: valCurr !== null && valCurr !== undefined && valCurr !== '' ? valCurr : 'None'
        });
      }
    } else {
      const strCurr = valCurr !== undefined && valCurr !== null ? String(valCurr).trim() : '';
      const strPrev = valPrev !== undefined && valPrev !== null ? String(valPrev).trim() : '';
      if (strCurr !== strPrev) {
        changes.push({
          label: f.label,
          old: valPrev || 'None',
          new: valCurr || 'None'
        });
      }
    }
  });

  return changes;
};

export default function SavingsCalculatorPage() {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();

  const isReadOnly = (user as any)?.readOnlyModules?.includes('savings-calculator');
  const isNoDelete = (user as any)?.readOnlyModules?.includes('savings-calculator-nodelete');
  const canEdit = isAdmin || !isReadOnly || isNoDelete;
  const canDelete = isAdmin || (!isReadOnly && !isNoDelete);

  // State variables
  const [selectedInsightsEntry, setSelectedInsightsEntry] = useState<SavingsCalculatorEntry | null>(null);
  const [entries, setEntries] = useState<SavingsCalculatorEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Dialog State
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedEntry, setSelectedEntry] = useState<SavingsCalculatorEntry | null>(null);
  const [activeStep, setActiveStep] = useState<number>(0);

  // Client Overview State
  const [clientOverview, setClientOverview] = useState<ClientOverviewResult | null>(null);
  const [overviewLoading, setOverviewLoading] = useState<boolean>(false);

  // Form Fields State
  const [clientName, setClientName] = useState('');
  const [clientPrefix, setClientPrefix] = useState('Mr.');
  const [hasReachedSummary, setHasReachedSummary] = useState(false);
  const [industryName, setIndustryName] = useState('');
  const [address, setAddress] = useState('');
  const [sanctionedLoadKw, setSanctionedLoadKw] = useState('');
  const [sanctionedLoadKva, setSanctionedLoadKva] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [discom, setDiscom] = useState('');
  const [consumerCategory, setConsumerCategory] = useState('');
  const [voltageLevel, setVoltageLevel] = useState('');
  const [supplyVoltageValue, setSupplyVoltageValue] = useState('');
  const [proltMargin, setProltMargin] = useState<string>('');
  const [traderMargin, setTraderMargin] = useState('');
  const [meteringCharges, setMeteringCharges] = useState('');
  const [consultancyFee, setConsultancyFee] = useState('');
  const [probusPlatformFee, setProbusPlatformFee] = useState('');

  const [todConsumptions, setTodConsumptions] = useState<Record<string, Record<string, string>>>({});
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>('initial');
  const [editingMonth, setEditingMonth] = useState<string | null>(null);

  // Additional Billing Fields
  const [billedDemandKv, setBilledDemandKv] = useState('');
  const [powerFactor, setPowerFactor] = useState('');
  const [arrearAmount, setArrearAmount] = useState('');
  const [currentLpsc, setCurrentLpsc] = useState('');
  const [billDate, setBillDate] = useState('');

  // Validation Errors
  const [formErrors, setFormErrors] = useState<{
    clientName?: string;
    industryName?: string;
    address?: string;
    sanctionedLoadKw?: string;
    clientDetails?: string;
    stateCode?: string;
    discom?: string;
  }>({});

  // Submitting States
  const [submitting, setSubmitting] = useState(false);

  // PROLT Dialog State
  const [proltDialogOpen, setProltDialogOpen] = useState(false);
  const [todDialogOpen, setTodDialogOpen] = useState(false);

  // Calculation Dialog States
  const [calcDialogOpen, setCalcDialogOpen] = useState(false);
  const [calcEntry, setCalcEntry] = useState<SavingsCalculatorEntry | null>(null);
  const [cachedResults, setCachedResults] = useState<Record<string, { calc: CalculationResult | null, market: MarketDecisionResult | null, insights: DemandShiftInsightsResult | null }>>({});


  const [calculating, setCalculating] = useState(false);
  const [calculatingInsights, setCalculatingInsights] = useState(false);
  const [calcVersions, setCalcVersions] = useState<number[]>([]);
  const [selectedCalcVersion, setSelectedCalcVersion] = useState<number | ''>('');

  const [calcTab, setCalcTab] = useState(0);
  const [graphDialogOpen, setGraphDialogOpen] = useState(false);
  const [demandShiftGraphOpen, setDemandShiftGraphOpen] = useState(false);
  const [dynamicGraphDialogOpen, setDynamicGraphDialogOpen] = useState(false);
  const [dynamicDemandShiftGraphOpen, setDynamicDemandShiftGraphOpen] = useState(false);

  // Market Decision States
  const [marketDecisionOpen, setMarketDecisionOpen] = useState(false);
  const [marketDecisionEntry, setMarketDecisionEntry] = useState<SavingsCalculatorEntry | null>(null);
  const [marketDecisionLoading, setMarketDecisionLoading] = useState(false);
  const [marketVolumeKwh, setMarketVolumeKwh] = useState<string>('15000');
  const [nldcFee, setNldcFee] = useState<string>('5000');
  const [sldcFee, setSldcFee] = useState<string>('1500');
  const [marketMonthStr, setMarketMonthStr] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Version History States
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyData, setHistoryData] = useState<any[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyClientName, setHistoryClientName] = useState<string>('');

  // Snackbar Notification State
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch entries
  const [tariffData, setTariffData] = useState<any[]>([]);
  const [discomList, setDiscomList] = useState<any[]>([]);
  const [regionStates, setRegionStates] = useState<any[]>([]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSavingsEntries();
      setEntries(data);
    } catch (err: any) {
      console.error('Failed to load entries:', err);
      setError(err.message || 'Failed to connect to the server. Please verify the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const loadResourceData = async () => {
    try {
      const [tariffRes, discomRes, regionRes] = await Promise.all([
        getResourceData('state-tariff'),
        getResourceData('discom-list'),
        getResourceData('region-state')
      ]);
      if (tariffRes.success && tariffRes.data.length > 0) {
        setTariffData(tariffRes.data);
      } else {
        setTariffData(STATE_TARIFF_MOCK_DATA);
      }
      if (discomRes.success && discomRes.data.length > 0) {
        setDiscomList(discomRes.data);
      } else {
        setDiscomList(DISCOM_LIST_MOCK_DATA);
      }
      if (regionRes.success && regionRes.data.length > 0) {
        setRegionStates(regionRes.data);
      }
    } catch (err) {
      console.error('Failed to load resource data, falling back to mock data:', err);
      setTariffData(STATE_TARIFF_MOCK_DATA);
      setDiscomList(DISCOM_LIST_MOCK_DATA);
    }
  };

  useEffect(() => {
    loadEntries();
    loadResourceData();
  }, []);

  const [entryYear, setEntryYear] = useState<number>(new Date().getFullYear());
  const [entryMonth, setEntryMonth] = useState<number>(new Date().getMonth() + 1);

  const filteredAndSortedEntries = React.useMemo(() => {
    let result = [...entries];

    // Filtering
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.clientName?.toLowerCase().includes(q) ||
        e.industryName?.toLowerCase().includes(q) ||
        e.stateCode?.toLowerCase().includes(q) ||
        e.discom?.toLowerCase().includes(q) ||
        e.consumerCategory?.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let aVal = a[sortBy as keyof SavingsCalculatorEntry] ?? '';
      let bVal = b[sortBy as keyof SavingsCalculatorEntry] ?? '';

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Add serial number
    return result.map((entry, idx) => ({
      ...entry,
      sno: idx + 1
    }));
  }, [entries, searchQuery, sortBy, sortOrder]);

  const [selectedSimMonth, setSelectedSimMonth] = useState<string>('all');
  const [overallTab, setOverallTab] = useState<string>('overview');
  const calcResult = cachedResults[selectedSimMonth]?.calc || null;
  const marketDecisionResult = cachedResults[selectedSimMonth]?.market || null;
  const demandShiftInsights = cachedResults[selectedSimMonth]?.insights || null;


  const uniqueStates = React.useMemo(() => {
    const statesMap = new Map<string, string>();

    // Helper to format string to Title Case
    const toTitleCase = (str: string) => {
      return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    tariffData.forEach((row: any) => {
      if (row.state) {
        const raw = row.state.trim();
        const key = raw.toUpperCase().replace(/_/g, ' ');
        if (!statesMap.has(key)) {
          statesMap.set(key, toTitleCase(key));
        }
      }
    });
    return Array.from(statesMap.values())
      .sort()
      .map((name) => ({ stateCode: name, stateName: name }));
  }, [tariffData]);

  const filteredDiscoms = React.useMemo(() => {
    // We need to match the selected stateCode (which could be "Uttar Pradesh" or "UP")
    // against the discom's stateCode (which is "UP").
    let normalizedCode = stateCode;
    const region = regionStates.find(r => r.stateName.toLowerCase() === stateCode?.toLowerCase() || r.stateCode.toLowerCase() === stateCode?.toLowerCase());
    if (region) {
      normalizedCode = region.stateCode;
    }

    return discomList
      .filter((d: any) => !stateCode ||
        (d.stateCode && normalizedCode && d.stateCode.toLowerCase() === normalizedCode.toLowerCase()) ||
        (d.state && d.state.toLowerCase() === stateCode.toLowerCase()) ||
        (d.stateCode && d.stateCode.toLowerCase() === stateCode.toLowerCase()))
      .map((d: any) => ({ code: d.code, legalName: d.legalName }));
  }, [discomList, stateCode, regionStates]);

  const uniqueCategories = React.useMemo(() => {
    const categoriesSet = new Set<string>();
    tariffData.forEach((row: any) => {
      const matchState = !stateCode ||
        row.state?.toLowerCase() === stateCode.trim().toLowerCase() ||
        (stateCode === 'UP' && row.state?.toLowerCase() === 'uttar pradesh');
      if (matchState && row.consumerCategory) {
        const sub = row.subCategory && row.subCategory.trim();
        if (sub && sub !== '-' && sub !== '') {
          categoriesSet.add(`${row.consumerCategory} | ${sub}`);
        } else {
          categoriesSet.add(row.consumerCategory);
        }
      }
    });

    const list = Array.from(categoriesSet);
    const filtered = list.filter(item => {
      if (!item.includes(' | ')) {
        return !list.some(other => other.startsWith(`${item} | `));
      }
      return true;
    });

    return filtered.sort();
  }, [tariffData, stateCode]);

  const uniqueVoltageLevels = React.useMemo(() => {
    if (consumerCategory.startsWith('LMV-')) return ['Low Tension (LT)', 'High Tension (HT)'];
    if (consumerCategory.startsWith('HV-1')) return ['At 11 kV', 'Above 11 kV'];
    if (consumerCategory.startsWith('HV-2')) return ['Up to 11 kV', 'Above 11 kV to 66 kV', 'Above 66 kV to 132 kV', 'Above 132 kV'];

    const levelsSet = new Set<string>();
    tariffData.forEach((row: any) => {
      const matchState = !stateCode ||
        row.state?.toLowerCase() === stateCode.trim().toLowerCase() ||
        (stateCode === 'UP' && row.state?.toLowerCase() === 'uttar pradesh');
      let parsedCategory = consumerCategory;
      let parsedSubCategory = '';
      if (consumerCategory === "HV-1 A") { parsedCategory = "HV-1"; parsedSubCategory = "Commercial, Private Inst"; }
      else if (consumerCategory === "HV-1 B") { parsedCategory = "HV-1"; parsedSubCategory = "Public Inst., Societies"; }
      else if (consumerCategory === "LMV-11 (Multistoried Buildings)") { parsedCategory = "LMV-11"; parsedSubCategory = "Multistoried Buildings"; }
      else if (consumerCategory === "LMV-11 (Public Charging)") { parsedCategory = "LMV-11"; parsedSubCategory = "Public Charging"; }
      else if (consumerCategory.includes(' | ')) {
        const parts = consumerCategory.split(' | ');
        parsedCategory = parts[0];
        parsedSubCategory = parts[1];
      }

      const matchCategory = !consumerCategory || (row.consumerCategory === parsedCategory && (!parsedSubCategory || (row.subCategory && row.subCategory.includes(parsedSubCategory))));
      if (matchState && matchCategory && row.supplyVoltageCategory) {
        levelsSet.add(row.supplyVoltageCategory);
      }
    });
    return Array.from(levelsSet);
  }, [tariffData, stateCode, consumerCategory]);

  const getTodSlabsForMonth = React.useCallback((ymOrMonth: string | number) => {
    let monthsToCheck: number[] = [];
    if (typeof ymOrMonth === 'number') {
      monthsToCheck = [ymOrMonth];
    } else {
      const entry = todConsumptions[ymOrMonth];
      const startInput = entry?.['Start Date'];
      const endInput = entry?.['End Date'];
      if (startInput && endInput) {
        const start = new Date(startInput);
        const end = new Date(endInput);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          // Get all months between start and end
          const cur = new Date(start.getFullYear(), start.getMonth(), 1);
          const limit = new Date(end.getFullYear(), end.getMonth(), 1);
          while (cur <= limit) {
            monthsToCheck.push(cur.getMonth() + 1);
            cur.setMonth(cur.getMonth() + 1);
          }
        }
      }
      if (monthsToCheck.length === 0) {
        const targetMonth = parseInt(ymOrMonth.split('-')[1], 10);
        monthsToCheck = [targetMonth];
      }
    }

    if (discom === 'NPCL') {
      const hasWinter = monthsToCheck.some(m => m >= 9 || m <= 3);
      
      if (hasWinter) {
        return ['TOD1', 'TOD2', 'TOD3', 'TOD4', 'TOD5', 'TOD6'];
      } else {
        return ['TOD1', 'TOD2', 'TOD3', 'TOD4'];
      }
    }

    const slabsSet = new Set<string>();
    tariffData.forEach((row: any) => {
      const matchState = !stateCode ||
        row.state?.toLowerCase() === stateCode.trim().toLowerCase() ||
        (stateCode === 'UP' && row.state?.toLowerCase() === 'uttar pradesh');
      let parsedCategory = consumerCategory;
      let parsedSubCategory = '';
      if (consumerCategory === "HV-1 A") { parsedCategory = "HV-1"; parsedSubCategory = "Commercial, Private Inst"; }
      else if (consumerCategory === "HV-1 B") { parsedCategory = "HV-1"; parsedSubCategory = "Public Inst., Societies"; }
      else if (consumerCategory === "LMV-11 (Multistoried Buildings)") { parsedCategory = "LMV-11"; parsedSubCategory = "Multistoried Buildings"; }
      else if (consumerCategory === "LMV-11 (Public Charging)") { parsedCategory = "LMV-11"; parsedSubCategory = "Public Charging"; }
      else if (consumerCategory.includes(' | ')) {
        const parts = consumerCategory.split(' | ');
        parsedCategory = parts[0];
        parsedSubCategory = parts[1];
      }

      const matchCategory = !consumerCategory || (row.consumerCategory === parsedCategory && (!parsedSubCategory || (row.subCategory && row.subCategory.includes(parsedSubCategory))));
      let parsedVoltageLevel = voltageLevel;
      if (parsedVoltageLevel && parsedVoltageLevel.includes(' - ')) {
        parsedVoltageLevel = parsedVoltageLevel.split(' - ')[0];
      }
      const matchVoltage = !voltageLevel || row.supplyVoltageCategory === parsedVoltageLevel;
      // month in new schema is YYYYMM int; Match by the last two digits of the stored month
      const storedMonthNum = row.month % 100;
      const matchMonth = monthsToCheck.includes(storedMonthNum);

      if (matchState && matchCategory && matchVoltage && matchMonth) {
        // Derive a slab name from tod times: use start-end or 'FLAT' when no TOD
        const start = row.todStartTime || '—';
        const end = row.todEndTime || '—';
        const slabName = (start === '—' && end === '—')
          ? 'FLAT'
          : `${start}-${end}`;
        slabsSet.add(slabName.toUpperCase());
      }
    });
    // If no slabs found, always include a FLAT slab
    if (slabsSet.size === 0) slabsSet.add('FLAT');
    return Array.from(slabsSet).sort((a, b) => {
      if (a === 'FLAT') return -1;
      if (b === 'FLAT') return 1;
      const getStartHour = (slab: string) => {
        const startStr = slab.split('-')[0];
        if (!startStr || !startStr.includes(':')) return 0;
        const hour = parseInt(startStr.split(':')[0], 10);
        return isNaN(hour) ? 0 : (hour < 5 ? hour + 24 : hour);
      };
      return getStartHour(a) - getStartHour(b);
    });
  }, [tariffData, stateCode, consumerCategory, voltageLevel, discom, todConsumptions]);

  const availableSupplyVoltageValues = React.useMemo(() => {
    switch (voltageLevel) {
      case 'At 11 kV': return ['11'];
      case 'Above 11 kV': return ['33', '66', '132'];
      case 'Up to 11 kV': return ['11'];
      case 'Above 11 kV to 66 kV': return ['33', '66'];
      case 'Above 66 kV to 132 kV': return ['132'];
      default: return [];
    }
  }, [voltageLevel]);

  const resetForm = () => {
    setClientName('');
    setClientPrefix('Mr.');
    setIndustryName('');
    setAddress('');
    setSanctionedLoadKw('');
    setSanctionedLoadKva('');
    setStateCode('');
    setDiscom('');
    setConsumerCategory('');
    setVoltageLevel('');
    setSupplyVoltageValue('');
    setProltMargin('');
    setTraderMargin('');
    setMeteringCharges('');
    setConsultancyFee('');
    setProbusPlatformFee('');
    setTodConsumptions({});
    setFormErrors({});
    setBilledDemandKv('');
    setPowerFactor('');
    setArrearAmount('');
    setCurrentLpsc('');
    setBillDate('');
  };

  const handleOpenHistory = (entry: SavingsCalculatorEntry) => {
    navigate(`/savings-calculator/view/${entry.id}?tab=history`);
  };

  const handleOpenDialog = async (mode: DialogMode, entry?: SavingsCalculatorEntry) => {
    if (mode === 'create') {
      navigate('/savings-calculator/create');
      return;
    }
    if (entry) {
      if (mode === 'view') {
        navigate(`/savings-calculator/view/${entry.id}`);
        return;
      }
      if (mode === 'edit') {
        navigate(`/savings-calculator/view/${entry.id}?tab=edit`);
        return;
      }
    }

    setDialogMode(mode);
    setFormErrors({});
    setClientOverview(null);
    if (entry) {
      setSelectedEntry(entry);
      let loadedName = entry.clientName;
      let loadedTitle = 'Mr.';
      const titles = ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'M/s'];
      for (const t of titles) {
        if (loadedName.startsWith(t + ' ')) {
          loadedTitle = t;
          loadedName = loadedName.substring(t.length + 1);
          break;
        }
      }
      setClientPrefix(loadedTitle);
      setClientName(loadedName);
      setIndustryName(entry.industryName);
      setAddress(entry.address);
      const kwValue = entry.sanctionedLoadKw ? String(entry.sanctionedLoadKw) : '';
      setSanctionedLoadKw(kwValue);
      const pf = entry.powerFactor || 0.99;
      setSanctionedLoadKva(kwValue ? (Number(kwValue) / pf).toFixed(2).replace(/\.00$/, '') : '');
      setStateCode(entry.stateCode || '');
      setDiscom(entry.discom || '');
      setConsumerCategory(entry.consumerCategory || '');

      let parsedVoltageLevel = entry.voltageLevel || '';
      let parsedSupplyVoltageValue = '';
      if (parsedVoltageLevel.includes(' - ')) {
        const parts = parsedVoltageLevel.split(' - ');
        parsedVoltageLevel = parts[0];
        parsedSupplyVoltageValue = parts.slice(1).join(' - ');
      }
      setVoltageLevel(parsedVoltageLevel);
      setSupplyVoltageValue(parsedSupplyVoltageValue);

      setProltMargin(entry.proltMargin ? String(entry.proltMargin) : '');
      setTraderMargin(entry.traderMargin ? String(entry.traderMargin) : '');
      setMeteringCharges(entry.meteringCharges !== undefined && entry.meteringCharges !== null ? String(entry.meteringCharges) : '');
      setConsultancyFee(entry.consultancyFee ? String(entry.consultancyFee) : '');
      setProbusPlatformFee(entry.probusPlatformFee ? String(entry.probusPlatformFee) : '');

      const tc: Record<string, Record<string, string>> = {};
      if (entry.todConsumptions) {
        Object.keys(entry.todConsumptions).forEach(ym => {
          tc[ym] = {};
          const monthData = (entry.todConsumptions![ym] as Record<string, any>) || {};
          const monthSlabs = getTodSlabsForMonth(ym);
          const billingUnit = monthData['Billing Unit'] || 'kVAh';
          const isKvah = billingUnit === 'kVAh';
          
          const monthPf = monthData['Power Factor'];
          const pf = (monthPf && String(monthPf).trim() !== '') ? Number(monthPf) : (entry.powerFactor || (isKvah ? 0.99 : 1));
          
          Object.keys(monthData).forEach(slab => {
            if (slab === '_rawKvah') return;
            
            if (monthSlabs.includes(slab) || slab.toUpperCase() === 'FLAT' || slab.toUpperCase() === 'TOTAL') {
              const val = parseFloat(monthData[slab]);
              if (!isNaN(val)) {
                tc[ym][slab] = String(val);
              } else {
                tc[ym][slab] = String(monthData[slab]);
              }
            } else {
              tc[ym][slab] = String(monthData[slab]);
            }
          });
          
          // Ensure Billing Unit and Power Factor are set in state
          tc[ym]['Billing Unit'] = billingUnit;
          tc[ym]['Power Factor'] = String(pf);
        });
      }
      setTodConsumptions(tc);

      setBilledDemandKv(entry.billedDemandKv !== undefined && entry.billedDemandKv !== null ? String(entry.billedDemandKv) : '');
      setPowerFactor(entry.powerFactor !== undefined && entry.powerFactor !== null ? String(entry.powerFactor) : '');
      setArrearAmount(entry.arrearAmount !== undefined && entry.arrearAmount !== null ? String(entry.arrearAmount) : '');
      setCurrentLpsc(entry.currentLpsc !== undefined && entry.currentLpsc !== null ? String(entry.currentLpsc) : '');
      setBillDate(entry.billDate || '');

      setHasReachedSummary(true);
      setActiveStep(7);
    } else {
      setSelectedEntry(null);
      resetForm();
      setHasReachedSummary(false);
      setActiveStep(0);
    }
  };

  const isTodValid = () => {
    let hasAtLeastOneValue = false;
    let isConsumptionsValid = true;
    const ignoredKeys = ['Start Date', 'End Date', 'Electricity Duty', 'Season', 'Billing Month', '_rawKvah', 'Current LPSC', 'Arrear Amount', 'Miscellaneous Charges', 'Billing Unit', 'Peak Demand (kVA)'];
    Object.values(todConsumptions).forEach(monthData => {
      Object.entries(monthData).forEach(([key, val]) => {
        if (!ignoredKeys.includes(key) && val.trim()) {
          const v = parseFloat(val);
          if (key === 'Power Factor') {
            if (isNaN(v) || v <= 0 || v > 1) isConsumptionsValid = false;
            else hasAtLeastOneValue = true;
          } else {
            if (isNaN(v) || v < 0) isConsumptionsValid = false;
            else hasAtLeastOneValue = true;
          }
        }
      });
    });
    return isConsumptionsValid && hasAtLeastOneValue;
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 0:
        return clientName.trim() !== '' && industryName.trim() !== '' && address.trim() !== '';
      case 1:
        return stateCode.trim() !== '';
      case 2:
        return discom.trim() !== '';
      case 3:
        return consumerCategory.trim() !== '';
      case 4:
        if (!voltageLevel.trim()) return false;
        if (availableSupplyVoltageValues.length > 0 && !supplyVoltageValue.trim()) return false;
        return true;
      case 5:
        if (!sanctionedLoadKw.trim()) return false;
        const parsed = parseFloat(sanctionedLoadKw);
        return !isNaN(parsed) && parsed > 0;
      case 6:
        return true; // Additional Billing Details are optional
      default:
        return false;
    }
  };

  const handleCloseDialog = (event?: any, reason?: string) => {
    if (reason && (reason === 'backdropClick' || reason === 'escapeKeyDown')) return;
    setDialogMode(null);
    setSelectedEntry(null);
    setFormErrors({});
    setProltDialogOpen(false);
    setTodDialogOpen(false);
    resetForm();
  };

  const validateForm = () => {
    const errors: typeof formErrors = {};
    if (!clientName.trim()) errors.clientName = 'Client Name is required.';
    if (!industryName.trim()) errors.industryName = 'Industry Name is required.';
    if (!address.trim()) errors.address = 'Address is required.';
    if (!stateCode.trim()) errors.stateCode = 'State is required.';
    if (!discom.trim()) errors.discom = 'DISCOM is required.';

    if (sanctionedLoadKw.trim()) {
      const parsed = parseFloat(sanctionedLoadKw);
      if (isNaN(parsed) || parsed <= 0) {
        errors.sanctionedLoadKw = 'Sanctioned load must be a positive number.';
      }
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      setSnackbar({ open: true, message: firstError, severity: 'error' });
    }
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (dialogMode === 'view') return;
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const payload: any = {
        clientName: clientPrefix ? `${clientPrefix} ${clientName.trim()}` : clientName.trim(),
        industryName: industryName.trim(),
        address: address.trim(),
        sanctionedLoadKw: sanctionedLoadKw.trim() ? parseFloat(sanctionedLoadKw) : undefined,
        stateCode: stateCode.trim() || undefined,
        discom: discom.trim() || undefined,
        consumerCategory: consumerCategory.trim() || undefined,
        voltageLevel: (voltageLevel.trim() ? (supplyVoltageValue.trim() ? `${voltageLevel.trim()} - ${supplyVoltageValue.trim()}` : voltageLevel.trim()) : undefined),
        proltMargin: proltMargin ? Number(proltMargin) : undefined,
        traderMargin: traderMargin ? Number(traderMargin) : undefined,
        meteringCharges: meteringCharges ? Number(meteringCharges) : undefined,
        consultancyFee: consultancyFee ? Number(consultancyFee) : undefined,
        probusPlatformFee: probusPlatformFee ? Number(probusPlatformFee) : undefined,
        todConsumptions: Object.keys(todConsumptions).length > 0 ?
          Object.fromEntries(
            Object.entries(todConsumptions).map(([ym, data]) => {
              const stringFields = ['Start Date', 'End Date', 'Electricity Duty', 'Bill Date', 'Season', 'Billing Month', 'Billing Unit', 'Power Factor'];
              const monthSlabs = getTodSlabsForMonth(ym);
              
              const billingUnit = data['Billing Unit'] || 'kVAh';
              const isKvah = billingUnit === 'kVAh';
              
              const pfInput = data['Power Factor'];
              const pf = pfInput && String(pfInput).trim() !== '' ? Number(pfInput) : (isKvah ? 0.99 : 1);

              const processed: Record<string, any> = {};

              // Explicitly set these default fields so they are never lost
              processed['Billing Unit'] = billingUnit;
              processed['Power Factor'] = pf;

              Object.entries(data).forEach(([k, v]) => {
                if (!v || String(v).trim() === '') return;
                
                // Skip if we already explicitly set it
                if (k === 'Billing Unit' || k === 'Power Factor') return;

                if (stringFields.includes(k)) {
                  processed[k] = v;
                } else if (monthSlabs.includes(k) || k.toUpperCase() === 'FLAT' || k.toUpperCase() === 'TOTAL') {
                  const inputVal = parseFloat(String(v));
                  if (!isNaN(inputVal)) {
                    processed[k] = parseFloat(inputVal.toFixed(4));
                  }
                } else {
                  processed[k] = parseFloat(String(v));
                }
              });

              return [ym, processed];
            })
          )
          : undefined,
        billedDemandKv: billedDemandKv.trim() ? parseFloat(billedDemandKv) : undefined,
      };

      if (dialogMode === 'create') {
        await createSavingsEntry(payload);
        setSnackbar({
          open: true,
          message: 'Entry created successfully!',
          severity: 'success'
        });
      } else if (dialogMode === 'edit' && selectedEntry) {
        await updateSavingsEntry(selectedEntry.id, payload);
        setSnackbar({
          open: true,
          message: 'Entry updated successfully!',
          severity: 'success'
        });
      }

      setProltDialogOpen(false);
      setTodDialogOpen(false);
      handleCloseDialog();
      loadEntries();
    } catch (err: any) {
      console.error('Failed to submit form:', err);
      const errMsg = err.response?.data?.message || err.message || 'Operation failed. Please try again.';
      setSnackbar({
        open: true,
        message: errMsg,
        severity: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) {
      setSnackbar({
        open: true,
        message: 'You do not have permission to delete entries.',
        severity: 'error'
      });
      return;
    }
    if (!window.confirm('Are you sure you want to delete this entry?')) return;

    try {
      await deleteSavingsEntry(id);
      setSnackbar({
        open: true,
        message: 'Entry deleted successfully!',
        severity: 'success'
      });
      loadEntries();
    } catch (err: any) {
      console.error('Failed to delete entry:', err);
      setSnackbar({
        open: true,
        message: err.message || 'Delete operation failed.',
        severity: 'error'
      });
    }
  };

  const handleOpenCalc = (entry: SavingsCalculatorEntry) => {
    navigate(`/savings-calculator/analysis/${entry.id}`);
  };

  const handleCloseCalc = (event?: any, reason?: string) => {
    if (reason && (reason === 'backdropClick' || reason === 'escapeKeyDown')) return;
    setCalcDialogOpen(false);
    setCalcEntry(null);


  };

  const executeCalculation = async () => {
    if (!calcEntry) return;
    try {
      setCalculating(true);
      const months = ['all', ...Object.keys(calcEntry.todConsumptions || {}).sort()];

      const newCache: Record<string, any> = { ...cachedResults };

      for (const m of months) {
        const savingsRes = await calculateSavings(calcEntry.id, m, selectedCalcVersion || undefined);
        const marketRes = await calculateMarketDecision(calcEntry.id, m, selectedCalcVersion || undefined);
        const insightsRes = await fetchDemandShiftInsights(calcEntry.id, m, selectedCalcVersion || undefined);
        
        if (!newCache[m]) newCache[m] = { calc: null, market: null, insights: null };
        newCache[m].calc = savingsRes;
        newCache[m].market = marketRes;
        newCache[m].insights = insightsRes;
      }

      setCachedResults(newCache);
      setCalcTab(0);
    } catch (err: any) {
      console.error('Calculation failed:', err);
      setSnackbar({
        open: true,
        message: err.message || 'Calculations failed.',
        severity: 'error'
      });
    } finally {
      setCalculating(false);
    }
  };

  const executeGraphSimulation = async () => {
    if (!calcEntry) return;
    try {
      setCalculating(true);
      const res = await calculateMarketDecision(calcEntry.id, selectedSimMonth || undefined, selectedCalcVersion || undefined);
      setCachedResults(prev => ({
        ...prev,
        [selectedSimMonth]: {
          ...prev[selectedSimMonth],
          market: res
        }
      }));
      setGraphDialogOpen(true);
    } catch (err: any) {
      console.error('Graph Simulation failed:', err);
      setSnackbar({
        open: true,
        message: err.message || 'Graph calculation failed.',
        severity: 'error'
      });
    } finally {
      setCalculating(false);
    }
  };

  const executeInsights = async () => {
    if (!calcEntry) return;
    try {
      setCalculatingInsights(true);
      const months = ['all', ...Object.keys(calcEntry.todConsumptions || {}).sort()];

      const newCache: Record<string, any> = { ...cachedResults };

      for (const m of months) {
        const res = await fetchDemandShiftInsights(calcEntry.id, m, selectedCalcVersion || undefined);
        if (!newCache[m]) newCache[m] = { calc: null, market: null, insights: null };
        newCache[m].insights = res;
      }

      setCachedResults(newCache);
      setCalcTab(4);
    } catch (err: any) {
      console.error('Insights calculation failed:', err);
      setSnackbar({
        open: true,
        message: err.message || 'Insights calculation failed.',
        severity: 'error'
      });
    } finally {
      setCalculatingInsights(false);
    }
  };

  const exportCalcToCSV = () => {
    if (!calcResult || !calcResult.sortedMonthlyList) return;
    const exportData = calcResult.sortedMonthlyList.map((row) => ({
      'Date': row.date,
      'Timeblock': row.slot,
      'Time': row.timeStr,
      'TOD Slab': row.todSlab,
      'DAM (Rs/kWh)': row.damLandingPrice.toFixed(4),
      'DISCOM Landing Rate (Rs/kWh)': row.discomLandingPrice.toFixed(4),
      'Compared Lowest Price (Rs/kWh)': row.comparedLowestPrice.toFixed(4),
      'Sourced Energy (kWh)': row.maxEnergyPerSlot.toFixed(2),
      'Optimized Cost (Rs)': row.optimizedCost.toFixed(2),
      'Baseline DISCOM Cost (Rs)': row.baselineCost.toFixed(2),
      'Savings (Rs)': (row.baselineCost - row.optimizedCost).toFixed(2),
      'Market Decision (Yes/No)': row.selectedSource !== 'DISCOM' ? 'Yes' : 'No',
      'Selected Source': row.selectedSource,
      'ISTS Loss (%)': row.istsLoss?.toFixed(4) || '0.0000',
      'STU Loss (%)': row.stuLoss?.toFixed(4) || '0.0000',
      'Wheeling Loss (%)': row.wheelingLoss?.toFixed(4) || '0.0000'
    }));

    const filename = `${calcResult.clientName}_savings_report.csv`;
    exportToCSV(exportData, filename);
  };

  const exportDetailedOAToCSV = () => {
    if (!marketDecisionResult || !marketDecisionResult.slotsData) return;
    const exportData = marketDecisionResult.slotsData.map((row) => ({
      'Date': row.date,
      'Timeblock': row.timeblock,
      'TOD Slab': row.tod,
      'DAM MCP': row.damMcp?.toFixed(4) || '-',
      'RTM MCP': row.rtmMcp?.toFixed(4) || '-',
      'GDAM MCP': row.gdamMcp?.toFixed(4) || '-',
      'DAM Landing': row.damLanding?.toFixed(4) || '-',
      'RTM Landing': row.rtmLanding?.toFixed(4) || '-',
      'GDAM Landing': row.gdamLanding?.toFixed(4) || '-',
      'DISCOM Landing': row.discomLanding?.toFixed(4) || '-',
      'Best Market Source': row.marketSource,
      'Best Market Landing': row.bestMarketLanding?.toFixed(4) || '-',
      'Savings Per Kwh': row.savingsPerKwh?.toFixed(4) || '-',
      'Should Buy Market': row.shouldBuyFromMarket ? 'Yes' : 'No',
      'ISTS Loss (%)': row.istsLoss?.toFixed(4) || '0.0000',
      'STU Loss (%)': row.stuLoss?.toFixed(4) || '0.0000',
      'Wheeling Loss (%)': row.wheelingLoss?.toFixed(4) || '0.0000'
    }));

    const filename = `${marketDecisionResult.clientName}_detailed_oa_simulation.csv`;
    exportToCSV(exportData, filename);
  };

  const exportInsightsToCSV = () => {
    if (!demandShiftInsights || !demandShiftInsights.slotsData) return;
    const exportData = demandShiftInsights.slotsData.map((row) => ({
      'Date': row.date,
      'Timeblock': row.timeblock,
      'TOD Slab': row.tod,
      'Cost Per Kwh': row.costPerKwh?.toFixed(4) || '-',
      'Original Energy (kWh)': row.originalEnergy?.toFixed(2) || '0.00',
      'New Energy (kWh)': row.newEnergy?.toFixed(2) || '0.00',
      'Original Market Energy (kWh)': (row.marketEnergy - (row.newEnergy - row.originalEnergy))?.toFixed(2) || '0.00',
      'New Market Energy (kWh)': row.marketEnergy?.toFixed(2) || '0.00',
      'Discom Energy (kWh)': row.discomEnergy?.toFixed(2) || '0.00',
      'Market Source': row.marketSource || 'DISCOM',
      'Should Buy Market': row.shouldBuyFromMarket ? 'Yes' : 'No'
    }));

    const filename = `${demandShiftInsights.clientName}_industry_insights.csv`;
    exportToCSV(exportData, filename);
  };

  const exportInsightsToExcel = async () => {
    if (!calcEntry) return;
    try {
      setCalculatingInsights(true);
      await exportDemandShiftExcel(calcEntry.id, selectedSimMonth || undefined, selectedCalcVersion || undefined);
    } catch (error) {
      console.error('Failed to export Demand Shift Insights to Excel', error);
      setSnackbar({
        open: true,
        message: 'Failed to export Insights to Excel. Please try again.',
        severity: 'error'
      });
    } finally {
      setCalculatingInsights(false);
    }
  };

  const renderStep = (
    stepIndex: number,
    stepMeta: { icon: React.ReactNode; title: string; question: string; summary: string; content: React.ReactNode }
  ) => {
    const isCompleted = stepIndex < activeStep || dialogMode === 'view';
    const isActive = stepIndex === activeStep && dialogMode !== 'view';
    const isFuture = stepIndex > activeStep && dialogMode !== 'view';

    if (isFuture) return null;

    if (isCompleted) {
      return (
        <Card
          key={stepIndex}
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
            borderRadius: '12px',
            p: 1.75,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              borderColor: dialogMode !== 'view' ? '#8B5CF6' : 'divider',
              bgcolor: dialogMode !== 'view' ? `${alpha('#8B5CF6', 0.02)}` : (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC'
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CheckCircleIcon sx={{ color: '#10B981', fontSize: 22 }} />
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                {stepMeta.summary}
              </Typography>
            </Box>
            {dialogMode !== 'view' && (
              <IconButton size="small" onClick={() => setActiveStep(stepIndex)} title="Edit step">
                <EditIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              </IconButton>
            )}
          </Box>
        </Card>
      );
    }

    if (isActive) {
      return (
        <Card
          key={stepIndex}
          elevation={0}
          sx={{
            border: '2px solid #8B5CF6',
            borderRadius: '16px',
            p: 3,
            boxShadow: '0 4px 12px -2px rgba(139, 92, 246, 0.08), 0 2px 6px -1px rgba(139, 92, 246, 0.04)',
            bgcolor: 'background.paper'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box sx={{ color: '#8B5CF6', display: 'flex', alignItems: 'center' }}>
              {stepMeta.icon}
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '1rem' }}>
              {stepMeta.question}
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            {stepMeta.content}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
            {stepIndex > 0 && (
              <Button
                onClick={() => setActiveStep(stepIndex - 1)}
                sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600, color: 'text.secondary' }}
              >
                Back
              </Button>
            )}
            <Button
              variant="contained"
              onClick={() => {
                if (isStepValid(stepIndex)) {
                  if (hasReachedSummary && stepIndex < 7) {
                    setActiveStep(7);
                  } else if (stepIndex === 5) {
                    // After Sanction Load, open TOD Consumption dialog
                    setTodDialogOpen(true);
                  } else if (stepIndex < 5) {
                    setActiveStep(stepIndex + 1);
                  } else {
                    setProltDialogOpen(true);
                  }
                } else {
                  if (stepIndex === 0) {
                    setFormErrors({ clientDetails: 'Please fill in all required client details.' });
                  } else if (stepIndex === 5) {
                    setFormErrors({ sanctionedLoadKw: 'Sanctioned load must be a positive number.' });
                  }
                }
              }}
              endIcon={stepIndex === 6 ? undefined : (hasReachedSummary ? undefined : <ArrowForwardIcon />)}
              sx={{
                textTransform: 'none',
                borderRadius: 2.5,
                fontWeight: 600,
                bgcolor: '#8B5CF6',
                '&:hover': {
                  bgcolor: '#7C3AED'
                }
              }}
            >
              {hasReachedSummary && stepIndex < 7 ? 'Return to Summary' : (stepIndex === 6 ? 'Next' : 'Continue')}
            </Button>
          </Box>
        </Card>
      );
    }

    return null;
  };

  const stats = React.useMemo(() => {
    const totalEntries = entries.length;
    const totalKw = entries.reduce((acc, curr) => acc + (Number(curr.sanctionedLoadKw) || 0), 0);
    const uniqueDiscoms = new Set(entries.map(e => e.discom).filter(Boolean)).size;
    const uniqueStates = new Set(entries.map(e => e.stateCode).filter(Boolean)).size;
    return {
      totalEntries,
      totalMw: (totalKw / 1000).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 }),
      uniqueDiscoms,
      uniqueStates
    };
  }, [entries]);

  const columns: ColumnDefinition[] = [
    {
      field: 'sno',
      headerName: 'Client ID',
      align: 'center',
      width: 90,
      sticky: true,
      renderCell: (row) => (
        <Typography
          sx={{
            fontFamily: '"Inter", sans-serif',
            fontSize: '12px',
            fontWeight: 600,
            color: 'text.secondary'
          }}
        >
          {row.sno || row.id}
        </Typography>
      )
    },
    {
      field: 'clientName',
      headerName: 'Client Name',
      align: 'left',
      minWidth: 170,
      sticky: true,
      sortable: true,
      renderCell: (row) => (
        <Typography
          sx={{
            fontFamily: '"Inter", sans-serif',
            fontWeight: 600,
            color: 'text.primary',
            fontSize: '13px',
            letterSpacing: '-0.15px'
          }}
        >
          {row.clientName}
        </Typography>
      )
    },
    {
      field: 'industryName',
      headerName: 'Industry Name',
      align: 'left',
      minWidth: 170,
      sortable: true,
      renderCell: (row) => (
        <Typography
          sx={{
            fontFamily: '"Inter", sans-serif',
            fontSize: '12.5px',
            fontWeight: 500,
            color: 'text.primary'
          }}
        >
          {row.industryName || '-'}
        </Typography>
      )
    },
    {
      field: 'sanctionedLoadKw',
      headerName: 'Sanctioned Load (kW)',
      align: 'center',
      width: 150,
      sortable: true,
      renderCell: (row) => (
        <Typography
          sx={{
            fontFamily: '"Inter", sans-serif',
            fontWeight: 600,
            fontSize: '12.5px',
            color: 'text.primary',
            letterSpacing: '-0.1px'
          }}
        >
          {row.sanctionedLoadKw ? Number(row.sanctionedLoadKw).toLocaleString('en-IN') : '-'}
        </Typography>
      )
    },
    {
      field: 'stateCode',
      headerName: 'State',
      align: 'center',
      width: 120,
      sortable: true,
      renderCell: (row) => (
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            px: 1.3,
            py: 0.3,
            borderRadius: '16px',
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
            color: (theme) => theme.palette.mode === 'dark' ? '#93C5FD' : '#2563EB',
            fontWeight: 600,
            fontSize: '11px',
            fontFamily: '"Inter", sans-serif',
            border: '1px solid',
            borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.25)' : '#BFDBFE'
          }}
        >
          {row.stateCode || '-'}
        </Box>
      )
    },
    {
      field: 'discom',
      headerName: 'DISCOM',
      align: 'left',
      width: 100,
      sortable: true,
      renderCell: (row) => (
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            px: 1.3,
            py: 0.3,
            borderRadius: '16px',
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
            color: (theme) => theme.palette.mode === 'dark' ? '#6EE7B7' : '#059669',
            fontWeight: 600,
            fontSize: '11px',
            fontFamily: '"Inter", sans-serif',
            border: '1px solid',
            borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.25)' : '#A7F3D0'
          }}
        >
          {row.discom || '-'}
        </Box>
      )
    },
    {
      field: 'consumerCategory',
      headerName: 'Category',
      align: 'left',
      width: 160,
      sortable: true,
      renderCell: (row) => (
        <MuiTooltip title={row.consumerCategory || ''} placement="top">
          <Typography
            sx={{
              fontFamily: '"Inter", sans-serif',
              fontSize: '12px',
              fontWeight: 500,
              color: 'text.secondary',
              maxWidth: 150,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {row.consumerCategory || '-'}
          </Typography>
        </MuiTooltip>
      )
    },
    {
      field: 'voltageLevel',
      headerName: 'Voltage',
      align: 'center',
      width: 120,
      sortable: true,
      renderCell: (row) => (
        <Typography
          sx={{
            fontFamily: '"Inter", sans-serif',
            fontSize: '12px',
            fontWeight: 500,
            color: 'text.secondary'
          }}
        >
          {row.voltageLevel || '-'}
        </Typography>
      )
    },
    {
      field: 'createdAt',
      headerName: 'Created At',
      align: 'center',
      width: 160,
      sortable: true,
      renderCell: (row) => (
        <Typography
          sx={{
            fontFamily: '"Inter", sans-serif',
            fontSize: '11.5px',
            color: 'text.secondary'
          }}
        >
          {row.createdAt ? new Date(row.createdAt as string).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}
        </Typography>
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      align: 'center',
      width: 170,
      stickyRight: true,
      renderCell: (row) => (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/savings-calculator/view/${row.id}`);
            }}
            endIcon={<ArrowForwardIcon sx={{ fontSize: '13px !important' }} />}
            sx={{
              fontSize: '11.5px',
              fontWeight: 600,
              fontFamily: '"Inter", sans-serif',
              py: 0.6,
              px: 1.6,
              background: 'linear-gradient(135deg, #7C3AED 0%, #6366F1 100%)',
              color: '#fff',
              textTransform: 'none',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(124, 58, 237, 0.22)',
              '&:hover': {
                background: 'linear-gradient(135deg, #6D28D9 0%, #4F46E5 100%)',
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.32)',
              }
            }}
          >
            Open Client
          </Button>

          {canDelete && (
            <MuiTooltip title="Delete Entry" arrow>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(row.id);
                }}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  p: 0.6,
                  color: '#EF4444',
                  '&:hover': {
                    borderColor: '#EF4444',
                    bgcolor: alpha('#EF4444', 0.08)
                  }
                }}
              >
                <DeleteIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </MuiTooltip>
          )}
        </Box>
      )
    }
  ];

  if (selectedInsightsEntry) {
    return <EnergyInsightsExplorer entry={selectedInsightsEntry} onBack={() => setSelectedInsightsEntry(null)} />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, pt: 2 }}>
      {/* Executive Header Banner */}
      <Box sx={{
        display: 'flex',
        alignItems: { xs: 'flex-start', md: 'center' },
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2.5,
        pb: 3,
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Box sx={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)',
            color: '#8B5CF6',
            p: 2,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'rgba(139, 92, 246, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.15)'
          }}>
            <CalculateIcon sx={{ fontSize: 32 }} />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <Typography variant="h1" sx={{ color: 'text.primary', fontWeight: 800, fontSize: { xs: '22px', sm: '26px' }, letterSpacing: '-0.5px' }}>
                Savings Calculator (Classic)
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '13px' }}>
              Compare grid utility tariffs against energy market procurement clearing prices with automated TOD arbitrage.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: { xs: '100%', md: 'auto' } }}>
          <OutlinedInput
            placeholder="Search clients, industries, DISCOMs..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            startAdornment={
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              </InputAdornment>
            }
            sx={{
              borderRadius: 2.5,
              bgcolor: 'background.paper',
              minWidth: { xs: '100%', sm: 300 },
              fontSize: '13px'
            }}
          />
          {canEdit && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog('create')}
              sx={{
                textTransform: 'none',
                borderRadius: 2.5,
                fontWeight: 700,
                background: 'linear-gradient(135deg, #7C3AED 0%, #6366F1 100%)',
                boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #6D28D9 0%, #4F46E5 100%)',
                  boxShadow: '0 6px 18px rgba(124, 58, 237, 0.4)',
                },
                px: 2.5,
                py: 1.1,
                fontSize: '13px',
                whiteSpace: 'nowrap'
              }}
            >
              Create New Entry
            </Button>
          )}
        </Box>
      </Box>

      {/* Executive Metric Cards */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={0} sx={{
            p: 2.2,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            transition: 'all 0.2s ease',
            '&:hover': {
              boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.06)',
              borderColor: '#8B5CF6'
            }
          }}>
            <Box sx={{
              p: 1.5,
              borderRadius: 2.5,
              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)',
              color: '#8B5CF6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BusinessIcon fontSize="medium" />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Active Portfolios
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', mt: 0.2 }}>
                {stats.totalEntries} <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>Clients</span>
              </Typography>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={0} sx={{
            p: 2.2,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            transition: 'all 0.2s ease',
            '&:hover': {
              boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.06)',
              borderColor: '#10B981'
            }
          }}>
            <Box sx={{
              p: 1.5,
              borderRadius: 2.5,
              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BoltIcon fontSize="medium" />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Contract Load
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', mt: 0.2 }}>
                {stats.totalMw} <span style={{ fontSize: '12px', fontWeight: 500, color: '#10B981' }}>MW</span>
              </Typography>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={0} sx={{
            p: 2.2,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            transition: 'all 0.2s ease',
            '&:hover': {
              boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.06)',
              borderColor: '#3B82F6'
            }
          }}>
            <Box sx={{
              p: 1.5,
              borderRadius: 2.5,
              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
              color: '#3B82F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ElectricBoltIcon fontSize="medium" />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Grid Utilities
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', mt: 0.2 }}>
                {stats.uniqueDiscoms} <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>DISCOMs</span>
              </Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer
        title="Savings Calculator Entries"
        data={filteredAndSortedEntries}
        columns={columns}
        loading={loading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={(field) => {
          if (sortBy === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
          } else {
            setSortBy(field);
            setSortOrder('asc');
          }
        }}
        emptyStateMessage={
          <EmptyTableState
            title="No entries found"
            description="Create your first client configuration entry to simulate and calculate savings."
            onAddRecord={() => handleOpenDialog('create')}
          />
        }
      />

      <Dialog
        open={dialogMode !== null && !proltDialogOpen && !todDialogOpen}
        onClose={handleCloseDialog}
        maxWidth={dialogMode === 'view' ? 'lg' : 'sm'}
        fullWidth
        PaperProps={{
          sx: { borderRadius: 4, p: 1 }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, pb: 1 }}>
          {dialogMode === 'create' && 'Create New Entry'}
          {dialogMode === 'edit' && 'Edit Entry'}
          {dialogMode === 'view' && 'View Entry Details'}
          <IconButton onClick={handleCloseDialog}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 2, mx: 'auto', width: '100%', pb: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {dialogMode !== 'view' && (
              <>
                <Box sx={{ width: '100%', height: 6, bgcolor: '#F1F5F9', borderRadius: 3, mb: 1, overflow: 'hidden' }}>
                  <Box sx={{
                    height: '100%',
                    width: `${((activeStep + 1) / 8) * 100}%`,
                    bgcolor: '#3B8FF3',
                    background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)',
                    transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                  }} />
                </Box>

                {renderStep(0, {
                  icon: <BusinessIcon />,
                  title: "Client & Facility Details",
                  question: "Who is the client for this simulation?",
                  summary: `Client: ${clientName} (${industryName})`,
                  content: (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
                      <TextField
                        label="Client Name"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        fullWidth
                        required
                        variant="outlined"
                        size="small"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Select
                                value={clientPrefix}
                                onChange={(e) => setClientPrefix(e.target.value)}
                                variant="standard"
                                disableUnderline
                                displayEmpty
                                sx={{ '& .MuiSelect-select': { py: 0, pr: 1, color: 'text.secondary' } }}
                              >
                                <MenuItem value=""><em>None</em></MenuItem>
                                <MenuItem value="Mr.">Mr.</MenuItem>
                                <MenuItem value="Ms.">Ms.</MenuItem>
                                <MenuItem value="Mrs.">Mrs.</MenuItem>
                                <MenuItem value="Dr.">Dr.</MenuItem>
                                <MenuItem value="M/s">M/s</MenuItem>
                              </Select>
                            </InputAdornment>
                          ),
                        }}
                      />
                      <TextField
                        label="Industry Name"
                        value={industryName}
                        onChange={(e) => setIndustryName(e.target.value)}
                        fullWidth
                        required
                        variant="outlined"
                        size="small"
                      />
                      <TextField
                        label="Address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        fullWidth
                        required
                        multiline
                        rows={3}
                        variant="outlined"
                        size="small"
                      />
                    </Box>
                  )
                })}

                {renderStep(1, {
                  icon: <LocationIcon />,
                  title: "Where is your facility located?",
                  question: "Where is your facility located?",
                  summary: `Location: ${stateCode} - ${uniqueStates.find(s => s.stateCode === stateCode)?.stateName || stateCode}`,
                  content: (
                    <Box sx={{ mt: 1 }}>
                      <TextField
                        select
                        label="State Code"
                        value={stateCode}
                        onChange={(e) => {
                          setStateCode(e.target.value);
                          setDiscom('');
                          setConsumerCategory('');
                          setVoltageLevel('');
                          setSupplyVoltageValue('');
                        }}
                        fullWidth
                        variant="outlined"
                        size="small"
                        InputLabelProps={{ shrink: true }}
                      >
                        <MenuItem value="" disabled>Select State</MenuItem>
                        {uniqueStates.map((s) => (
                          <MenuItem key={s.stateCode} value={s.stateCode}>
                            {s.stateName}
                          </MenuItem>
                        ))}
                        {stateCode && !uniqueStates.some((s) => s.stateCode === stateCode) && (
                          <MenuItem value={stateCode}>{stateCode}</MenuItem>
                        )}
                      </TextField>
                    </Box>
                  )
                })}

                {renderStep(2, {
                  icon: <ElectricBoltIcon />,
                  title: "Who is your electricity provider?",
                  question: "Who is your electricity provider?",
                  summary: `Provider: ${discom}`,
                  content: (
                    <Box sx={{ mt: 1 }}>
                      <TextField
                        select
                        label="DISCOM"
                        value={discom}
                        onChange={(e) => setDiscom(e.target.value)}
                        fullWidth
                        variant="outlined"
                        size="small"
                        InputLabelProps={{ shrink: true }}
                      >
                        <MenuItem value="" disabled>Select DISCOM</MenuItem>
                        {filteredDiscoms.map((d) => (
                          <MenuItem key={d.code} value={d.code}>
                            {d.code} - {d.legalName}
                          </MenuItem>
                        ))}
                        {discom && !filteredDiscoms.some((d) => d.code === discom) && (
                          <MenuItem value={discom}>{discom}</MenuItem>
                        )}
                      </TextField>
                    </Box>
                  )
                })}

                {renderStep(3, {
                  icon: <CategoryIcon />,
                  title: "What is your consumer category?",
                  question: "What is your consumer category?",
                  summary: `Category: ${consumerCategory}`,
                  content: (
                    <Box sx={{ mt: 1 }}>
                      <TextField
                        select
                        label="Consumer Category"
                        value={consumerCategory}
                        onChange={(e) => {
                          const newCat = e.target.value;
                          setConsumerCategory(newCat);

                          // Reset or set appropriate default voltage level when category changes
                          let defaultVoltage = '';
                          let defaultSupplyValue = '';
                          if (newCat.startsWith('LMV-')) {
                            defaultVoltage = 'Low Tension (LT)';
                          } else if (newCat.startsWith('HV-1')) {
                            defaultVoltage = 'At 11 kV';
                            defaultSupplyValue = '11';
                          } else if (newCat.startsWith('HV-2')) {
                            defaultVoltage = 'Up to 11 kV';
                            defaultSupplyValue = '11';
                          }
                          setVoltageLevel(defaultVoltage);
                          setSupplyVoltageValue(defaultSupplyValue);
                        }}
                        fullWidth
                        variant="outlined"
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <MuiTooltip title="Your official customer category defined by the DISCOM (determines your base tariff)." placement="top">
                                <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary', cursor: 'help' }} />
                              </MuiTooltip>
                            </InputAdornment>
                          )
                        }}
                      >
                        <MenuItem value="" disabled>Select Category</MenuItem>
                        {uniqueCategories.map((cat) => (
                          <MenuItem key={cat} value={cat}>
                            {cat}
                          </MenuItem>
                        ))}
                        {consumerCategory && !uniqueCategories.includes(consumerCategory) && (
                          <MenuItem value={consumerCategory}>{consumerCategory}</MenuItem>
                        )}
                      </TextField>
                    </Box>
                  )
                })}

                {renderStep(4, {
                  icon: <BoltIcon />,
                  title: "What is your voltage level?",
                  question: "What is your voltage level?",
                  summary: `Voltage Level: ${voltageLevel}${supplyVoltageValue ? ` - ${supplyVoltageValue}` : ''}`,
                  content: (
                    <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                      <TextField
                        select
                        label="Voltage Category"
                        value={voltageLevel}
                        onChange={(e) => {
                          setVoltageLevel(e.target.value);
                          setSupplyVoltageValue('');
                        }}
                        fullWidth
                        variant="outlined"
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <MuiTooltip title="The supply voltage level for your connection (affects surcharges)." placement="top">
                                <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary', cursor: 'help' }} />
                              </MuiTooltip>
                            </InputAdornment>
                          )
                        }}
                      >
                        <MenuItem value="" disabled>Select Voltage</MenuItem>
                        {uniqueVoltageLevels.map((lvl) => (
                          <MenuItem key={lvl} value={lvl}>
                            {lvl}
                          </MenuItem>
                        ))}
                        {voltageLevel && !uniqueVoltageLevels.includes(voltageLevel) && (
                          <MenuItem value={voltageLevel}>{voltageLevel}</MenuItem>
                        )}
                      </TextField>

                      {availableSupplyVoltageValues.length > 0 && (
                        <TextField
                          select
                          label="Supply Voltage Value (kV)"
                          value={supplyVoltageValue}
                          onChange={(e) => setSupplyVoltageValue(e.target.value)}
                          fullWidth
                          variant="outlined"
                          size="small"
                          InputLabelProps={{ shrink: true }}
                        >
                          <MenuItem value="" disabled>Select Value</MenuItem>
                          {availableSupplyVoltageValues.map((val) => (
                            <MenuItem key={val} value={val}>{val} kV</MenuItem>
                          ))}
                          {supplyVoltageValue && !availableSupplyVoltageValues.includes(supplyVoltageValue) && (
                            <MenuItem value={supplyVoltageValue}>{supplyVoltageValue} kV</MenuItem>
                          )}
                        </TextField>
                      )}


                    </Box>
                  )
                })}

                {renderStep(5, {
                  icon: <SpeedIcon />,
                  title: "What is your sanctioned load and power factor?",
                  question: "What is your sanctioned load and average power factor?",
                  summary: `Load: ${sanctionedLoadKw} kW | PF: ${powerFactor || '0.99'}`,
                  content: (
                    <Box sx={{ mt: 1, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <TextField
                        label="Sanctioned Load (kW)"
                        value={sanctionedLoadKw}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSanctionedLoadKw(val);
                          if (val && !isNaN(Number(val))) {
                            setSanctionedLoadKva((Number(val) / 0.99).toFixed(2).replace(/\.00$/, ''));
                          } else {
                            setSanctionedLoadKva('');
                          }
                        }}
                        error={!!formErrors.sanctionedLoadKw}
                        helperText={formErrors.sanctionedLoadKw}
                        sx={{ flex: 1, minWidth: '200px' }}
                        variant="outlined"
                        size="small"
                        type="number"
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <MuiTooltip title="The maximum power capacity your DISCOM has approved for your facility." placement="top">
                                <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary', cursor: 'help' }} />
                              </MuiTooltip>
                            </InputAdornment>
                          )
                        }}
                      />
                      <TextField
                        label="Sanctioned Load (kVA)"
                        value={sanctionedLoadKva}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSanctionedLoadKva(val);
                          if (val && !isNaN(Number(val))) {
                            setSanctionedLoadKw((Number(val) * 0.99).toFixed(2).replace(/\.00$/, ''));
                          } else {
                            setSanctionedLoadKw('');
                          }
                        }}
                        sx={{ flex: 1, minWidth: '200px' }}
                        variant="outlined"
                        size="small"
                        type="number"
                      />
                    </Box>
                  )
                })}


              </>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between', width: '100%' }}>
          <Button
            onClick={handleCloseDialog}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600, color: 'text.secondary' }}
          >
            {dialogMode === 'view' ? 'Close' : 'Cancel'}
          </Button>
          {dialogMode === 'edit' && activeStep === 7 && (
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                onClick={() => setTodDialogOpen(true)}
                sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600, borderColor: '#8B5CF6', color: '#8B5CF6', '&:hover': { borderColor: '#7C3AED', color: '#7C3AED' } }}
              >
                Edit TOD Consumption
              </Button>
              <Button
                variant="outlined"
                onClick={() => setProltDialogOpen(true)}
                sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600, borderColor: '#8B5CF6', color: '#8B5CF6', '&:hover': { borderColor: '#7C3AED', color: '#7C3AED' } }}
              >
                Edit ProLT Margin
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600, bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' } }}
              >
                Save Entry
              </Button>
            </Box>
          )}
        </DialogActions>
      </Dialog>

      {/* TOD Monthly Consumption Dialog */}
      <Dialog
        open={todDialogOpen}
        onClose={(e, reason) => { if (reason !== 'backdropClick' && reason !== 'escapeKeyDown') setTodDialogOpen(false); }}
        disableEscapeKeyDown
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 4, p: 2, bgcolor: (theme) => theme.palette.mode === 'dark' ? '#0E1422' : '#F8FAFC' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, pb: 0 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>Enter ToD Consumption</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Add monthly consumption data for each Time-of-Day period</Typography>
          </Box>
          <IconButton onClick={() => setTodDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>

          {getTodSlabsForMonth(1).length === 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Please select a State, DISCOM, and Category first to load the correct TOD slabs.
            </Alert>
          )}

          {Object.keys(todConsumptions).sort().map((ym, index) => {
            const monthSlabs = getTodSlabsForMonth(ym);
            return (
              <Accordion key={ym} expanded={expandedAccordion === 'initial' ? index === 0 : expandedAccordion === ym} onChange={(e, isExpanded) => setExpandedAccordion(isExpanded ? ym : false)} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px !important', '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC', borderRadius: '12px' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {new Date(`${ym}-01`).toLocaleString('default', { month: 'short', year: 'numeric' })}
                      </Typography>
                      {todConsumptions[ym]['Billing Month'] && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                          Bill Month: {(() => {
                            const [year, month] = todConsumptions[ym]['Billing Month'].split('-');
                            return new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1).toLocaleString('default', { month: 'short', year: 'numeric' });
                          })()}
                        </Typography>
                      )}
                    </Box>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); const newTc = { ...todConsumptions }; delete newTc[ym]; setTodConsumptions(newTc); }}>
                      <DeleteIcon fontSize="small" color="action" />
                    </IconButton>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 3, pt: 1 }}>
                  {/* ── Section 1: Billing Data ── */}
                  <Box sx={{ mb: 2.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#8B5CF6', display: 'block', mb: 1.5 }}>
                      Billing Data
                    </Typography>
                    <FormControl component="fieldset">
                      <FormLabel component="legend" sx={{ fontSize: '12px', color: 'text.secondary', mb: 0.5 }}>Electricity Duty Applied?</FormLabel>
                      <RadioGroup
                        row
                        value={todConsumptions[ym]['Electricity Duty'] || 'Yes'}
                        onChange={(e) => setTodConsumptions(prev => ({ ...prev, [ym]: { ...prev[ym], 'Electricity Duty': e.target.value } }))}
                      >
                        <FormControlLabel value="Yes" control={<Radio size="small" sx={{ color: '#8B5CF6', '&.Mui-checked': { color: '#8B5CF6' } }} />} label={<Typography variant="body2">Yes</Typography>} />
                        <FormControlLabel value="No" control={<Radio size="small" sx={{ color: '#8B5CF6', '&.Mui-checked': { color: '#8B5CF6' } }} />} label={<Typography variant="body2">No</Typography>} />
                      </RadioGroup>
                    </FormControl>

                    <Box sx={{ mt: 2 }}>
                      <TextField
                        label="Billing Month"
                        type="month"
                        value={todConsumptions[ym]['Billing Month'] || (() => {
                          const parts = ym.split('-');
                          const y = parseInt(parts[0], 10);
                          const m = parseInt(parts[1], 10);
                          const d = new Date(y, m, 1);
                          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        })()}
                        onChange={(e) => setTodConsumptions(prev => ({ ...prev, [ym]: { ...prev[ym], 'Billing Month': e.target.value } }))}
                        InputLabelProps={{ shrink: true }}
                        variant="outlined"
                        size="small"
                        sx={{ bgcolor: 'background.paper', width: { xs: '100%', sm: '50%' } }}
                      />
                    </Box>
                  </Box>

                  <Divider sx={{ mb: 2.5 }} />

                  {/* ── Section 2: Billing Demand ── */}
                  <Box sx={{ mb: 2.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#8B5CF6', display: 'block', mb: 1.5 }}>
                      Billing Demand
                    </Typography>
                    <TextField
                      label="Peak Demand (kVA)"
                      value={todConsumptions[ym]['Peak Demand (kVA)'] || ''}
                      onChange={(e) => setTodConsumptions(prev => ({ ...prev, [ym]: { ...prev[ym], 'Peak Demand (kVA)': e.target.value } }))}
                      variant="outlined" size="small" type="number" placeholder="0" sx={{ bgcolor: 'background.paper', width: { xs: '100%', sm: '50%' } }}
                    />
                  </Box>

                  <Divider sx={{ mb: 2.5 }} />

                  {/* ── Section 3: Billed Consumption ── */}
                  <Box sx={{ mb: 2.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#8B5CF6', display: 'block', mb: 1.5 }}>
                      Billed Consumption
                    </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={12}>
                          <DateRangePicker
                            startDate={todConsumptions[ym]['Start Date'] || ''}
                            endDate={todConsumptions[ym]['End Date'] || ''}
                            onChange={(start, end) => setTodConsumptions(prev => ({ ...prev, [ym]: { ...prev[ym], 'Start Date': start, 'End Date': end } }))}
                          />
                        </Grid>
                        <Grid item xs={12} sm={12}>
                          <FormControl component="fieldset">
                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 1 }}>
                              Input Unit
                            </Typography>
                            <RadioGroup
                              row
                              value={todConsumptions[ym]['Billing Unit'] || 'kVAh'}
                              onChange={(e) => setTodConsumptions(prev => ({ ...prev, [ym]: { ...prev[ym], 'Billing Unit': e.target.value } }))}
                            >
                              <FormControlLabel value="kVAh" control={<Radio size="small" />} label={<Typography variant="body2" sx={{ mr: 2 }}>kVAh</Typography>} />
                              <FormControlLabel value="kWh" control={<Radio size="small" />} label={<Typography variant="body2">kWh</Typography>} />
                            </RadioGroup>
                          </FormControl>
                        </Grid>
                        {monthSlabs.map(slab => {
                          const unit = todConsumptions[ym]['Billing Unit'] || 'kVAh';
                          return (
                            <Grid item xs={12} sm={6} md={3} key={slab}>
                              <TextField
                                label={`${slab} (${unit})`}
                                value={todConsumptions[ym][slab] || ''}
                                onChange={(e) => setTodConsumptions(prev => ({ ...prev, [ym]: { ...prev[ym], [slab]: e.target.value } }))}
                                fullWidth variant="outlined" size="small" type="number" placeholder="0" sx={{ bgcolor: 'background.paper' }}
                              />
                            </Grid>
                          );
                        })}
                      </Grid>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mt: 2, mb: 1 }}>
                        Calculated Consumption ({todConsumptions[ym]['Billing Unit'] === 'kWh' ? 'kVAh' : 'kWh'})
                      </Typography>
                      <Grid container spacing={2}>
                        {monthSlabs.map(slab => {
                          const unit = todConsumptions[ym]['Billing Unit'] || 'kVAh';
                          const inputVal = Number(todConsumptions[ym][slab]) || 0;
                          const pfInput = todConsumptions[ym]['Power Factor'];
                          const pf = pfInput && pfInput.trim() ? Number(pfInput) : 0.99;
                          let calculatedVal = '';
                          if (inputVal > 0) {
                            if (unit === 'kVAh') {
                              calculatedVal = (inputVal * pf).toFixed(2);
                            } else {
                              calculatedVal = (inputVal / pf).toFixed(2);
                            }
                          }
                          return (
                            <Grid item xs={12} sm={6} md={3} key={`calc-${slab}`}>
                              <TextField
                                label={`${slab} (${unit === 'kWh' ? 'kVAh' : 'kWh'})`}
                                value={calculatedVal}
                                InputProps={{ readOnly: true }}
                                fullWidth variant="filled" size="small" sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9' }}
                              />
                            </Grid>
                          );
                        })}
                      </Grid>
                  </Box>

                  <Divider sx={{ mb: 2.5 }} />

                  {/* ── Section 4: Other Info (optional) ── */}
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'text.secondary', display: 'block', mb: 1.5 }}>
                      Other Info <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          label="Power Factor"
                          value={todConsumptions[ym]['Power Factor'] || ''}
                          onChange={(e) => {
                            let val = e.target.value;
                            if (val !== '') {
                              if (Number(val) > 1) val = '1';
                              else if (Number(val) < 0) val = '';
                            }
                            setTodConsumptions(prev => ({ ...prev, [ym]: { ...prev[ym], 'Power Factor': val } }))
                          }}
                          onBlur={(e) => {
                            if (e.target.value === '' || Number(e.target.value) <= 0) {
                              setTodConsumptions(prev => ({ ...prev, [ym]: { ...prev[ym], 'Power Factor': '0.99' } }))
                            }
                          }}
                          fullWidth variant="outlined" size="small" type="number" placeholder="0.99" sx={{ bgcolor: 'background.paper' }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          label="Current LPSC (₹)"
                          value={todConsumptions[ym]['Current LPSC'] || ''}
                          onChange={(e) => setTodConsumptions(prev => ({ ...prev, [ym]: { ...prev[ym], 'Current LPSC': e.target.value } }))}
                          fullWidth variant="outlined" size="small" type="number" placeholder="0" sx={{ bgcolor: 'background.paper' }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          label="Arrear Amount (₹)"
                          value={todConsumptions[ym]['Arrear Amount'] || ''}
                          onChange={(e) => setTodConsumptions(prev => ({ ...prev, [ym]: { ...prev[ym], 'Arrear Amount': e.target.value } }))}
                          fullWidth variant="outlined" size="small" type="number" placeholder="0" sx={{ bgcolor: 'background.paper' }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          label="Miscellaneous Charges (₹)"
                          value={todConsumptions[ym]['Miscellaneous Charges'] || ''}
                          onChange={(e) => setTodConsumptions(prev => ({ ...prev, [ym]: { ...prev[ym], 'Miscellaneous Charges': e.target.value } }))}
                          fullWidth variant="outlined" size="small" type="text" placeholder="0" sx={{ bgcolor: 'background.paper' }}
                          inputProps={{ inputMode: 'decimal' }}
                        />
                      </Grid>
                    </Grid>
                  </Box>

                </AccordionDetails>
              </Accordion>
            );
          })}

          <Accordion elevation={0} expanded={expandedAccordion === 'new_month'} onChange={(e, isExpanded) => setExpandedAccordion(isExpanded ? 'new_month' : false)} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px !important', '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC', borderRadius: '12px' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>+ Add New Month</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 3, pt: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', display: 'block', mb: 1 }}>Month</Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <TextField select label="Year" value={entryYear} onChange={(e) => setEntryYear(Number(e.target.value))} size="small" sx={{ width: 120, bgcolor: 'background.paper' }}>
                  <MenuItem value={2023}>2023</MenuItem>
                  <MenuItem value={2024}>2024</MenuItem>
                  <MenuItem value={2025}>2025</MenuItem>
                  <MenuItem value={2026}>2026</MenuItem>
                </TextField>
                <TextField select label="Month" value={entryMonth} onChange={(e) => setEntryMonth(Number(e.target.value))} size="small" sx={{ width: 150, bgcolor: 'background.paper' }}>
                  <MenuItem value={1}>January</MenuItem>
                  <MenuItem value={2}>February</MenuItem>
                  <MenuItem value={3}>March</MenuItem>
                  <MenuItem value={4}>April</MenuItem>
                  <MenuItem value={5}>May</MenuItem>
                  <MenuItem value={6}>June</MenuItem>
                  <MenuItem value={7}>July</MenuItem>
                  <MenuItem value={8}>August</MenuItem>
                  <MenuItem value={9}>September</MenuItem>
                  <MenuItem value={10}>October</MenuItem>
                  <MenuItem value={11}>November</MenuItem>
                  <MenuItem value={12}>December</MenuItem>
                </TextField>
              </Box>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                fullWidth
                onClick={() => {
                  const key = `${entryYear}-${String(entryMonth).padStart(2, '0')}`;
                  if (!todConsumptions[key]) {
                    let defaultStart = '';
                    let defaultEnd = '';
                    if (discom === 'NPCL') {
                      defaultStart = `${entryYear}-${String(entryMonth).padStart(2, '0')}-19`;
                      const nextMonthDate = new Date(entryYear, entryMonth - 1 + 1, 18);
                      defaultEnd = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-18`;
                    } else {
                      defaultStart = `${entryYear}-${String(entryMonth).padStart(2, '0')}-01`;
                      const lastDay = new Date(entryYear, entryMonth, 0).getDate();
                      defaultEnd = `${entryYear}-${String(entryMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
                    }
                    const billingMonthDate = new Date(entryYear, entryMonth - 1 + 1, 1);
                    const defaultBillingMonth = `${billingMonthDate.getFullYear()}-${String(billingMonthDate.getMonth() + 1).padStart(2, '0')}`;
                    setTodConsumptions(prev => ({
                      ...prev,
                      [key]: {
                        'Power Factor': '',
                        'Start Date': defaultStart,
                        'End Date': defaultEnd,
                        'Electricity Duty': 'Yes',
                        'Miscellaneous Charges': '',
                        'Billing Month': defaultBillingMonth
                      }
                    }));
                    setExpandedAccordion(key);
                  } else {
                    setSnackbar({ open: true, message: 'This month has already been added.', severity: 'error' });
                  }
                }}
                sx={{ mt: 3, height: 48, textTransform: 'none', borderRadius: 2, borderStyle: 'dashed', color: 'text.primary', borderColor: 'divider' }}
              >
                + Add Month
              </Button>
            </AccordionDetails>
          </Accordion>

        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'center', display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => setTodDialogOpen(false)}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              height: 48,
              fontWeight: 600,
              fontSize: '16px',
              borderColor: '#8B5CF6',
              color: '#8B5CF6',
              '&:hover': {
                borderColor: '#7C3AED',
                backgroundColor: 'rgba(139, 92, 246, 0.04)'
              }
            }}
          >
            Back
          </Button>
          <Button
            variant="contained"
            fullWidth
            onClick={() => {
              if (!isTodValid()) {
                setSnackbar({ open: true, message: 'Please enter valid consumption values for at least one month.', severity: 'error' });
                return;
              }
              setTodDialogOpen(false);
              setProltDialogOpen(true);
            }}
            sx={{
              bgcolor: '#8B5CF6',
              '&:hover': { bgcolor: '#7C3AED' },
              borderRadius: 2,
              textTransform: 'none',
              height: 48,
              fontWeight: 600,
              fontSize: '16px'
            }}
          >
            Preview Inputs
          </Button>
        </DialogActions>
      </Dialog>

      {/* PROLT Config Dialog */}
      <Dialog
        open={proltDialogOpen}
        onClose={(e, reason) => { if (reason !== "backdropClick" && reason !== "escapeKeyDown") setProltDialogOpen(false); }}
        disableEscapeKeyDown
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 4, p: 1 }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ bgcolor: '#F3E8FF', color: '#8B5CF6', p: 1, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalculateIcon fontSize="small" />
            </Box>
            Margin Details
          </Box>
          <IconButton onClick={() => setProltDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 3 }}>
          <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
            What are the margin rates for this client?
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Trader Margin (Rs/kWh)"
              value={traderMargin}
              onChange={(e) => setTraderMargin(e.target.value)}
              fullWidth
              type="number"
              variant="outlined"
              size="small"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <MuiTooltip title="The fixed fee per unit (kWh) paid to the exchange trader." placement="top">
                      <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary', cursor: 'help' }} />
                    </MuiTooltip>
                  </InputAdornment>
                )
              }}
            />
            <TextField
              label="Prolt Consultancy Fee"
              value={consultancyFee}
              onChange={(e) => setConsultancyFee(e.target.value)}
              fullWidth
              type="number"
              variant="outlined"
              size="small"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <MuiTooltip title="PROLT Consultancy Fee for ST 11, NOC, Bill Adjustment (Monthly)" placement="top">
                      <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary', cursor: 'help' }} />
                    </MuiTooltip>
                  </InputAdornment>
                )
              }}
            />
            <TextField
              label="Metering Charges (Rs)"
              value={meteringCharges}
              onChange={(e) => setMeteringCharges(e.target.value)}
              fullWidth
              type="number"
              variant="outlined"
              size="small"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <MuiTooltip title="One-time metering cost used for 5-year ROI calculation." placement="top">
                      <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary', cursor: 'help' }} />
                    </MuiTooltip>
                  </InputAdornment>
                )
              }}
            />
            <TextField
              label="Probus Platform Subscription fees (Rs/kWh)"
              value={probusPlatformFee}
              onChange={(e) => setProbusPlatformFee(e.target.value)}
              fullWidth
              type="number"
              variant="outlined"
              size="small"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <MuiTooltip title="Probus Platform Subscription fees" placement="top">
                      <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary', cursor: 'help' }} />
                    </MuiTooltip>
                  </InputAdornment>
                )
              }}
            />
            <TextField
              label="Prolt Margin (% of total savings)"
              value={proltMargin}
              onChange={(e) => setProltMargin(e.target.value)}
              fullWidth
              type="number"
              variant="outlined"
              size="small"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <MuiTooltip title="Our optimization fee taken as a percentage of your total savings." placement="top">
                      <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary', cursor: 'help' }} />
                    </MuiTooltip>
                  </InputAdornment>
                )
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
          <Button
            onClick={() => {
              setProltDialogOpen(false);
              setTodDialogOpen(true);
            }}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600, color: 'text.secondary' }}
          >
            Back
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              handleSubmit();
            }}
            sx={{
              bgcolor: '#8B5CF6',
              '&:hover': { bgcolor: '#7C3AED' },
              borderRadius: 2,
              textTransform: 'none',
              px: 3
            }}
          >
            {dialogMode === 'edit' ? 'Save Entry' : 'Create Entry'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={calcDialogOpen}
        onClose={handleCloseCalc}
        fullScreen
        PaperProps={{
          sx: { p: 1 }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CalculateIcon sx={{ color: '#8B5CF6' }} />
            <Typography variant="h2" sx={{ fontWeight: 700 }}>
              Savings Analysis for {calcEntry?.clientName}
            </Typography>
          </Box>
          <IconButton onClick={handleCloseCalc}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ minHeight: '500px' }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap', alignItems: 'center', p: 2, bgcolor: 'background.default', borderRadius: 2.5, border: '1px solid', borderColor: 'divider' }}>

            <TextField
              select
              label="Version"
              value={selectedCalcVersion}
              onChange={(e) => {
                setSelectedCalcVersion(Number(e.target.value));


              }}
              size="small"
              sx={{ width: 120, bgcolor: 'background.paper' }}
            >
              {calcVersions.map((v) => (
                <MenuItem key={v} value={v}>
                  v{v} {v === Math.max(...calcVersions) && '(Recent)'}
                </MenuItem>
              ))}
            </TextField>

            <Button
              variant="contained"
              startIcon={<PlayIcon />}
              onClick={executeCalculation}
              disabled={calculating || calculatingInsights || !selectedSimMonth}
              sx={{
                textTransform: 'none',
                borderRadius: 2,
                bgcolor: '#8B5CF6',
                '&:hover': {
                  bgcolor: '#7C3AED'
                }
              }}
            >
              {calculating ? 'Analyzing...' : 'View'}
            </Button>



            <Button
              variant="contained"
              startIcon={<BarChartIcon />}
              onClick={executeGraphSimulation}
              disabled={calculating || !selectedSimMonth}
              sx={{
                textTransform: 'none',
                borderRadius: 2,
                bgcolor: '#F59E0B',
                '&:hover': {
                  bgcolor: '#D97706'
                }
              }}
            >
              {calculating ? 'Analyzing...' : 'Slot-wise Heatmap'}
            </Button>

            <Button
              variant="contained"
              startIcon={<BarChartIcon />}
              onClick={() => {
                if (!marketDecisionResult) {
                  executeGraphSimulation();
                  // A bit hacky, but they want it to behave the same
                  setTimeout(() => {
                    setGraphDialogOpen(false);
                    setDynamicGraphDialogOpen(true);
                  }, 1000);
                } else {
                  setDynamicGraphDialogOpen(true);
                }
              }}
              disabled={calculating || !selectedSimMonth}
              sx={{
                textTransform: 'none',
                borderRadius: 2,
                bgcolor: '#8B5CF6',
                '&:hover': {
                  bgcolor: '#7C3AED'
                }
              }}
            >
              Dynamic Heatmap
            </Button>

            {calcResult && (
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={exportCalcToCSV}
                sx={{
                  textTransform: 'none',
                  borderRadius: 2,
                  borderColor: 'divider',
                  color: 'text.secondary'
                }}
              >
                Export CSV
              </Button>
            )}

            {Object.keys(cachedResults).length > 0 && (
              <Box sx={{ width: '100%', mt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Tabs
                  value={selectedSimMonth}
                  onChange={(e, v) => setSelectedSimMonth(v)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ minHeight: 40, '& .MuiTab-root': { textTransform: 'none', minHeight: 40, fontWeight: 600 } }}
                >
                  <Tab label="Overall" value="all" />
                  {Object.keys(calcEntry?.todConsumptions || {}).sort().map((ym) => (
                    <Tab
                      key={ym}
                      label={new Date(`${ym}-01`).toLocaleString('default', { month: 'long', year: 'numeric' })}
                      value={ym}
                    />
                  ))}
                </Tabs>
              </Box>
            )}
          </Box>

          {marketDecisionResult && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', my: 2.5, gap: 1.5, width: '100%' }}>

              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={async () => {
                  if (!calcEntry) return;
                  try {
                    await exportSavingsExcel(calcEntry.id, selectedSimMonth || undefined, selectedCalcVersion || undefined, calcEntry.clientName);
                  } catch (err: any) {
                    setSnackbar({
                      open: true,
                      message: err.message || 'Export failed',
                      severity: 'error'
                    });
                  }
                }}
                sx={{
                  textTransform: 'none',
                  borderRadius: 2.5,
                  fontWeight: 600,
                  borderColor: 'divider',
                  backgroundColor: '#0F172A',
                  color: 'white',
                  px: 2.5,
                  py: 1,
                  whiteSpace: 'nowrap',
                  '&:hover': {
                    backgroundColor: '#1E293B',
                    borderColor: 'divider'
                  }
                }}
              >
                Export Excel Sheet
              </Button>

              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={async () => {
                  if (!calcEntry) return;
                  try {
                    await exportDemandShiftExcel(calcEntry.id, selectedSimMonth || undefined, selectedCalcVersion || undefined);
                  } catch (err: any) {
                    setSnackbar({
                      open: true,
                      message: err.message || 'Export failed',
                      severity: 'error'
                    });
                  }
                }}
                sx={{
                  textTransform: 'none',
                  borderRadius: 2.5,
                  fontWeight: 600,
                  borderColor: 'divider',
                  backgroundColor: '#8B5CF6',
                  color: 'white',
                  px: 2.5,
                  py: 1,
                  whiteSpace: 'nowrap',
                  '&:hover': {
                    backgroundColor: '#7C3AED',
                    borderColor: 'divider'
                  }
                }}
              >
                Export TOD Shifting Excel
              </Button>
            </Box>
          )}

          {calculating && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
              <CircularProgress sx={{ color: '#8B5CF6' }} />
              <Typography variant="body2" color="text.secondary">
                Running cost simulations and sorting 15-minute slot metrics...
              </Typography>
            </Box>
          )}

          {calculatingInsights && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
              <CircularProgress sx={{ color: '#14B8A6' }} />
              <Typography variant="body2" color="text.secondary">
                Calculating potential demand shift savings...
              </Typography>
            </Box>
          )}

          {!calculating && !calculatingInsights && !calcResult && !marketDecisionResult && !demandShiftInsights && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <Typography variant="body1" color="text.secondary">
                Click 'View' to load the landed cost analysis for your configured months.
              </Typography>
            </Box>
          )}

          {calcResult && !calculating && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>

              <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Tabs value={calcTab} onChange={(e, v) => setCalcTab(v)} sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 } }}>
                  {selectedSimMonth !== 'all' && <Tab label="Slabs Group Summary (TOD Sorted)" disabled={!calcResult} value={0} />}
                  {selectedSimMonth !== 'all' && <Tab label="Cheapest Month-wide Slots" disabled={!calcResult} value={1} />}
                  {selectedSimMonth !== 'all' && <Tab label="Market Buy Decision" disabled={!marketDecisionResult} value={2} />}
                  {selectedSimMonth !== 'all' && <Tab label="Detailed OA Simulation" disabled={!marketDecisionResult?.oaDetailed} value={3} />}
                  <Tab label="Usage Recommendations" disabled={!demandShiftInsights} value={4} />
                  <Tab label="Dashboard" disabled={!marketDecisionResult} value={6} />
                </Tabs>
              </Box>

              {calcTab === 6 && (
                <Box sx={{ mt: 3 }}>
                  <Dashboard calcEntry={null} clientName={clientName} clientOverview={clientOverview} marketDecisionResult={marketDecisionResult} demandShiftInsights={demandShiftInsights} selectedMonth={selectedSimMonth} />
                </Box>
              )}

              {calcTab === 0 && calcResult && selectedSimMonth !== 'all' && (
                <Grid container spacing={3}>
                  {Object.entries(calcResult.todGroups).sort(([a], [b]) => a.localeCompare(b)).map(([groupName, list]) => {
                    const groupCount = Object.keys(calcResult.todGroups).length;
                    const lgValue = groupCount === 4 ? 3 : groupCount === 3 ? 4 : groupCount === 2 ? 6 : 12;
                    return (
                      <Grid item xs={12} lg={lgValue} key={groupName}>
                        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2, height: '100%', bgcolor: 'background.paper' }}>
                          <Typography variant="h4" sx={{ textTransform: 'uppercase', fontWeight: 700, mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                            <span>{groupName}</span>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                              {list.length} slots
                            </Typography>
                          </Typography>

                          <Box sx={{ overflowX: 'hidden' }}>
                            <Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}>
                              <TableHead>
                                <TableRow>
                                  <TableCell sx={{ width: '40%', fontSize: '10px', fontWeight: 700, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC', whiteSpace: 'nowrap' }}>Date/Time</TableCell>
                                  <TableCell align="right" sx={{ width: '40%', fontSize: '10px', fontWeight: 700, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC', whiteSpace: 'nowrap' }}>Lowest Price</TableCell>
                                  <TableCell align="right" sx={{ width: '20%', fontSize: '10px', fontWeight: 700, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC', whiteSpace: 'nowrap' }}>DISCOM</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {list.slice(0, 50).map((row, idx) => (
                                  <TableRow key={idx} hover sx={{ '&:nth-of-type(odd)': { bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' } }}>
                                    <TableCell sx={{ fontSize: '11px', py: 0.75 }}>
                                      {row.date.substring(5)} {row.timeStr}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontSize: '11px', fontWeight: 600, color: '#16A34A', py: 0.75 }}>
                                      ₹{row.comparedLowestPrice.toFixed(2)}
                                      <span style={{
                                        fontSize: '9px',
                                        fontWeight: 800,
                                        color: row.selectedSource === 'DISCOM' ? '#64748B' : '#7C3AED',
                                        backgroundColor: row.selectedSource === 'DISCOM' ? '#F1F5F9' : '#F5F3FF',
                                        padding: '1px 4px',
                                        borderRadius: '3px',
                                        marginLeft: '4px'
                                      }}>
                                        {row.selectedSource}
                                      </span>
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontSize: '11px', color: 'text.secondary', py: 0.75 }}>
                                      ₹{row.discomLandingPrice.toFixed(2)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </Box>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              )}

              {calcTab === 1 && calcResult && selectedSimMonth !== 'all' && (
                <Box sx={{ maxHeight: 400, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC' }}>Date</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC' }}>Time</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC' }}>TOD Slab</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC' }}>DAM</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC' }}>GDAM</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC' }}>RTM</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC' }}>DISCOM Rate</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC' }}>Compared Lowest</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC' }}>Cheapest Source</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC' }}>Market Decision</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC' }}>Cost</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {calcResult.sortedMonthlyList.slice(0, 100).map((row, idx) => (
                        <TableRow key={idx} hover sx={{ '&:nth-of-type(odd)': { bgcolor: 'rgba(0,0,0,0.01)' } }}>
                          <TableCell>{row.date}</TableCell>
                          <TableCell align="center">{row.timeStr}</TableCell>
                          <TableCell align="center">
                            <span style={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: 700, color: 'text.secondary' }}>
                              {row.todSlab}
                            </span>
                          </TableCell>
                          <TableCell align="right">₹{row.damLandingPrice > 0 ? row.damLandingPrice.toFixed(4) : '-'}</TableCell>
                          <TableCell align="right">₹{row.gdamLandingPrice > 0 ? row.gdamLandingPrice.toFixed(4) : '-'}</TableCell>
                          <TableCell align="right">₹{row.rtmLandingPrice > 0 ? row.rtmLandingPrice.toFixed(4) : '-'}</TableCell>
                          <TableCell align="right">₹{row.discomLandingPrice.toFixed(4)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, color: '#16A34A' }}>₹{row.comparedLowestPrice.toFixed(4)}</TableCell>
                          <TableCell align="center">
                            <span style={{
                              textTransform: 'uppercase',
                              fontSize: '10px',
                              fontWeight: 800,
                              color: row.selectedSource === 'DISCOM' ? '#64748B' : '#7C3AED',
                              backgroundColor: row.selectedSource === 'DISCOM' ? '#F1F5F9' : '#F5F3FF',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}>
                              {row.selectedSource}
                            </span>
                          </TableCell>
                          <TableCell align="center">
                            <span style={{
                              textTransform: 'uppercase',
                              fontSize: '10px',
                              fontWeight: 800,
                              color: row.selectedSource !== 'DISCOM' ? '#16A34A' : '#DC2626',
                              backgroundColor: row.selectedSource !== 'DISCOM' ? '#DCFCE7' : '#FEE2E2',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}>
                              {row.selectedSource !== 'DISCOM' ? 'Yes' : 'No'}
                            </span>
                          </TableCell>
                          <TableCell align="right">₹{row.optimizedCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}

              {calcTab === 2 && marketDecisionResult && (
                <Box>
                  {/* Savings Dashboard Removed */}
                  {selectedSimMonth !== 'all' && (
                    <>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4, mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                          Slot-wise Market Simulation
                        </Typography>
                        <Button
                          variant="outlined"
                          startIcon={<BarChartIcon />}
                          onClick={() => setGraphDialogOpen(true)}
                          sx={{ textTransform: 'none', borderRadius: 2 }}
                        >
                          View Daily Simulation Graph
                        </Button>
                      </Box>

                      <Box sx={{ maxHeight: 500, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2.5, mb: 4 }}>
                        <Table size="small" stickyHeader>
                          <TableBody>
                            {marketDecisionResult.slotsData.slice(0, 150).map((row: any, idx: number) => {
                              const isOaEligible = (marketDecisionResult.totalSavings - (marketDecisionResult.oaDetailed?.dailyFixedOverhead || 0) - (marketDecisionResult.oaDetailed?.bidApplicationFees || 0)) > 0;
                              const buyDecision = isOaEligible && row.shouldBuyFromMarket;

                              return (
                                <TableRow key={idx} hover sx={{ '&:nth-of-type(odd)': { bgcolor: 'rgba(0,0,0,0.01)' } }}>
                                  <TableCell>{row.date}</TableCell>
                                  <TableCell align="center">{row.timeStr || `${String(row.hour).padStart(2, '0')}:${String((row.timeblock - 1) * 15 % 60).padStart(2, '0')}`}</TableCell>
                                  <TableCell align="center">
                                    <span style={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: 700, color: 'text.secondary' }}>
                                      {row.tod}
                                    </span>
                                  </TableCell>
                                  <TableCell align="right">
                                    <span style={{
                                      textTransform: 'uppercase',
                                      fontSize: '10px',
                                      fontWeight: 800,
                                      color: row.marketSource === 'DAM' ? '#3B82F6' : row.marketSource === 'GDAM' ? '#10B981' : '#8B5CF6',
                                      backgroundColor: row.marketSource === 'DAM' ? '#EFF6FF' : row.marketSource === 'GDAM' ? '#ECFDF5' : '#F5F3FF',
                                      padding: '2px 6px',
                                      borderRadius: '4px'
                                    }}>
                                      {row.marketSource}
                                    </span>
                                  </TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 600 }}>₹{row.bestMarketLanding > 0 ? row.bestMarketLanding.toFixed(4) : '-'}</TableCell>
                                  <TableCell align="right">₹{row.discomLanding.toFixed(4)}</TableCell>
                                  <TableCell align="center">
                                    <span style={{
                                      textTransform: 'uppercase',
                                      fontSize: '10px',
                                      fontWeight: 800,
                                      color: buyDecision ? '#16A34A' : '#DC2626',
                                      backgroundColor: buyDecision ? '#DCFCE7' : '#FEE2E2',
                                      padding: '2px 6px',
                                      borderRadius: '4px'
                                    }}>
                                      {buyDecision ? 'Yes' : 'No'}
                                    </span>
                                  </TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 600, color: row.savingsPerKwh > 0 ? '#16A34A' : 'inherit' }}>
                                    {row.savingsPerKwh > 0 ? `₹${row.savingsPerKwh.toFixed(4)}` : '-'}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </Box>
                    </>
                  )}
                </Box>
              )}
              {calcTab === 3 && marketDecisionResult?.oaDetailed?.breakdown && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      Detailed OA Savings Breakdown
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      onClick={exportDetailedOAToCSV}
                      sx={{ textTransform: 'none', borderRadius: 2 }}
                    >
                      Export Detailed Report CSV
                    </Button>
                  </Box>
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, overflow: 'hidden' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC' }}>TOD Slab</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC' }}>Total Sourced (DISCOM Units)</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC' }}>Market Sourced (OA Units)</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC' }}>DISCOM Bill (Total)</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC' }}>Prolt DISCOM Bill (Net)</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC' }}>OA Consumer Bus Units</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC' }}>OA Bill</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {marketDecisionResult.oaDetailed.breakdown.map((row, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase' }}>{row.slabName}</TableCell>
                            <TableCell align="right">{row.discomUnits.toLocaleString('en-IN', { maximumFractionDigits: 0 })} kWh</TableCell>
                            <TableCell align="right">{row.oaUnits.toLocaleString('en-IN', { maximumFractionDigits: 0 })} kWh</TableCell>
                            <TableCell align="right">₹{row.discomBill.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                            <TableCell align="right">₹{row.proltDiscomBill.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                            <TableCell align="right">{row.consumerBusUnits.toLocaleString('en-IN', { maximumFractionDigits: 0 })} kWh</TableCell>
                            <TableCell align="right">₹{row.oaBill.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow sx={{ backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC' }}>
                          <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            {marketDecisionResult.oaDetailed.breakdown.reduce((sum, r) => sum + r.discomUnits, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} kWh
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            {marketDecisionResult.oaDetailed.breakdown.reduce((sum, r) => sum + r.oaUnits, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} kWh
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            ₹{marketDecisionResult.oaDetailed.breakdown.reduce((sum, r) => sum + r.discomBill, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            ₹{marketDecisionResult.oaDetailed.breakdown.reduce((sum, r) => sum + r.proltDiscomBill, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            {marketDecisionResult.oaDetailed.breakdown.reduce((sum, r) => sum + r.consumerBusUnits, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} kWh
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            ₹{marketDecisionResult.oaDetailed.breakdown.reduce((sum, r) => sum + r.oaBill, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 4, mt: 2, p: 2, backgroundColor: '#F1F5F9', borderRadius: 2, flexWrap: 'wrap' }}>
                    {marketDecisionResult.miscellaneousCharges !== undefined && marketDecisionResult.miscellaneousCharges > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">Miscellaneous Charges</Typography>
                        <Typography variant="body2" fontWeight={600}>₹{marketDecisionResult.miscellaneousCharges.toLocaleString('en-IN')}</Typography>
                      </Box>
                    )}
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">SLDC Scheduling Cost</Typography>
                      <Typography variant="body2" fontWeight={600}>₹{(marketDecisionResult.oaDetailed.sldcSchedulingCost || 0).toLocaleString('en-IN')} ({marketDecisionResult.oaDetailed.totalDaysTraded} days)</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">NLDC Scheduling Cost</Typography>
                      <Typography variant="body2" fontWeight={600}>₹{(marketDecisionResult.oaDetailed.nldcSchedulingCost || 0).toLocaleString('en-IN')} ({marketDecisionResult.oaDetailed.totalDaysTraded} days)</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Total Estimated OA Bill (Inc. Overheads)</Typography>
                      <Typography variant="body2" fontWeight={700} color="#7C3AED">
                        ₹{(
                          marketDecisionResult.oaDetailed.breakdown.reduce((sum, r) => sum + r.oaBill, 0) +
                          marketDecisionResult.oaDetailed.dailyFixedOverhead +
                          marketDecisionResult.oaDetailed.bidApplicationFees
                        ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Total Gross Bill (Net Landed OA Cost)</Typography>
                      <Typography variant="body2" fontWeight={700} color="#E11D48">
                        ₹{(
                          marketDecisionResult.totalLandedExchangeCost +
                          marketDecisionResult.oaDetailed.dailyFixedOverhead +
                          marketDecisionResult.oaDetailed.bidApplicationFees
                        ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Net Savings</Typography>
                      {(() => {
                        const rawSavings = marketDecisionResult.totalSavings - marketDecisionResult.oaDetailed.dailyFixedOverhead - marketDecisionResult.oaDetailed.bidApplicationFees;
                        if (rawSavings <= 0) {
                          return (
                            <Typography variant="body2" fontWeight={700} color="#DC2626">
                              Not Eligible for OA
                            </Typography>
                          );
                        }
                        return (
                          <Typography variant="body2" fontWeight={700} color="#16A34A">
                            ₹{rawSavings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </Typography>
                        );
                      })()}
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {calcTab === 4 && demandShiftInsights && (
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>Usage Recommendations: Demand Shifting</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<BarChartIcon />}
                    onClick={() => setDemandShiftGraphOpen(true)}
                    sx={{
                      textTransform: 'none',
                      borderRadius: 2,
                      bgcolor: '#F59E0B',
                      '&:hover': {
                        bgcolor: '#D97706'
                      }
                    }}
                  >
                    Slot-wise Heatmap
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<BarChartIcon />}
                    onClick={() => setDynamicDemandShiftGraphOpen(true)}
                    sx={{
                      textTransform: 'none',
                      borderRadius: 2,
                      bgcolor: '#8B5CF6',
                      '&:hover': {
                        bgcolor: '#7C3AED'
                      }
                    }}
                  >
                    Dynamic Heatmap
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={exportInsightsToCSV}
                    sx={{
                      textTransform: 'none',
                      borderRadius: 2,
                      borderColor: 'divider',
                      color: 'text.secondary'
                    }}
                  >
                    Export CSV
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={exportInsightsToExcel}
                    sx={{
                      textTransform: 'none',
                      borderRadius: 2,
                      borderColor: 'divider',
                      color: '#10B981',
                      '&:hover': {
                        borderColor: '#059669',
                        bgcolor: '#F0FDF4'
                      }
                    }}
                  >
                    Export Excel
                  </Button>
                </Box>
              </Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                  <Box sx={{ bgcolor: 'background.paper', p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Original Energy Cost</Typography>
                    <Typography variant="h4" fontWeight={700}>₹{demandShiftInsights.originalTotalCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box sx={{ bgcolor: 'background.paper', p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Shifted Energy Cost</Typography>
                    <Typography variant="h4" fontWeight={700}>₹{demandShiftInsights.newTotalCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box sx={{ bgcolor: '#F0FDF4', p: 3, borderRadius: 3, border: '1px solid', borderColor: '#BBF7D0', height: '100%' }}>
                    <Typography variant="subtitle2" color="#166534" sx={{ mb: 1 }}>Potential Extra Savings</Typography>
                    <Typography variant="h4" fontWeight={700} color="#15803D">₹{demandShiftInsights.savingsAchieved.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Typography>
                    <Typography variant="body2" color="#166534" sx={{ mt: 1 }}>by shifting {demandShiftInsights.shiftedEnergy.toLocaleString('en-IN', { maximumFractionDigits: 0 })} kWh to cheaper slots</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box sx={{ bgcolor: '#EFF6FF', p: 3, borderRadius: 3, border: '1px solid', borderColor: '#BFDBFE', height: '100%' }}>
                    <Typography variant="subtitle2" color="#1E40AF" sx={{ mb: 1 }}>Total Potential Savings</Typography>
                    {(() => {
                      const baseRawSavings = marketDecisionResult ? marketDecisionResult.totalSavings : 0;
                      const baseSavings = Math.max(0, baseRawSavings);
                      const totalCombinedSavings = baseSavings + demandShiftInsights.savingsAchieved;
                      return (
                        <>
                          <Typography variant="h4" fontWeight={700} color="#1D4ED8">₹{totalCombinedSavings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Typography>
                          <Typography variant="body2" color="#1E40AF" sx={{ mt: 1 }}>(Base OA Savings + Demand Shifting)</Typography>
                        </>
                      );
                    })()}
                  </Box>
                </Grid>
              </Grid>

              <Typography variant="h6" fontWeight={700} sx={{ mt: 4, mb: 2 }}>TOD Shifting Summary</Typography>
              <Box sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC' }}>
                      <TableCell sx={{ fontWeight: 600 }}>TOD Slab</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Original Energy (kWh)</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Orig Market (kWh)</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>New Energy (kWh)</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>New Market (kWh)</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Difference (kWh)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {demandShiftInsights.todShiftSummary.map((row) => (
                      <TableRow key={row.tod}>
                        <TableCell>{row.tod}</TableCell>
                        <TableCell align="right">{row.originalEnergy.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                        <TableCell align="right" sx={{ color: 'text.secondary' }}>{row.originalMarketEnergy?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || 0}</TableCell>
                        <TableCell align="right">{row.newEnergy.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                        <TableCell align="right" sx={{ color: 'text.secondary' }}>{row.newMarketEnergy?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || 0}</TableCell>
                        <TableCell align="right" sx={{ color: row.diff > 0 ? '#16A34A' : row.diff < 0 ? '#DC2626' : 'inherit', fontWeight: row.diff !== 0 ? 600 : 400 }}>
                          {row.diff > 0 ? '+' : ''}{row.diff.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ bgcolor: '#F1F5F9' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {demandShiftInsights.todShiftSummary.reduce((sum, row) => sum + (row.originalEnergy || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                        {demandShiftInsights.todShiftSummary.reduce((sum, row) => sum + (row.originalMarketEnergy || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {demandShiftInsights.todShiftSummary.reduce((sum, row) => sum + (row.newEnergy || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                        {demandShiftInsights.todShiftSummary.reduce((sum, row) => sum + (row.newMarketEnergy || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {(() => {
                          const totalDiff = demandShiftInsights.todShiftSummary.reduce((sum, row) => sum + (row.diff || 0), 0);
                          return (
                            <Box component="span" sx={{ color: totalDiff > 0 ? '#16A34A' : totalDiff < 0 ? '#DC2626' : 'inherit' }}>
                              {totalDiff > 0 ? '+' : ''}{totalDiff.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </Box>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Box>
            </Box>
          )}

          {/* Removed VisualAnalyticsCharts */}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleCloseCalc}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600, color: 'text.secondary' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <HistoryIcon sx={{ color: '#8B5CF6' }} />
            Version History: {historyClientName}
          </Box>
          <IconButton onClick={() => setHistoryDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: 'background.default', p: 3 }}>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : historyData && historyData.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {historyData.map((v) => {
                const previousVersion = historyData.find(p => p.version === v.version - 1);
                const changes = previousVersion ? getChanges(v, previousVersion) : [];
                return (
                  <Paper key={v.id} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle1" fontWeight={700} color="primary">
                        Version {v.version}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(v.changedAt).toLocaleString('en-IN')}
                      </Typography>
                    </Box>
                    {previousVersion ? (
                      changes.length > 0 ? (
                        <Grid container spacing={2}>
                          {changes.map((c, i) => (
                            <Grid item xs={12} sm={6} key={i}>
                              <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" sx={{ textDecoration: 'line-through', color: 'error.main' }}>
                                  {String(c.old)}
                                </Typography>
                                <ArrowRightAltIcon fontSize="small" color="action" />
                                <Typography variant="body2" fontWeight={600} color="success.main">
                                  {String(c.new)}
                                </Typography>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          No trackable changes in this version (might be TOD updates or other nested edits).
                        </Typography>
                      )
                    ) : (
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={4}>
                          <Typography variant="caption" color="text.secondary">Client</Typography>
                          <Typography variant="body2" fontWeight={600}>{v.clientName}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={4}>
                          <Typography variant="caption" color="text.secondary">Industry</Typography>
                          <Typography variant="body2" fontWeight={600}>{v.industryName}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={4}>
                          <Typography variant="caption" color="text.secondary">State</Typography>
                          <Typography variant="body2" fontWeight={600}>{v.stateCode}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={4}>
                          <Typography variant="caption" color="text.secondary">Load</Typography>
                          <Typography variant="body2" fontWeight={600}>{v.sanctionedLoadKw} kW</Typography>
                        </Grid>
                        <Grid item xs={6} sm={4}>
                          <Typography variant="caption" color="text.secondary">Discom</Typography>
                          <Typography variant="body2" fontWeight={600}>{v.discom}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={4}>
                          <Typography variant="caption" color="text.secondary">PROLT / Trader / Metering</Typography>
                          <Typography variant="body2" fontWeight={600}>₹{v.proltMargin} / ₹{v.traderMargin} / ₹{v.meteringCharges || 0}</Typography>
                        </Grid>
                      </Grid>
                    )}
                  </Paper>
                );
              })}
            </Box>
          ) : (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              No version history found. Update the entry to create versions.
            </Typography>
          )}
        </DialogContent>
      </Dialog>

      {/* Snackbar notification */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      <Dialog
        open={graphDialogOpen}
        onClose={() => setGraphDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
          Slot-wise Market Simulation
          <IconButton onClick={() => setGraphDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {marketDecisionResult && (
            <SlotWiseMarketHeatmap slotsData={marketDecisionResult.slotsData} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={dynamicGraphDialogOpen}
        onClose={() => setDynamicGraphDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
          Dynamic Slot-wise Market Simulation
          <IconButton onClick={() => setDynamicGraphDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {marketDecisionResult && (
            <DynamicSlotWiseMarketHeatmap slotsData={marketDecisionResult.slotsData} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={demandShiftGraphOpen}
        onClose={() => setDemandShiftGraphOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
          Usage Recommendations Heatmap
          <IconButton onClick={() => setDemandShiftGraphOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {demandShiftInsights && (
            <SlotWiseMarketHeatmap slotsData={demandShiftInsights.slotsData} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={dynamicDemandShiftGraphOpen}
        onClose={() => setDynamicDemandShiftGraphOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
          Dynamic Usage Recommendations Heatmap
          <IconButton onClick={() => setDynamicDemandShiftGraphOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {demandShiftInsights && (
            <DynamicSlotWiseMarketHeatmap slotsData={demandShiftInsights.slotsData} />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
