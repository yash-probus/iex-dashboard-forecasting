import { apiClient } from "../api/client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, TextField, IconButton, Alert, alpha, OutlinedInput, Card,
  Grid, Paper, Tooltip, Table, TableBody, TableCell, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, Chip, MenuItem, FormControlLabel, RadioGroup, Radio, FormControl, FormLabel, Select, InputAdornment, Divider, Accordion, AccordionSummary, AccordionDetails, CircularProgress
} from '@mui/material';
import {
  Calculate as CalculateIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  BarChart as BarChartIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  LocationOn as LocationIcon,
  ElectricBolt as ElectricBoltIcon,
  Category as CategoryIcon,
  Bolt as BoltIcon,
  Speed as SpeedIcon,
  ExpandMore as ExpandMoreIcon,
  AccountBalance as AccountBalanceIcon,
  History as HistoryIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
  Business as BusinessIcon,
  LightbulbOutlined as LightbulbIcon,
  ArrowRightAlt as ArrowRightAltIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import TableContainer, { ColumnDefinition } from '../components/dashboard/TableContainer';
import EmptyTableState from '../components/dashboard/EmptyTableState';
import DateRangePicker from '../components/common/DateRangePicker';
import {
  fetchTraderPerformanceEntries,
  createTraderPerformanceEntry,
  updateTraderPerformanceEntry,
  deleteTraderPerformanceEntry,
  fetchTraderPerformanceEntryById,
  fetchEntryHistoryTraderPerformance,
  fetchResourceDefaults,
  TraderPerformanceEntry,
  CustomTodSlot
} from '../api/traderPerformance.api';
import { getResourceData } from '../api/resourceCenter.api';

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
          old: strPrev || 'None',
          new: strCurr || 'None'
        });
      }
    }
  });

  return changes;
};

// Comprehensive Indian States & Discoms Master Data
const STATE_DISCOM_MASTER: Record<string, { name: string; discoms: { code: string; name: string }[] }> = {
  MH: {
    name: 'Maharashtra',
    discoms: [
      { code: 'MSEDCL', name: 'MSEDCL (Maharashtra State Electricity Distribution)' },
      { code: 'AEML', name: 'AEML (Adani Electricity Mumbai Limited)' },
      { code: 'TPC', name: 'Tata Power Company' },
      { code: 'BEST', name: 'BEST Undertaking' }
    ]
  },
  GJ: {
    name: 'Gujarat',
    discoms: [
      { code: 'DGVCL', name: 'DGVCL (Dakshin Gujarat Vij Company)' },
      { code: 'UGVCL', name: 'UGVCL (Uttar Gujarat Vij Company)' },
      { code: 'PGVCL', name: 'PGVCL (Paschim Gujarat Vij Company)' },
      { code: 'MGVCL', name: 'MGVCL (Madhya Gujarat Vij Company)' },
      { code: 'TORRENT', name: 'Torrent Power Ltd' }
    ]
  },
  UP: {
    name: 'Uttar Pradesh',
    discoms: [
      { code: 'NPCL', name: 'NPCL (Noida Power Company Limited)' },
      { code: 'PVVNL', name: 'PVVNL (Paschimanchal Vidyut Vitran)' },
      { code: 'DVVNL', name: 'DVVNL (Dakshinanchal Vidyut Vitran)' },
      { code: 'MVVNL', name: 'MVVNL (Madhyanchal Vidyut Vitran)' },
      { code: 'PUVVNL', name: 'PUVVNL (Purvanchal Vidyut Vitran)' },
      { code: 'KESCO', name: 'KESCO (Kanpur Electricity Supply Company)' }
    ]
  },
  DL: {
    name: 'Delhi',
    discoms: [
      { code: 'TPDDL', name: 'TPDDL (Tata Power Delhi Distribution)' },
      { code: 'BRPL', name: 'BRPL (BSES Rajdhani Power Limited)' },
      { code: 'BYPL', name: 'BYPL (BSES Yamuna Power Limited)' },
      { code: 'NDMC', name: 'NDMC (New Delhi Municipal Council)' }
    ]
  },
  KA: {
    name: 'Karnataka',
    discoms: [
      { code: 'BESCOM', name: 'BESCOM (Bangalore Electricity Supply)' },
      { code: 'MESCOM', name: 'MESCOM (Mangalore Electricity Supply)' },
      { code: 'CESC', name: 'CESC Mysuru' },
      { code: 'GESCOM', name: 'GESCOM (Gulbarga Electricity Supply)' },
      { code: 'HESCOM', name: 'HESCOM (Hubli Electricity Supply)' }
    ]
  },
  TN: {
    name: 'Tamil Nadu',
    discoms: [
      { code: 'TANGEDCO', name: 'TANGEDCO (Tamil Nadu Generation & Distribution)' }
    ]
  },
  HR: {
    name: 'Haryana',
    discoms: [
      { code: 'DHBVN', name: 'DHBVN (Dakshin Haryana Bijli Vitran Nigam)' },
      { code: 'UHBVN', name: 'UHBVN (Uttar Haryana Bijli Vitran Nigam)' }
    ]
  },
  PB: {
    name: 'Punjab',
    discoms: [
      { code: 'PSPCL', name: 'PSPCL (Punjab State Power Corporation)' }
    ]
  },
  JH: {
    name: 'Jharkhand',
    discoms: [
      { code: 'JBVNL', name: 'JBVNL (Jharkhand Bijli Vitran Nigam)' }
    ]
  },
  AS: {
    name: 'Assam',
    discoms: [
      { code: 'APDCL', name: 'APDCL (Assam Power Distribution Company)' }
    ]
  },
  RJ: {
    name: 'Rajasthan',
    discoms: [
      { code: 'JVVNL', name: 'JVVNL (Jaipur Vidyut Vitran Nigam)' },
      { code: 'AVVNL', name: 'AVVNL (Ajmer Vidyut Vitran Nigam)' },
      { code: 'JdVVNL', name: 'JdVVNL (Jodhpur Vidyut Vitran Nigam)' }
    ]
  },
  MP: {
    name: 'Madhya Pradesh',
    discoms: [
      { code: 'MPPKVVCL', name: 'MPPKVVCL (Paschim Kshetra)' },
      { code: 'MPMKVVCL', name: 'MPMKVVCL (Madhya Kshetra)' },
      { code: 'MPAKVVCL', name: 'MPAKVVCL (Purv Kshetra)' }
    ]
  },
  AP: {
    name: 'Andhra Pradesh',
    discoms: [
      { code: 'APSPDCL', name: 'APSPDCL (Southern Power Distribution)' },
      { code: 'APEPDCL', name: 'APEPDCL (Eastern Power Distribution)' },
      { code: 'APCPDCL', name: 'APCPDCL (Central Power Distribution)' }
    ]
  },
  TG: {
    name: 'Telangana',
    discoms: [
      { code: 'TSSPDCL', name: 'TSSPDCL (Southern Power Distribution)' },
      { code: 'TSNPDCL', name: 'TSNPDCL (Northern Power Distribution)' }
    ]
  },
  WB: {
    name: 'West Bengal',
    discoms: [
      { code: 'WBSEDCL', name: 'WBSEDCL (West Bengal State Electricity)' },
      { code: 'CESC_WB', name: 'CESC Kolkata' }
    ]
  },
  OD: {
    name: 'Odisha',
    discoms: [
      { code: 'TPCODL', name: 'TPCODL (TP Central Odisha Distribution)' },
      { code: 'TPNODL', name: 'TPNODL (TP Northern Odisha Distribution)' },
      { code: 'TPWODL', name: 'TPWODL (TP Western Odisha Distribution)' },
      { code: 'TPSODL', name: 'TPSODL (TP Southern Odisha Distribution)' }
    ]
  },
  CT: {
    name: 'Chhattisgarh',
    discoms: [
      { code: 'CSPDCL', name: 'CSPDCL (Chhattisgarh State Power Distribution)' }
    ]
  },
  UK: {
    name: 'Uttarakhand',
    discoms: [
      { code: 'UPCL', name: 'UPCL (Uttarakhand Power Corporation)' }
    ]
  },
  HP: {
    name: 'Himachal Pradesh',
    discoms: [
      { code: 'HPSEBL', name: 'HPSEBL (Himachal Pradesh State Electricity Board)' }
    ]
  },
  GA: {
    name: 'Goa',
    discoms: [
      { code: 'GED', name: 'GED (Goa Electricity Department)' }
    ]
  }
};

