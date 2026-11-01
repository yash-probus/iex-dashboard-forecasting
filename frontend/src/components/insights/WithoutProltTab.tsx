import React from 'react';
import { Box, Typography, Grid, Card, CardContent, LinearProgress, Accordion, AccordionSummary, AccordionDetails, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { PersonOutline, ReceiptLong, ShowChart, AccountBalanceWallet, Speed, ExpandMore } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CalendarToday, ElectricBolt, ChevronLeft, ChevronRight, Description, WarningAmber } from '@mui/icons-material';

import { SavingsCalculatorEntry, ClientOverviewResult } from '../../api/savingsCalculator.api';

interface WithoutProltTabProps {
  entry: SavingsCalculatorEntry;
  overview: ClientOverviewResult;
  currentMonth: string;
}

const formatCurrency = (val?: number) => {
  if (val === undefined || val === null) return "N/A";
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
};

export default function WithoutProltTab({ entry, overview, currentMonth }: WithoutProltTabProps) {
  // Map ToD Consumptions for the current month if available
  const monthData = entry.todConsumptions?.[currentMonth] || {};
  const dynamicConsumptionData = Object.entries(monthData).map(([slab, val]) => ({
    name: slab,
    value: Number(val) || 0
  })).filter(d => d.value > 0);

  const chartData = dynamicConsumptionData;
  const currentMonthData = overview?.months?.find(m => m.month === currentMonth);
  const totalBilledUnits = currentMonthData?.totalEnergyKwh || 0;

  const netCurrentBill = overview?.aggregatedCosts?.totalDiscomCost || 0;
  const arrearAmount = entry.arrearAmount || 0;
  const currentLpsc = entry.currentLpsc || 0;
  const totalBill = netCurrentBill + arrearAmount + currentLpsc;

  const energyCharges = overview?.aggregatedCosts?.energyCharges || 0;
  const demandAndFixed = overview?.aggregatedCosts?.demandAndFixedCharges || 0;
  const penalties = overview?.aggregatedCosts?.penaltiesAndAdjustments || 0;
  const miscCharges = overview?.aggregatedCosts?.miscellaneousCharges || 0;
  const totalDiscomCost = overview?.aggregatedCosts?.totalDiscomCost || 0;

  const energyPct = totalDiscomCost > 0 ? (energyCharges / totalDiscomCost) * 100 : 0;
  const demandPct = totalDiscomCost > 0 ? (demandAndFixed / totalDiscomCost) * 100 : 0;
  const penaltiesPct = totalDiscomCost > 0 ? (penalties / totalDiscomCost) * 100 : 0;
  const miscPct = totalDiscomCost > 0 ? (miscCharges / totalDiscomCost) * 100 : 0;

  const formatLakhs = (val: number) => (val / 100000).toFixed(2) + 'L';
  const formatK = (val: number) => {
    if (val >= 100000 || val <= -100000) return formatLakhs(val);
    if (val >= 1000 || val <= -1000) return (val / 1000).toFixed(2) + 'K';
    return val.toFixed(2);
  };

  const peakDemand = overview?.aggregatedCosts?.peakDemand || 0;
  const demandChargeRate = overview?.aggregatedCosts?.demandChargeRate || 0;
  const sanctionedLoad = entry.sanctionedLoadKw || 0;
  const utilizationPct = sanctionedLoad > 0 ? Math.min(100, Math.round((peakDemand / sanctionedLoad) * 100)) : 0;



  return (
    <Box sx={{ display: 'flex', gap: 3 }}>
      
      {/* Main Content (Left) */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
        
        {/* Blue Grid Header Banner */}
        <Box sx={{ 
          position: 'relative', 
          bgcolor: '#EBF4FF', 
          borderRadius: 4, 
          overflow: 'hidden',
          backgroundImage: 'linear-gradient(#DBEAFE 1px, transparent 1px), linear-gradient(90deg, #DBEAFE 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          border: '1px solid #BFDBFE',
          mb: 6 // margin bottom for overlapping cards
        }}>
          <Box sx={{ p: { xs: 3, md: 5 }, pb: { xs: 8, md: 10 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'white', px: 2, py: 0.5, borderRadius: 5, border: '1px solid #E5E7EB' }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#22C55E', mr: 1 }} />
                <Typography variant="caption" fontWeight={700} color="text.secondary">ENERGY INSIGHTS EXPLORER</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#000', color: 'white', borderRadius: 5, px: 2, py: 0.5, cursor: 'pointer' }}>
                <ChevronLeft fontSize="small" sx={{ color: 'text.secondary' }} />
                <Typography variant="caption" sx={{ mx: 2, fontWeight: 600 }}>{currentMonth}</Typography>
                <ChevronRight fontSize="small" sx={{ color: 'text.secondary' }} />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 3 }}>
              <Box>
                <Typography variant="overline" color="text.secondary" fontWeight={700}>YOUR {currentMonth.toUpperCase()} BILL</Typography>
                <Typography variant="h4" fontWeight={800} color="#0F172A" sx={{ mt: 0.5, mb: 2, maxWidth: 800, textTransform: 'uppercase' }}>
                  {entry.clientName}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'white', px: 1.5, py: 0.5, borderRadius: 5, border: '1px solid #E5E7EB' }}>
                    <CalendarToday sx={{ fontSize: 14, color: '#3B82F6' }} />
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Month :</Typography>
                    <Typography variant="caption" fontWeight={700}>{currentMonth.split(' ')[0].toUpperCase()}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'white', px: 1.5, py: 0.5, borderRadius: 5, border: '1px solid #E5E7EB' }}>
                    <CalendarToday sx={{ fontSize: 14, color: '#3B82F6' }} />
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Billed on :</Typography>
                    <Typography variant="caption" fontWeight={700}>{entry.billDate?.toUpperCase() || "N/A"}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'white', px: 1.5, py: 0.5, borderRadius: 5, border: '1px solid #E5E7EB' }}>
                    <ElectricBolt sx={{ fontSize: 14, color: '#3B82F6' }} />
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Billed Units :</Typography>
                    <Typography variant="caption" fontWeight={700}>{totalBilledUnits.toLocaleString()} kWh</Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ bgcolor: 'white', p: 3, borderRadius: 4, border: '1px solid #E5E7EB', minWidth: 250, textAlign: 'center', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>AMOUNT PAYABLE</Typography>
                <Typography variant="h3" fontWeight={800} color="#2563EB" sx={{ my: 1 }}>₹{formatLakhs(totalBill)}</Typography>
                <Box sx={{ bgcolor: '#E0F2FE', px: 2, py: 1, borderRadius: 5, display: 'inline-block' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Includes ₹{formatLakhs(arrearAmount)} in arrears amount</Typography>
                </Box>
              </Box>
            </Box>
          </Box>
          
          {/* Overlapping Summary Cards */}
          <Box sx={{ 
            position: 'absolute', 
            bottom: '-40px', 
            left: '5%', 
            right: '5%',
            display: 'flex', 
            justifyContent: 'center'
          }}>
            <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 4, boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}>
              <CardContent sx={{ p: '0 !important', display: 'flex' }}>
                <Box sx={{ p: 2, minWidth: 160, borderRight: '1px solid #E5E7EB' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ bgcolor: '#DBEAFE', p: 0.5, borderRadius: '50%', display: 'flex' }}><ElectricBolt sx={{ fontSize: 14, color: '#3B82F6' }} /></Box> ENERGY CHARGES</Typography>
                  <Typography variant="h6" fontWeight={800} sx={{ mt: 1 }}>₹{formatLakhs(energyCharges)}</Typography>
                  <Typography variant="caption" color="text.secondary">{energyPct.toFixed(2)}% of your bill</Typography>
                </Box>
                <Box sx={{ p: 2, minWidth: 160, borderRight: '1px solid #E5E7EB' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ bgcolor: '#DBEAFE', p: 0.5, borderRadius: '50%', display: 'flex' }}><Description sx={{ fontSize: 14, color: '#3B82F6' }} /></Box> MISC CHARGES</Typography>
                  <Typography variant="h6" fontWeight={800} sx={{ mt: 1 }}>₹{formatLakhs(miscCharges)}</Typography>
                  <Typography variant="caption" color="text.secondary">Extra Cost Additions</Typography>
                </Box>
                <Box sx={{ p: 2, minWidth: 160, borderRight: '1px solid #E5E7EB' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ bgcolor: '#DBEAFE', p: 0.5, borderRadius: '50%', display: 'flex' }}><AccountBalanceWallet sx={{ fontSize: 14, color: '#3B82F6' }} /></Box> NET CURRENT BILL</Typography>
                  <Typography variant="h6" fontWeight={800} sx={{ mt: 1 }}>₹{formatLakhs(netCurrentBill)}</Typography>
                  <Typography variant="caption" color="text.secondary">Current month charges</Typography>
                </Box>
                <Box sx={{ p: 2, minWidth: 160, borderRight: '1px solid #E5E7EB' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ bgcolor: '#DBEAFE', p: 0.5, borderRadius: '50%', display: 'flex' }}><ReceiptLong sx={{ fontSize: 14, color: '#3B82F6' }} /></Box> ARREARS CARRIED</Typography>
                  <Typography variant="h6" fontWeight={800} sx={{ mt: 1 }}>₹{formatLakhs(arrearAmount)}</Typography>
                  <Typography variant="caption" color="text.secondary">Pay by {entry.billDate || 'due date'} to avoid penalty</Typography>
                </Box>
                <Box sx={{ p: 2, minWidth: 160 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ bgcolor: '#FEE2E2', p: 0.5, borderRadius: '50%', display: 'flex' }}><WarningAmber sx={{ fontSize: 14, color: '#EF4444' }} /></Box> CURRENT LPSC</Typography>
                  <Typography variant="h6" fontWeight={800} sx={{ mt: 1, color: '#EF4444' }}>₹{formatK(currentLpsc)}</Typography>
                  <Typography variant="caption" color="text.secondary">Late payment surcharge</Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Account Details Component */}
        <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 4, mb: 1 }}>
          <CardContent sx={{ p: 0 }}>
            {/* Header part of card */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3, borderBottom: '1px solid #E5E7EB' }}>
              <Box>
                <Typography variant="h6" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonOutline color="primary" /> {entry.clientName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                  {entry.address || "N/A"}
                </Typography>
              </Box>
              <Box sx={{ border: '1px solid #22C55E', color: '#166534', bgcolor: '#F0FDF4', px: 2, py: 0.5, borderRadius: 1 }}>
                <Typography variant="caption" fontWeight={700}>TYPE: UNKNOWN</Typography>
              </Box>
            </Box>
            {/* Grid part of card */}
            <Grid container sx={{ p: 3 }}>
              <Grid item xs={12} sm={4} sx={{ mb: 3 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ReceiptLong fontSize="small" color="primary" /> ACCOUNT NO.</Typography>
                <Typography variant="h6" fontWeight={800} sx={{ mt: 1, ml: 3.5 }}>{entry.id.substring(0, 11).toUpperCase()}</Typography>
              </Grid>
              <Grid item xs={12} sm={4} sx={{ mb: 3 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Speed fontSize="small" color="primary" /> SANCTIONED LOAD</Typography>
                <Typography variant="h6" fontWeight={800} sx={{ mt: 1, ml: 3.5 }}>{entry.sanctionedLoadKw ? `${entry.sanctionedLoadKw} kVA` : "N/A"}</Typography>
              </Grid>
              <Grid item xs={12} sm={4} sx={{ mb: 3 }} />
              
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ShowChart fontSize="small" color="primary" /> BILLED DEMAND</Typography>
                <Typography variant="h6" fontWeight={800} sx={{ mt: 1, ml: 3.5 }}>{entry.billedDemandKv ? `${entry.billedDemandKv}` : "N/A"}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ShowChart fontSize="small" color="primary" /> POWER FACTOR</Typography>
                <Typography variant="h6" fontWeight={800} sx={{ mt: 1, ml: 3.5 }}>{entry.powerFactor ? `${entry.powerFactor}` : "-"}</Typography>
              </Grid>
              <Grid item xs={12} sm={4} />

              <Grid item xs={12} sm={4} sx={{ mt: 3 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><PersonOutline fontSize="small" color="primary" /> SUPPLY TYPE</Typography>
                <Typography variant="h6" fontWeight={800} sx={{ mt: 1, ml: 3.5 }}>{entry.voltageLevel || "N/A"}</Typography>
              </Grid>
              <Grid item xs={12} sm={4} sx={{ mt: 3 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ReceiptLong fontSize="small" color="primary" /> TARIFF</Typography>
                <Typography variant="h6" fontWeight={800} sx={{ mt: 1, ml: 3.5 }}>{entry.consumerCategory || "N/A"}</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* DISCOM Consumption Breakdown */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <ShowChart color="primary" />
            <Typography variant="h6" fontWeight={700} color="text.primary">DISCOM Consumption Breakdown</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Where is consumption happening?</Typography>
          
          <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 4 }}>
            <CardContent sx={{ height: 350, p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Box sx={{ border: '1px solid #3B82F6', color: '#3B82F6', px: 2, py: 0.5, borderRadius: 1 }}>
                  <Typography variant="caption" fontWeight={700}>PEAK USAGE: TOD-4 SLOT 4 (23-24H / 0-5H) : 29%</Typography>
                </Box>
              </Box>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={{ stroke: '#E5E7EB' }} tickLine={false} />
                  <YAxis tickFormatter={(value) => `${value >= 1000 ? (value / 1000) + 'k' : value}`} tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
              {/* Custom Legend */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2, mt: 3 }}>
                {chartData.map((d, i) => (
                  <Box key={d.name} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#3B82F6' }} />
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>{d.name} ({totalBilledUnits > 0 ? ((d.value / totalBilledUnits) * 100).toFixed(2) : 0}%)</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* 2-Column Section */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <AccountBalanceWallet color="primary" />
                <Typography variant="h6" fontWeight={700} color="text.primary">Where your money went?</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>A clear split of the ₹{totalDiscomCost.toLocaleString()} of your DISCOM bill</Typography>
              
              <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 4, height: 350 }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', height: '100%', p: 4 }}>
                  <Box sx={{ position: 'relative', width: 200, height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Energy', value: energyCharges },
                            { name: 'Demand', value: demandAndFixed },
                            { name: 'Misc', value: miscCharges },
                            { name: 'Penalty', value: penalties }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={90}
                          dataKey="value"
                          stroke="none"
                        >
                          <Cell fill="#3B82F6" />
                          <Cell fill="#F59E0B" />
                          <Cell fill="#10B981" />
                          <Cell fill="#EF4444" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>TOTAL BILL</Typography>
                      <Typography variant="h5" fontWeight={800}>₹{formatLakhs(totalDiscomCost)}</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, ml: 4 }}>
                    <LegendRow label="Energy Charges" percentage={energyPct} amount={energyCharges} color="#3B82F6" />
                    <LegendRow label="Demand & Fixed" percentage={demandPct} amount={demandAndFixed} color="#F59E0B" />
                    <LegendRow label="Miscellaneous" percentage={miscPct} amount={miscCharges} color="#10B981" />
                    <LegendRow label="Penalties & Adjustments" percentage={penaltiesPct} amount={penalties} color="#EF4444" />
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Speed color="primary" />
                <Typography variant="h6" fontWeight={700} color="text.primary">Is your sanctioned load optimized?</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Identify fixed cost inefficiencies.</Typography>
              
              <Card elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: 4, height: 350 }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', height: '100%', p: 4, gap: 4 }}>
                  {/* Semi-circle Gauge */}
                  <Box sx={{ width: 250, height: 180, position: 'relative' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[{ value: utilizationPct }, { value: 100 - utilizationPct }]}
                          cx="50%"
                          cy="80%"
                          startAngle={180}
                          endAngle={0}
                          innerRadius={80}
                          outerRadius={100}
                          dataKey="value"
                          stroke="none"
                        >
                          <Cell fill="#22C55E" />
                          <Cell fill="#E5E7EB" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <Box sx={{ position: 'absolute', bottom: 10, left: 0, width: '100%', textAlign: 'center' }}>
                      <Typography variant="h4" fontWeight={800}>{utilizationPct}%</Typography>
                      <Typography variant="caption" fontWeight={700} color="success.main" sx={{ bgcolor: '#F0FDF4', px: 1, py: 0.2, borderRadius: 1, mt: 0.5, display: 'inline-block' }}>OPTIMAL</Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ border: '1px solid #E5E7EB', borderRadius: 2, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>SANCTIONED LOAD</Typography>
                        <Typography variant="h6" fontWeight={800}>{sanctionedLoad ? sanctionedLoad.toLocaleString() : 'N/A'}</Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>kVA</Typography>
                    </Box>
                    <Box sx={{ border: '1px solid #E5E7EB', borderRadius: 2, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>MAX DEMAND</Typography>
                        <Typography variant="h6" fontWeight={800}>{peakDemand ? peakDemand.toLocaleString() : 'N/A'}</Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>kVA</Typography>
                    </Box>
                    <Box sx={{ border: '1px solid #E5E7EB', borderRadius: 2, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>DEMAND CHARGE</Typography>
                        <Typography variant="h6" fontWeight={800}>₹{formatLakhs(demandAndFixed)}</Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>@ ₹{demandChargeRate}/kVA</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Grid>
        </Grid>

        {/* Detailed Bill Information */}
        {/* Detailed Bill Information */}
        <Box sx={{ mt: 2 }}>
          <Accordion elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '12px !important', mb: 2, '&:before': { display: 'none' }, bgcolor: '#F8FAFC' }}>
            <AccordionSummary expandIcon={<ExpandMore />} sx={{ fontWeight: 700, alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ bgcolor: '#DBEAFE', color: '#2563EB', p: 1, borderRadius: 2, display: 'flex' }}><ReceiptLong fontSize="small" /></Box>
                <Box>
                  <Typography variant="body1" fontWeight={700}>Meter Details</Typography>
                  <Typography variant="caption" color="text.secondary">Readings, multipliers and demand</Typography>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <Box sx={{ bgcolor: 'white', borderTop: '1px solid #E5E7EB', p: 3, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={2.4} sx={{ borderRight: { sm: '1px solid #E5E7EB' } }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>METER NUMBER</Typography>
                    <Typography variant="body1" fontWeight={800} sx={{ mt: 0.5 }}>{'4006362'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={2.4} sx={{ borderRight: { sm: '1px solid #E5E7EB' }, pl: { sm: 2 } }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>ENERGY TYPE</Typography>
                    <Typography variant="body1" fontWeight={800} sx={{ mt: 0.5 }}>KVAH</Typography>
                  </Grid>
                  <Grid item xs={12} sm={2.4} sx={{ borderRight: { sm: '1px solid #E5E7EB' }, pl: { sm: 2 } }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>MULTIPLICATION FACTOR</Typography>
                    <Typography variant="body1" fontWeight={800} sx={{ mt: 0.5 }}>{'30'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={2.4} sx={{ borderRight: { sm: '1px solid #E5E7EB' }, pl: { sm: 2 } }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>METER UNITS</Typography>
                    <Typography variant="body1" fontWeight={800} sx={{ mt: 0.5 }}>{totalBilledUnits.toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={2.4} sx={{ pl: { sm: 2 } }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>RECORDED DEMAND</Typography>
                    <Typography variant="body1" fontWeight={800} sx={{ mt: 0.5 }}>{peakDemand ? `${peakDemand} kVA` : 'N/A'}</Typography>
                  </Grid>
                </Grid>
              </Box>
            </AccordionDetails>
          </Accordion>

          <Accordion elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '12px !important', mb: 2, '&:before': { display: 'none' }, bgcolor: '#F8FAFC' }}>
            <AccordionSummary expandIcon={<ExpandMore />} sx={{ fontWeight: 700, alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ bgcolor: '#DBEAFE', color: '#2563EB', p: 1, borderRadius: 2, display: 'flex' }}><ShowChart fontSize="small" /></Box>
                <Box>
                  <Typography variant="body1" fontWeight={700}>ToD Calculation Details</Typography>
                  <Typography variant="caption" color="text.secondary">Slot-wise units, tariff and energy charge</Typography>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <Box sx={{ bgcolor: 'white', borderTop: '1px solid #E5E7EB', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, overflowX: 'auto' }}>
                <Table sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: 'text.secondary', fontWeight: 700, borderBottom: '1px solid #E5E7EB' }}>TOD SLOT</TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontWeight: 700, borderBottom: '1px solid #E5E7EB' }}>Difference (kWh)</TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontWeight: 700, borderBottom: '1px solid #E5E7EB' }}>AMOUNT (₹)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {chartData.map((d, i) => (
                      <TableRow key={d.name} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell sx={{ fontWeight: 800 }}>{d.name}</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>{d.value.toLocaleString()}</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>-</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </AccordionDetails>
          </Accordion>

          <Accordion elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '12px !important', mb: 2, '&:before': { display: 'none' }, bgcolor: '#F8FAFC' }}>
            <AccordionSummary expandIcon={<ExpandMore />} sx={{ fontWeight: 700, alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ bgcolor: '#DBEAFE', color: '#2563EB', p: 1, borderRadius: 2, display: 'flex' }}><AccountBalanceWallet fontSize="small" /></Box>
                <Box>
                  <Typography variant="body1" fontWeight={700}>Connection Details</Typography>
                  <Typography variant="caption" color="text.secondary">Tariff, supply and contracted load</Typography>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <Box sx={{ bgcolor: 'white', borderTop: '1px solid #E5E7EB', p: 3, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={2.4} sx={{ borderRight: { sm: '1px solid #E5E7EB' } }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>DIVISION</Typography>
                    <Typography variant="body1" fontWeight={800} sx={{ mt: 0.5 }}>{entry.discom || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={2.4} sx={{ borderRight: { sm: '1px solid #E5E7EB' }, pl: { sm: 2 } }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>SUBDIVISION</Typography>
                    <Typography variant="body1" fontWeight={800} sx={{ mt: 0.5 }}>{entry.stateCode || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={2.4} sx={{ borderRight: { sm: '1px solid #E5E7EB' }, pl: { sm: 2 } }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>VOLTAGE LEVEL</Typography>
                    <Typography variant="body1" fontWeight={800} sx={{ mt: 0.5 }}>{entry.voltageLevel || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={2.4} sx={{ borderRight: { sm: '1px solid #E5E7EB' }, pl: { sm: 2 } }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>CATEGORY</Typography>
                    <Typography variant="body1" fontWeight={800} sx={{ mt: 0.5 }}>{entry.industryName || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={2.4} sx={{ pl: { sm: 2 } }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>CONNECTION DATE</Typography>
                    <Typography variant="body1" fontWeight={800} sx={{ mt: 0.5 }}>N/A</Typography>
                  </Grid>
                </Grid>
              </Box>
            </AccordionDetails>
          </Accordion>
        </Box>

      </Box>
    </Box>
  );
}

// Helper components
const DetailCard = ({ label, value, icon }: { label: string, value: string, icon: string }) => (
  <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: 'text.secondary' }}>
        <Typography variant="caption" fontWeight={600}>{label}</Typography>
      </Box>
      <Typography variant="body2" fontWeight={800}>{value}</Typography>
    </CardContent>
  </Card>
);

const SummaryCard = ({ label, value, highlight = false }: { label: string, value: string, highlight?: boolean }) => (
  <Card elevation={0} sx={{ border: highlight ? '1px solid #93C5FD' : '1px solid', borderColor: highlight ? '#93C5FD' : 'divider', borderRadius: 2, height: '100%', bgcolor: highlight ? '#EFF6FF' : 'white' }}>
    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, color: highlight ? 'primary.main' : 'text.secondary' }}>
        <Typography variant="caption" fontWeight={600}>{label}</Typography>
      </Box>
      <Typography variant="body1" fontWeight={800} color={highlight ? 'primary.main' : 'text.primary'}>{value}</Typography>
    </CardContent>
  </Card>
);

const LegendRow = ({ label, percentage, amount, color }: { label: string, percentage: number, amount: number, color: string }) => (
  <Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
        <Typography variant="body2" fontWeight={600} color="text.secondary">{label}</Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 3 }}>
        <Typography variant="body2" fontWeight={600} color="text.secondary">{percentage.toFixed(1)}%</Typography>
        <Typography variant="body2" fontWeight={800}>₹{(amount / 100000).toFixed(2)}L</Typography>
      </Box>
    </Box>
  </Box>
);
