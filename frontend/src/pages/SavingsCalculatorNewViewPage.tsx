// @ts-nocheck
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Building,
  MapPin,
  Zap,
  Activity,
  Calendar,
  History,
  Edit3,
  Trash2,
  Save,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sliders,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Percent,
  Check,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Lightbulb,
  FileText,
  Sparkles,
  BarChart3,
  BarChart2,
  RefreshCw,
  Plus,
  Eye,
  Layers,
  Gauge,
  Building2,
  CalendarDays,
  ClipboardList,
  Bolt
} from 'lucide-react';
import {
  Box,
  Typography,
  Button as MuiButton,
  IconButton as MuiIconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  Snackbar,
  Alert,
  Chip as MuiChip
} from '@mui/material';
import {
  fetchSavingsNewEntryById,
  updateSavingsNewEntry,
  deleteSavingsNewEntry,
  fetchEntryHistoryNew,
  calculateSavingsNew,
  calculateMarketDecisionNew,
  fetchDemandShiftInsightsNew,
  fetchClientOverviewNew,
  exportSavingsExcelNew,
  exportDemandShiftExcelNew,
  SavingsCalculatorNewEntry,
  CustomTodSlot
} from '../api/savingsCalculatorNew.api';
import {
  exportTechnicalProposalWord,
  exportCommercialProposalWord,
  SavingsCalculatorEntryHistory,
  CalculationResult,
  MarketDecisionResult,
  DemandShiftInsightsResult,
  ClientOverviewResult
} from '../api/savingsCalculator.api';
import { getResourceData } from '../api/resourceCenter.api';
import { STATE_TARIFF_MOCK_DATA } from './resource-center/mockData/stateTariff.mock';
import { DISCOM_LIST_MOCK_DATA } from './resource-center/mockData/discomList.mock';
import { Dashboard } from '../components/dashboard/Dashboard';
import { SlotWiseMarketHeatmap } from '../components/dashboard/SlotWiseMarketHeatmap';
import { DynamicSlotWiseMarketHeatmap } from '../components/dashboard/DynamicSlotWiseMarketHeatmap';
import { ProposalDashboardExport } from '../components/dashboard/ProposalDashboardExport';
import { RedesignedSavingsReport } from '../components/savings-assistant/RedesignedSavingsReport';
import EnergyInsightsExplorer from '../components/insights/EnergyInsightsExplorer';
import CommercialProposalModal from '../components/common/CommercialProposalModal';
import { numberToIndianWords } from '../utils/numberToIndianWords';
import html2canvas from 'html2canvas';

const formatIndianCurrency = (num: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

const formatIndianNumber = (num: number) => {
  if (Math.abs(num) >= 10000000) {
    return `${(num / 10000000).toFixed(2)} Cr`;
  }
  if (Math.abs(num) >= 100000) {
    return `${(num / 100000).toFixed(2)} L`;
  }
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 1,
  }).format(num);
};

