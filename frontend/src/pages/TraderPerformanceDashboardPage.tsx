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
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  Snackbar,
  Alert,
  Chip as MuiChip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer as MuiTableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent
} from '@mui/material';
import {
  fetchTraderPerformanceEntryById,
  updateTraderPerformanceEntry,
  deleteTraderPerformanceEntry,
  fetchEntryHistoryTraderPerformance,
  calculateTraderPerformance,
  calculateMarketDecisionTraderPerformance,
  fetchDemandShiftInsightsTraderPerformance,
  fetchClientOverviewTraderPerformance,
  exportTraderPerformanceExcel,
  exportTraderPerformanceActualTraderExcel,
  exportDemandShiftExcelTraderPerformance,
  TraderPerformanceEntry,
  CalculationResult,
  MarketDecisionResult
} from '../api/traderPerformance.api';
import {
  exportTechnicalProposalWord,
  exportCommercialProposalWord,
  ClientOverviewResult
} from '../api/savingsCalculator.api';
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

export default function TraderPerformanceDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Basic entry & history state
  const [entry, setEntry] = useState<TraderPerformanceEntry | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<TraderPerformanceEntry>>({});
  const [editPrefix, setEditPrefix] = useState('Mr.');
  const [editCleanName, setEditCleanName] = useState('');
  const [todConsumptions, setTodConsumptions] = useState<Record<string, Record<string, string>>>({});
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Accordion open states for Left Panel configuration
  const [openSections, setOpenSections] = useState({
    profile: false,
    grid: false,
    technical: false,
    commercial: false,
    tod: false
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Simulation & Analysis state
  const initialMonth = searchParams.get('month') || 'all';
  const [selectedSimMonth, setSelectedSimMonth] = useState<string>(initialMonth);
  const [calcVersions, setCalcVersions] = useState<number[]>([]);
  const [selectedCalcVersion, setSelectedCalcVersion] = useState<number | ''>('');
  const [cachedResults, setCachedResults] = useState<Record<string, { calc: CalculationResult | null; market: MarketDecisionResult | null; insights: any | null }>>({});
  const [calculating, setCalculating] = useState(false);
  const [clientOverview, setClientOverview] = useState<ClientOverviewResult | null>(null);

  // Modals & Explorer states
  const [commercialModalOpen, setCommercialModalOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [isPrintingRedesigned, setIsPrintingRedesigned] = useState(false);

  // Toast Helper
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Initialize edit form from entry data
  const initEditForm = (data: TraderPerformanceEntry) => {
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
      const tc: Record<string, Record<string, string>> = {};
      Object.entries(data.todConsumptions).forEach(([k, v]) => {
        tc[k] = {};
        if (typeof v === 'object' && v !== null) {
          Object.entries(v).forEach(([subK, subV]) => {
            if (typeof subV !== 'object') {
              tc[k][subK] = String(subV);
            }
          });
        }
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
      const data = await fetchTraderPerformanceEntryById(id, selectedCalcVersion ? Number(selectedCalcVersion) : undefined);
      setEntry(data);
      initEditForm(data);

      if (!searchParams.get('month') && data.todConsumptions) {
        const keys = Object.keys(data.todConsumptions).filter(k => !k.startsWith('_') && k.includes('-')).sort();
        if (keys.length > 0) {
          setSelectedSimMonth(keys[keys.length - 1]);
        }
      }

      // Load Version History
      try {
        const histData = await fetchEntryHistoryTraderPerformance(id);
        setHistory(histData || []);
        const versions = (histData || []).map((h: any) => h.version).sort((a: any, b: any) => b - a);
        setCalcVersions(versions);
        if (versions.length > 0 && selectedCalcVersion === '') {
          setSelectedCalcVersion(versions[0]);
        }
      } catch (err) {
        console.error('Failed to load version history:', err);
      }

      // Load Client Overview
      fetchClientOverviewTraderPerformance(id).then(res => {
        setClientOverview(res);
      }).catch(err => {
        console.error('Failed to fetch client overview:', err);
      });

    } catch (err: any) {
      console.error('Failed to load entry:', err);
      showToast(err.message || 'Failed to load trader performance entry', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const onAfterPrint = () => {
      document.body.classList.remove('printing-report');
      setIsPrintingRedesigned(false);
    };
    window.addEventListener('afterprint', onAfterPrint);

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'CHANGE_MONTH' && event.data.month) {
        setSelectedSimMonth(event.data.month);
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('afterprint', onAfterPrint);
      window.removeEventListener('message', handleMessage);
    };
  }, [id, selectedCalcVersion]);

  // Execute Calculation for Active Month
  const executeCalculation = async (monthOverride?: string, forceFresh = false) => {
    if (!id) return;
    const targetMonth = monthOverride !== undefined ? monthOverride : (selectedSimMonth || 'all');
    try {
      setCalculating(true);
      const newCache = forceFresh ? {} : { ...cachedResults };

      if (!newCache[targetMonth] || forceFresh) {
        const marketRes = await calculateMarketDecisionTraderPerformance(id, targetMonth, selectedCalcVersion || undefined);
        let calcRes: any = null;
        try {
          calcRes = await calculateTraderPerformance(id, targetMonth, selectedCalcVersion || undefined);
        } catch {
          // fallback synthesis
        }
        if (!calcRes && marketRes) {
          calcRes = {
            clientId: id,
            clientName: entry?.clientName,
            sanctionedLoad: entry?.sanctionedLoadKw || 0,
            maxEnergyPerSlot: (entry?.sanctionedLoadKw || 0) * 0.25,
            totalEnergyKwh: marketRes.totalEnergyKwh,
            totalMarketEnergyKwh: marketRes.totalMarketEnergyKwh,
            totalBaselineCost: marketRes.totalBaselineCost,
            totalOptimizedCost: marketRes.totalOptimizedCost,
            totalSavings: marketRes.totalSavings
          };
        }

        let insightsRes: any = null;
        try {
          insightsRes = await fetchDemandShiftInsightsTraderPerformance(id, targetMonth, selectedCalcVersion || undefined);
        } catch {
          insightsRes = null;
        }

        newCache[targetMonth] = {
          calc: calcRes,
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

  useEffect(() => {
    if (entry && id) {
      executeCalculation(selectedSimMonth);
    }
  }, [selectedSimMonth, selectedCalcVersion, entry?.id]);

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

  const handleFieldChange = (field: keyof TraderPerformanceEntry, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
    setIsFormDirty(true);
  };

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

      const updated = await updateTraderPerformanceEntry(id, payload);
      setEntry(updated);
      initEditForm(updated);
      showToast('Configuration updated! Recalculating benchmark...', 'success');

      fetchClientOverviewTraderPerformance(id).then(res => setClientOverview(res)).catch(() => { });
      fetchEntryHistoryTraderPerformance(id).then(hist => setHistory(hist || [])).catch(() => { });

      await executeCalculation(selectedSimMonth, true);
    } catch (err: any) {
      console.error('Update failed:', err);
      showToast(err.message || 'Failed to update configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      setDeleting(true);
      await deleteTraderPerformanceEntry(id);
      showToast('Entry deleted successfully');
      setTimeout(() => {
        navigate('/trader-performance');
      }, 800);
    } catch (err: any) {
      console.error('Delete failed:', err);
      showToast(err.message || 'Failed to delete entry', 'error');
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const calcResult = cachedResults[selectedSimMonth]?.calc || null;
  const marketDecisionResult = cachedResults[selectedSimMonth]?.market || null;
  const demandShiftInsights = cachedResults[selectedSimMonth]?.insights || null;

  const availableMonthKeys = useMemo(() => {
    const keys = Object.keys(entry?.todConsumptions || {}).filter(k => !k.startsWith('_') && k.includes('-')).sort();
    return keys;
  }, [entry?.todConsumptions]);

  const clientInitials = useMemo(() => {
    if (!entry?.clientName) return 'TP';
    const parts = entry.clientName.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.|M\/s)\s*/i, '').trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }, [entry?.clientName]);

  const { firstInsightMonthState, secondInsightMonthState } = useMemo(() => {
    let first = 'January 2026';
    let second = 'May 2026';
    if (clientOverview && clientOverview.months) {
      const monthlyData = clientOverview.months.map((m: any) => ({
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

  // Export Handlers
  const handleQuickPagePrint = () => {
    const originalTitle = document.title;
    if (entry?.clientName) document.title = `${entry.clientName} - Trader Performance Analysis`;
    window.print();
    document.title = originalTitle;
  };

  const handleExportPdf = async () => {
    if (!entry) return;
    const monthsToFetch = ['all', ...availableMonthKeys];
    const newCache = { ...cachedResults };
    let fetchedAny = false;

    setCalculating(true);
    try {
      for (const m of monthsToFetch) {
        if (!newCache[m]) {
          const marketRes = await calculateMarketDecisionTraderPerformance(entry.id, m, selectedCalcVersion || undefined);
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
    if (entry.clientName) document.title = `${entry.clientName}_Trader_Performance_Analysis`;
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
      await exportTraderPerformanceExcel(entry.id, selectedSimMonth || undefined, selectedCalcVersion || undefined, entry.clientName);
      showToast('Excel report downloaded successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Excel export failed', 'error');
    } finally {
      setCalculating(false);
    }
  };

  const handleExportActualTraderExcel = async () => {
    if (!entry) return;
    try {
      setCalculating(true);
      await exportTraderPerformanceActualTraderExcel(entry.id, selectedSimMonth || undefined, selectedCalcVersion || undefined, entry.clientName);
      showToast('Actual trader calculation sheet downloaded!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Export failed', 'error');
    } finally {
      setCalculating(false);
    }
  };

  const handleExportShiftedTod = async () => {
    if (!entry) return;
    try {
      setCalculating(true);
      await exportDemandShiftExcelTraderPerformance(entry.id, selectedSimMonth || undefined, selectedCalcVersion || undefined, entry.clientName);
      showToast('Shifted TOD simulation sheet downloaded successfully!', 'success');
    } catch (err: any) {
      console.error('Failed to export shifted TOD sheet:', err);
      showToast(err.message || 'Failed to download Shifted TOD sheet', 'error');
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
        } catch { }
      }

      const chartsEl = document.getElementById('dashboard-screenshot-target');
      if (chartsEl) {
        try {
          const canvas = await html2canvas(chartsEl, { scale: 2, useCORS: true, backgroundColor: '#F8FAFC' });
          dashboard_charts_screenshot = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
        } catch { }
      }

      setCalculating(true);
      const clientData = {
        client_name: entry.clientName,
        industry_name: entry.industryName,
        sanctioned_load: entry.sanctionedLoadKw,
        connectivity: entry.voltageLevel,
        discom_name: entry.discom,
        feeder_type: (entry as any).feederType || 'Dedicated',
        average_monthly_savings: clientOverview.months.length > 0 ? (clientOverview.totalSavings || 0) / clientOverview.months.length : 0,
        average_annual_savings: clientOverview.months.length > 0 ? ((clientOverview.totalSavings || 0) / clientOverview.months.length) * 12 : 0,
        smart_metering_infra_cost: entry.meteringCharges || 0,
        monthly_probus_savings_amount: clientOverview.months.length > 0 ? (clientOverview.totalSavings || 0) / clientOverview.months.length : 0,
        monthlyData: clientOverview.months.map((m: any) => ({
          month: m.month,
          total_energy_kwh: m.totalEnergyKwh || 0,
          total_market_energy_kwh: m.totalMarketEnergyKwh || 0,
          consumer_bus_units: m.oaConsumer ?? m.clearedUnitsKwh ?? m.cleared ?? ((m.totalEnergyKwh || 0) * 0.85),
          discom_only: {
            volume: m.totalEnergyKwh || 0,
            total_amount: m.totalBaselineCost || 0,
            per_unit_effective: ((m.totalBaselineCost || 0) / (m.totalEnergyKwh || 1)).toFixed(2)
          },
          oa_mix: {
            total_amount: m.totalOptimizedCost || 0,
            per_unit_effective: ((m.totalOptimizedCost || 0) / (m.totalEnergyKwh || 1)).toFixed(2)
          },
          savings: m.savings || 0,
          savings_per_unit: ((m.savings || 0) / (m.totalEnergyKwh || 1)).toFixed(2)
        })),
        monthlySavings: clientOverview.totalSavings || 0,
        savings_in_words: numberToIndianWords(Math.round(clientOverview.totalSavings || 0)),
        dashboard_hero_kpis_screenshot,
        dashboard_charts_screenshot,
        dashboard_screenshot: dashboard_hero_kpis_screenshot
      };

      await exportTechnicalProposalWord(clientData);
      showToast('Technical proposal downloaded successfully!', 'success');
    } catch (err: any) {
      console.error('Failed to export technical proposal:', err);
      showToast(err.message || 'Failed to export technical proposal', 'error');
    } finally {
      setCalculating(false);
    }
  };

  if (insightsOpen && entry) {
    return <EnergyInsightsExplorer entry={entry as any} onBack={() => setInsightsOpen(false)} />;
  }

  if (loading) {
    return (
      <div className="w-full h-[80vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-3 border-violet-500/20 border-t-violet-600 rounded-full animate-spin" />
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          Loading trader performance workspace...
        </span>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="w-full max-w-4xl mx-auto py-16 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Portfolio Record Not Found</h2>
        <p className="text-xs text-slate-400 mt-1 mb-6">The requested trader entry may have been removed or migrated.</p>
        <button
          onClick={() => navigate('/trader-performance')}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-violet-600 text-white hover:bg-violet-700 cursor-pointer"
        >
          Return to Trader Performance
        </button>
      </div>
    );
  }

  return (
    <div className="w-full px-2 sm:px-4 lg:px-6 py-2.5 font-sans select-none pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold text-white shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${toastMessage.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
          {toastMessage.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
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
                  onClick={() => navigate('/trader-performance')}
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
                      <span>{entry.stateCode || 'UP'} / {entry.discom || 'DVVNL'}</span>
                    </span>
                    <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-amber-700 dark:text-amber-400 font-bold">
                      <Zap className="w-2.5 h-2.5 shrink-0" />
                      <span>{entry.sanctionedLoadKw ? `${Number(entry.sanctionedLoadKw).toLocaleString('en-IN')} kW` : '1,108 kW'}</span>
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
                      className="h-9 w-full appearance-none rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-bold text-slate-800 dark:text-white outline-none transition-all focus:border-violet-500 focus:ring-1 focus:ring-violet-500 cursor-pointer shadow-2xs"
                    >
                      <option value="all">All Months (Overall Portfolio)</option>
                      {availableMonthKeys.map((ym) => (
                        <option key={ym} value={ym}>
                          {formatMonthDisplay(ym)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
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
              <section className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 p-3 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                    <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-[-0.01em]">
                      Simulation Controls
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <div className="relative min-w-0">
                    <select
                      value={selectedCalcVersion || (calcVersions.length > 0 ? Math.max(...calcVersions) : '')}
                      onChange={(e) => setSelectedCalcVersion(Number(e.target.value))}
                      className="h-8.5 w-full appearance-none rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-2.5 pr-7 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none transition-all focus:border-violet-500 focus:ring-1 focus:ring-violet-500 cursor-pointer shadow-2xs"
                    >
                      {calcVersions.length > 0 ? (
                        calcVersions.map(v => (
                          <option key={v} value={v}>
                            Ver: v{v} {v === Math.max(...calcVersions) ? '(Latest)' : ''}
                          </option>
                        ))
                      ) : (
                        <option value="">Ver: v1 (Latest)</option>
                      )}
                    </select>
                    <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
                  </div>

                  <button
                    type="button"
                    onClick={() => executeCalculation(selectedSimMonth, true)}
                    disabled={calculating}
                    className="h-8.5 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs active:scale-[0.98] disabled:opacity-50"
                  >
                    {calculating ? (
                      <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-slate-700 dark:border-t-white rounded-full animate-spin shrink-0" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                    )}
                    <span>{calculating ? 'Simulating...' : 'Recalculate'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setInsightsOpen(true)}
                  className="h-9 w-full rounded-lg border border-emerald-300/80 dark:border-emerald-700/60 bg-emerald-50/70 hover:bg-emerald-100/80 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-[0.99]"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
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

                  {/* 3. Calculation Sheet (Actual Trader) */}
                  <button
                    type="button"
                    onClick={handleExportActualTraderExcel}
                    className="h-8.5 px-3 rounded-lg border border-slate-200/90 dark:border-white/10 bg-slate-50/70 hover:bg-slate-100/80 dark:bg-white/[0.03] dark:hover:bg-white/[0.07] text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span className="truncate">Calculation Sheet (Actual Trader)</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">.xlsx</span>
                  </button>

                  {/* 4. Calculation Sheet (SHIFTED TOD) */}
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

                  {/* 5. Technical Proposal NEW */}
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

                  {/* 6. Technical Proposal LATEST */}
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

                  {/* 7. Commercial Proposal */}
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

              {/* SECTION 4: CLIENT CONFIGURATION SPECS */}
              <section className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 p-3 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                    <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-[-0.01em]">
                      Configuration Specs
                    </h3>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 tabular-nums">
                    5 Sections
                  </span>
                </div>

                <div className="space-y-1.5 pt-0.5">
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
                        <div className="grid grid-cols-[minmax(0,0.32fr)_minmax(0,0.68fr)] gap-2">
                          <label className="block min-w-0">
                            <span className="mb-1 block text-[10px] font-semibold text-slate-500 dark:text-slate-400">Prefix</span>
                            <div className="relative">
                              <select
                                value={editPrefix}
                                onChange={(e) => { setEditPrefix(e.target.value); setIsFormDirty(true); }}
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

                          <label className="block min-w-0">
                            <span className="mb-1 block text-[10px] font-semibold text-slate-500 dark:text-slate-400">Full Name *</span>
                            <input
                              type="text"
                              value={editCleanName}
                              onChange={(e) => { setEditCleanName(e.target.value); setIsFormDirty(true); }}
                              placeholder="e.g. Rahul Juglan"
                              className="h-8.5 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                            />
                          </label>
                        </div>

                        <label className="block min-w-0">
                          <span className="mb-1 block text-[10px] font-semibold text-slate-500 dark:text-slate-400">Industry Name</span>
                          <input
                            type="text"
                            value={editForm.industryName || ''}
                            onChange={(e) => handleFieldChange('industryName', e.target.value)}
                            placeholder="e.g. Zydus Wellness Ltd"
                            className="h-8.5 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                          />
                        </label>

                        <label className="block min-w-0">
                          <span className="mb-1 block text-[10px] font-semibold text-slate-500 dark:text-slate-400">Facility Address</span>
                          <textarea
                            value={editForm.address || ''}
                            onChange={(e) => handleFieldChange('address', e.target.value)}
                            rows={2}
                            placeholder="Plant address, city, state, pincode"
                            className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 resize-y"
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
                              placeholder="e.g. DVVNL"
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
                            placeholder="e.g. 11 kV"
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
                              placeholder="e.g. 1108.8"
                              className="h-8.5 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                            />
                          </label>
                          <label className="block min-w-0">
                            <span className="mb-1 block text-[10px] font-semibold text-slate-500 dark:text-slate-400">Billed Demand (kV)</span>
                            <input
                              type="number"
                              value={editForm.billedDemandKv !== undefined && editForm.billedDemandKv !== null ? editForm.billedDemandKv : ''}
                              onChange={(e) => handleFieldChange('billedDemandKv', e.target.value)}
                              placeholder="e.g. 11"
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
                              value={editForm.powerFactor !== undefined && editForm.powerFactor !== null ? editForm.powerFactor : ''}
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
                      onClick={() => toggleSection('commercial')}
                      aria-expanded={openSections.commercial}
                      className={`h-9 w-full flex items-center justify-between px-2.5 text-left text-xs font-bold cursor-pointer transition-colors ${openSections.commercial ? 'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-white/[0.03]'}`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <BarChart3 className="w-3.5 h-3.5 shrink-0 text-violet-600 dark:text-violet-400" />
                        <span className="truncate">4. Commercial Margins &amp; Fees</span>
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200 ease-out ${openSections.commercial ? 'rotate-180' : ''}`} />
                    </button>

                    {openSections.commercial && (
                      <div className="flex flex-col gap-2 border-t border-slate-200/70 dark:border-white/5 p-2.5 bg-white dark:bg-[#0B0F19]">
                        <div className="grid grid-cols-2 gap-2">
                          <label className="block min-w-0">
                            <span className="mb-1 block text-[10px] font-semibold text-slate-500 dark:text-slate-400">ProLT Margin (₹)</span>
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.proltMargin !== undefined ? editForm.proltMargin : ''}
                              onChange={(e) => handleFieldChange('proltMargin', e.target.value)}
                              placeholder="0.05"
                              className="h-8.5 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                            />
                          </label>
                          <label className="block min-w-0">
                            <span className="mb-1 block text-[10px] font-semibold text-slate-500 dark:text-slate-400">Trader Margin (₹)</span>
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
                              value={editForm.meteringCharges !== undefined && editForm.meteringCharges !== null ? editForm.meteringCharges : ''}
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
                        <span className="truncate">5. TOD Consumption Slabs</span>
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200 ease-out ${openSections.tod ? 'rotate-180' : ''}`} />
                    </button>

                    {openSections.tod && (
                      <div className="flex flex-col gap-2 border-t border-slate-200/70 dark:border-white/5 p-2.5 bg-white dark:bg-[#0B0F19]">
                        {Object.entries(todConsumptions)
                          .filter(([mKey]) => selectedSimMonth === 'all' || mKey === selectedSimMonth)
                          .map(([mKey, slabs]) => (
                            <div key={mKey} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200/70 dark:border-white/10 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400">
                                  Month: {mKey}
                                </span>
                                <span className="text-[9px] text-slate-400 font-semibold">
                                  Unit: {String((slabs as any)['Billing Unit'] || 'kVAh')}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-1.5">
                                {Object.entries(slabs as Record<string, string>)
                                  .filter(([k]) => !['Start Date', 'End Date', 'Electricity Duty', 'Billing Unit', 'Season', 'Billing Month', '_rawKvah', 'traderReports'].includes(k))
                                  .map(([slabKey, slabVal]) => (
                                    <div key={slabKey}>
                                      <label className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 block truncate mb-0.5">
                                        {slabKey}
                                      </label>
                                      <input
                                        type="number"
                                        value={typeof slabVal === 'object' ? '' : (slabVal || '')}
                                        onChange={(e) => handleTodSlotChange(mKey, slabKey, e.target.value)}
                                        className="h-8 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                                      />
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ))}
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
                  <span>Delete Portfolio Record</span>
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
              <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                {selectedSimMonth === 'all' ? 'All Months Simulation' : `${formatMonthDisplay(selectedSimMonth)} Simulation`}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {selectedSimMonth === 'all'
                  ? 'Annual Trader Benchmark & Landed Cost Analysis'
                  : `Monthly Energy Sourcing & Surcharge Arbitrage (${formatMonthDisplay(selectedSimMonth)})`}
              </h2>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* LIVE KPI METRICS SUMMARY MATRIX                                       */}
          {/* --------------------------------------------------------------------- */}
          {marketDecisionResult && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-white/90 dark:bg-[#0B0F19]/90 backdrop-blur-md border border-slate-200/80 dark:border-white/10 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Baseline DISCOM Cost
                </span>
                <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {formatIndianCurrency(Math.round(marketDecisionResult.totalBaselineCost || 0))}
                </div>
                <span className="text-[11px] text-slate-500 font-medium">Standard Utility Rate</span>
              </div>

              <div className="p-4 rounded-xl bg-white/90 dark:bg-[#0B0F19]/90 backdrop-blur-md border border-slate-200/80 dark:border-white/10 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Optimized Open Access
                </span>
                <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {formatIndianCurrency(Math.round(marketDecisionResult.totalBaselineCost - (marketDecisionResult.totalSavings || 0)))}
                </div>
                <span className="text-[11px] text-violet-600 dark:text-violet-400 font-medium">IEX Market Landing</span>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:bg-[#0B0F19]/90 backdrop-blur-md border border-emerald-500/30 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                  Net Realized Savings
                </span>
                <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatIndianCurrency(Math.round(marketDecisionResult.totalSavings || 0))}
                </div>
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  {marketDecisionResult.totalBaselineCost > 0
                    ? `+${((marketDecisionResult.totalSavings / marketDecisionResult.totalBaselineCost) * 100).toFixed(1)}% Cost Reduction`
                    : 'Optimal Arbitrage'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white/90 dark:bg-[#0B0F19]/90 backdrop-blur-md border border-slate-200/80 dark:border-white/10 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Effective Savings Rate
                </span>
                <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  ₹{marketDecisionResult.totalEnergyKwh > 0 ? (marketDecisionResult.totalSavings / marketDecisionResult.totalEnergyKwh).toFixed(2) : '0.00'}
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
          {!calculating && marketDecisionResult && (
            <div id="dashboard-screenshot-target" className="space-y-5">
              <div className="rounded-2xl overflow-hidden bg-white/95 dark:bg-[#0B0F19]/95 border border-slate-200/80 dark:border-white/10 p-2 sm:p-4 shadow-sm">
                <Dashboard
                  calcResult={calcResult}
                  calcEntry={entry as any}
                  clientName={entry.clientName}
                  clientOverview={clientOverview}
                  marketDecisionResult={marketDecisionResult}
                  demandShiftInsights={demandShiftInsights}
                  selectedMonth={selectedSimMonth}
                />

                {/* Custom Trader Performance 3-Way Comparison */}
                {entry && marketDecisionResult && (
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Trader Performance 3-Way Comparison (Actuals)
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/25">
                        ACTUAL SETTLEMENT
                      </span>
                    </div>

                    <Card sx={{ borderRadius: 2.5, boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid', borderColor: 'divider' }}>
                      <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                        <MuiTableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                          <Table size="small">
                            <TableHead sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC' }}>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 700, fontSize: '12px' }}>Metric</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '12px' }}>Discom (Original)</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '12px', color: '#10B981' }}>Probus (Discom + OA)</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '12px', color: '#6366F1' }}>Actual Trader (PDF)</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {(() => {
                                let traderBoughtKwh = 0;
                                let traderMarketCost = 0;
                                
                                const aggregateReports = (reports: any) => {
                                  if (reports && reports.data) {
                                    Object.values(reports.data).forEach((report: any) => {
                                      if (report.total_trade_mwh) traderBoughtKwh += report.total_trade_mwh * 1000;
                                      if (report.total_amount) traderMarketCost += Math.abs(report.total_amount);
                                    });
                                  }
                                };

                                if (selectedSimMonth === 'all') {
                                  Object.values(entry.todConsumptions || {}).forEach((tc: any) => {
                                    if (tc && tc.traderReports) {
                                      aggregateReports(tc.traderReports);
                                    }
                                  });
                                } else {
                                  const tc = (entry.todConsumptions as any)?.[selectedSimMonth];
                                  if (tc && tc.traderReports) {
                                    aggregateReports(tc.traderReports);
                                  }
                                }

                                const totalEnergy = marketDecisionResult.totalEnergyKwh || 0;
                                const discomCost = marketDecisionResult.totalBaselineCost || 0;
                                const probusCost = discomCost - (marketDecisionResult.totalSavings || 0);
                                const probusResidualDiscomCost = marketDecisionResult.totalDiscomAfterProlt || 0;
                                const probusFullyLandedOaCost = Math.max(0, probusCost - probusResidualDiscomCost);
                                
                                const probusConsumerBusKwh = marketDecisionResult.totalConsumerBusEnergyKwh || 0;

                                const actualSettlement = marketDecisionResult.actualTrader;
                                const exactTraderLandedCost = actualSettlement?.totalCost ?? marketDecisionResult.totalTraderLandedCost ?? 0;
                                const exactTraderMarketEnergy = actualSettlement?.marketEnergyKwh ?? marketDecisionResult.totalTraderMarketEnergy ?? 0;
                                const traderConsumerBusKwh = actualSettlement?.consumerBusEnergyKwh ?? marketDecisionResult.totalTraderConsumerBusEnergy ?? 0;
                                const leftoverDiscomEnergy = Math.max(0, totalEnergy - traderConsumerBusKwh);
                                const actualBreakdown = marketDecisionResult.oaDetailed?.breakdown || [];
                                const miscellaneousCharges = Number((marketDecisionResult as any).miscellaneousCharges || 0);
                                const residualDiscomEnergy = actualSettlement?.residualDiscomEnergyKwh
                                  ?? actualBreakdown.reduce((sum: number, row: any) => sum + Number(row.traderLeftoverDiscomEnergy || 0), 0);
                                const residualDiscomCost = actualSettlement?.residualDiscomCost
                                  ?? actualBreakdown.reduce((sum: number, row: any) => sum + Number(row.traderDiscomBillTotal || 0), 0) + miscellaneousCharges;
                                const actualOaCost = actualSettlement?.totalOaCost
                                  ?? Math.max(0, exactTraderLandedCost - residualDiscomCost);
                                const discomRate = totalEnergy > 0 ? (discomCost / totalEnergy) : 0;
                                const actualTraderCost = exactTraderMarketEnergy > 0 
                                  ? exactTraderLandedCost 
                                  : (leftoverDiscomEnergy * discomRate) + traderMarketCost;
                                const actualTraderSavings = exactTraderMarketEnergy > 0
                                  ? (actualSettlement?.savings ?? marketDecisionResult.actualTraderSavings ?? (discomCost - actualTraderCost))
                                  : (discomCost - actualTraderCost);
                                const hasTraderData = exactTraderMarketEnergy > 0 || traderBoughtKwh > 0;

                                const pf = entry?.powerFactor ? Number(entry.powerFactor) : 1;
                                const toKvAh = (kwh: number) => kwh / pf;
                                
                                return (
                                  <>
                                    <TableRow hover>
                                      <TableCell sx={{ fontSize: '12.5px' }}>Total Energy (kVAh)</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '12.5px' }}>{toKvAh(totalEnergy).toLocaleString(undefined, {maximumFractionDigits: 0})}</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '12.5px' }}>{toKvAh(totalEnergy).toLocaleString(undefined, {maximumFractionDigits: 0})}</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '12.5px' }}>{toKvAh(totalEnergy).toLocaleString(undefined, {maximumFractionDigits: 0})}</TableCell>
                                    </TableRow>
                                    <TableRow hover>
                                      <TableCell sx={{ fontSize: '12.5px' }}>OA Energy Bought at Regional Bus (kWh)</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '12.5px' }}>0</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '12.5px', color: '#10B981', fontWeight: 600 }}>{(marketDecisionResult.totalMarketEnergyKwh || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '12.5px', color: '#6366F1', fontWeight: 600 }}>{hasTraderData ? (exactTraderMarketEnergy).toLocaleString(undefined, {maximumFractionDigits: 0}) : '-'}</TableCell>
                                    </TableRow>
                                    <TableRow hover>
                                      <TableCell sx={{ fontSize: '12.5px' }}>OA Energy Bought at Regional Bus (kVAh)</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '12.5px' }}>0</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '12.5px' }}>{toKvAh(marketDecisionResult.totalMarketEnergyKwh || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '12.5px' }}>{hasTraderData ? toKvAh(exactTraderMarketEnergy).toLocaleString(undefined, {maximumFractionDigits: 0}) : '-'}</TableCell>
                                    </TableRow>
                                    <TableRow hover>
                                      <TableCell sx={{ fontSize: '12.5px' }}>OA Energy at Consumer Bus (kVAh)</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '12.5px' }}>0</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '12.5px' }}>{toKvAh(probusConsumerBusKwh).toLocaleString(undefined, {maximumFractionDigits: 0})}</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '12.5px' }}>{toKvAh(traderConsumerBusKwh).toLocaleString(undefined, {maximumFractionDigits: 0})}</TableCell>
                                    </TableRow>
                                    <TableRow hover>
                                      <TableCell sx={{ fontSize: '12.5px' }}>Residual Energy from DISCOM (kVAh)</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '12.5px' }}>{toKvAh(totalEnergy).toLocaleString(undefined, {maximumFractionDigits: 0})}</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '12.5px' }}>{toKvAh(Math.max(0, totalEnergy - probusConsumerBusKwh)).toLocaleString(undefined, {maximumFractionDigits: 0})}</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '12.5px' }}>{hasTraderData ? toKvAh(residualDiscomEnergy).toLocaleString(undefined, {maximumFractionDigits: 0}) : '-'}</TableCell>
                                    </TableRow>
                                    <TableRow hover>
                                      <TableCell sx={{ fontSize: '12.5px' }}>Lapsed Banking Energy (kVAh)</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '12.5px' }}>0</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '12.5px' }}>0</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '12.5px', color: (actualSettlement?.lapsedEnergyKwh || 0) > 0 ? '#EF4444' : 'inherit' }}>{hasTraderData ? toKvAh(actualSettlement?.lapsedEnergyKwh || 0).toLocaleString(undefined, {maximumFractionDigits: 0}) : '-'}</TableCell>
                                    </TableRow>
                                    <TableRow hover>
                                      <TableCell sx={{ fontSize: '12.5px' }}>Fully Landed OA Cost (₹)</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '12.5px' }}>-</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '12.5px', color: '#10B981', fontWeight: 600 }}>₹ {probusFullyLandedOaCost.toLocaleString(undefined, {maximumFractionDigits: 0})}</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '12.5px', color: '#6366F1', fontWeight: 600 }}>{hasTraderData ? `₹ ${actualOaCost.toLocaleString(undefined, {maximumFractionDigits: 0})}` : '-'}</TableCell>
                                    </TableRow>
                                    <TableRow hover>
                                      <TableCell sx={{ fontSize: '12.5px' }}>Residual DISCOM Cost (₹)</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '12.5px' }}>₹ {discomCost.toLocaleString(undefined, {maximumFractionDigits: 0})}</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '12.5px' }}>₹ {probusResidualDiscomCost.toLocaleString(undefined, {maximumFractionDigits: 0})}</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '12.5px' }}>{hasTraderData ? `₹ ${residualDiscomCost.toLocaleString(undefined, {maximumFractionDigits: 0})}` : '-'}</TableCell>
                                    </TableRow>
                                    <TableRow hover sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                                      <TableCell sx={{ fontSize: '12.5px', fontWeight: 600 }}>Total Cost (₹)</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '12.5px', fontWeight: 600 }}>₹ {discomCost.toLocaleString(undefined, {maximumFractionDigits: 0})}</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '12.5px', fontWeight: 700, color: '#10B981' }}>₹ {probusCost.toLocaleString(undefined, {maximumFractionDigits: 0})}</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '12.5px', fontWeight: 700, color: hasTraderData ? '#6366F1' : 'text.secondary' }}>
                                        {hasTraderData ? `₹ ${actualTraderCost.toLocaleString(undefined, {maximumFractionDigits: 0})}` : 'No PDF Data'}
                                      </TableCell>
                                    </TableRow>
                                    <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.06)' }}>
                                      <TableCell sx={{ fontSize: '13px', fontWeight: 800, color: '#10B981' }}>Net Savings vs Discom (₹)</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '13px' }}>-</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '13px', color: '#10B981', fontWeight: 800 }}>₹ {(discomCost - probusCost).toLocaleString(undefined, {maximumFractionDigits: 0})}</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '13px', color: '#6366F1', fontWeight: 800 }}>
                                        {hasTraderData ? `₹ ${actualTraderSavings.toLocaleString(undefined, {maximumFractionDigits: 0})}` : '-'}
                                      </TableCell>
                                    </TableRow>
                                  </>
                                );
                              })()}
                            </TableBody>
                          </Table>
                        </MuiTableContainer>
                      </CardContent>
                    </Card>

                    {marketDecisionResult.oaDetailed?.breakdown && marketDecisionResult.oaDetailed.breakdown.length > 0 && (
                      <Card sx={{ mt: 3, borderRadius: 2.5, boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid', borderColor: 'divider' }}>
                        <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: 'text.primary', fontSize: '16px' }}>
                            Actual Trader - TOD Breakdown
                          </Typography>
                          <MuiTableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                            <Table size="small">
                              <TableHead sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC' }}>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 700, fontSize: '12px' }}>TOD Slab</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '12px' }}>Discom Consumption (kVAh)</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '12px' }}>OA Bought (Regional Bus) (kWh)</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '12px' }}>Trader Delivered (kVAh)</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '12px' }}>Lapsed Banking Energy (kVAh)</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {marketDecisionResult.oaDetailed.breakdown.map((row: any, idx: number) => {
                                  const pf = entry?.powerFactor ? Number(entry.powerFactor) : 1;
                                  const toKvAh = (kwh: number) => kwh / pf;
                                  return (
                                    <TableRow key={idx} hover>
                                      <TableCell sx={{ fontSize: '12.5px', fontWeight: 500 }}>{row.slabName}</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '12.5px' }}>{toKvAh(row.discomUnits || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '12.5px', fontWeight: 600, color: '#6366F1' }}>{(row.traderMarketEnergy || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '12.5px' }}>{toKvAh(row.traderConsumerBusUnits || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</TableCell>
                                      <TableCell align="right" sx={{ fontSize: '12.5px', fontWeight: (row.traderLapsedEnergy || 0) > 0 ? 700 : 400, color: (row.traderLapsedEnergy || 0) > 0 ? '#EF4444' : 'inherit' }}>
                                        {toKvAh(row.traderLapsedEnergy || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </MuiTableContainer>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
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

          {/* Proposal Export Targets for PDF generation */}
          <div id="proposal-export-target" style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '1200px' }}>
            <ProposalDashboardExport 
              clientOverview={clientOverview} 
              marketDecisionResult={marketDecisionResult} 
              demandShiftInsights={demandShiftInsights} 
              selectedMonth={selectedSimMonth} 
            />
          </div>

          <div id="proposal-export-target-new" style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '1200px' }}>
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
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '16px' }}>Delete Portfolio Record?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to delete this portfolio record for <strong>{entry?.clientName}</strong>? This action cannot be undone.
          </Typography>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
            >
              {deleting ? 'Deleting...' : 'Delete Permanently'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Redesigned Savings Report portal for printing */}
      {isPrintingRedesigned && entry && Object.keys(cachedResults).length > 0 && createPortal(
        <Box className="print-container">
          <RedesignedSavingsReport
            calcEntry={entry as any}
            allResults={Object.keys(cachedResults).map(m => ({ month: m, marketDecisionResult: cachedResults[m].market }))}
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
        onSubmit={async (formData) => {
          try {
            await exportCommercialProposalWord(formData);
            showToast('Commercial proposal downloaded successfully!', 'success');
          } catch (err: any) {
            showToast(err.message || 'Commercial proposal export failed', 'error');
          }
        }}
      />
    </div>
  );
}
