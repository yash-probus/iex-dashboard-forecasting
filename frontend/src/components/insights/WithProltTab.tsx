import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Card, CardContent, LinearProgress, Alert, Table, TableBody, TableCell, TableHead, TableRow, IconButton, CircularProgress } from '@mui/material';
import { BarChart as BarChartIcon, Timeline, ShowChart, AccountBalanceWallet, PictureAsPdf, Download } from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import html2pdf from 'html2pdf.js';

import { SavingsCalculatorEntry, ClientOverviewResult, calculateMarketDecision, MarketDecisionResult } from '../../api/savingsCalculator.api';

interface WithProltTabProps {
  entry: SavingsCalculatorEntry;
  overview: ClientOverviewResult;
  currentMonth: string;
}

export default function WithProltTab({ entry, overview, currentMonth }: WithProltTabProps) {
  const [marketDecisionData, setMarketDecisionData] = useState<MarketDecisionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch market decision data when month changes
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    
    calculateMarketDecision(entry.id, currentMonth)
      .then(result => {
        if (isMounted) {
          setMarketDecisionData(result);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to fetch market decision data:', err);
        if (isMounted) {
          setError(err.message || 'Failed to load data');
          setLoading(false);
        }
      });
    
    return () => { isMounted = false; };
  }, [entry.id, currentMonth]);

  // Compute dynamic aggregations based on overview data
  const totalSavings = overview.totalSavings || 0;
  
  // Attempt to find the specific month's data, else fallback to aggregating all months
  const monthData = overview.months.find(m => m.month === currentMonth);
  const totalUnits = monthData ? (monthData.totalEnergyKwh || 0) : overview.months.reduce((acc, m) => acc + (m.totalEnergyKwh || 0), 0);
  const oaUnits = monthData ? (monthData.totalMarketEnergyKwh || 0) : overview.months.reduce((acc, m) => acc + (m.totalMarketEnergyKwh || 0), 0);
  const discomUnits = Math.max(0, totalUnits - oaUnits);
  
  const oaPct = totalUnits > 0 ? Math.round((oaUnits / totalUnits) * 100) : 0;
  const discomPct = totalUnits > 0 ? 100 - oaPct : 0;

  // Calculate real metrics from API data
  const blendedRate = marketDecisionData && totalUnits > 0 
    ? (marketDecisionData.totalLandedExchangeCost || 0) / totalUnits 
    : 0;
  
  const discomOnlyRate = overview.aggregatedCosts?.totalDiscomCost && totalUnits > 0 
    ? overview.aggregatedCosts.totalDiscomCost / totalUnits 
    : 0;
  
  const rateImprovement = discomOnlyRate > 0 
    ? ((discomOnlyRate - blendedRate) / discomOnlyRate) * 100 
    : 0;

  const peakDemand = marketDecisionData?.peakDemand || overview.aggregatedCosts?.peakDemand || 0;
  const sanctionedLoad = entry.sanctionedLoadKw || 0;
  const demandUtilization = sanctionedLoad > 0 ? Math.round((peakDemand / sanctionedLoad) * 100) : 0;

  // Format Helpers
  const formatLakhs = (val: number) => `₹${(val / 100000).toFixed(2)}L`;
  const formatRate = (val: number) => `₹${val.toFixed(2)}/kWh`;

  // Generate ToD breakdown from market decision data
  const generateTodBreakdown = () => {
    if (!marketDecisionData?.todSummaries || !marketDecisionData?.oaDetailed?.breakdown) {
      return [];
    }
    
    return marketDecisionData.todSummaries.map((summary, index) => {
      const breakdown = marketDecisionData.oaDetailed?.breakdown[index];
      const total = summary.totalEnergyKwh || 0;
      const oaKwh = summary.marketEnergyKwh || 0;
      const discomKwh = Math.max(0, total - oaKwh);
      const discomPctVal = total > 0 ? ((discomKwh / total) * 100).toFixed(0) : '0';
      const oaPctVal = total > 0 ? ((oaKwh / total) * 100).toFixed(0) : '0';
      
      return {
        slot: summary.slabName || `ToD-${index + 1}`,
        discom: `${discomKwh.toLocaleString('en-IN')} kWh`,
        discomPct: `${discomPctVal}%`,
        oa: `${oaKwh.toLocaleString('en-IN')} kWh`,
        oaPct: `${oaPctVal}%`,
        total: `${total.toLocaleString('en-IN')} kWh`
      };
    });
  };

  // Generate daily rates from market decision data
  const generateDailyRates = () => {
    if (!marketDecisionData?.slotsData || marketDecisionData.slotsData.length === 0) {
      return [];
    }
    
    // Group by day and calculate daily average blended rate
    const dailyRates: Record<number, { totalCost: number; totalEnergy: number }> = {};
    
    marketDecisionData.slotsData.forEach(slot => {
      const dateObj = new Date(slot.date);
      const day = dateObj.getDate();
      
      if (!dailyRates[day]) {
        dailyRates[day] = { totalCost: 0, totalEnergy: 0 };
      }
      
      const energy = (slot.marketEnergy || 0) + (slot.discomEnergy || 0);
      const cost = (slot.marketEnergy || 0) * (slot.bestMarketLanding || 0) + (slot.discomEnergy || 0) * (slot.discomLanding || 0);
      
      dailyRates[day].totalCost += cost;
      dailyRates[day].totalEnergy += energy;
    });
    
    return Object.entries(dailyRates)
      .map(([day, data]) => ({
        day: parseInt(day),
        rate: data.totalEnergy > 0 ? data.totalCost / data.totalEnergy : 0
      }))
      .sort((a, b) => a.day - b.day);
  };

  const todBreakdown = generateTodBreakdown();
  const dailyRates = generateDailyRates();

  // Calculate cost breakdown percentages from real data
  const totalDiscomCost = overview.aggregatedCosts?.totalDiscomCost || 0;
  const energyCharges = overview.aggregatedCosts?.energyCharges || 0;
  const demandAndFixed = overview.aggregatedCosts?.demandAndFixedCharges || 0;
  const miscCharges = overview.aggregatedCosts?.miscellaneousCharges || 0;
  const penalties = overview.aggregatedCosts?.penaltiesAndAdjustments || 0;
  
  const energyPct = totalDiscomCost > 0 ? (energyCharges / totalDiscomCost) * 100 : 0;
  const demandPct = totalDiscomCost > 0 ? (demandAndFixed / totalDiscomCost) * 100 : 0;
  const miscPct = totalDiscomCost > 0 ? (miscCharges / totalDiscomCost) * 100 : 0;
  const penaltiesPct = totalDiscomCost > 0 ? (penalties / totalDiscomCost) * 100 : 0;

  const handlePdfDownload = (title: string) => {
    const element = document.getElementById('report-content-to-download');
    if (!element) return;
    const opt: any = {
      margin:       10,
      filename:     `${title} - ${currentMonth}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  return (
    <Box sx={{ display: 'flex', gap: 3 }}>
      {/* Main Content (Left) */}
      <Box id="report-content-to-download" sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
        
        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
            <CircularProgress />
          </Box>
        )}
        
        {error && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            Failed to load market data: {error}
          </Alert>
        )}
        
        {/* Monthly Performance Summary */}
        {!loading && marketDecisionData && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <BarChartIcon color="error" />
            <Typography variant="h6" fontWeight={700} color="text.primary">Monthly Performance Summary - {currentMonth}</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Procurement & cost performance for this month</Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}><StatCard label="Total Units Procured" value={`${totalUnits.toLocaleString('en-IN')} kWh`} /></Grid>
            <Grid item xs={12} md={3}><StatCard label="DISCOM Units" value={`${discomUnits.toLocaleString('en-IN')} kWh`} /></Grid>
            <Grid item xs={12} md={3}><StatCard label="OA Units" value={`${oaUnits.toLocaleString('en-IN')} kWh`} /></Grid>
            <Grid item xs={12} md={3}><StatCard label="Blended Effective Rate" value={formatRate(blendedRate)} highlight /></Grid>
            
            <Grid item xs={12} md={3}><StatCard label="DISCOM Only Effective Rate" value={formatRate(discomOnlyRate)} /></Grid>
            <Grid item xs={12} md={3}><StatCard label="Total Cost (Discom)" value={overview.aggregatedCosts?.totalDiscomCost ? formatLakhs(overview.aggregatedCosts.totalDiscomCost) : 'N/A'} /></Grid>
            <Grid item xs={12} md={3}><StatCard label="Savings Achieved" value={formatLakhs(marketDecisionData.totalSavings || monthData?.savings || totalSavings)} color="success.main" /></Grid>
            <Grid item xs={12} md={3}><StatCard label="Contract Demand Utilization" value={`${demandUtilization}%`} /></Grid>
          </Grid>

          <Alert severity="success" sx={{ mt: 2, borderRadius: 2, fontWeight: 600, bgcolor: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0' }}>
            Blended rate of <strong>{formatRate(blendedRate)}</strong> is {rateImprovement.toFixed(1)}% lower than DISCOM only baseline this month.
          </Alert>
        </Box>
        )}

        {/* Procurement Mix Overview */}
        {!loading && marketDecisionData && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <PieChartIcon color="error" />
            <Typography variant="h6" fontWeight={700} color="text.primary">Procurement Mix Overview (Actual vs Strategy)</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Compare your executed procurement mix with Prolt's optimized strategy for this billing period.</Typography>
          
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
            <CardContent sx={{ display: 'flex', pt: 4, pb: 0 }}>
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 2 }}>Actual Executed Mix</Typography>
                <Box sx={{ width: 120, height: 120, mb: 2 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[{ value: oaPct, fill: '#22C55E' }, { value: discomPct, fill: '#3B82F6' }]} innerRadius={40} outerRadius={60} dataKey="value" stroke="none" />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Typography variant="caption" fontWeight={700} color="success.main">● OA {oaPct}%</Typography>
                  <Typography variant="caption" fontWeight={700} color="primary.main">● DISCOM {discomPct}%</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>How energy was actually procured</Typography>
              </Box>
              
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', borderLeft: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 2 }}>Prolt Strategy Mix</Typography>
                <Box sx={{ width: 120, height: 120, mb: 2 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[{ value: oaPct + 3, fill: '#22C55E' }, { value: Math.max(0, discomPct - 3), fill: '#3B82F6' }]} innerRadius={40} outerRadius={60} dataKey="value" stroke="none" />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Typography variant="caption" fontWeight={700} color="success.main">● OA {Math.min(100, oaPct + 3)}% (Mock)</Typography>
                  <Typography variant="caption" fontWeight={700} color="primary.main">● DISCOM {Math.max(0, discomPct - 3)}% (Mock)</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Optimized procurement strategy for this period</Typography>
              </Box>
            </CardContent>
            
            <Box sx={{ p: 2, pt: 4 }}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>ToD Energy Source Breakdown</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>Monthly consumption per ToD slot with DISCOM vs OA contribution</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>ToD Slot</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>DISCOM Consumption</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>OA Consumption</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {todBreakdown.length > 0 ? todBreakdown.map((row, i) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{row.slot}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700} color="primary.main">{row.discom}</Typography>
                        <Typography variant="caption" color="text.secondary">({row.discomPct})</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700} color="success.main">{row.oa}</Typography>
                        <Typography variant="caption" color="text.secondary">({row.oaPct})</Typography>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{row.total}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
                        No ToD breakdown data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </Card>
        </Box>
        )}

        {/* 2-Column Layout */}
        {!loading && marketDecisionData && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            {/* Where Your Money Went */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <AccountBalanceWallet color="error" />
                <Typography variant="h6" fontWeight={700} color="text.primary">Where Your Money Went This Month</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Breakdown of all charges in your DISCOM bill</Typography>
              
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <BreakdownRow label="Energy Charges" percentage={energyPct} amount={formatLakhs(energyCharges)} color="#3B82F6" />
                    <BreakdownRow label="Demand & Fixed" percentage={demandPct} amount={formatLakhs(demandAndFixed)} color="#F59E0B" />
                    <BreakdownRow label="Penalties & Adjustments" percentage={penaltiesPct} amount={formatLakhs(penalties)} color="#EF4444" />
                    <BreakdownRow label="Miscellaneous" percentage={miscPct} amount={formatLakhs(miscCharges)} color="#10B981" />
                  </Box>
                  <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1" fontWeight={700}>Total Bill</Typography>
                    <Typography variant="h6" fontWeight={800}>{formatLakhs(totalDiscomCost)}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            {/* Contract Demand Optimization */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <ShowChart color="error" />
                <Typography variant="h6" fontWeight={700} color="text.primary">Contract Demand Optimization</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Peak demand vs contract demand utilization</Typography>
              
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, height: '100%' }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 4 }}>
                  {/* Gauge Mockup */}
                  <Box sx={{ width: 200, height: 100, position: 'relative', overflow: 'hidden', mb: 2 }}>
                    <Box sx={{ width: 200, height: 200, borderRadius: '50%', border: '20px solid #E5E7EB', borderTopColor: demandUtilization > 90 ? '#EF4444' : '#22C55E', borderLeftColor: demandUtilization > 90 ? '#EF4444' : '#22C55E', transform: 'rotate(45deg)', position: 'absolute', top: 0, left: 0 }} />
                    <Typography variant="h4" fontWeight={800} color={demandUtilization > 90 ? 'error.main' : 'success.main'} sx={{ position: 'absolute', bottom: 0, width: '100%', textAlign: 'center' }}>{demandUtilization}%</Typography>
                    <Typography variant="caption" fontWeight={700} color={demandUtilization > 90 ? 'error.main' : 'success.main'} sx={{ position: 'absolute', bottom: -20, width: '100%', textAlign: 'center' }}>{demandUtilization > 90 ? 'High' : 'Optimal'}</Typography>
                  </Box>
                  
                  <Grid container spacing={2} sx={{ mt: 2 }}>
                    <Grid item xs={6}>
                      <Box sx={{ bgcolor: '#F8FAFC', p: 1.5, borderRadius: 2, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>Contract Demand</Typography>
                        <Typography variant="body1" fontWeight={800}>{sanctionedLoad.toLocaleString()} kVA</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ bgcolor: '#F8FAFC', p: 1.5, borderRadius: 2, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>Peak Demand</Typography>
                        <Typography variant="body1" fontWeight={800}>{peakDemand.toLocaleString()} kVA</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  <Box sx={{ bgcolor: '#F8FAFC', p: 1.5, borderRadius: 2, textAlign: 'center', width: '100%', mt: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Monthly Fixed Charge</Typography>
                    <Typography variant="body1" fontWeight={800}>{formatLakhs(demandAndFixed)}</Typography>
                    <Typography variant="caption" color="text.secondary">@ ₹{overview.aggregatedCosts?.demandChargeRate || 0}/kVA</Typography>
                  </Box>
                  <Alert severity={demandUtilization > 90 ? 'warning' : 'success'} sx={{ width: '100%', mt: 2, py: 0 }}>
                    Your contract demand is <strong>{demandUtilization > 90 ? 'over-utilized' : 'well aligned'} with usage</strong> at {demandUtilization}% utilization.
                  </Alert>
                </CardContent>
              </Card>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            {/* Optimization Impact Analysis */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Timeline color="error" />
                <Typography variant="h6" fontWeight={700} color="text.primary">Optimization Impact Analysis</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Measurable outcomes from your optimized procurement strategy</Typography>
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={4}>
                  <Card elevation={0} sx={{ bgcolor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 2, height: '100%' }}>
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="caption" color="error.main" fontWeight={700}>Savings Achieved</Typography>
                      <Typography variant="h6" color="error.main" fontWeight={800}>{formatLakhs(marketDecisionData?.totalSavings || monthData?.savings || 0)}</Typography>
                      <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 1, lineHeight: 1.2 }}>Vs DISCOM-only baseline</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card elevation={0} sx={{ bgcolor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 2, height: '100%' }}>
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="caption" color="primary.main" fontWeight={700}>Cumulative YTD Savings</Typography>
                      <Typography variant="h6" color="primary.main" fontWeight={800}>{formatLakhs(totalSavings)}</Typography>
                      <Typography variant="caption" color="primary.main" sx={{ display: 'block', mt: 1, lineHeight: 1.2 }}>Jan-present</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card elevation={0} sx={{ bgcolor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 2, height: '100%' }}>
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="caption" color="success.main" fontWeight={700}>Blended Rate Improvement</Typography>
                      <Typography variant="h6" color="success.main" fontWeight={800}>{rateImprovement.toFixed(1)}%</Typography>
                      <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 1, lineHeight: 1.2 }}>Vs DISCOM rate</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              <Alert severity="success" sx={{ borderRadius: 2, fontWeight: 600, bgcolor: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0' }}>
                This month's procurement reduced energy costs by <strong>{rateImprovement.toFixed(1)}%</strong> compared to DISCOM only sourcing.
              </Alert>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            {/* Download Reports */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <PictureAsPdf color="error" />
                <Typography variant="h6" fontWeight={700} color="text.primary">Download Reports</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Export analysis and settlement reports for {currentMonth}</Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Card onClick={() => handlePdfDownload('Reconciliation Summary')} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: '#F8FAFC', cursor: 'pointer', '&:hover': { bgcolor: '#F1F5F9' } }}>
                  <CardContent sx={{ p: '16px !important', display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ bgcolor: '#DCFCE7', p: 1, borderRadius: 1.5, color: '#16A34A' }}>
                      <PictureAsPdf />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" fontWeight={700}>Reconciliation Summary - {currentMonth} (PDF)</Typography>
                      <Typography variant="caption" color="text.secondary">OA + DISCOM settlement reconciliation</Typography>
                    </Box>
                    <IconButton size="small"><Download /></IconButton>
                  </CardContent>
                </Card>
                
                <Card onClick={() => handlePdfDownload('Energy Purchase Monthly Report')} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: '#F8FAFC', cursor: 'pointer', '&:hover': { bgcolor: '#F1F5F9' } }}>
                  <CardContent sx={{ p: '16px !important', display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ bgcolor: '#EFF6FF', p: 1, borderRadius: 1.5, color: '#2563EB' }}>
                      <PictureAsPdf />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" fontWeight={700}>Energy Purchase Monthly Report - {currentMonth} (PDF)</Typography>
                      <Typography variant="caption" color="text.secondary">Monthly procurement + cost breakdown</Typography>
                    </Box>
                    <IconButton size="small"><Download /></IconButton>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          </Grid>
        </Grid>
        )}

        {/* Daily Blended Rate Trend */}
        {!loading && marketDecisionData && (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <ShowChart color="error" />
            <Typography variant="h6" fontWeight={700} color="text.primary">Daily Blended Rate Trend</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Daily effective energy rate for this billing period</Typography>
          
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
            <CardContent sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyRates} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value) => formatRate(value as number)} />
                  <Line type="monotone" dataKey="rate" stroke="#22C55E" strokeWidth={3} dot={{ fill: '#22C55E', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                <span style={{ color: '#22C55E' }}>●</span> Daily Blended Rate = (OA Cost + DISCOM Cost) / Total Consumption. Lower values indicate more efficient procurement days.
              </Typography>
            </CardContent>
          </Card>
        </Box>
        )}

      </Box>

      {/* Side Column (Right) */}
      <Box sx={{ width: 320, display: { xs: 'none', lg: 'block' } }}>
        <Card elevation={0} sx={{ border: '1px solid', borderColor: '#E2E8F0', borderRadius: 3, bgcolor: '#F8FAFC' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="caption" color="primary" fontWeight={700}>ONBOARDING IN PROGRESS</Typography>
              <Box sx={{ flexGrow: 1 }} />
              <Box sx={{ bgcolor: '#CBD5E1', color: 'white', px: 1, py: 0.25, borderRadius: 4, fontSize: '0.65rem', fontWeight: 800 }}>Step 3/8</Box>
            </Box>
            <Typography variant="subtitle2" fontWeight={800}>Document Collecti...</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>Upload your KYC documents to proceed.</Typography>
            <LinearProgress variant="determinate" value={37.5} sx={{ height: 6, borderRadius: 3, mb: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={500}>Immediate — upl...</Typography>
              <Typography variant="caption" color="primary" fontWeight={600} sx={{ cursor: 'pointer' }}>View Details →</Typography>
            </Box>
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 2, fontSize: '0.65rem' }}>Ticket: PROLT-ONBD-2305</Typography>
          </CardContent>
        </Card>
      </Box>

    </Box>
  );
}

// Helper components
const StatCard = ({ label, value, highlight = false, color = 'text.primary' }: { label: string, value: string, highlight?: boolean, color?: string }) => (
  <Card elevation={0} sx={{ border: highlight ? '1px solid #BBF7D0' : '1px solid', borderColor: highlight ? '#BBF7D0' : 'divider', borderRadius: 2, height: '100%', bgcolor: highlight ? '#F0FDF4' : '#F8FAFC' }}>
    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
      <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 1 }}>{label}</Typography>
      <Typography variant="h6" fontWeight={800} color={color}>{value}</Typography>
    </CardContent>
  </Card>
);

const BreakdownRow = ({ label, percentage, amount, color }: { label: string, percentage: number, amount: string, color: string }) => (
  <Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
        <Typography variant="body2" fontWeight={600} color="text.secondary">{label}</Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 3 }}>
        <Typography variant="body2" fontWeight={600} color="text.secondary">{percentage.toFixed(1)}%</Typography>
        <Typography variant="body2" fontWeight={800}>₹{amount}</Typography>
      </Box>
    </Box>
    <LinearProgress variant="determinate" value={percentage} sx={{ height: 6, borderRadius: 3, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: color } }} />
  </Box>
);

const PieChartIcon = ({ color }: { color: any }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: color === 'error' ? '#EF4444' : 'inherit' }}>
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
    <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
  </svg>
);