export default function SavingsCalculatorNewViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Basic entry & history state
  const [entry, setEntry] = useState<SavingsCalculatorNewEntry | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Resource data for dropdowns
  const [tariffData, setTariffData] = useState<any[]>(STATE_TARIFF_MOCK_DATA);
  const [discomList, setDiscomList] = useState<any[]>(DISCOM_LIST_MOCK_DATA);

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<SavingsCalculatorNewEntry>>({});
  const [editPrefix, setEditPrefix] = useState('Mr.');
  const [editCleanName, setEditCleanName] = useState('');
  const [todConsumptions, setTodConsumptions] = useState<Record<string, any>>({});
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Accordion open states for Left Panel configuration (collapsed by default matching mockup)
  const [openSections, setOpenSections] = useState({
    profile: false,
    grid: false,
    technical: false,
    margins: false,
    tod: false,
    history: false
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Simulation & Analysis state
  const initialMonth = searchParams.get('month') || 'all';
  const [selectedSimMonth, setSelectedSimMonth] = useState<string>(initialMonth);
  const [calcVersions, setCalcVersions] = useState<number[]>([]);
  const [selectedCalcVersion, setSelectedCalcVersion] = useState<number | ''>('');
  const [cachedResults, setCachedResults] = useState<Record<string, { calc: any | null, market: MarketDecisionResult | null, insights: any | null }>>({});
  const [calculating, setCalculating] = useState(false);
  const [calculatingInsights, setCalculatingInsights] = useState(false);
  const [clientOverview, setClientOverview] = useState<ClientOverviewResult | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  // Modals & Explorer states
  const [commercialModalOpen, setCommercialModalOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [demandShiftGraphOpen, setDemandShiftGraphOpen] = useState(false);
  const [dynamicDemandShiftGraphOpen, setDynamicDemandShiftGraphOpen] = useState(false);
  const [isPrintingRedesigned, setIsPrintingRedesigned] = useState(false);

  // Toast Helper
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Initialize edit form from entry data
  const initEditForm = (data: SavingsCalculatorNewEntry) => {
    setEditForm({ ...data });

    // Parse prefix & clean name
    let prefix = 'Mr.';
    let cleanName = data.clientName || '';
    const prefixes = ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'M/s'];
    for (const p of prefixes) {
      if (cleanName.startsWith(p + ' ')) {
        prefix = p;
        cleanName = cleanName.substring(p.length + 1);
        break;
      }
    }
    setEditPrefix(prefix);
    setEditCleanName(cleanName);

    // Parse TOD consumptions
    if (data.todConsumptions) {
      const tc: Record<string, any> = {};
      Object.entries(data.todConsumptions).forEach(([k, v]) => {
        tc[k] = v;
      });
      setTodConsumptions(tc);
    } else {
      setTodConsumptions({});
    }
    setIsFormDirty(false);
  };

  // Load Entry Data & Versions & Overview
  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await fetchSavingsNewEntryById(id);
      setEntry(data);
      initEditForm(data);

      // Default to latest billing month if not explicitly set in query
      if (!searchParams.get('month') && data.todConsumptions) {
        const keys = Object.keys(data.todConsumptions).filter(m => !m.startsWith('_') && m.includes('-')).sort();
        if (keys.length > 0) {
          setSelectedSimMonth(keys[keys.length - 1]);
        }
      }

      // Load Version History
      try {
        const histData = await fetchEntryHistoryNew(id);
        setHistory(histData || []);
        const versions = (histData || []).map((h: any) => h.version).sort((a: number, b: number) => b - a);
        setCalcVersions(versions);
        if (versions.length > 0) {
          setSelectedCalcVersion(versions[0]);
        }
      } catch (err) {
        console.error('Failed to load version history:', err);
      }

      // Load Client Overview
      setOverviewLoading(true);
      fetchClientOverviewNew(id).then(res => {
        setClientOverview(res);
        setOverviewLoading(false);
      }).catch(err => {
        console.error('Failed to fetch client overview:', err);
        setOverviewLoading(false);
      });

    } catch (err: any) {
      console.error('Failed to load client entry:', err);
      showToast(err.message || 'Failed to load client details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    getResourceData('state-tariff').then(r => { if (r?.success && r.data?.length) setTariffData(r.data); });
    getResourceData('discom-list').then(r => { if (r?.success && r.data?.length) setDiscomList(r.data); });

    const onAfterPrint = () => {
      document.body.classList.remove('printing-report');
      setIsPrintingRedesigned(false);
    };
    window.addEventListener('afterprint', onAfterPrint);
    return () => {
      window.removeEventListener('afterprint', onAfterPrint);
    };
  }, [id]);

  // Execute Calculation for Active Month
  const executeCalculation = async (monthOverride?: string, forceFresh = false) => {
    if (!id) return;
    const targetMonth = monthOverride !== undefined ? monthOverride : (selectedSimMonth || 'all');
    try {
      setCalculating(true);
      const newCache = forceFresh ? {} : { ...cachedResults };

      if (!newCache[targetMonth] || forceFresh) {
        const savingsRes = await calculateSavingsNew(id, targetMonth, selectedCalcVersion || undefined);
        const marketRes = await calculateMarketDecisionNew(id, targetMonth, selectedCalcVersion || undefined);
        let insightsRes: any = null;
        try {
          insightsRes = await fetchDemandShiftInsightsNew(id, targetMonth, selectedCalcVersion || undefined);
        } catch (e) {
          console.warn('Demand shift insights not available for month:', targetMonth);
        }

        newCache[targetMonth] = {
          calc: savingsRes,
          market: marketRes,
          insights: insightsRes
        };
      }

      setCachedResults(newCache);
    } catch (err: any) {
      console.error('Calculation failed:', err);
      showToast(err.message || 'Simulation calculation failed.', 'error');
    } finally {
      setCalculating(false);
    }
  };

  // Run calculation when month or version changes
  useEffect(() => {
    if (entry && id) {
      executeCalculation(selectedSimMonth);
    }
  }, [selectedSimMonth, selectedCalcVersion, entry?.id]);

  // Month selection handler
  const handleSelectMonth = (monthKey: string) => {
    setSelectedSimMonth(monthKey);
    const nextParams = new URLSearchParams(searchParams);
    if (monthKey === 'all') {
      nextParams.delete('month');
    } else {
      nextParams.set('month', monthKey);
    }
    setSearchParams(nextParams, { replace: true });
  };

  // Handle Edit Field Change
  const handleFieldChange = (field: keyof SavingsCalculatorNewEntry, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
    setIsFormDirty(true);
  };

  // Handle TOD Slot Change
  const handleTodSlotChange = (monthKey: string, slotKey: string, value: string) => {
    setTodConsumptions(prev => ({
      ...prev,
      [monthKey]: {
        ...(prev[monthKey] || {}),
        [slotKey]: value
      }
    }));
    setIsFormDirty(true);
  };

  // Handle Custom Slot Change (for Advanced Array Slots format)
  const handleCustomSlotChange = (monthKey: string, slotIdx: number, field: string, value: any) => {
    setTodConsumptions(prev => {
      const monthData = { ...(prev[monthKey] || {}) };
      const slots = Array.isArray(monthData.slots) ? [...monthData.slots] : [];
      if (slots[slotIdx]) {
        slots[slotIdx] = { ...slots[slotIdx], [field]: value };
      }
      return {
        ...prev,
        [monthKey]: {
          ...monthData,
          slots
        }
      };
    });
    setIsFormDirty(true);
  };

  // Save Configuration & Auto-recalculate
  const handleSave = async () => {
    if (!id || !entry) return;
    if (!editCleanName.trim()) {
      showToast('Client Name is required', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        ...editForm,
        clientName: editPrefix ? `${editPrefix} ${editCleanName.trim()}` : editCleanName.trim(),
        industryName: editForm.industryName?.trim() || '',
        address: editForm.address?.trim() || '',
        sanctionedLoadKw: editForm.sanctionedLoadKw ? Number(editForm.sanctionedLoadKw) : undefined,
        proltMargin: editForm.proltMargin ? Number(editForm.proltMargin) : undefined,
        traderMargin: editForm.traderMargin ? Number(editForm.traderMargin) : undefined,
        meteringCharges: editForm.meteringCharges ? Number(editForm.meteringCharges) : undefined,
        consultancyFee: editForm.consultancyFee ? Number(editForm.consultancyFee) : undefined,
        probusPlatformFee: editForm.probusPlatformFee ? Number(editForm.probusPlatformFee) : undefined,
        billedDemandKv: editForm.billedDemandKv ? Number(editForm.billedDemandKv) : undefined,
        powerFactor: editForm.powerFactor ? Number(editForm.powerFactor) : undefined,
        arrearAmount: editForm.arrearAmount ? Number(editForm.arrearAmount) : undefined,
        currentLpsc: editForm.currentLpsc ? Number(editForm.currentLpsc) : undefined,
        todConsumptions: Object.keys(todConsumptions).length > 0 ? todConsumptions : undefined
      };

      const updated = await updateSavingsNewEntry(id, payload);
      setEntry(updated);
      initEditForm(updated);
      showToast('Configuration updated! Recalculating simulation...', 'success');

      // Refresh Overview & Version History
      fetchClientOverviewNew(id).then(res => setClientOverview(res)).catch(() => { });
      fetchEntryHistoryNew(id).then(hist => setHistory(hist || [])).catch(() => { });

      // Recalculate right-hand side simulation
      await executeCalculation(selectedSimMonth, true);
    } catch (err: any) {
      console.error('Update failed:', err);
      showToast(err.message || 'Failed to update configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete Client
  const handleDelete = async () => {
    if (!id) return;
    try {
      setDeleting(true);
      await deleteSavingsNewEntry(id);
      showToast('Client deleted successfully');
      setTimeout(() => {
        navigate('/savings-calculator-new');
      }, 800);
    } catch (err: any) {
      console.error('Delete failed:', err);
      showToast(err.message || 'Failed to delete client', 'error');
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // Active Simulation Results from Cache
  const calcResult = cachedResults[selectedSimMonth]?.calc || null;
  const marketDecisionResult = cachedResults[selectedSimMonth]?.market || null;
  const demandShiftInsights = cachedResults[selectedSimMonth]?.insights || null;

  // Available Month Keys
  const availableMonthKeys = useMemo(() => {
    const keys = Object.keys(entry?.todConsumptions || {}).filter(m => !m.startsWith('_') && m.includes('-')).sort();
    return keys;
  }, [entry?.todConsumptions]);

  // Client Initials
  const clientInitials = useMemo(() => {
    if (!entry?.clientName) return 'CL';
    const parts = entry.clientName.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.|M\/s)\s*/i, '').trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }, [entry?.clientName]);

  // Insight month states for proposals
  const { firstInsightMonthState, secondInsightMonthState } = useMemo(() => {
    let first = 'January 2026';
    let second = 'May 2026';
    if (clientOverview && clientOverview.months) {
      const monthlyData = clientOverview.months.map(m => ({
        month_name: m.month || '',
        raw_saving: Math.round(m.savings || 0)
      }));
      const sorted = [...monthlyData].sort((a, b) => b.raw_saving - a.raw_saving);
      if (sorted.length > 0) {
        first = sorted[0].month_name;
        second = sorted.length > 1 ? sorted[1].month_name : sorted[0].month_name;
      }
    }
    return { firstInsightMonthState: first, secondInsightMonthState: second };
  }, [clientOverview]);

  // Month list and cycle navigation
  const allSelectableMonths = useMemo(() => {
    return ['all', ...availableMonthKeys];
  }, [availableMonthKeys]);

  const formatMonthDisplay = (ym: string) => {
    if (!ym || ym === 'all') return 'All Months';
    const dateObj = new Date(`${ym}-01`);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    }
    return ym;
  };

  const handlePrevMonth = () => {
    const currentIndex = allSelectableMonths.indexOf(selectedSimMonth);
    if (currentIndex <= 0) {
      handleSelectMonth(allSelectableMonths[allSelectableMonths.length - 1]);
    } else {
      handleSelectMonth(allSelectableMonths[currentIndex - 1]);
    }
  };

  const handleNextMonth = () => {
    const currentIndex = allSelectableMonths.indexOf(selectedSimMonth);
    if (currentIndex === -1 || currentIndex >= allSelectableMonths.length - 1) {
      handleSelectMonth(allSelectableMonths[0]);
    } else {
      handleSelectMonth(allSelectableMonths[currentIndex + 1]);
    }
  };

  // State for active slab preset in Accordion 5
  const [activeSlabPreset, setActiveSlabPreset] = useState('Standard UP TOD');

  // Listen for print completion to clear print styles
  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove('printing-report');
      setIsPrintingRedesigned(false);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  // Export Handlers
  const handleQuickPagePrint = () => {
    const originalTitle = document.title;
    if (entry?.clientName) {
      document.title = `${entry.clientName} - Savings Analysis`;
    }
    window.print();
    document.title = originalTitle;
  };

  const handleExportPdf = async () => {
    if (!entry) return;
    const monthsToFetch = ['all', ...Object.keys(entry.todConsumptions || {}).filter(m => !m.startsWith('_') && m.includes('-'))];
    const newCache = { ...cachedResults };
    let fetchedAny = false;

    setCalculating(true);
    try {
      for (const m of monthsToFetch) {
        if (!newCache[m]) {
          const marketRes = await calculateMarketDecisionNew(entry.id, m, selectedCalcVersion || undefined);
          newCache[m] = { calc: null, market: marketRes, insights: null };
          fetchedAny = true;
        }
      }
      if (fetchedAny) setCachedResults(newCache);
    } catch (err) {
      console.error('Failed to prefetch for PDF:', err);
    } finally {
      setCalculating(false);
    }

    const originalTitle = document.title;
    if (entry.clientName) document.title = `${entry.clientName}_Savings_Analysis`;
    setIsPrintingRedesigned(true);
    document.body.classList.add('printing-report');
    setTimeout(() => {
      window.print();
      document.title = originalTitle;
    }, 1200);
  };

  const handleExportExcel = async () => {
    if (!entry) return;
    try {
      setCalculating(true);
      await exportSavingsExcelNew(entry.id, selectedSimMonth || undefined, selectedCalcVersion || undefined, entry.clientName);
      showToast('Excel report downloaded successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Excel export failed', 'error');
    } finally {
      setCalculating(false);
    }
  };

  const handleExportShiftedTod = async () => {
    if (!entry) return;
    try {
      setCalculating(true);
      await exportDemandShiftExcelNew(entry.id, selectedSimMonth || undefined, selectedCalcVersion || undefined, entry.clientName);
      showToast('Shifted TOD simulation sheet downloaded successfully!', 'success');
    } catch (err: any) {
      console.error('Failed to export shifted TOD sheet:', err);
      showToast(err.message || 'Failed to download Shifted TOD simulation sheet', 'error');
    } finally {
      setCalculating(false);
    }
  };

  const handleExportTechnicalProposal = async () => {
    if (!entry || !clientOverview) return;
    try {
      let dashboard_hero_kpis_screenshot = '';
      let dashboard_charts_screenshot = '';

      const heroKpisEl = document.getElementById('dashboard-hero-kpis-screenshot-target');
      if (heroKpisEl) {
        try {
          const canvas = await html2canvas(heroKpisEl, { scale: 2, useCORS: true, backgroundColor: '#F8FAFC' });
          dashboard_hero_kpis_screenshot = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
        } catch (e) { }
      }

      const chartsEl = document.getElementById('dashboard-screenshot-target');
      if (chartsEl) {
        try {
          const canvas = await html2canvas(chartsEl, { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' });
          dashboard_charts_screenshot = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
        } catch (e) { }
      }

      const clientData: any = {
        client_name: entry.clientName || 'Valued Client',
        industry_name: entry.industryName || 'Commercial Facility',
        address: entry.address || 'India',
        sanctioned_load: entry.sanctionedLoadKw || 1000,
        connectivity: entry.voltageLevel || '11 kV',
        discom_name: entry.discom || 'PVVNL',
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
        months_covered: clientOverview.monthsCovered || 1,
        total_baseline_cost: clientOverview.totalBaselineCost || 0,
        total_optimized_cost: clientOverview.totalOptimizedCost || 0,
        total_savings: clientOverview.totalSavings || 0,
        savings_percentage: clientOverview.savingsPercentage || 0,
        effective_saving_rate: clientOverview.effectiveSavingRate || 0,
        dashboard_hero_kpis_screenshot,
        dashboard_charts_screenshot,
        months: (clientOverview.months || []).map(m => ({
          month_name: m.month,
          baseline_cost: m.baselineCost,
          optimized_cost: m.optimizedCost,
          savings: m.savings,
          savings_percent: m.savingsPercent,
          oa_coverage: m.oaCoverage || 0
        }))
      };

      await exportTechnicalProposalWord(clientData);
      showToast('Technical proposal Word document generated successfully!');
    } catch (err: any) {
      console.error('Technical proposal export failed:', err);
      showToast(err.message || 'Technical proposal export failed', 'error');
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-600 rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500 tracking-tight">Loading client portfolio workspace...</p>
      </div>
    );
  }

  // Not found
  if (!entry) {
    return (
      <div className="w-full max-w-4xl mx-auto py-16 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Client Record Not Found</h2>
        <p className="text-xs text-slate-400 mt-1 mb-6">The requested client may have been removed or migrated.</p>
        <button
          onClick={() => navigate('/savings-calculator-new')}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-violet-600 text-white hover:bg-violet-700 cursor-pointer"
        >
          Return to Savings Calculator
        </button>
      </div>
    );
  }

  return (
    <div className="w-full px-2 sm:px-4 lg:px-6 py-2.5 font-sans select-none pb-16">

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-medium backdrop-blur-md animate-fade-in-up border ${toastMessage.type === 'success'
          ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/30'
          : 'bg-rose-950/90 text-rose-200 border-rose-500/30'
          }`}>
          {toastMessage.type === 'success' ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Split Layout: Left Command Sidebar (Sticky) + Right Analysis Studio */}
      <div className="flex flex-col lg:flex-row gap-5 w-full items-start">

        {/* ======================================================================= */}
        {/* LEFT COLUMN: CLIENT COMMAND PANEL (Fixed width on desktop, Sticky)      */}
        {/* ======================================================================= */}
        <div className="w-full lg:w-[380px] xl:w-[390px] 2xl:w-[410px] shrink-0 lg:sticky lg:top-2 lg:self-start lg:z-20">
          <div className="flex flex-col h-auto lg:h-[calc(100vh-130px)] rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0B0F19] shadow-sm overflow-hidden">

            {/* Top Fixed Area: Back Button + Client Profile Header */}
            <header className="border-b border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0B0F19] px-4 py-3 shrink-0 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/savings-calculator-new')}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 transition-colors py-1 px-1.5 -ml-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer tracking-tight"
                  aria-label="Back to all clients"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to All Clients</span>
                </button>

                {isFormDirty && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 animate-pulse">
                    Unsaved
                  </span>
                )}
              </div>

              <div className="flex items-start gap-3">
                <div className="grid w-10 h-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] text-xs font-bold text-white shadow-sm shadow-violet-500/25">
                  {clientInitials}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-semibold tracking-[-0.015em] leading-snug text-slate-900 dark:text-white" title={entry.clientName}>
                    {entry.clientName}
                  </h2>
                  <p className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 tracking-tight">
                    {entry.industryName || 'Commercial Facility'}
                  </p>

                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] font-medium">
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 px-1.5 py-0.5 text-slate-700 dark:text-slate-300">
                      <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                      <span>{entry.stateCode || 'UP'} / {entry.discom || 'PVVNL'}</span>
                    </span>
                    <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-amber-700 dark:text-amber-400 font-bold">
                      <Zap className="w-2.5 h-2.5 shrink-0" />
                      <span>{entry.sanctionedLoadKw ? `${Number(entry.sanctionedLoadKw).toLocaleString('en-IN')} kW` : '810 kW'}</span>
                    </span>
                    <span className="inline-flex items-center rounded-md bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 text-violet-700 dark:text-violet-300 font-medium">
                      <span>{entry.voltageLevel || '11 kV'}</span>
                    </span>
                  </div>
                </div>
              </div>
            </header>

            {/* Scrollable Middle Area: Sleek Unified Sections */}
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3.5 bg-slate-50/60 dark:bg-[#070A12] [scrollbar-width:thin] scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">

              {/* SECTION 1: SELECT BILLING MONTH */}
              <section className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 p-3 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                    <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-[-0.01em]">
                      Select Billing Month
                    </h3>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 tabular-nums">
                    {availableMonthKeys.length} Months
                  </span>
                </div>

                {/* Integrated Single-Row Month Switcher */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    disabled={availableMonthKeys.length > 0 && selectedSimMonth === availableMonthKeys[0]}
                    className="w-8 h-9 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                    title="Previous month"
                    aria-label="Previous billing month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="relative flex-1 min-w-0">
                    <select
                      id="billing-month"
                      value={selectedSimMonth}
                      onChange={(e) => handleSelectMonth(e.target.value)}
                      className="w-full h-9 pl-3 pr-8 rounded-lg appearance-none border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 cursor-pointer tracking-tight"
                    >
                      <option value="all">All Months (Overall Overview)</option>
                      {availableMonthKeys.map((ym) => (
                        <option key={ym} value={ym}>
                          {formatMonthDisplay(ym)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                  </div>

                  <button
                    type="button"
                    onClick={handleNextMonth}
                    disabled={availableMonthKeys.length > 0 && selectedSimMonth === availableMonthKeys[availableMonthKeys.length - 1]}
                    className="w-8 h-9 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                    title="Next month"
                    aria-label="Next billing month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </section>

              {/* SECTION 2: SIMULATION CONTROLS */}
              <section className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 p-3 shadow-2xs space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                  <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-[-0.01em]">
                    Simulation Controls
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1 min-w-0">
                    <select
                      value={selectedCalcVersion}
                      onChange={(e) => setSelectedCalcVersion(e.target.value ? Number(e.target.value) : '')}
                      className="w-full h-8.5 pl-2.5 pr-7 rounded-lg appearance-none border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:border-violet-500 cursor-pointer"
                    >
                      {calcVersions.length > 0 ? (
                        calcVersions.map((v, i) => (
                          <option key={v} value={v}>
                            Ver: v{v} {i === 0 ? '(Latest)' : ''}
                          </option>
                        ))
                      ) : (
                        <option value="">Default (v1)</option>
                      )}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
                  </div>

                  <button
                    type="button"
                    onClick={() => executeCalculation(selectedSimMonth, true)}
                    disabled={calculating}
                    className="h-8.5 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-white/5 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-violet-600 dark:text-violet-400 ${calculating ? 'animate-spin' : ''}`} />
                    <span>Recalculate</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setInsightsOpen(true)}
                  className="w-full h-8.5 rounded-lg border border-teal-200/80 dark:border-teal-900/40 bg-teal-50/50 hover:bg-teal-50 dark:bg-teal-950/20 dark:hover:bg-teal-950/40 text-teal-700 dark:text-teal-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span className="truncate">Explore Demand Shift &amp; Energy Insights</span>
                </button>
              </section>

              {/* SECTION 3: REPORTS & PROPOSALS */}
              <section className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 p-3 shadow-2xs space-y-2">
                <div className="flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                  <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-[-0.01em]">
                    Reports &amp; Proposals
                  </h3>
                </div>

                <div className="flex flex-col gap-1.5">
                  {/* 1. Export as PDF */}
                  <button
                    type="button"
                    onClick={handleQuickPagePrint}
                    className="h-8.5 px-3 rounded-lg border border-slate-200/90 dark:border-white/10 bg-slate-50/70 hover:bg-slate-100/80 dark:bg-white/[0.03] dark:hover:bg-white/[0.07] text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">Export as PDF</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">.pdf</span>
                  </button>

                  {/* 2. Calculation Sheet (Original TOD) */}
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="h-8.5 px-3 rounded-lg border border-slate-200/90 dark:border-white/10 bg-slate-50/70 hover:bg-slate-100/80 dark:bg-white/[0.03] dark:hover:bg-white/[0.07] text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate">Calculation Sheet (Original TOD)</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">.xlsx</span>
                  </button>

                  {/* 3. Calculation Sheet (SHIFTED TOD) */}
                  <button
                    type="button"
                    onClick={handleExportShiftedTod}
                    className="h-8.5 px-3 rounded-lg border border-slate-200/90 dark:border-white/10 bg-slate-50/70 hover:bg-slate-100/80 dark:bg-white/[0.03] dark:hover:bg-white/[0.07] text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Download className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                      <span className="truncate">Calculation Sheet (SHIFTED TOD)</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">.xlsx</span>
                  </button>

                  {/* 4. Technical Proposal NEW */}
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    className="h-8.5 px-3 rounded-lg border border-slate-200/90 dark:border-white/10 bg-slate-50/70 hover:bg-slate-100/80 dark:bg-white/[0.03] dark:hover:bg-white/[0.07] text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <FileText className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300 shrink-0" />
                      <span className="truncate">Technical Proposal</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/70 dark:border-rose-900/40 shrink-0">
                      NEW
                    </span>
                  </button>

                  {/* 5. Technical Proposal LATEST */}
                  <button
                    type="button"
                    onClick={handleExportTechnicalProposal}
                    className="h-8.5 px-3 rounded-lg border border-slate-200/90 dark:border-white/10 bg-slate-50/70 hover:bg-slate-100/80 dark:bg-white/[0.03] dark:hover:bg-white/[0.07] text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <FileText className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300 shrink-0" />
                      <span className="truncate">Technical Proposal</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/70 dark:border-blue-900/40 shrink-0">
                      LATEST
                    </span>
                  </button>

                  {/* 6. Commercial Proposal */}
                  <button
                    type="button"
                    onClick={() => setCommercialModalOpen(true)}
                    className="h-8.5 px-3 rounded-lg border border-slate-200/90 dark:border-white/10 bg-slate-50/70 hover:bg-slate-100/80 dark:bg-white/[0.03] dark:hover:bg-white/[0.07] text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="truncate">Commercial Proposal</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">.docx</span>
                  </button>
                </div>
              </section>

              {/* SECTION 4: CLIENT CONFIGURATION SPECS ACCORDION */}
              <section className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 p-3 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                    <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-[-0.01em]">
                      Configuration Specs
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">5 Sections</span>
                </div>

                {/* 5 Stacked Accordion Panels (Collapsed by default) */}
                <div className="space-y-1.5">

                  {/* Accordion 1: Client & Plant Profile */}
                  <div className="overflow-hidden rounded-lg border border-slate-200/70 dark:border-white/5 bg-slate-50/40 dark:bg-slate-900/60">
                    <button
                      type="button"
                      onClick={() => toggleSection('profile')}
                      aria-expanded={openSections.profile}
                      className={`h-9 w-full flex items-center justify-between px-2.5 text-left text-xs font-bold cursor-pointer transition-colors ${openSections.profile ? 'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-white/[0.03]'}`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 shrink-0 text-violet-600 dark:text-violet-400" />
                        <span className="truncate">1. Client &amp; Plant Profile</span>
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200 ease-out ${openSections.profile ? 'rotate-180' : ''}`} />
                    </button>

                    {openSections.profile && (
                      <div className="flex flex-col gap-2 border-t border-slate-200/70 dark:border-white/5 p-2.5 bg-white dark:bg-[#0B0F19]">
                        <div className="flex gap-1.5">
                          <div className="w-20 shrink-0">
                            <label className="block min-w-0">
                              <span className="mb-1 block text-[10px] font-semibold text-slate-500 dark:text-slate-400">Prefix</span>
                              <div className="relative">
                                <select
                                  value={editPrefix}
                                  onChange={(e) => {
                                    setEditPrefix(e.target.value);
                                    setIsFormDirty(true);
                                  }}
                                  className="h-8.5 w-full appearance-none rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-2 pr-6 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                                >
                                  <option value="Mr.">Mr.</option>
                                  <option value="Ms.">Ms.</option>
                                  <option value="Mrs.">Mrs.</option>
                                  <option value="Dr.">Dr.</option>
                                  <option value="M/s">M/s</option>
                                </select>
                                <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" />
                              </div>
                            </label>
                          </div>
                          <div className="min-w-0 flex-1">
                            <label className="block min-w-0">
                              <span className="mb-1 block text-[10px] font-semibold text-slate-500 dark:text-slate-400">Client Name *</span>
                              <input
                                type="text"
                                value={editCleanName}
                                onChange={(e) => {
                                  setEditCleanName(e.target.value);
                                  setIsFormDirty(true);
                                }}
                                placeholder="Contact name"
                                className="h-8.5 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                              />
                            </label>
                          </div>
                        </div>

                        <label className="block min-w-0">
                          <span className="mb-1 block text-[10px] font-semibold text-slate-500 dark:text-slate-400">Facility / Industry</span>
                          <input
                            type="text"
                            value={editForm.industryName || ''}
                            onChange={(e) => handleFieldChange('industryName', e.target.value)}
                            placeholder="e.g. Unit 2 Plant"
                            className="h-8.5 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                          />
                        </label>

                        <label className="block min-w-0">
                          <span className="mb-1 block text-[10px] font-semibold text-slate-500 dark:text-slate-400">Plant Address</span>
                          <input
                            type="text"
                            value={editForm.address || ''}
                            onChange={(e) => handleFieldChange('address', e.target.value)}
                            placeholder="Plot / Site location"
                            className="h-8.5 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Accordion 2: Grid & DISCOM Parameters */}
                  <div className="overflow-hidden rounded-lg border border-slate-200/70 dark:border-white/5 bg-slate-50/40 dark:bg-slate-900/60">
                    <button
                      type="button"
                      onClick={() => toggleSection('grid')}
                      aria-expanded={openSections.grid}
                      className={`h-9 w-full flex items-center justify-between px-2.5 text-left text-xs font-bold cursor-pointer transition-colors ${openSections.grid ? 'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-white/[0.03]'}`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Zap className="w-3.5 h-3.5 shrink-0 text-violet-600 dark:text-violet-400" />
                        <span className="truncate">2. Grid &amp; DISCOM Parameters</span>
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200 ease-out ${openSections.grid ? 'rotate-180' : ''}`} />
                    </button>

                    {openSections.grid && (
                      <div className="flex flex-col gap-2 border-t border-slate-200/70 dark:border-white/5 p-2.5 bg-white dark:bg-[#0B0F19]">
                        <div className="grid grid-cols-2 gap-2">
                          <label className="block min-w-0">
                            <span className="mb-1 block text-[10px] font-semibold text-slate-500 dark:text-slate-400">State Code</span>
                            <input
                              type="text"
                              value={editForm.stateCode || ''}
                              onChange={(e) => handleFieldChange('stateCode', e.target.value)}
                              placeholder="e.g. UP"
                              className="h-8.5 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                            />
                          </label>
                          <label className="block min-w-0">
                            <span className="mb-1 block text-[10px] font-semibold text-slate-500 dark:text-slate-400">DISCOM</span>
                            <input
                              type="text"
                              value={editForm.discom || ''}
                              onChange={(e) => handleFieldChange('discom', e.target.value)}
                              placeholder="e.g. PVVNL"
                              className="h-8.5 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                            />
                          </label>
                        </div>

                        <label className="block min-w-0">
                          <span className="mb-1 block text-[10px] font-semibold text-slate-500 dark:text-slate-400">Consumer Category</span>
                          <input
                            type="text"
                            value={editForm.consumerCategory || ''}
                            onChange={(e) => handleFieldChange('consumerCategory', e.target.value)}
                            placeholder="e.g. HV-2"
                            className="h-8.5 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                          />
                        </label>

                        <label className="block min-w-0">
                          <span className="mb-1 block text-[10px] font-semibold text-slate-500 dark:text-slate-400">Voltage Level</span>
                          <input
                            type="text"
                            value={editForm.voltageLevel || ''}
                            onChange={(e) => handleFieldChange('voltageLevel', e.target.value)}
                            placeholder="e.g. 11kV"
                            className="h-8.5 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Accordion 3: Technical Specs & PF */}
                  <div className="overflow-hidden rounded-lg border border-slate-200/70 dark:border-white/5 bg-slate-50/40 dark:bg-slate-900/60">
                    <button
                      type="button"
                      onClick={() => toggleSection('technical')}
                      aria-expanded={openSections.technical}
                      className={`h-9 w-full flex items-center justify-between px-2.5 text-left text-xs font-bold cursor-pointer transition-colors ${openSections.technical ? 'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-white/[0.03]'}`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Bolt className="w-3.5 h-3.5 shrink-0 text-violet-600 dark:text-violet-400" />
                        <span className="truncate">3. Technical Specs &amp; PF</span>
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200 ease-out ${openSections.technical ? 'rotate-180' : ''}`} />
                    </button>

                    {openSections.technical && (
                      <div className="flex flex-col gap-2 border-t border-slate-200/70 dark:border-white/5 p-2.5 bg-white dark:bg-[#0B0F19]">
                        <div className="grid grid-cols-2 gap-2">
                          <label className="block min-w-0">
                            <span className="mb-1 block text-[10px] font-semibold text-slate-500 dark:text-slate-400">Sanctioned (kW) *</span>
                            <input
                              type="number"
                              value={editForm.sanctionedLoadKw !== undefined ? editForm.sanctionedLoadKw : ''}
                              onChange={(e) => handleFieldChange('sanctionedLoadKw', e.target.value)}
                              placeholder="e.g. 810"
                              className="h-8.5 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                            />
                          </label>
                          <label className="block min-w-0">
                            <span className="mb-1 block text-[10px] font-semibold text-slate-500 dark:text-slate-400">Billed Demand (kV)</span>
                            <input
                              type="number"
                              value={editForm.billedDemandKv !== undefined ? editForm.billedDemandKv : ''}
                              onChange={(e) => handleFieldChange('billedDemandKv', e.target.value)}
                              placeholder="e.g. 700"
                              className="h-8.5 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                            />
                          </label>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <label className="block min-w-0">
                            <span className="mb-1 block text-[10px] font-semibold text-slate-500 dark:text-slate-400">Power Factor</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0.80"
                              max="1.00"
                              value={editForm.powerFactor !== undefined ? editForm.powerFactor : ''}
                              onChange={(e) => handleFieldChange('powerFactor', e.target.value)}
                              placeholder="0.98"
                              className="h-8.5 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                            />
                          </label>
                          <label className="block min-w-0">
                            <span className="mb-1 block text-[10px] font-semibold text-slate-500 dark:text-slate-400">Electricity Duty</span>
                            <div className="relative">
                              <select
                                value={editForm.applyElectricityDuty ? 'Chargeable' : 'Exempted'}
                                onChange={(e) => handleFieldChange('applyElectricityDuty', e.target.value === 'Chargeable')}
                                className="h-8.5 w-full appearance-none rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-2 pr-6 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                              >
                                <option value="Chargeable">Chargeable</option>
                                <option value="Exempted">Exempted</option>
                              </select>
                              <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" />
                            </div>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Accordion 4: Commercial Margins & Fees */}
                  <div className="overflow-hidden rounded-lg border border-slate-200/70 dark:border-white/5 bg-slate-50/40 dark:bg-slate-900/60">
                    <button
                      type="button"
                      onClick={() => toggleSection('margins')}
                      aria-expanded={openSections.margins}
                      className={`h-9 w-full flex items-center justify-between px-2.5 text-left text-xs font-bold cursor-pointer transition-colors ${openSections.margins ? 'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-white/[0.03]'}`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <BarChart3 className="w-3.5 h-3.5 shrink-0 text-violet-600 dark:text-violet-400" />
                        <span className="truncate">4. Commercial Margins &amp; Fees</span>
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200 ease-out ${openSections.margins ? 'rotate-180' : ''}`} />
                    </button>

                    {openSections.margins && (
                      <div className="flex flex-col gap-2 border-t border-slate-200/70 dark:border-white/5 p-2.5 bg-white dark:bg-[#0B0F19]">
                        <div className="grid grid-cols-2 gap-2">
                          <label className="block min-w-0">
                            <span className="mb-1 block text-[10px] font-semibold text-slate-500 dark:text-slate-400">PROLT Margin (%)</span>
                            <input
                              type="number"
                              value={editForm.proltMargin !== undefined ? editForm.proltMargin : ''}
                              onChange={(e) => handleFieldChange('proltMargin', e.target.value)}
                              placeholder="15"
                              className="h-8.5 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                            />
                          </label>
                          <label className="block min-w-0">
                            <span className="mb-1 block text-[10px] font-semibold text-slate-500 dark:text-slate-400">Trader Margin (₹/kWh)</span>
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.traderMargin !== undefined ? editForm.traderMargin : ''}
                              onChange={(e) => handleFieldChange('traderMargin', e.target.value)}
                              placeholder="0.02"
                              className="h-8.5 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                            />
                          </label>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                          <label className="block min-w-0">
                            <span className="mb-1 block text-[9px] font-semibold text-slate-500 dark:text-slate-400 truncate">Metering</span>
                            <input
                              type="number"
                              value={editForm.meteringCharges !== undefined ? editForm.meteringCharges : ''}
                              onChange={(e) => handleFieldChange('meteringCharges', e.target.value)}
                              placeholder="0"
                              className="h-8 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-1.5 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                            />
                          </label>
                          <label className="block min-w-0">
                            <span className="mb-1 block text-[9px] font-semibold text-slate-500 dark:text-slate-400 truncate">Consultancy</span>
                            <input
                              type="number"
                              value={editForm.consultancyFee !== undefined ? editForm.consultancyFee : ''}
                              onChange={(e) => handleFieldChange('consultancyFee', e.target.value)}
                              placeholder="0"
                              className="h-8 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-1.5 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                            />
                          </label>
                          <label className="block min-w-0">
                            <span className="mb-1 block text-[9px] font-semibold text-slate-500 dark:text-slate-400 truncate">Platform</span>
                            <input
                              type="number"
                              value={editForm.probusPlatformFee !== undefined ? editForm.probusPlatformFee : ''}
                              onChange={(e) => handleFieldChange('probusPlatformFee', e.target.value)}
                              placeholder="0"
                              className="h-8 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-1.5 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Accordion 5: TOD Slabs */}
                  <div className="overflow-hidden rounded-lg border border-slate-200/70 dark:border-white/5 bg-slate-50/40 dark:bg-slate-900/60">
                    <button
                      type="button"
                      onClick={() => toggleSection('tod')}
                      aria-expanded={openSections.tod}
                      className={`h-9 w-full flex items-center justify-between px-2.5 text-left text-xs font-bold cursor-pointer transition-colors ${openSections.tod ? 'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-white/[0.03]'}`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 shrink-0 text-violet-600 dark:text-violet-400" />
                        <span className="truncate">5. TOD Slabs</span>
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200 ease-out ${openSections.tod ? 'rotate-180' : ''}`} />
                    </button>

                    {openSections.tod && (
                      <div className="flex flex-col gap-2 border-t border-slate-200/70 dark:border-white/5 p-2.5 bg-white dark:bg-[#0B0F19]">
                        <label className="block min-w-0">
                          <span className="mb-1 block text-[10px] font-semibold text-slate-500 dark:text-slate-400">Preset</span>
                          <div className="relative">
                            <select
                              value={activeSlabPreset}
                              onChange={(e) => setActiveSlabPreset(e.target.value)}
                              className="h-8.5 w-full appearance-none rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-2 pr-6 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                            >
                              <option value="Standard UP TOD">Standard UP TOD</option>
                              <option value="Seasonal Tariff TOD">Seasonal Tariff TOD</option>
                              <option value="Custom TOD">Custom TOD</option>
                            </select>
                            <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" />
                          </div>
                        </label>

                        {/* Render slabs for selected month (or all if 'all') */}
                        {Object.entries(todConsumptions)
                          .filter(([mKey]) => !mKey.startsWith('_') && mKey.includes('-'))
                          .filter(([mKey]) => selectedSimMonth === 'all' || mKey === selectedSimMonth)
                          .map(([mKey, monthData]) => {
                            const isArraySlots = Array.isArray(monthData?.slots);
                            return (
                              <div key={mKey} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200/70 dark:border-white/10 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400">
                                    Month: {mKey}
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-semibold">
                                    {isArraySlots ? `${monthData.slots.length} Custom Slots` : `Unit: ${String((monthData as any)['Billing Unit'] || 'kVAh')}`}
                                  </span>
                                </div>

                                {isArraySlots ? (
                                  <div className="space-y-1.5">
                                    {monthData.slots.map((slot: CustomTodSlot, sIdx: number) => (
                                      <div key={slot.id || sIdx} className="grid grid-cols-2 gap-1.5 p-1.5 rounded bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-white/5">
                                        <div className="col-span-2 flex items-center justify-between text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                          <span>{slot.name || `Slot ${sIdx + 1}`} ({slot.startTime || '00:00'} - {slot.endTime || '24:00'})</span>
                                        </div>
                                        <div>
                                          <label className="text-[9px] text-slate-400 block mb-0.5">Energy (kWh)</label>
                                          <input
                                            type="number"
                                            value={slot.consumptionKwh !== undefined ? slot.consumptionKwh : ''}
                                            onChange={(e) => handleCustomSlotChange(mKey, sIdx, 'consumptionKwh', e.target.value)}
                                            className="h-7 w-full rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-1.5 text-xs text-slate-900 dark:text-white"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-[9px] text-slate-400 block mb-0.5">Tariff (₹/kWh)</label>
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={slot.effectivePrice !== undefined ? slot.effectivePrice : ''}
                                            onChange={(e) => handleCustomSlotChange(mKey, sIdx, 'effectivePrice', e.target.value)}
                                            className="h-7 w-full rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-1.5 text-xs text-slate-900 dark:text-white"
                                          />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {Object.entries(monthData as Record<string, string>)
                                      .filter(([k]) => !['Start Date', 'End Date', 'Electricity Duty', 'Billing Unit', 'Season', 'Billing Month', '_rawKvah', 'slots'].includes(k))
                                      .map(([slabKey, slabVal]) => (
                                        <div key={slabKey}>
                                          <label className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 block truncate mb-0.5">
                                            {slabKey}
                                          </label>
                                          <input
                                            type="number"
                                            value={slabVal || ''}
                                            onChange={(e) => handleTodSlotChange(mKey, slabKey, e.target.value)}
                                            className="h-8 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                                          />
                                        </div>
                                      ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="h-8 w-full flex items-center justify-center gap-1.5 rounded-lg border border-rose-200/60 dark:border-rose-900/30 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer transition-colors mt-1"
                >
                  <Trash2 className="w-3 h-3 text-rose-500 shrink-0" />
                  <span>Delete Client Record</span>
                </button>
              </section>
            </div>

            {/* Sticky Bottom Footer: Save Configuration Action */}
            <footer className="border-t border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0B0F19] px-4 py-2.5 shrink-0 shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className={`h-10 w-full rounded-xl text-white font-semibold text-xs sm:text-sm tracking-[-0.01em] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50 ${isFormDirty ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-violet-600/30' : 'bg-[#7C3AED] hover:bg-[#6D28D9] shadow-violet-600/20'}`}
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin shrink-0" />
                ) : (
                  <Save className="w-4 h-4 shrink-0" />
                )}
                <span>{saving ? 'Saving...' : isFormDirty ? 'Save Configuration Changes' : 'Save Configuration'}</span>
              </button>
            </footer>

          </div>
        </div>

        {/* ======================================================================= */}
        {/* RIGHT COLUMN: LIVE ANALYSIS STUDIO & VISUAL DASHBOARD                   */}
        {/* ======================================================================= */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* SIMULATION HEADER & STATUS TOOLBAR */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#0B0F19] border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                  {selectedSimMonth === 'all' ? 'All Months Simulation' : `${formatMonthDisplay(selectedSimMonth)} Simulation`}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {selectedSimMonth === 'all'
                  ? 'Annual Open Access Landed Cost & Savings Analysis'
                  : `Monthly Energy Sourcing & Surcharge Arbitrage (${formatMonthDisplay(selectedSimMonth)})`}
              </h2>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* LIVE KPI METRICS SUMMARY MATRIX                                       */}
          {/* --------------------------------------------------------------------- */}
          {(calcResult || marketDecisionResult) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-white/90 dark:bg-[#0B0F19]/90 backdrop-blur-md border border-slate-200/80 dark:border-white/10 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Baseline DISCOM Cost
                </span>
                <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {formatIndianCurrency(Math.round((calcResult?.totalBaselineCost ?? marketDecisionResult?.totalBaselineCost) || 0))}
                </div>
                <span className="text-[11px] text-slate-500 font-medium">Standard Utility Rate</span>
              </div>

              <div className="p-4 rounded-xl bg-white/90 dark:bg-[#0B0F19]/90 backdrop-blur-md border border-slate-200/80 dark:border-white/10 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Optimized Open Access
                </span>
                <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {formatIndianCurrency(Math.round((calcResult?.totalOptimizedCost ?? marketDecisionResult?.totalOptimizedCost) || 0))}
                </div>
                <span className="text-[11px] text-violet-600 dark:text-violet-400 font-medium">IEX Market Landing</span>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:bg-[#0B0F19]/90 backdrop-blur-md border border-emerald-500/30 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                  Net Realized Savings
                </span>
                <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatIndianCurrency(Math.round((calcResult?.totalSavings ?? marketDecisionResult?.totalSavings) || 0))}
                </div>
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  {((calcResult?.totalBaselineCost ?? marketDecisionResult?.totalBaselineCost) || 0) > 0
                    ? `+${((((calcResult?.totalSavings ?? marketDecisionResult?.totalSavings) || 0) / ((calcResult?.totalBaselineCost ?? marketDecisionResult?.totalBaselineCost) || 1)) * 100).toFixed(1)}% Cost Reduction`
                    : 'Optimal Arbitrage'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white/90 dark:bg-[#0B0F19]/90 backdrop-blur-md border border-slate-200/80 dark:border-white/10 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Effective Savings Rate
                </span>
                <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  ₹{((calcResult?.totalEnergyKwh ?? marketDecisionResult?.totalEnergyKwh) || 0) > 0 ? (((calcResult?.totalSavings ?? marketDecisionResult?.totalSavings) || 0) / ((calcResult?.totalEnergyKwh ?? marketDecisionResult?.totalEnergyKwh) || 1)).toFixed(2) : '0.00'}
                  <span className="text-xs font-normal text-slate-400">/kWh</span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">Per Unit Economy</span>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* LOADING & CALCULATING INDICATOR                                       */}
          {/* --------------------------------------------------------------------- */}
          {calculating && (
            <div className="p-8 rounded-2xl bg-white/80 dark:bg-[#0B0F19]/80 border border-slate-200/80 dark:border-white/10 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-violet-500/20 border-t-violet-600 rounded-full animate-spin" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Running 15-minute slot simulations across DAM, RTM, GDAM, and DISCOM tariffs...
              </p>
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* INTERACTIVE DASHBOARD COMPONENT                                       */}
          {/* --------------------------------------------------------------------- */}
          {!calculating && (calcResult || marketDecisionResult) && (
            <div id="dashboard-screenshot-target" className="space-y-5">
              <div className="rounded-2xl overflow-hidden bg-white/95 dark:bg-[#0B0F19]/95 border border-slate-200/80 dark:border-white/10 p-2 sm:p-4 shadow-sm">
                <Dashboard
                  calcResult={calcResult || marketDecisionResult}
                  calcEntry={entry}
                  clientName={entry.clientName}
                  clientOverview={clientOverview}
                  marketDecisionResult={marketDecisionResult}
                  demandShiftInsights={demandShiftInsights}
                  selectedMonth={selectedSimMonth}
                />
              </div>

              {/* Slot-Wise Simulation Heatmaps (when a specific month is selected) */}
              {selectedSimMonth !== 'all' && marketDecisionResult && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-white/95 dark:bg-[#0B0F19]/95 border border-slate-200/80 dark:border-white/10 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                      Slot-Wise Market Simulation Heatmap ({selectedSimMonth})
                    </h4>
                    <SlotWiseMarketHeatmap slotsData={marketDecisionResult.slotsData} />
                  </div>

                  <div className="p-4 rounded-2xl bg-white/95 dark:bg-[#0B0F19]/95 border border-slate-200/80 dark:border-white/10 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                      Dynamic Slot-Wise Arbitrage Distribution ({selectedSimMonth})
                    </h4>
                    <DynamicSlotWiseMarketHeatmap slotsData={marketDecisionResult.slotsData} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty / Initial State */}
          {!calculating && !calcResult && !marketDecisionResult && (
            <div className="py-16 text-center p-8 rounded-2xl bg-white/80 dark:bg-[#0B0F19]/80 border border-slate-200/80 dark:border-white/10">
              <BarChart3 className="w-10 h-10 text-violet-500/40 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Ready to analyze Open Access Savings
              </p>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Select a month from the left panel or click Recalculate to generate the 15-minute slot arbitrage.
              </p>
              <button
                type="button"
                onClick={() => executeCalculation(selectedSimMonth, true)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 shadow-md shadow-violet-600/20 cursor-pointer"
              >
                Launch Simulation
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* HIDDEN PROPOSAL EXPORT TARGETS (FOR GENERATING WORD & PDF SNAPSHOTS)      */}
      {/* ========================================================================= */}
      <div id="proposal-export-target" style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '1200px' }}>
        <ProposalDashboardExport
          clientOverview={clientOverview}
          marketDecisionResult={marketDecisionResult}
          demandShiftInsights={demandShiftInsights}
          selectedMonth={selectedSimMonth}
        />
      </div>

      <div id="proposal-export-target-1" style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '1200px' }}>
        <ProposalDashboardExport
          clientOverview={clientOverview}
          marketDecisionResult={marketDecisionResult}
          demandShiftInsights={demandShiftInsights}
          selectedMonth={firstInsightMonthState}
        />
      </div>

      <div id="proposal-export-target-2" style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '1200px' }}>
        <ProposalDashboardExport
          clientOverview={clientOverview}
          marketDecisionResult={marketDecisionResult}
          demandShiftInsights={demandShiftInsights}
          selectedMonth={secondInsightMonthState}
        />
      </div>

      {/* Hidden PDF Report component (rendered for printing via Portal) */}
      {isPrintingRedesigned && entry && Object.keys(cachedResults).length > 0 && createPortal(
        <Box className="print-container">
          <RedesignedSavingsReport
            calcEntry={entry}
            allResults={Object.keys(cachedResults)
              .sort((a, b) => {
                if (a === 'all') return -1;
                if (b === 'all') return 1;
                return a.localeCompare(b);
              })
              .map(key => ({ month: key, marketDecisionResult: cachedResults[key].market }))
              .filter(res => res.marketDecisionResult !== null)
            }
          />
        </Box>,
        document.body
      )}

      {/* Commercial Proposal Custom Modal */}
      <CommercialProposalModal
        open={commercialModalOpen}
        onClose={() => setCommercialModalOpen(false)}
        initialData={{
          client_name: entry?.clientName,
          industry_name: entry?.industryName,
          sanctioned_load: entry?.sanctionedLoadKw,
          connectivity: entry?.voltageLevel,
          discom_name: entry?.discom,
          traderMargin: entry?.traderMargin,
          probusPlatformFee: entry?.probusPlatformFee,
          proltMargin: entry?.proltMargin
        }}
      />

      {/* Energy Insights Explorer Modal */}
      {entry && (
        <Dialog
          open={insightsOpen}
          onClose={() => setInsightsOpen(false)}
          maxWidth="xl"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              bgcolor: (theme) => theme.palette.mode === 'dark' ? '#0B0F19' : '#FFFFFF',
              maxHeight: '92vh'
            }
          }}
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Lightbulb className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Demand Shift &amp; Energy Procurement Insights: {entry.clientName}
              </Typography>
            </Box>
            <MuiIconButton onClick={() => setInsightsOpen(false)} size="small">
              <span className="text-xl leading-none">&times;</span>
            </MuiIconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 2, pt: 3 }}>
            <EnergyInsightsExplorer
              entry={entry}
              onBack={() => setInsightsOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delete Client Portfolio</h3>
                <p className="text-xs text-slate-400 mt-0.5">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-white/5">
              Are you sure you want to delete <strong className="text-slate-900 dark:text-white">{entry.clientName}</strong>? All multi-month TOD records, pricing logs, and simulated versions will be permanently removed.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 h-9 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 h-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white shadow-sm shadow-rose-600/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {deleting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{deleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
