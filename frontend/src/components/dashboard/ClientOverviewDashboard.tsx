import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, PieChart, Pie, AreaChart, Area } from 'recharts';
import { Box, Typography, Grid, Card, CardContent, Table, TableBody, TableCell, TableHead, TableRow, CircularProgress, Paper } from '@mui/material';
import { ClientOverviewResult } from '../../api/savingsCalculator.api';

interface ClientOverviewDashboardProps {
  clientOverview: ClientOverviewResult | null;
  overviewLoading: boolean;
}

export const ClientOverviewDashboard: React.FC<ClientOverviewDashboardProps> = ({ clientOverview, overviewLoading }) => {
  if (overviewLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8, flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <CircularProgress size={40} thickness={4} />
        <Typography variant="body1" color="text.secondary" fontWeight={500}>Aggregating executive dashboard...</Typography>
      </Box>
    );
  }

  if (!clientOverview) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} color="primary" gutterBottom sx={{ letterSpacing: '-0.02em' }}>
            {clientOverview.clientName}
          </Typography>
          <Typography variant="body1" color="text.secondary" fontWeight={500}>
            {clientOverview.industryName}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="overline" color="text.secondary" fontWeight={700}>Annual Net Savings</Typography>
          <Typography variant="h4" fontWeight={800} color="success.main" sx={{ letterSpacing: '-0.02em' }}>
            ₹{Number(clientOverview.totalSavings || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Typography>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, bgcolor: '#F8FAFC' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" fontWeight={700}>Avg Monthly Savings</Typography>
              <Typography variant="h5" fontWeight={800} color="primary.main">
                ₹{clientOverview.months?.length > 0 ? Number(clientOverview.totalSavings / clientOverview.months.length).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, bgcolor: '#F8FAFC' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" fontWeight={700}>Market Penetration</Typography>
              <Typography variant="h5" fontWeight={800} color="info.main">
                {(() => {
                  const totalE = clientOverview.months.reduce((s, m) => s + (m.totalEnergyKwh || 0), 0);
                  const marketE = clientOverview.months.reduce((s, m) => s + (m.totalMarketEnergyKwh || 0), 0);
                  return totalE > 0 ? ((marketE / totalE) * 100).toFixed(1) + '%' : '0%';
                })()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, bgcolor: '#F8FAFC' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" fontWeight={700}>Green Energy Volume</Typography>
              <Typography variant="h5" fontWeight={800} color="success.main">
                {(() => {
                  const marketE = clientOverview.months.reduce((s, m) => s + (m.totalMarketEnergyKwh || 0), 0);
                  return (marketE / 1000000).toFixed(2) + ' MUs';
                })()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Grid */}
      <Grid container spacing={3}>
        {/* Left Column: Bar Chart & Area Chart */}
        <Grid item xs={12} lg={7}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            
            {/* Monthly Savings Bar Chart */}
            <Box sx={{ width: '100%', height: 350, p: 2.5, bgcolor: 'background.paper', borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 800, color: 'text.primary' }}>Monthly Savings Projection</Typography>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clientOverview.months} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.2}/>
                    </linearGradient>
                    <linearGradient id="colorZero" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.2}/>
                    </linearGradient>
                    <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 600 }} dy={10} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 600 }} 
                    tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                  />
                  <Tooltip 
                    cursor={{ fill: '#F3F4F6' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number, name: string) => {
                      if (name === 'savings') return [`₹${value.toLocaleString('en-IN')}`, 'Net Savings'];
                      if (name === 'grossSavings') return [`₹${value.toLocaleString('en-IN')}`, 'Gross Savings'];
                      return [value, name];
                    }}
                    labelStyle={{ color: '#111827', fontWeight: 800, marginBottom: '6px' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} iconType="circle" />
                  <Bar name="Gross Savings (Before Prolt)" dataKey="grossSavings" fill="url(#colorGross)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar name="Net Savings" dataKey="savings" radius={[4, 4, 0, 0]} maxBarSize={32}>
                    {clientOverview.months.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.savings > 0 ? "url(#colorSavings)" : "url(#colorZero)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>

            {/* Energy Mix Area Chart */}
            <Box sx={{ width: '100%', height: 350, p: 2.5, bgcolor: 'background.paper', borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 800, color: 'text.primary' }}>Energy Sourcing Mix (Market vs DISCOM)</Typography>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={clientOverview.months.map(m => ({ 
                    month: m.month, 
                    Market: (m.totalMarketEnergyKwh || 0) / 1000, 
                    DISCOM: ((m.totalEnergyKwh || 0) - (m.totalMarketEnergyKwh || 0)) / 1000 
                  }))} 
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorMarket" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id="colorDiscom" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9CA3AF" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#9CA3AF" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 600 }} dy={10} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 600 }} 
                    tickFormatter={(value) => `${value.toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`${value.toLocaleString('en-IN')} kWh`, undefined]}
                    labelStyle={{ color: '#111827', fontWeight: 800, marginBottom: '6px' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} iconType="circle" />
                  <Area type="monotone" dataKey="DISCOM" stackId="1" stroke="#9CA3AF" strokeWidth={2} fill="url(#colorDiscom)" />
                  <Area type="monotone" dataKey="Market" stackId="1" stroke="#06B6D4" strokeWidth={2} fill="url(#colorMarket)" />
                </AreaChart>
              </ResponsiveContainer>
            </Box>

          </Box>
        </Grid>

        {/* Right Column: Pie Chart & Table */}
        <Grid item xs={12} lg={5}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
            
            {/* OA Cost Pie Chart */}
            {clientOverview.aggregatedCosts && (
              <Box sx={{ width: '100%', height: 400, p: 2.5, bgcolor: 'background.paper', borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 800, color: 'text.primary' }}>Annual Cost Breakdown</Typography>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <Pie
                      data={[
                        { name: 'Cross Subsidy', value: clientOverview.aggregatedCosts.cssCharge, color: '#3B82F6' },
                        { name: 'RPO Charge', value: clientOverview.aggregatedCosts.rpoCharge, color: '#10B981' },
                        { name: 'POC Charge', value: clientOverview.aggregatedCosts.pocCharge, color: '#F59E0B' },
                        { name: 'STU Charge', value: clientOverview.aggregatedCosts.stuCharge, color: '#8B5CF6' },
                        { name: 'Wheeling/DC', value: clientOverview.aggregatedCosts.dcCharge, color: '#EC4899' },
                        { name: 'IEX Fee', value: clientOverview.aggregatedCosts.iexFee, color: '#6366F1' },
                        { name: 'Trader Margin', value: clientOverview.aggregatedCosts.traderMarginTotal, color: '#14B8A6' },
                        { name: 'Daily Overhead', value: clientOverview.aggregatedCosts.dailyFixedOverhead, color: '#F43F5E' },
                        { name: 'Bid Fees', value: clientOverview.aggregatedCosts.bidApplicationFees, color: '#F97316' },
                        { name: 'Prolt Margin', value: clientOverview.aggregatedCosts.proltMarginCost, color: '#64748B' }
                      ].filter(d => d.value > 0)}
                      cx="50%"
                      cy="42%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {[
                        { name: 'Cross Subsidy', value: clientOverview.aggregatedCosts.cssCharge, color: '#3B82F6' },
                        { name: 'RPO Charge', value: clientOverview.aggregatedCosts.rpoCharge, color: '#10B981' },
                        { name: 'POC Charge', value: clientOverview.aggregatedCosts.pocCharge, color: '#F59E0B' },
                        { name: 'STU Charge', value: clientOverview.aggregatedCosts.stuCharge, color: '#8B5CF6' },
                        { name: 'Wheeling/DC', value: clientOverview.aggregatedCosts.dcCharge, color: '#EC4899' },
                        { name: 'IEX Fee', value: clientOverview.aggregatedCosts.iexFee, color: '#6366F1' },
                        { name: 'Trader Margin', value: clientOverview.aggregatedCosts.traderMarginTotal, color: '#14B8A6' },
                        { name: 'Daily Overhead', value: clientOverview.aggregatedCosts.dailyFixedOverhead, color: '#F43F5E' },
                        { name: 'Bid Fees', value: clientOverview.aggregatedCosts.bidApplicationFees, color: '#F97316' },
                        { name: 'Prolt Margin', value: clientOverview.aggregatedCosts.proltMarginCost, color: '#64748B' }
                      ].filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [`₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, 'Cost']}
                    />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '15px', fontSize: '11px', fontWeight: 600 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            )}

            {/* Data Table */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, overflow: 'hidden', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ overflowX: 'auto', flexGrow: 1 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800, bgcolor: '#F8FAFC' }}>Month</TableCell>
                        <TableCell sx={{ fontWeight: 800, textAlign: 'right', bgcolor: '#F8FAFC' }}>Saving for your business</TableCell>
                        <TableCell sx={{ fontWeight: 800, textAlign: 'right', bgcolor: '#F8FAFC' }}>Prolt Margin</TableCell>
                        <TableCell sx={{ fontWeight: 800, textAlign: 'right', bgcolor: '#F8FAFC' }}>Trader Margin</TableCell>
                        <TableCell sx={{ fontWeight: 800, textAlign: 'right', bgcolor: '#F8FAFC' }}>Consultancy Fee</TableCell>
                        <TableCell sx={{ fontWeight: 800, textAlign: 'right', bgcolor: '#F8FAFC' }}>Probus Platform Fee</TableCell>
                        <TableCell sx={{ fontWeight: 800, textAlign: 'right', bgcolor: '#F8FAFC' }}>Net Savings</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {clientOverview.months.map((m) => (
                        <TableRow key={m.month} hover>
                          <TableCell sx={{ fontWeight: 500 }}>{m.month}</TableCell>
                          <TableCell sx={{ textAlign: 'right', color: '#6366F1', fontWeight: 600 }}>
                            ₹{m.grossSavings ? m.grossSavings.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : 0}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>
                            ₹{m.proltMarginCost ? m.proltMarginCost.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : 0}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>
                            ₹{m.traderMargin ? m.traderMargin.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : 0}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>
                            ₹{m.consultancyFee ? m.consultancyFee.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : 0}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>
                            ₹{m.probusPlatformFee ? m.probusPlatformFee.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : 0}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>
                            {m.savings <= 0 ? (
                              <Typography variant="body2" color="error" fontWeight={700}>Not Eligible (₹0)</Typography>
                            ) : (
                              <Typography variant="body2" color="success.main" fontWeight={700}>₹{Number(m.savings || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Paper>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};