const CATEGORY_OPTIONS = [
  'Industrial',
  'Commercial',
  'HV-1',
  'HV-2',
  'HV-1 A',
  'HV-1 B',
  'LMV-11'
];

const VOLTAGE_OPTIONS = [
  '11 kV',
  '33 kV',
  '66 kV',
  '132 kV',
  '220 kV'
];

interface MonthTodData {
  startDate: string; // "YYYY-MM-DD"
  endDate: string;   // "YYYY-MM-DD"
  peakDemandKw: number;
  slots: CustomTodSlot[];
  'Electricity Duty'?: string;
  'Billing Month'?: string;
  'Current LPSC'?: string;
  'Arrear Amount'?: string;
  'Miscellaneous Charges'?: string;
  traderReports?: any;
  'Power Factor'?: string;
}

function parseTimeToMinutes(t: string): number {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function getSlotIntervals(startTime: string, endTime: string): Array<[number, number]> {
  const s = parseTimeToMinutes(startTime);
  const e = parseTimeToMinutes(endTime);
  if (s === e) return [];
  if (s < e) return [[s, e]];
  return [[s, 1440], [0, e]]; // Cross-midnight
}


interface CoverageInfo {
  coveredMinutes: number;
  unallocatedMinutes: number;
  coveredHoursStr: string;
  unallocatedHoursStr: string;
  isComplete24Hours: boolean;
  gapSummary: string;
}

function formatMinuteToTime(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  const hrs = Math.floor(m / 60);
  const mins = m % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function get24HourCoverageInfo(slots: CustomTodSlot[]): CoverageInfo {
  const covered = new Array(1440).fill(false);

  for (const slot of slots) {
    if (!slot.startTime || !slot.endTime) continue;
    const intervals = getSlotIntervals(slot.startTime, slot.endTime);
    for (const [startMin, endMin] of intervals) {
      const s = Math.max(0, Math.min(1440, startMin));
      const e = Math.max(0, Math.min(1440, endMin));
      for (let m = s; m < e; m++) {
        covered[m] = true;
      }
    }
  }

  let coveredCount = 0;
  for (let m = 0; m < 1440; m++) {
    if (covered[m]) coveredCount++;
  }

  const unallocatedMinutes = 1440 - coveredCount;
  const isComplete24Hours = unallocatedMinutes === 0;

  const gaps: { start: string; end: string }[] = [];
  let gapStart: number | null = null;

  for (let m = 0; m < 1440; m++) {
    if (!covered[m]) {
      if (gapStart === null) gapStart = m;
    } else {
      if (gapStart !== null) {
        gaps.push({
          start: formatMinuteToTime(gapStart),
          end: formatMinuteToTime(m)
        });
        gapStart = null;
      }
    }
  }
  if (gapStart !== null) {
    gaps.push({
      start: formatMinuteToTime(gapStart),
      end: formatMinuteToTime(1440)
    });
  }

  if (gaps.length > 1 && gaps[0].start === '00:00' && gaps[gaps.length - 1].end === '24:00') {
    const lastGap = gaps.pop()!;
    gaps[0].start = lastGap.start;
  }

  const gapSummary = gaps.map(g => `${g.start} - ${g.end}`).join(', ');
  const coveredHoursNum = coveredCount / 60;
  const unallocatedHoursNum = unallocatedMinutes / 60;

  return {
    coveredMinutes: coveredCount,
    unallocatedMinutes,
    coveredHoursStr: coveredHoursNum % 1 === 0 ? `${coveredHoursNum}h` : `${coveredHoursNum.toFixed(1)}h`,
    unallocatedHoursStr: unallocatedHoursNum % 1 === 0 ? `${unallocatedHoursNum}h` : `${unallocatedHoursNum.toFixed(1)}h`,
    isComplete24Hours,
    gapSummary
  };
}
export default function TraderPerformancePage() {
  const navigate = useNavigate();

  const [entries, setEntries] = useState<TraderPerformanceEntry[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  // Version History States
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyData, setHistoryData] = useState<any[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyClientName, setHistoryClientName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state & Step Wizard
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [todDialogOpen, setTodDialogOpen] = useState<boolean>(false);
  const [proltDialogOpen, setProltDialogOpen] = useState<boolean>(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number>(0);

  // Form Fields matching old UI
  const [clientPrefix, setClientPrefix] = useState('M/s');
  const [clientName, setClientName] = useState('');
  const [industryName, setIndustryName] = useState('');
  const [address, setAddress] = useState('');
  const [sanctionedLoadKw, setSanctionedLoadKw] = useState('');
  const [sanctionedLoadKva, setSanctionedLoadKva] = useState('');
  const [stateCode, setStateCode] = useState('UP');
  const [discom, setDiscom] = useState('MVVNL');
  const [consumerCategory, setConsumerCategory] = useState('Industrial');
  const [voltageLevel, setVoltageLevel] = useState('11 kV');

  // Margins & Fees Fields
  const [proltMargin, setProltMargin] = useState<string>('15');
  const [traderMargin, setTraderMargin] = useState<string>('0.02');
  const [meteringCharges, setMeteringCharges] = useState<string>('0');
  const [consultancyFee, setConsultancyFee] = useState<string>('0');
  const [probusPlatformFee, setProbusPlatformFee] = useState<string>('0');

  // Additional Billing & Tariff Fields
  const [applyElectricityDuty, setApplyElectricityDuty] = useState<boolean>(true);
  const [electricityDutyPercent, setElectricityDutyPercent] = useState<string>('5.00');

  const [billedDemandKv, setBilledDemandKv] = useState<string>('');
  const [powerFactor, setPowerFactor] = useState<string>('0.99');
  const [arrearAmount, setArrearAmount] = useState<string>('0');
  const [currentLpsc, setCurrentLpsc] = useState<string>('0');

  // Master Data State
  const [apiStates, setApiStates] = useState<any[]>([]);
  const [apiDiscoms, setApiDiscoms] = useState<any[]>([]);
  const [apiTariffs, setApiTariffs] = useState<any[]>([]);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [statesRes, discomsRes, tariffRes] = await Promise.all([
          getResourceData('region-state'),
          getResourceData('discom-list'),
          getResourceData('state-tariff')
        ]);
        if (statesRes.success && statesRes.data) setApiStates(statesRes.data);
        if (discomsRes.success && discomsRes.data) setApiDiscoms(discomsRes.data);
        if (tariffRes.success && tariffRes.data) setApiTariffs(tariffRes.data);
      } catch (err) {
        console.warn('Using default master state/discom list:', err);
      }
    };
    fetchMasterData();
  }, []);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    apiTariffs.forEach((row: any) => {
      const matchState = !stateCode ||
        row.state?.toLowerCase() === stateCode.trim().toLowerCase() ||
        (stateCode === 'UP' && row.state?.toLowerCase() === 'uttar pradesh');
      if (matchState && row.consumerCategory) {
        const sub = row.subCategory && row.subCategory.trim();
        if (sub && sub !== '-' && sub !== '') {
          set.add(`${row.consumerCategory} | ${sub}`);
        } else {
          set.add(row.consumerCategory);
        }
      }
    });

    if (set.size === 0) {
      CATEGORY_OPTIONS.forEach(cat => set.add(cat));
    }

    return Array.from(set);
  }, [apiTariffs, stateCode]);

  useEffect(() => {
    if (categoryOptions.length > 0 && !categoryOptions.includes(consumerCategory)) {
      setConsumerCategory(categoryOptions[0]);
    }
  }, [categoryOptions]);

  const stateOptions = useMemo(() => {
    const map = new Map<string, string>();
    Object.entries(STATE_DISCOM_MASTER).forEach(([code, val]) => {
      map.set(code, `${code} - ${val.name}`);
    });
    apiStates.forEach(s => {
      if (s.stateCode && !map.has(s.stateCode)) {
        map.set(s.stateCode, `${s.stateCode} - ${s.stateName || s.stateCode}`);
      }
    });
    return Array.from(map.entries()).map(([code, label]) => ({ code, label }));
  }, [apiStates]);

  const discomOptions = useMemo(() => {
    const list: { code: string; name: string }[] = [];
    if (STATE_DISCOM_MASTER[stateCode]) {
      list.push(...STATE_DISCOM_MASTER[stateCode].discoms);
    }
    apiDiscoms.filter(d => d.stateCode === stateCode).forEach(d => {
      const codeName = d.discom || d.code || d.legalName;
      if (codeName && !list.some(x => x.code === codeName)) {
        list.push({ code: codeName, name: d.legalName || codeName });
      }
    });

    if (discom && !list.some(x => x.code === discom)) {
      list.push({ code: discom, name: discom });
    }

    return list;
  }, [stateCode, discom, apiDiscoms]);

  // Custom TOD Consumptions & Billed Dates per Month
  const [todConsumptions, setTodConsumptions] = useState<Record<string, MonthTodData>>({
    '2026-04': {
      startDate: '2026-04-01',
      endDate: '2026-04-30',
      peakDemandKw: 1000,
      slots: [
        { id: 'tod-1', name: 'Slot 1', startTime: '05:00', endTime: '08:00', consumptionKwh: '' as any, effectivePrice: '' as any },
        { id: 'tod-2', name: 'Slot 2', startTime: '17:00', endTime: '23:00', consumptionKwh: '' as any, effectivePrice: '' as any }
      ]
    }
  });

  const getCurrentYearMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const [activeMonth, setActiveMonth] = useState<string>('2026-04');
  const [newMonthInput, setNewMonthInput] = useState<string>(getCurrentYearMonth());
  const [entryYear, setEntryYear] = useState<number>(2026);
  const [entryMonth, setEntryMonth] = useState<number>(4);
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>('2026-04');

  const loadEntries = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTraderPerformanceEntries();
      setEntries(data || []);
    } catch (err: any) {
      console.error('Failed to load savings calculator new entries:', err);
      setError(err.message || 'Failed to fetch entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    if (!dialogOpen || dialogMode === 'edit') return;
    const loadResourceDefaults = async () => {
      try {
        const defaults = await fetchResourceDefaults({
          stateCode,
          discom,
          consumerCategory,
          voltageLevel,
          monthStr: activeMonth
        });
        if (defaults) {

          if (defaults.electricityDutyPercent !== undefined) setElectricityDutyPercent(String(defaults.electricityDutyPercent));
        }
      } catch (err) {
        console.warn('Could not load resource defaults:', err);
      }
    };
    loadResourceDefaults();
  }, [dialogOpen, dialogMode, stateCode, discom, consumerCategory, voltageLevel, activeMonth]);

  const handleOpenCreate = () => {
    setDialogMode('create');
    setSelectedEntryId(null);
    setClientPrefix('M/s');
    setClientName('');
    setIndustryName('');
    setAddress('');
    setSanctionedLoadKw('1000');
    setSanctionedLoadKva('1111.11');
    setStateCode('UP');
    setDiscom('MVVNL');
    setConsumerCategory(categoryOptions[0] || 'HV-2 | Urban Schedule (Large & Heavy Power)');
    setVoltageLevel('11 kV');
    setProltMargin('15');
    setTraderMargin('0.02');
    setMeteringCharges('0');
    setConsultancyFee('0');
    setProbusPlatformFee('0');
    setApplyElectricityDuty(true);
    setBilledDemandKv('');
    setPowerFactor('0.99');
    setArrearAmount('0');
    setCurrentLpsc('0');
    setTodConsumptions({
      '2026-04': {
        startDate: '2026-04-01',
        endDate: '2026-04-30',
        peakDemandKw: 1000,
        slots: [
          { id: 'tod-1', name: 'Slot 1', startTime: '05:00', endTime: '08:00', consumptionKwh: '' as any, effectivePrice: '' as any },
          { id: 'tod-2', name: 'Slot 2', startTime: '17:00', endTime: '23:00', consumptionKwh: '' as any, effectivePrice: '' as any }
        ]
      }
    });
    setActiveMonth('2026-04');
    setNewMonthInput(getCurrentYearMonth());
    setActiveStep(0);
    setDialogOpen(true);
  };

  const handleOpenEdit = (entry: TraderPerformanceEntry) => {
    setDialogMode('edit');
    setSelectedEntryId(entry.id);
    setActiveStep(0);
    let fullClientName = entry.clientName || '';
    const matchedPrefix = ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'M/s'].find(p => fullClientName.startsWith(`${p} `));
    if (matchedPrefix) {
      setClientPrefix(matchedPrefix);
      setClientName(fullClientName.substring(matchedPrefix.length + 1));
    } else {
      setClientPrefix('');
      setClientName(fullClientName);
    }
    setIndustryName(entry.industryName);
    setAddress(entry.address);

    const kwVal = entry.sanctionedLoadKw ? String(entry.sanctionedLoadKw) : '';
    setSanctionedLoadKw(kwVal);
    const pf = entry.powerFactor || 0.99;
    setSanctionedLoadKva(kwVal && !isNaN(Number(kwVal)) ? (Number(kwVal) / pf).toFixed(2).replace(/\.00$/, '') : '');

    setStateCode(entry.stateCode || 'MH');
    setDiscom(entry.discom || 'MSEDCL');
    setConsumerCategory(entry.consumerCategory || 'Industrial');
    setVoltageLevel(entry.voltageLevel || '11 kV');
    setProltMargin(entry.proltMargin !== undefined && entry.proltMargin !== null 
      ? (Number(entry.proltMargin) <= 1 && Number(entry.proltMargin) > 0 ? String(Number(entry.proltMargin) * 100) : String(entry.proltMargin)) 
      : '15');
    setTraderMargin(entry.traderMargin !== undefined && entry.traderMargin !== null ? String(entry.traderMargin) : '0.02');
    setMeteringCharges(entry.meteringCharges !== undefined && entry.meteringCharges !== null ? String(entry.meteringCharges) : '0');
    setConsultancyFee(entry.consultancyFee !== undefined && entry.consultancyFee !== null ? String(entry.consultancyFee) : '0');
    setProbusPlatformFee(entry.probusPlatformFee !== undefined && entry.probusPlatformFee !== null ? String(entry.probusPlatformFee) : '0');
    setApplyElectricityDuty(entry.applyElectricityDuty !== undefined ? entry.applyElectricityDuty : true);
    setElectricityDutyPercent(entry.electricityDutyPercent !== undefined && entry.electricityDutyPercent !== null ? String(entry.electricityDutyPercent) : ((entry.todConsumptions as any)?._meta?.electricityDutyPercent !== undefined ? String((entry.todConsumptions as any)?._meta?.electricityDutyPercent) : '5.00'));
    setBilledDemandKv(entry.billedDemandKv !== undefined && entry.billedDemandKv !== null ? String(entry.billedDemandKv) : '');
    setPowerFactor(entry.powerFactor !== undefined && entry.powerFactor !== null ? String(entry.powerFactor) : '0.99');
    setArrearAmount(entry.arrearAmount !== undefined && entry.arrearAmount !== null ? String(entry.arrearAmount) : '0');
    setCurrentLpsc(entry.currentLpsc !== undefined && entry.currentLpsc !== null ? String(entry.currentLpsc) : '0');

    const parsed: Record<string, MonthTodData> = {};
    if (entry.todConsumptions && typeof entry.todConsumptions === 'object') {
      Object.entries(entry.todConsumptions).forEach(([m, val]: [string, any]) => {
        if (m.startsWith('_') || !m.includes('-')) return;
        const [yearStr, monthStr] = m.split('-');
        const y = parseInt(yearStr, 10) || 2026;
        const mon = parseInt(monthStr, 10) || 4;
        const lastDay = new Date(y, mon, 0).getDate();

        if (Array.isArray(val)) {
          parsed[m] = {
            startDate: `${m}-01`,
            endDate: `${m}-${String(lastDay).padStart(2, '0')}`,
            peakDemandKw: Number(entry.sanctionedLoadKw || 1000),
            slots: val
          };
        } else if (val && typeof val === 'object') {
          parsed[m] = {
            ...val,
            startDate: val.startDate || `${m}-01`,
            endDate: val.endDate || `${m}-${String(lastDay).padStart(2, '0')}`,
            peakDemandKw: Number(val.peakDemandKw || entry.sanctionedLoadKw || 1000),
            slots: Array.isArray(val.slots) ? val.slots : [],
            'Electricity Duty': val['Electricity Duty'],
            'Billing Month': val['Billing Month'],
            'Current LPSC': val['Current LPSC'],
            'Arrear Amount': val['Arrear Amount'],
            'Miscellaneous Charges': val['Miscellaneous Charges'],
            'Power Factor': val['Power Factor']
          };
        }
      });
    }
    const validMonths = Object.keys(parsed);
    setTodConsumptions(validMonths.length > 0 ? parsed : {
      '2026-04': {
        startDate: '2026-04-01',
        endDate: '2026-04-30',
        peakDemandKw: 1000,
        slots: [
          { id: 'tod-1', name: 'Peak Hours', startTime: '09:00', endTime: '12:00', consumptionKwh: '' as any, effectivePrice: '' as any },
          { id: 'tod-2', name: 'Off-Peak Hours', startTime: '22:00', endTime: '06:00', consumptionKwh: '' as any, effectivePrice: '' as any }
        ]
      }
    });
    setActiveMonth(validMonths.length > 0 ? validMonths[0] : '2026-04');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleAddTodSlot = () => {
    const currentMonthData = todConsumptions[activeMonth] || {
      startDate: `${activeMonth}-01`,
      endDate: `${activeMonth}-30`,
      peakDemandKw: Number(sanctionedLoadKw) || 1000,
      slots: []
    };
    const slots = currentMonthData.slots || [];
    const newSlotNumber = slots.length + 1;

    let defaultStart = '08:00';
    let defaultEnd = '12:00';
    if (slots.length > 0) {
      const lastSlot = slots[slots.length - 1];
      if (lastSlot.endTime) {
        defaultStart = lastSlot.endTime;
        const [h, m] = defaultStart.split(':').map(Number);
        const endH = (h + 4) % 24;
        defaultEnd = `${String(endH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
      }
    }

    const newSlot: CustomTodSlot = {
      id: `tod-${Date.now()}-${newSlotNumber}`,
      name: `Slot ${newSlotNumber}`,
      startTime: defaultStart,
      endTime: defaultEnd,
      consumptionKwh: '' as any,
      effectivePrice: '' as any
    };
    setTodConsumptions(prev => ({
      ...prev,
      [activeMonth]: {
        ...currentMonthData,
        slots: [...slots, newSlot]
      }
    }));
  };

  const handleRemoveTodSlot = (slotIndex: number) => {
    setTodConsumptions(prev => {
      const cur = prev[activeMonth];
      if (!cur) return prev;
      return {
        ...prev,
        [activeMonth]: {
          ...cur,
          slots: cur.slots.filter((_, idx) => idx !== slotIndex)
        }
      };
    });
  };

  const handleUpdateTodSlot = (ymStr: string, slotIndex: number, field: keyof CustomTodSlot, value: any) => {
    setTodConsumptions(prev => {
      const cur = prev[ymStr];
      if (!cur) return prev;
      const slots = [...cur.slots];
      if (slots[slotIndex]) {
        slots[slotIndex] = {
          ...slots[slotIndex],
          [field]: value
        };
      }
      return {
        ...prev,
        [ymStr]: {
          ...cur,
          slots
        }
      };
    });
  };

  const handleUpdateBilledDates = (startDate: string, endDate: string) => {
    setTodConsumptions(prev => {
      const cur = prev[activeMonth] || {
        startDate,
        endDate,
        peakDemandKw: Number(sanctionedLoadKw) || 1000,
        slots: []
      };
      return {
        ...prev,
        [activeMonth]: {
          ...cur,
          startDate,
          endDate
        }
      };
    });
  };

  const handleUpdatePeakDemand = (ymStr: string, peakDemandKw: any) => {
    setTodConsumptions(prev => {
      const cur = prev[ymStr] || {
        startDate: `${ymStr}-01`,
        endDate: `${ymStr}-30`,
        peakDemandKw,
        slots: []
      };
      return {
        ...prev,
        [ymStr]: {
          ...cur,
          peakDemandKw
        }
      };
    });
  };

  const handleAddMonth = () => {
    if (!newMonthInput) return;
    if (!todConsumptions[newMonthInput]) {
      const [y, m] = newMonthInput.split('-');
      const lastDay = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
      setTodConsumptions(prev => ({
        ...prev,
        [newMonthInput]: {
          startDate: `${newMonthInput}-01`,
          endDate: `${newMonthInput}-${String(lastDay).padStart(2, '0')}`,
          peakDemandKw: Number(sanctionedLoadKw) || 1000,
          slots: [
            { id: `tod-1`, name: 'Slot 1', startTime: '05:00', endTime: '08:00', consumptionKwh: '' as any, effectivePrice: '' as any }
          ]
        }
      }));
      setActiveMonth(newMonthInput);
      setNewMonthInput(getCurrentYearMonth());
    }
  };

  const handleDeleteMonth = (monthToDelete: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const remainingMonths = Object.keys(todConsumptions).filter(m => !m.startsWith('_') && m.includes('-') && m !== monthToDelete);
    if (remainingMonths.length === 0 && !monthToDelete.startsWith('_')) {
      setError('At least one month entry is required.');
      return;
    }
    setTodConsumptions(prev => {
      const updated = { ...prev };
      delete updated[monthToDelete];
      return updated;
    });
    if (activeMonth === monthToDelete) {
      setActiveMonth(remainingMonths[0] || '2026-04');
    }
  };

  const handleSaveEntry = async () => {
    if (!clientName || !industryName || !address) {
      setError('Please fill in required fields (Client Name, Industry, Address).');
      return;
    }

    try {
      const formattedClientName = clientPrefix ? `${clientPrefix} ${clientName}` : clientName;
      const payload = {
        clientName: formattedClientName,
        industryName,
        address,
        sanctionedLoadKw: Number(sanctionedLoadKw) || 0,
        stateCode,
        discom,
        consumerCategory,
        voltageLevel,
        proltMargin: Number(proltMargin) || 0,
        traderMargin: Number(traderMargin) || 0,
        meteringCharges: Number(meteringCharges) || 0,
        consultancyFee: Number(consultancyFee) || 0,
        probusPlatformFee: Number(probusPlatformFee) || 0,
        applyElectricityDuty,
        electricityDutyPercent: Number(electricityDutyPercent) || 0,
        billedDemandKv: billedDemandKv ? Number(billedDemandKv) : null,
        powerFactor: powerFactor ? Number(powerFactor) : null,
        arrearAmount: arrearAmount ? Number(arrearAmount) : 0,
        currentLpsc: currentLpsc ? Number(currentLpsc) : 0,
        todConsumptions: {
          ...todConsumptions,
          _meta: {
            electricityDutyPercent: Number(electricityDutyPercent) || 0,
          }
        }
      };

      if (dialogMode === 'create') {
        await createTraderPerformanceEntry(payload);
      } else if (selectedEntryId) {
        await updateTraderPerformanceEntry(selectedEntryId, payload);
      }

      setDialogOpen(false);
      setTodDialogOpen(false);
      setProltDialogOpen(false);
      loadEntries();
    } catch (err: any) {
      console.error('Save failed:', err);
      setError(err.message || 'Failed to save entry');
    }
  };

  const handleOpenHistory = async (entry: TraderPerformanceEntry) => {
    setHistoryClientName(entry.clientName);
    setHistoryDialogOpen(true);
    setHistoryLoading(true);
    try {
      const data = await fetchEntryHistoryTraderPerformance(entry.id);
      setHistoryData(data);
    } catch (error) {
      console.error(error);
      setError('Failed to fetch version history');
      setHistoryDialogOpen(false);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      try {
        await deleteTraderPerformanceEntry(id);
        loadEntries();
      } catch (err: any) {
        setError(err.message || 'Failed to delete entry');
      }
    }
  };

  const filteredEntries = entries.filter(e =>
    e.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.industryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.discom && e.discom.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const stats = useMemo(() => {
    const totalEntries = entries.length;
    const totalMw = (entries.reduce((sum, e) => sum + (Number(e.sanctionedLoadKw) || 0), 0) / 1000).toFixed(1);
    const uniqueDiscoms = new Set(entries.map(e => e.discom).filter(Boolean)).size;
    return { totalEntries, totalMw, uniqueDiscoms };
  }, [entries]);

  const columns: ColumnDefinition[] = [
    {
      field: 'id',
      headerName: 'Client ID',
      align: 'center',
      width: 90,
      sticky: true,
      renderCell: (row: TraderPerformanceEntry) => {
        const index = filteredEntries.findIndex(e => e.id === row.id);
        return (
          <Typography
            sx={{
              fontFamily: '"Inter", sans-serif',
              fontSize: '12px',
              fontWeight: 600,
              color: 'text.secondary'
            }}
          >
            {index >= 0 ? index + 1 : 1}
          </Typography>
        );
      }
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
      width: 110,
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
        <Tooltip title={row.consumerCategory || ''} placement="top">
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
        </Tooltip>
      )
    },
    {
      field: 'voltageLevel',
      headerName: 'Voltage',
      align: 'center',
      width: 110,
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
      width: 210,
      stickyRight: true,
      renderCell: (row: TraderPerformanceEntry) => (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/trader-performance/${row.id}/dashboard`);
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
            Open Desk
          </Button>

          <Tooltip title="Edit Entry" arrow>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenEdit(row);
              }}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1.5,
                p: 0.6,
                color: 'text.secondary',
                '&:hover': {
                  borderColor: '#8B5CF6',
                  color: '#8B5CF6',
                  bgcolor: alpha('#8B5CF6', 0.08)
                }
              }}
            >
              <EditIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Version History" arrow>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenHistory(row);
              }}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1.5,
                p: 0.6,
                color: '#8B5CF6',
                '&:hover': {
                  borderColor: '#8B5CF6',
                  bgcolor: alpha('#8B5CF6', 0.08)
                }
              }}
            >
              <HistoryIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Delete Entry" arrow>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteEntry(row.id);
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
          </Tooltip>
        </Box>
      )
    }
  ];

  const activeMonthData = todConsumptions[activeMonth] || {
    startDate: `${activeMonth}-01`,
    endDate: `${activeMonth}-30`,
    peakDemandKw: Number(sanctionedLoadKw) || 1000,
    slots: []
  };

  const isStepValid = (stepIndex: number) => {
    if (stepIndex === 0) return Boolean(clientName && industryName && address);
    if (stepIndex === 1) return Boolean(stateCode && discom);
    if (stepIndex === 2) return Boolean(consumerCategory && voltageLevel);
    if (stepIndex === 3) return Boolean(sanctionedLoadKw && !isNaN(Number(sanctionedLoadKw)) && Number(sanctionedLoadKw) > 0);
    return true;
  };

  const renderStep = (stepIndex: number, stepMeta: { icon: React.ReactNode; title: string; question: string; summary: string; content: React.ReactNode }) => {
    const isCompleted = activeStep > stepIndex;
    const isActive = activeStep === stepIndex;

    if (isCompleted) {
      return (
        <Card
          key={stepIndex}
          elevation={0}
          sx={{
            flexShrink: 0,
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            p: 2,
            bgcolor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CheckCircleIcon sx={{ color: '#10B981', fontSize: 20 }} />
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {stepMeta.title}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B' }}>
                {stepMeta.summary}
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setActiveStep(stepIndex)}>
            <EditIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          </IconButton>
        </Card>
      );
    }

    if (isActive) {
      return (
        <Card
          key={stepIndex}
          elevation={0}
          sx={{
            flexShrink: 0,
            border: '2px solid #8B5CF6',
            borderRadius: '16px',
            p: 3,
            boxShadow: '0 4px 12px -2px rgba(139, 92, 246, 0.08)',
            bgcolor: '#FFF'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box sx={{ color: '#8B5CF6', display: 'flex', alignItems: 'center' }}>
              {stepMeta.icon}
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1E293B', fontSize: '1.05rem' }}>
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
              disabled={!isStepValid(stepIndex)}
              onClick={() => {
                if (isStepValid(stepIndex)) {
                  if (stepIndex < 3) {
                    setActiveStep(stepIndex + 1);
                  } else {
                    setDialogOpen(false);
                    setTodDialogOpen(true);
                  }
                }
              }}
              endIcon={<ArrowForwardIcon />}
              sx={{
                textTransform: 'none',
                borderRadius: 2.5,
                fontWeight: 600,
                bgcolor: '#8B5CF6',
                '&:hover': { bgcolor: '#7C3AED' }
              }}
            >
              {stepIndex === 3 ? 'Proceed to ToD' : 'Continue'}
            </Button>
          </Box>
        </Card>
      );
    }

    return null;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, pt: 2, p: 3 }}>
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
                Trader Performance Calculator
              </Typography>
              <Box sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.5,
                py: 0.3,
                borderRadius: 999,
                bgcolor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: '#10B981',
                fontSize: '11px',
                fontWeight: 600,
                fontFamily: 'monospace'
              }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#10B981' }} />
                TRADER BENCHMARK ENGINE
              </Box>
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '13px' }}>
              Track trader execution benchmarks, compare grid utility tariffs against energy market procurement, and analyze portfolio performance.
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
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
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
        </Box>
      </Box>

      {/* Executive Metric Cards */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
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

        <Grid item xs={12} sm={6} md={3}>
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

        <Grid item xs={12} sm={6} md={3}>
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

        <Grid item xs={12} sm={6} md={3}>
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
              borderColor: '#F59E0B'
            }
          }}>
            <Box sx={{
              p: 1.5,
              borderRadius: 2.5,
              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
              color: '#F59E0B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <SpeedIcon fontSize="medium" />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Benchmark Engine
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#10B981', mt: 0.2, fontSize: '16px' }}>
                Live Active <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>• Trader Audit</span>
              </Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Entries Table Container */}
      <TableContainer
        title="Trader Performance Entries"
        columns={columns}
        data={filteredEntries}
        loading={loading}
        emptyStateMessage={
          <EmptyTableState
            title="No entries found"
            description="Create your first client configuration entry to simulate and calculate savings."
            onAddRecord={handleOpenCreate}
          />
        }
      />


      {/* Modal Dialog styled EXACTLY like the old Savings Calculator modal */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 4, bgcolor: '#F8FAFC' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, p: 3, pb: 1 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1E293B' }}>
              {dialogMode === 'create' ? 'Create New Entry' : 'Edit Entry'}
            </Typography>
          </Box>
          <IconButton onClick={handleCloseDialog} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3, bgcolor: '#F8FAFC' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Progress Bar */}
          <Box sx={{ width: '100%', height: 6, bgcolor: '#E2E8F0', borderRadius: 3, mb: 1, overflow: 'hidden' }}>
            <Box sx={{
              height: '100%',
              width: `${((activeStep + 1) / 4) * 100}%`,
              background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)',
              transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }} />
          </Box>

          {/* Step 0: Client & Facility Details */}
          {renderStep(0, {
            icon: <BusinessIcon />,
            title: 'Client Information',
            question: 'Who is the client for this simulation?',
            summary: `Client: ${clientPrefix ? `${clientPrefix} ` : ''}${clientName} (${industryName})`,
            content: (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
                <TextField
                  label="Client Name *"
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
                  label="Industry Name *"
                  value={industryName}
                  onChange={(e) => setIndustryName(e.target.value)}
                  fullWidth
                  required
                  variant="outlined"
                  size="small"
                />
                <TextField
                  label="Address *"
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

          {/* Step 1: Location & DISCOM */}
          {renderStep(1, {
            icon: <LocationIcon />,
            title: 'Location & DISCOM',
            question: 'Where is your facility located and who is your DISCOM?',
            summary: `Location: ${stateCode} | DISCOM: ${discom}`,
            content: (
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="State Code *"
                    value={stateCode}
                    onChange={(e) => {
                      setStateCode(e.target.value);
                      const stateDiscoms = STATE_DISCOM_MASTER[e.target.value]?.discoms || [];
                      if (stateDiscoms.length > 0) setDiscom(stateDiscoms[0].code);
                    }}
                    fullWidth
                    size="small"
                  >
                    {stateOptions.map((s) => (
                      <MenuItem key={s.code} value={s.code}>
                        {s.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="DISCOM *"
                    value={discom}
                    onChange={(e) => setDiscom(e.target.value)}
                    fullWidth
                    size="small"
                  >
                    {discomOptions.map((d) => (
                      <MenuItem key={d.code} value={d.code}>
                        {d.code} - {d.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>
            )
          })}

          {/* Step 2: Consumer Category & Voltage Level */}
          {renderStep(2, {
            icon: <CategoryIcon />,
            title: 'Consumer Category & Voltage',
            question: 'What is your consumer category and voltage level?',
            summary: `Category: ${consumerCategory} | Voltage: ${voltageLevel}`,
            content: (
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Consumer Category *"
                    value={consumerCategory}
                    onChange={(e) => setConsumerCategory(e.target.value)}
                    fullWidth
                    size="small"
                  >
                    {categoryOptions.map((c) => (
                      <MenuItem key={c} value={c}>
                        {c}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Voltage Category *"
                    value={voltageLevel}
                    onChange={(e) => setVoltageLevel(e.target.value)}
                    fullWidth
                    size="small"
                  >
                    {VOLTAGE_OPTIONS.map((v) => (
                      <MenuItem key={v} value={v}>
                        {v}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>
            )
          })}

          {/* Step 3: Sanctioned Load */}
          {renderStep(3, {
            icon: <SpeedIcon />,
            title: 'Sanctioned Load',
            question: 'What is your sanctioned load capacity?',
            summary: `Sanctioned Load: ${sanctionedLoadKw} kW (${sanctionedLoadKva} kVA)`,
            content: (
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Sanctioned Load (kW) *"
                    type="number"
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
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Sanctioned Load (kVA)"
                    type="number"
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
                    fullWidth
                    size="small"
                  />
                </Grid>
              </Grid>
            )
          })}

          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between', bgcolor: '#F8FAFC' }}>
          <Button onClick={handleCloseDialog} color="inherit" sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Standalone Popup 1: TOD Monthly Consumption Dialog */}
      <Dialog
        open={todDialogOpen}
        onClose={(e, reason) => { if (reason !== 'backdropClick' && reason !== 'escapeKeyDown') setTodDialogOpen(false); }}
        disableEscapeKeyDown
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 4, p: 3, bgcolor: '#F8FAFC', maxWidth: '1200px', width: '95vw' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, pb: 0 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1E293B' }}>Enter ToD Consumption</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Add monthly consumption data for each Time-of-Day period</Typography>
          </Box>
          <IconButton onClick={() => setTodDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Monthly Accordions */}
          {Object.keys(todConsumptions).filter(m => !m.startsWith('_') && m.includes('-')).sort().map((ym, index) => {
            const monthData = todConsumptions[ym] || { startDate: `${ym}-01`, endDate: `${ym}-30`, peakDemandKw: 1000, slots: [] };
            const isExpanded = expandedAccordion === 'initial' ? index === 0 : expandedAccordion === ym;
            const coverage = get24HourCoverageInfo(monthData.slots || []);

            return (
              <Accordion
                key={ym}
                expanded={isExpanded}
                onChange={(e, expanded) => setExpandedAccordion(expanded ? ym : false)}
                elevation={0}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px !important', '&:before': { display: 'none' } }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#F8FAFC', borderRadius: '12px' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1E293B' }}>
                          {new Date(`${ym}-01`).toLocaleString('default', { month: 'short', year: 'numeric' })}
                        </Typography>
                        {monthData['Billing Month'] && (
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                            Bill Month: {(() => {
                              const [year, month] = monthData['Billing Month'].split('-');
                              return new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1).toLocaleString('default', { month: 'short', year: 'numeric' });
                            })()}
                          </Typography>
                        )}
                      </Box>
                      <Chip
                        size="small"
                        label={coverage.isComplete24Hours ? "24h Covered" : `${coverage.coveredHoursStr} / 24h (${coverage.unallocatedHoursStr} remaining)`}
                        color={coverage.isComplete24Hours ? "success" : "warning"}
                        variant="outlined"
                        sx={{ fontWeight: 600, fontSize: 11 }}
                      />
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMonth(ym, e);
                      }}
                    >
                      <DeleteIcon fontSize="small" color="action" />
                    </IconButton>
                  </Box>
                </AccordionSummary>

                <AccordionDetails sx={{ p: 3, pt: 1, bgcolor: '#FFFFFF' }}>
                  
                  {/* ── Section: IEX Trader PDFs ── */}
                  <Box sx={{ mb: 2.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#8B5CF6', display: 'block', mb: 1.5 }}>
                      Upload IEX Market PDFs (Max 3)
                    </Typography>
                    <Box sx={{ p: 2, border: '1px dashed #ccc', borderRadius: 2, bgcolor: '#f9f9f9', textAlign: 'center' }}>
                      <input 
                        type="file" 
                        multiple 
                        accept=".pdf" 
                        onChange={async (e) => {
                          if (!e.target.files) return;
                          const files = Array.from(e.target.files).slice(0, 200);
                          const formData = new FormData();
                          files.forEach(f => formData.append('files', f));
                          try {
                            const res = await apiClient.post('/trader-performance/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                            setTodConsumptions(prev => {
                              const cur = prev[ym] || {};
                              const existingReports = cur.traderReports || { data: {}, files_status: [] };
                              const mergedReports = {
                                data: { ...existingReports.data, ...(res.data.data || {}) },
                                files_status: [...(existingReports.files_status || []), ...(res.data.files_status || [])]
                              };
                              return { ...prev, [ym]: { ...cur, traderReports: mergedReports } };
                            });
                            alert('PDFs processed successfully!');
                          } catch (err: any) {
                            alert('Upload failed: ' + err.message);
                          }
                        }} 
                      />
                      {monthData.traderReports && (
                        <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                          Successfully parsed {Object.keys(monthData.traderReports?.data || {}).length} report(s).
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <Divider sx={{ mb: 2.5 }} />

                  {/* ── Section: Billing Data ── */}
                  <Box sx={{ mb: 2.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#8B5CF6', display: 'block', mb: 1.5 }}>
                      Billing Data
                    </Typography>
                    <FormControl component="fieldset">
                      <FormLabel component="legend" sx={{ fontSize: '12px', color: 'text.secondary', mb: 0.5 }}>Electricity Duty Applied?</FormLabel>
                      <RadioGroup
                        row
                        value={monthData['Electricity Duty'] || 'Yes'}
                        onChange={(e) => {
                          const updated = { ...todConsumptions };
                          if (updated[ym]) {
                            updated[ym]['Electricity Duty'] = e.target.value;
                            setTodConsumptions(updated);
                          }
                        }}
                      >
                        <FormControlLabel value="Yes" control={<Radio size="small" sx={{ color: '#8B5CF6', '&.Mui-checked': { color: '#8B5CF6' } }} />} label={<Typography variant="body2">Yes</Typography>} />
                        <FormControlLabel value="No" control={<Radio size="small" sx={{ color: '#8B5CF6', '&.Mui-checked': { color: '#8B5CF6' } }} />} label={<Typography variant="body2">No</Typography>} />
                      </RadioGroup>
                    </FormControl>

                    <Box sx={{ mt: 2 }}>
                      <TextField
                        label="Billing Month"
                        type="month"
                        value={monthData['Billing Month'] || (() => {
                          const parts = ym.split('-');
                          const y = parseInt(parts[0], 10);
                          const m = parseInt(parts[1], 10);
                          const d = new Date(y, m, 1);
                          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        })()}
                        onChange={(e) => {
                          const updated = { ...todConsumptions };
                          if (updated[ym]) {
                            updated[ym]['Billing Month'] = e.target.value;
                            setTodConsumptions(updated);
                          }
                        }}
                        InputLabelProps={{ shrink: true }}
                        variant="outlined"
                        size="small"
                        sx={{ bgcolor: '#FFF', width: { xs: '100%', sm: '50%' } }}
                      />
                    </Box>
                  </Box>

                  <Divider sx={{ mb: 2.5 }} />

                  {/* ── Section: Billing Demand ── */}
                  <Box sx={{ mb: 2.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#8B5CF6', display: 'block', mb: 1.5 }}>
                      Billing Demand
                    </Typography>
                    <TextField
                      label="Peak Demand (kW)"
                      type="number"
                      size="small"
                      value={monthData.peakDemandKw || ''}
                      onChange={(e) => {
                        setActiveMonth(ym);
                        handleUpdatePeakDemand(ym, e.target.value);
                      }}
                      sx={{ bgcolor: '#FFF', width: { xs: '100%', sm: '50%' } }}
                    />
                  </Box>

                  <Divider sx={{ mb: 2.5 }} />

                  {/* ── Section: Billed Consumption ── */}
                  <Box sx={{ mb: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#8B5CF6', display: 'block' }}>
                        Billed Consumption & TOD Customizations
                      </Typography>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => {
                          setActiveMonth(ym);
                          handleAddTodSlot();
                        }}
                        sx={{ bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' }, textTransform: 'none', borderRadius: 2 }}
                      >
                        + Add TOD Slot
                      </Button>
                    </Box>

                    <Box sx={{ mb: 2, width: { xs: '100%', sm: '50%' } }}>
                      <DateRangePicker
                        startDate={monthData.startDate || `${ym}-01`}
                        endDate={monthData.endDate || `${ym}-30`}
                        onChange={(start, end) => {
                          setActiveMonth(ym);
                          handleUpdateBilledDates(start, end);
                        }}
                      />
                    </Box>

                    {/* Slot Table */}
                    <Table size="small" sx={{ minWidth: 950 }}>
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                          <TableCell sx={{ fontWeight: 700 }}>TOD Slot Name</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>Start Time</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>End Time</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>Consumption (kWh)</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>Consumption (kVAh)</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>Effective Price (₹/kWh)</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>Effective Price (₹/kVAh)</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(() => {
                          const slots = (monthData.slots || []) as CustomTodSlot[];
                          const monthPf = monthData['Power Factor'];
                          const currentPf = monthPf && !isNaN(Number(monthPf)) && Number(monthPf) > 0 ? Number(monthPf) : 0.99;

                          return slots.map((slot, idx) => {
                            const kwhVal = Number(slot.consumptionKwh) || 0;
                            const kvahVal = kwhVal > 0 ? parseFloat((kwhVal / currentPf).toFixed(4)) : '';
                            const effPriceKvahVal = slot.effectivePrice ? Number((Number(slot.effectivePrice) * currentPf).toFixed(4)) : '';

                            return (
                              <TableRow key={slot.id || idx} sx={{ bgcolor: 'inherit' }}>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <TextField
                                      size="small"
                                      value={slot.name || ''}
                                      onChange={(e) => {
                                        setActiveMonth(ym);
                                        handleUpdateTodSlot(ym, idx, 'name', e.target.value);
                                      }}
                                      placeholder={`Slot ${idx + 1}`}
                                    />
                                  </Box>
                                </TableCell>
                                <TableCell align="center">
                                  <TextField
                                    size="small"
                                    type="time"
                                    value={slot.startTime || '00:00'}
                                    onChange={(e) => {
                                      setActiveMonth(ym);
                                      handleUpdateTodSlot(ym, idx, 'startTime', e.target.value);
                                    }}
                                    inputProps={{ step: 300 }}
                                    sx={{ width: 110 }}
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  <TextField
                                    size="small"
                                    type="time"
                                    value={slot.endTime || '24:00'}
                                    onChange={(e) => {
                                      setActiveMonth(ym);
                                      handleUpdateTodSlot(ym, idx, 'endTime', e.target.value);
                                    }}
                                    inputProps={{ step: 300 }}
                                    sx={{ width: 110 }}
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  <TextField
                                    size="small"
                                    type="number"
                                    inputProps={{ step: 'any' }}
                                    value={slot.consumptionKwh}
                                    onChange={(e) => {
                                      setActiveMonth(ym);
                                      handleUpdateTodSlot(ym, idx, '_kvahInput' as any, undefined);
                                      handleUpdateTodSlot(ym, idx, 'consumptionKwh', e.target.value);
                                    }}
                                    sx={{ width: 110 }}
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  <TextField
                                    size="small"
                                    type="number"
                                    inputProps={{ step: 'any' }}
                                    value={(slot as any)._kvahInput !== undefined ? (slot as any)._kvahInput : kvahVal}
                                    onChange={(e) => {
                                      setActiveMonth(ym);
                                      const val = e.target.value;
                                      handleUpdateTodSlot(ym, idx, '_kvahInput' as any, val);
                                      if (val && !isNaN(Number(val))) {
                                        handleUpdateTodSlot(ym, idx, 'consumptionKwh', parseFloat((Number(val) * currentPf).toFixed(4)));
                                      } else {
                                        handleUpdateTodSlot(ym, idx, 'consumptionKwh', '');
                                      }
                                    }}
                                    sx={{ width: 110 }}
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  <TextField
                                    size="small"
                                    type="number"
                                    inputProps={{ step: 0.1 }}
                                    value={slot.effectivePrice}
                                    onChange={(e) => {
                                      setActiveMonth(ym);
                                      handleUpdateTodSlot(ym, idx, '_effPriceKvahInput' as any, undefined);
                                      handleUpdateTodSlot(ym, idx, 'effectivePrice', e.target.value);
                                    }}
                                    sx={{ width: 130 }}
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  <TextField
                                    size="small"
                                    type="number"
                                    inputProps={{ step: 0.1 }}
                                    value={(slot as any)._effPriceKvahInput !== undefined ? (slot as any)._effPriceKvahInput : effPriceKvahVal}
                                    onChange={(e) => {
                                      setActiveMonth(ym);
                                      const val = e.target.value;
                                      handleUpdateTodSlot(ym, idx, '_effPriceKvahInput' as any, val);
                                      if (val && !isNaN(Number(val))) {
                                        handleUpdateTodSlot(ym, idx, 'effectivePrice', Number((Number(val) / currentPf).toFixed(4)));
                                      } else {
                                        handleUpdateTodSlot(ym, idx, 'effectivePrice', '');
                                      }
                                    }}
                                    sx={{ width: 130 }}
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  <IconButton color="error" size="small" onClick={() => {
                                    setActiveMonth(ym);
                                    handleRemoveTodSlot(idx);
                                  }}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            );
                          });
                        })()}
                      </TableBody>
                    </Table>
                  </Box>

                  <Divider sx={{ mt: 3, mb: 2.5 }} />

                  {/* ── Section: Other Info (optional) ── */}
                  <Box sx={{ mb: 2.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#8B5CF6', display: 'block', mb: 1.5 }}>
                      Other Info <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          label="Power Factor"
                          value={monthData['Power Factor'] || ''}
                          onChange={(e) => {
                            let val = e.target.value;
                            if (val !== '') {
                              if (Number(val) > 1) val = '1';
                              else if (Number(val) < 0) val = '';
                            }
                            const updated = { ...todConsumptions };
                            if (!updated[ym]) updated[ym] = { startDate: '', endDate: '', peakDemandKw: 1000, slots: [] };
                            updated[ym]['Power Factor'] = val;
                            setTodConsumptions(updated);
                          }}
                          onBlur={(e) => {
                            if (e.target.value === '' || Number(e.target.value) <= 0) {
                              const updated = { ...todConsumptions };
                              if (!updated[ym]) updated[ym] = { startDate: '', endDate: '', peakDemandKw: 1000, slots: [] };
                              updated[ym]['Power Factor'] = '0.99';
                              setTodConsumptions(updated);
                            }
                          }}
                          fullWidth variant="outlined" size="small" type="number" placeholder="0.99" sx={{ bgcolor: '#FFF' }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          label="Current LPSC (₹)"
                          value={monthData['Current LPSC'] || ''}
                          onChange={(e) => {
                            const updated = { ...todConsumptions };
                            if (!updated[ym]) updated[ym] = { startDate: '', endDate: '', peakDemandKw: 1000, slots: [] };
                            updated[ym]['Current LPSC'] = e.target.value;
                            setTodConsumptions(updated);
                          }}
                          fullWidth variant="outlined" size="small" type="number" placeholder="0" sx={{ bgcolor: '#FFF' }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          label="Arrear Amount (₹)"
                          value={monthData['Arrear Amount'] || ''}
                          onChange={(e) => {
                            const updated = { ...todConsumptions };
                            if (!updated[ym]) updated[ym] = { startDate: '', endDate: '', peakDemandKw: 1000, slots: [] };
                            updated[ym]['Arrear Amount'] = e.target.value;
                            setTodConsumptions(updated);
                          }}
                          fullWidth variant="outlined" size="small" type="number" placeholder="0" sx={{ bgcolor: '#FFF' }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          label="Miscellaneous Charges (₹)"
                          value={monthData['Miscellaneous Charges'] || ''}
                          onChange={(e) => {
                            const updated = { ...todConsumptions };
                            if (!updated[ym]) updated[ym] = { startDate: '', endDate: '', peakDemandKw: 1000, slots: [] };
                            updated[ym]['Miscellaneous Charges'] = e.target.value;
                            setTodConsumptions(updated);
                          }}
                          fullWidth variant="outlined" size="small" type="number" placeholder="0" sx={{ bgcolor: '#FFF' }}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                </AccordionDetails>
              </Accordion>
            );
          })}

          {/* + Add New Month Accordion */}
          <Accordion
            elevation={0}
            expanded={expandedAccordion === 'new_month'}
            onChange={(e, isExpanded) => setExpandedAccordion(isExpanded ? 'new_month' : false)}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px !important', '&:before': { display: 'none' } }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#F8FAFC', borderRadius: '12px' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1E293B' }}>+ Add New Month</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 3, pt: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', display: 'block', mb: 1 }}>Consumption Month</Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  select
                  label="Year"
                  value={entryYear}
                  onChange={(e) => setEntryYear(Number(e.target.value))}
                  size="small"
                  sx={{ width: 120, bgcolor: '#FFF' }}
                >
                  <MenuItem value={2023}>2023</MenuItem>
                  <MenuItem value={2024}>2024</MenuItem>
                  <MenuItem value={2025}>2025</MenuItem>
                  <MenuItem value={2026}>2026</MenuItem>
                  <MenuItem value={2027}>2027</MenuItem>
                </TextField>
                <TextField
                  select
                  label="Month"
                  value={entryMonth}
                  onChange={(e) => setEntryMonth(Number(e.target.value))}
                  size="small"
                  sx={{ width: 150, bgcolor: '#FFF' }}
                >
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
                    const lastDay = new Date(entryYear, entryMonth, 0).getDate();
                    setTodConsumptions(prev => ({
                      ...prev,
                      [key]: {
                        startDate: `${key}-01`,
                        endDate: `${key}-${String(lastDay).padStart(2, '0')}`,
                        peakDemandKw: Number(sanctionedLoadKw) || 1000,
                        slots: [
                          { id: `tod-1`, name: 'Slot 1', startTime: '05:00', endTime: '08:00', consumptionKwh: '' as any, effectivePrice: '' as any },
                          { id: `tod-2`, name: 'Slot 2', startTime: '17:00', endTime: '23:00', consumptionKwh: '' as any, effectivePrice: '' as any }
                        ]
                      }
                    }));
                    setActiveMonth(key);
                    setExpandedAccordion(key);
                  } else {
                    setError('This month has already been added.');
                  }
                }}
                sx={{ mt: 3, height: 48, textTransform: 'none', borderRadius: 2, borderStyle: 'dashed', color: '#1E293B', borderColor: '#CBD5E1' }}
              >
                + Add Month
              </Button>
            </AccordionDetails>
          </Accordion>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'center', display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => {
              setTodDialogOpen(false);
              setDialogOpen(true);
              setActiveStep(3);
            }}
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

      {/* Standalone Popup 2: Margin Details Dialog */}
      <Dialog
        open={proltDialogOpen}
        onClose={(e, reason) => { if (reason !== 'backdropClick' && reason !== 'escapeKeyDown') setProltDialogOpen(false); }}
        disableEscapeKeyDown
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 4, p: 2, bgcolor: '#FFF' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, pb: 0 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1E293B' }}>Margin Details</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>What are the commercial margin rates for this client?</Typography>
          </Box>
          <IconButton onClick={() => setProltDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
          <TextField
            label="Trader Margin (₹/kWh)"
            type="number"
            inputProps={{ step: 0.01 }}
            value={traderMargin}
            onChange={(e) => setTraderMargin(e.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            label="PROLT Consultancy Fee (₹)"
            type="number"
            value={consultancyFee}
            onChange={(e) => setConsultancyFee(e.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            label="Metering Charges (₹)"
            type="number"
            value={meteringCharges}
            onChange={(e) => setMeteringCharges(e.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            label="Probus Platform Subscription Fee (₹)"
            type="number"
            value={probusPlatformFee}
            onChange={(e) => setProbusPlatformFee(e.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            label="PROLT Margin (% of total savings)"
            type="number"
            inputProps={{ step: 0.1 }}
            value={proltMargin}
            onChange={(e) => setProltMargin(e.target.value)}
            fullWidth
            size="small"
          />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'center', display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => {
              setProltDialogOpen(false);
              setTodDialogOpen(true);
            }}
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
            onClick={handleSaveEntry}
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
            {dialogMode === 'create' ? 'Save Client Entry' : 'Update Client Entry'}
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
    </Box>
  );
}
