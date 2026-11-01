import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Box, Typography, Button, TextField, IconButton, Alert, Snackbar,
  Grid, Card, CardContent, Tabs, Tab, Table, TableBody, TableCell, TableHead, TableRow,
  CircularProgress, MenuItem, Paper, Tooltip as MuiTooltip, Chip, Dialog, DialogTitle, DialogContent
} from '@mui/material';
import {
  Calculate as CalculateIcon,
  Add as AddIcon,
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
  PictureAsPdf as PictureAsPdfIcon,
  BarChart as BarChartIcon,
  History as HistoryIcon,
  InfoOutlined as InfoOutlinedIcon,
  Search as SearchIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { SlotWiseMarketHeatmap } from '../components/dashboard/SlotWiseMarketHeatmap';
import { DynamicSlotWiseMarketHeatmap } from '../components/dashboard/DynamicSlotWiseMarketHeatmap';
import TableContainer, { ColumnDefinition } from '../components/dashboard/TableContainer';
import EmptyTableState from '../components/dashboard/EmptyTableState';
import { Dashboard } from '../components/dashboard/Dashboard';
import { ProposalDashboardExport } from '../components/dashboard/ProposalDashboardExport';
import { RedesignedSavingsReport } from '../components/savings-assistant/RedesignedSavingsReport';
import {
  fetchSavingsNewEntryById,
  calculateMarketDecisionNew,
  fetchSavingsNewEntries,
  SavingsCalculatorNewEntry,
  MarketDecisionResult,
  exportSavingsExcelNew,
  exportDemandShiftExcelNew,
  fetchEntryHistoryNew,
  fetchClientOverviewNew
} from '../api/savingsCalculatorNew.api';
import html2canvas from 'html2canvas';
import { exportToExcel } from '../utils/export';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  exportSavingsExcel,
  exportProposalWord,
  exportTechnicalProposalWord,
  exportCommercialProposalWord
} from '../api/savingsCalculator.api';
import CommercialProposalModal from '../components/common/CommercialProposalModal';
import { numberToIndianWords } from '../utils/numberToIndianWords';

export default function SavingsCalculatorNewAnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [calcEntry, setCalcEntry] = useState<SavingsCalculatorNewEntry | null>(null);
  const [cachedResults, setCachedResults] = useState<Record<string, MarketDecisionResult>>({});
  const [calculating, setCalculating] = useState(false);
  const [clientOverview, setClientOverview] = useState<any | null>(null);
  const [selectedSimMonth, setSelectedSimMonth] = useState<string>('all');
  const [calcVersions, setCalcVersions] = useState<number[]>([]);
  const [selectedCalcVersion, setSelectedCalcVersion] = useState<number | ''>('');
  const [graphDialogOpen, setGraphDialogOpen] = useState(false);
  const [dynamicGraphDialogOpen, setDynamicGraphDialogOpen] = useState(false);
  const [commercialModalOpen, setCommercialModalOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [isPrintingRedesigned, setIsPrintingRedesigned] = useState(false);

  const marketDecisionResult = cachedResults[selectedSimMonth] || cachedResults['all'] || null;

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

  const loadData = async () => {
    if (!id) return;
    setCalculating(true);
    try {
      const baseEntryData = await fetchSavingsNewEntryById(id);
      
      let versions: number[] = calcVersions;
      if (calcVersions.length === 0) {
        try {
          const history = await fetchEntryHistoryNew(id);
          versions = history.map((h: any) => h.version).sort((a: any, b: any) => b - a);
          if (versions.length === 0) {
            versions = [1];
          }
          setCalcVersions(versions);
          if (versions.length > 0 && selectedCalcVersion === '') {
            setSelectedCalcVersion(versions[0]);
            return; // Let the useEffect re-trigger with the new version
          }
        } catch (err) {
          console.error('Failed to fetch history', err);
          versions = [1];
          setCalcVersions(versions);
          if (selectedCalcVersion === '') {
            setSelectedCalcVersion(versions[0]);
            return;
          }
        }
      }

      const entryData = await fetchSavingsNewEntryById(id, selectedCalcVersion || undefined);
      setCalcEntry(entryData);

      // Fetch overview independently, saving massive memory overhead
      const overview = await fetchClientOverviewNew(id);
      setClientOverview(overview);

      // Lazy load only the currently selected month
      const resultsMap: Record<string, MarketDecisionResult> = { ...cachedResults };
      if (!resultsMap[selectedSimMonth]) {
        const resSelected = await calculateMarketDecisionNew(id, selectedSimMonth, selectedCalcVersion || undefined);
        resultsMap[selectedSimMonth] = resSelected;
      }

      setCachedResults(resultsMap);
    } catch (err: any) {
      console.error('Failed to load analysis:', err);
      setSnackbar({ open: true, message: err.message || 'Failed to load analysis', severity: 'error' });
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, selectedCalcVersion, selectedSimMonth]);

  const handleExportPDF = () => {
    if (!marketDecisionResult || !marketDecisionResult.slotsData) return;
    
    const doc = new jsPDF({ orientation: 'landscape' });
    const clientNameStr = calcEntry?.clientName ? calcEntry.clientName.replace(/[^a-zA-Z0-9_\-]/g, '_') : 'client';
    
    doc.setFontSize(16);
    doc.text(`Market Buy Report - ${clientNameStr} (${selectedSimMonth})`, 14, 15);
    
    const head = [[
      'Date', 'Timeblock', 'Time', 'TOD Window', 'DAM MCP', 'RTM MCP', 'GDAM MCP', 
      'Discom Price', 'Selected Price', 'Source', 'Alloc. Energy', 'Discom Cost', 'Opt. Cost'
    ]];
    
    const body = marketDecisionResult.slotsData.map((row) => [
      row.date,
      row.slot,
      row.timeStr,
      row.todSlab,
      row.damLandingPrice ? row.damLandingPrice.toFixed(4) : '-',
      row.rtmLandingPrice ? row.rtmLandingPrice.toFixed(4) : '-',
      row.gdamLandingPrice ? row.gdamLandingPrice.toFixed(4) : '-',
      row.discomLandingPrice ? row.discomLandingPrice.toFixed(4) : '-',
      row.comparedLowestPrice ? row.comparedLowestPrice.toFixed(4) : '-',
      row.selectedSource,
      row.maxEnergyPerSlot ? row.maxEnergyPerSlot.toFixed(2) : '0',
      row.baselineCost ? Math.round(row.baselineCost) : 0,
      row.optimizedCost ? Math.round(row.optimizedCost) : 0
    ]);

    autoTable(doc, {
      startY: 25,
      head: head,
      body: body,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42] },
      margin: { top: 25, left: 10, right: 10 }
    });
    
    doc.save(`${clientNameStr}_market_buy_report_${selectedSimMonth}.pdf`);
  };

  const columns: ColumnDefinition[] = [
    { field: 'date', headerName: 'Date', align: 'center' },
    { field: 'timeStr', headerName: 'Time', align: 'center' },
    { field: 'todSlab', headerName: 'Custom TOD Window', align: 'center' },
    {
      field: 'discomLandingPrice',
      headerName: 'Discom Price (₹/kWh)',
      align: 'center',
      valueFormatter: (v) => typeof v === 'number' ? `₹${v.toFixed(2)}` : '-'
    },
    {
      field: 'comparedLowestPrice',
      headerName: 'Selected Price (₹/kWh)',
      align: 'center',
      valueFormatter: (v) => typeof v === 'number' ? `₹${v.toFixed(2)}` : '-'
    },
    {
      field: 'selectedSource',
      headerName: 'Lowest Source',
      align: 'center',
      renderCell: (row) => (
        <Chip
          label={row.selectedSource}
          size="small"
          color={row.selectedSource === 'DISCOM' ? 'default' : 'success'}
        />
      )
    },
    {
      field: 'maxEnergyPerSlot',
      headerName: 'Energy (kWh)',
      align: 'center',
      valueFormatter: (v) => typeof v === 'number' ? `${v.toFixed(1)} kWh` : '-'
    },
    {
      field: 'baselineCost',
      headerName: 'Discom Cost (₹)',
      align: 'center',
      valueFormatter: (v) => typeof v === 'number' ? `₹${Math.round(v).toLocaleString('en-IN')}` : '-'
    },
    {
      field: 'optimizedCost',
      headerName: 'Optimized Cost (₹)',
      align: 'center',
      valueFormatter: (v) => typeof v === 'number' ? `₹${Math.round(v).toLocaleString('en-IN')}` : '-'
    }
  ];

  return (
    <Box sx={{ p: 3, width: '100%', maxWidth: '383mm', mx: 'auto', '@media print': { maxWidth: '383mm', p: 0 } }}>
      <Box className="dashboard-content-to-hide">
        {/* Top Header */}
        <Box className="no-print" sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
          <IconButton
            onClick={() => navigate('/savings-calculator-new')}
            sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h2" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Savings Analysis for {calcEntry?.clientName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              State: {calcEntry?.stateCode} | Discom: {calcEntry?.discom} | Load: {calcEntry?.sanctionedLoadKw ? `${calcEntry.sanctionedLoadKw} kW` : '-'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 3, p: 3, border: '1px solid', borderColor: 'divider', minHeight: 'calc(100vh - 130px)', display: 'flex', flexDirection: 'column' }}>
          {/* Action Bar */}
          <Box className="no-print" sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap', alignItems: 'center', p: 2, bgcolor: 'background.default', borderRadius: 2.5, border: '1px solid', borderColor: 'divider' }}>
            {calcVersions.length > 0 && (
              <TextField
                select
                label="Version"
                value={selectedCalcVersion}
                onChange={(e) => setSelectedCalcVersion(Number(e.target.value))}
                size="small"
                sx={{ width: 120, bgcolor: 'background.paper' }}
              >
                {calcVersions.map((v) => (
                  <MenuItem key={v} value={v}>
                    v{v} {v === Math.max(...calcVersions) && '(Recent)'}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <Button
              variant="contained"
              startIcon={<PlayIcon />}
              onClick={loadData}
              disabled={calculating}
              sx={{
                textTransform: 'none',
                borderRadius: 2,
                bgcolor: '#8B5CF6',
                '&:hover': { bgcolor: '#7C3AED' }
              }}
            >
              {calculating ? 'Analyzing...' : 'Refresh Simulation'}
            </Button>

            {selectedSimMonth !== 'all' && (
              <>
                <Button
                  variant="contained"
                  startIcon={<BarChartIcon />}
                  onClick={() => setGraphDialogOpen(true)}
                  disabled={calculating}
                  sx={{
                    textTransform: 'none',
                    borderRadius: 2,
                    bgcolor: '#F59E0B',
                    '&:hover': { bgcolor: '#D97706' }
                  }}
                >
                  Slot-wise Heatmap
                </Button>

                <Button
                  variant="contained"
                  startIcon={<BarChartIcon />}
                  onClick={() => setDynamicGraphDialogOpen(true)}
                  disabled={calculating}
                  sx={{
                    textTransform: 'none',
                    borderRadius: 2,
                    bgcolor: '#8B5CF6',
                    '&:hover': { bgcolor: '#7C3AED' }
                  }}
                >
                  Dynamic Heatmap
                </Button>
              </>
            )}

            {/* Month Tabs */}
            <Box className="no-print" sx={{ width: '100%', mt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Tabs
                value={selectedSimMonth}
                onChange={(e, v) => setSelectedSimMonth(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ minHeight: 40, '& .MuiTab-root': { textTransform: 'none', minHeight: 40, fontWeight: 600 } }}
              >
                <Tab label="Overall" value="all" />
                {Object.keys(calcEntry?.todConsumptions || {}).filter(m => !m.startsWith('_') && m.includes('-')).sort().map((ym) => (
                  <Tab
                    key={ym}
                    label={new Date(`${ym}-01`).toLocaleString('default', { month: 'long', year: 'numeric' })}
                    value={ym}
                  />
                ))}
              </Tabs>
            </Box>
          </Box>

          {/* Export Toolbar */}
          {marketDecisionResult && (
            <Box className="no-print" sx={{ 
              display: 'flex', 
              flexWrap: 'nowrap', 
              overflowX: 'auto',
              alignItems: 'center', 
              justifyContent: { xs: 'flex-start', xl: 'flex-end' }, 
              gap: 1.5, 
              my: 2.5, 
              width: '100%',
              pb: 0.5,
              '&::-webkit-scrollbar': { display: 'none' },
              msOverflowStyle: 'none',
              scrollbarWidth: 'none'
            }}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => {
                  const originalTitle = document.title;
                  if (calcEntry?.clientName) {
                    document.title = `${calcEntry.clientName} - Savings Analysis`;
                  }
                  window.print();
                  document.title = originalTitle;
                }}
                sx={{
                  textTransform: 'none',
                  borderRadius: 2.5,
                  fontWeight: 600,
                  borderColor: 'divider',
                  backgroundColor: '#FFFFFF',
                  color: 'text.primary',
                  px: 2.5,
                  py: 1,
                  '&:hover': { backgroundColor: '#F8FAFC', borderColor: 'divider' }
                }}
              >
                Export as PDF
              </Button>
              <Button
                variant="outlined"
                startIcon={<FileDownloadIcon />}
                onClick={async () => {
                  if (!id) return;
                  try {
                    await exportSavingsExcelNew(id, selectedSimMonth || undefined, selectedCalcVersion || undefined, calcEntry?.clientName);
                  } catch (err: any) {
                    setSnackbar({ open: true, message: err.message || 'Excel export failed', severity: 'error' });
                  }
                }}
                sx={{
                  textTransform: 'none',
                  borderRadius: 2.5,
                  fontWeight: 600,
                  borderColor: 'divider',
                  backgroundColor: '#10B981',
                  color: 'white',
                  px: 2.5,
                  py: 1,
                  '&:hover': { backgroundColor: '#059669', borderColor: 'divider' }
                }}
              >
                Calculation Sheet (Original TOD)
              </Button>
              <Button
                variant="outlined"
                startIcon={<FileDownloadIcon />}
                onClick={async () => {
                  if (!id) return;
                  try {
                    await exportDemandShiftExcelNew(id, selectedSimMonth || undefined, selectedCalcVersion || undefined, calcEntry?.clientName);
                  } catch (err: any) {
                    setSnackbar({ open: true, message: err.message || 'Excel export failed', severity: 'error' });
                  }
                }}
                sx={{
                  textTransform: 'none',
                  borderRadius: 2.5,
                  fontWeight: 600,
                  borderColor: 'divider',
                  backgroundColor: '#0284C7',
                  color: 'white',
                  px: 2.5,
                  py: 1,
                  '&:hover': { backgroundColor: '#0369A1', borderColor: 'divider' }
                }}
              >
                Calculation Sheet (SHIFTED TOD)
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={async () => {
                  if (!calcEntry || !id) return;
                  
                  // Ensure ALL months are loaded for the PDF to include pages for every month
                  setCalculating(true);
                  try {
                    const monthsToFetch = ['all', ...Object.keys(calcEntry.todConsumptions || {})];
                    const newCache = { ...cachedResults };
                    let fetchedAny = false;

                    for (const m of monthsToFetch) {
                      if (!newCache[m]) {
                        const marketRes = await calculateMarketDecisionNew(id, m, selectedCalcVersion || undefined);
                        newCache[m] = marketRes;
                        fetchedAny = true;
                      }
                    }
                    if (fetchedAny) {
                      setCachedResults(newCache);
                    }
                  } catch (err) {
                    console.error('Failed to fetch all months for PDF', err);
                  } finally {
                    setCalculating(false);
                  }

                  const originalTitle = document.title;
                  if (calcEntry?.clientName) {
                    document.title = `${calcEntry.clientName}_Custom_TOD_Savings_Report`;
                  }
                  setIsPrintingRedesigned(true);
                  document.body.classList.add('printing-report');
                  setTimeout(() => {
                    window.print();
                    document.title = originalTitle;
                  }, 1500); // Wait for all months to render
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
                  '&:hover': { backgroundColor: '#1E293B', borderColor: 'divider' }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>Technical Proposal</span>
                  <Chip label="NEW" size="small" color="error" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold' }} />
                </Box>
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={async () => {
                  if (!id || !clientOverview || !calcEntry) return;
                  try {
                    let dashboard_hero_kpis_screenshot = '';
                    let dashboard_charts_screenshot = '';

                    const heroKpisEl = document.getElementById('dashboard-hero-kpis-screenshot-target');
                    if (heroKpisEl) {
                      try {
                        const canvas = await html2canvas(heroKpisEl, {
                          scale: 2,
                          useCORS: true,
                          allowTaint: true,
                          backgroundColor: '#F8FAFC'
                        });
                        const imgData = canvas.toDataURL('image/png');
                        dashboard_hero_kpis_screenshot = imgData.replace(/^data:image\/png;base64,/, '');
                      } catch (screenshotErr) {
                        console.error('Failed to capture dashboard hero/kpis screenshot:', screenshotErr);
                      }
                    }

                    const chartsEl = document.getElementById('dashboard-screenshot-target');
                    if (chartsEl) {
                      try {
                        const canvas = await html2canvas(chartsEl, {
                          scale: 2,
                          useCORS: true,
                          allowTaint: true,
                          backgroundColor: '#F8FAFC'
                        });
                        const imgData = canvas.toDataURL('image/png');
                        dashboard_charts_screenshot = imgData.replace(/^data:image\/png;base64,/, '');
                      } catch (screenshotErr) {
                        console.error('Failed to capture dashboard charts screenshot:', screenshotErr);
                      }
                    }

                    setCalculating(true);
                    const clientData = {
                      client_name: calcEntry.clientName,
                      industry_name: calcEntry.industryName,
                      sanctioned_load: calcEntry.sanctionedLoadKw,
                      connectivity: calcEntry.voltageLevel,
                      discom_name: calcEntry.discom,
                      feeder_type: (calcEntry as any).feederType || 'Dedicated',
                      average_monthly_savings: clientOverview.months.length > 0 ? (clientOverview.totalSavings || 0) / clientOverview.months.length : 0,
                      average_annual_savings: clientOverview.months.length > 0 ? ((clientOverview.totalSavings || 0) / clientOverview.months.length) * 12 : 0,
                      smart_metering_infra_cost: calcEntry.meteringCharges || 0,
                      monthly_probus_savings_amount: clientOverview.months.length > 0 ? (clientOverview.totalSavings || 0) / clientOverview.months.length : 0,
                      monthlyData: clientOverview.months.map((m: any) => ({
                        month: m.month,
                        total_energy_kwh: m.totalEnergyKwh || 0,
                        total_market_energy_kwh: m.totalMarketEnergyKwh || 0,
                        consumer_bus_units: m.oaConsumer ?? m.clearedUnitsKwh ?? m.cleared ?? (m.oaCoverage != null ? ((m.totalEnergyKwh || 0) * m.oaCoverage / 100) : ((m.totalMarketEnergyKwh || 0) * (1 - (m.busLoss ? m.busLoss / 100 : 0.1211)))),
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
                    setSnackbar({ open: true, message: 'Technical proposal downloaded successfully!', severity: 'success' });
                  } catch (err: any) {
                    console.error('Failed to export Technical Proposal', err);
                    setSnackbar({ open: true, message: err.message || 'Technical proposal export failed', severity: 'error' });
                  } finally {
                    setCalculating(false);
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
                  '&:hover': { backgroundColor: '#1E293B', borderColor: 'divider' }
                }}
              >
                Technical Proposal
                <Chip 
                  label="LATEST" 
                  size="small" 
                  sx={{ 
                    ml: 1, 
                    backgroundColor: '#d32f2f', 
                    color: 'white', 
                    height: '20px', 
                    fontSize: '11px', 
                    fontWeight: 'bold',
                    '& .MuiChip-label': { px: 1 }
                  }} 
                />
              </Button>





              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => setCommercialModalOpen(true)}
                sx={{
                  textTransform: 'none',
                  borderRadius: 2.5,
                  fontWeight: 600,
                  borderColor: 'divider',
                  backgroundColor: '#D97706',
                  color: 'white',
                  px: 2.5,
                  py: 1,
                  '&:hover': { backgroundColor: '#B45309', borderColor: 'divider' }
                }}
              >
                Commercial Proposal
              </Button>
            </Box>
          )}

          {calculating && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
              <CircularProgress sx={{ color: '#8B5CF6' }} />
              <Typography variant="body2" color="text.secondary">
                Running custom TOD cost simulations and analyzing 15-minute slot metrics...
              </Typography>
            </Box>
          )}

          {/* Render Full Dashboard Component */}
          {marketDecisionResult && !calculating && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
              <Box id="dashboard-screenshot-target" sx={{ mt: 1, bgcolor: '#F8FAFC', p: 2, borderRadius: 2 }}>
                <Dashboard
                  calcResult={marketDecisionResult}
                  calcEntry={calcEntry as any}
                  clientName={calcEntry?.clientName}
                  clientOverview={clientOverview}
                  marketDecisionResult={marketDecisionResult}
                  selectedMonth={selectedSimMonth}
                />
              </Box>


              <div id="proposal-export-target-new" style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '1200px' }}>
                <ProposalDashboardExport 
                  clientOverview={clientOverview} 
                  marketDecisionResult={marketDecisionResult} 
                  demandShiftInsights={null} 
                  selectedMonth={selectedSimMonth} 
                />
              </div>
            </Box>
          )}
        </Box>

        {/* Heatmap Dialogs */}
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
      </Box>

      {/* Hidden PDF Report component rendered via Portal for high-res printing */}
      {isPrintingRedesigned && calcEntry && Object.keys(cachedResults).length > 0 && createPortal(
        <Box className="print-container">
          <RedesignedSavingsReport
            calcEntry={calcEntry}
            allResults={Object.keys(cachedResults).map(m => ({ month: m, marketDecisionResult: cachedResults[m] }))}
          />
        </Box>,
        document.body
      )}

      {/* Commercial Proposal Custom Modal */}
      <CommercialProposalModal
        open={commercialModalOpen}
        onClose={() => setCommercialModalOpen(false)}
        initialData={{
          client_name: calcEntry?.clientName,
          industry_name: calcEntry?.industryName,
          sanctioned_load: calcEntry?.sanctionedLoadKw,
          connectivity: calcEntry?.voltageLevel,
          discom_name: calcEntry?.discom,
          traderMargin: calcEntry?.traderMargin,
          probusPlatformFee: calcEntry?.probusPlatformFee,
          proltMargin: calcEntry?.proltMargin
        }}
        onSubmit={async (formData) => {
          try {
            await exportCommercialProposalWord(formData);
            setSnackbar({ open: true, message: 'Commercial proposal downloaded successfully!', severity: 'success' });
          } catch (err: any) {
            setSnackbar({ open: true, message: err.message || 'Commercial proposal export failed', severity: 'error' });
          }
        }}
      />

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
    </Box>
  );
}
