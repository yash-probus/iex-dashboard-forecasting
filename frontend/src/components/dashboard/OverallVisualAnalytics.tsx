import React, { useMemo } from 'react';
import { Box, Card, Typography, Grid, useTheme } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { 
  ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, 
  ComposedChart, Line, ScatterChart, Scatter, ZAxis, Cell
} from 'recharts';

export const OverallVisualAnalytics: React.FC<{ clientOverview: any; selectedMonth?: string }> = ({ clientOverview, selectedMonth }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  if (!clientOverview || !clientOverview.months) return null;

  const formatMonthLabel = (rawMonth: string) => {
    if (!rawMonth) return '';
    const str = String(rawMonth).trim();

    // Handles "YYYY-MM" or "YYYY-MM-DD" (e.g. 2025-03 or 2025-03-01)
    const yyyyMm = str.match(/^(\d{4})[-/](\d{1,2})/);
    if (yyyyMm) {
      const year = Number(yyyyMm[1]);
      const month = Number(yyyyMm[2]);
      const d = new Date(year, month - 1, 1);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      }
    }

    // Handles "MM/YYYY" or "M/YYYY" (e.g. 03/2025)
    const mmYyyy = str.match(/^(\d{1,2})[-/](\d{4})/);
    if (mmYyyy) {
      const month = Number(mmYyyy[1]);
      const year = Number(mmYyyy[2]);
      const d = new Date(year, month - 1, 1);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      }
    }

    // Handles "Mon-YY" or "Mon YY" or "Mon-YYYY" (e.g. Mar-25, Mar 25, Mar 2025)
    const monYy = str.match(/^([A-Za-z]{3,})[- ]?(\d{2,4})$/);
    if (monYy) {
      const mon = monYy[1].slice(0, 3);
      const yr = monYy[2].length === 2 ? `20${monYy[2]}` : monYy[2];
      return `${mon} ${yr}`;
    }

    // Handles "YYYY Mon" or "YYYY Month" (e.g. 2025 Mar)
    const yyyyMon = str.match(/^(\d{4})[- ]+([A-Za-z]+)$/);
    if (yyyyMon) {
      const mon = yyyyMon[2].slice(0, 3);
      return `${mon} ${yyyyMon[1]}`;
    }

    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    }

    return str;
  };

  const formatMonthTick = (rawMonth: string) => {
    return formatMonthLabel(rawMonth);
  };

  let validMonths = clientOverview.months.filter((m: any) => !m.error);
  if (selectedMonth && selectedMonth !== 'all') {
    validMonths = validMonths.filter((m: any) => m.month === selectedMonth);
  }

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(num);
  };
  
  const formatLakhs = (val: number) => `₹${(val / 100000).toFixed(2)}L`;

  const formatIndianNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(num);
  };

  const renderSpreadTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const point = payload[0].payload;
    return (
      <Box
        sx={{
          backgroundColor: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          px: 1.5,
          py: 1,
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>{formatMonthLabel(point.monthLabel || point.month)}</Typography>
        <Typography variant="body2">Coverage: {Number(point.coverage || 0).toFixed(2)}%</Typography>
        <Typography variant="body2">Price spread: ₹{Number(point.grossRate || 0).toFixed(2)}/kWh</Typography>
      </Box>
    );
  };

  // Process data for charts
  const chartData = validMonths.map((m: any) => {
    // Prolt OA at Consumer Bus (after grid losses, as used in Excel)
    const recOaConsumer = m.oaConsumer ?? m.clearedUnitsKwh ?? m.cleared ?? (m.totalMarketEnergyKwh ? m.totalMarketEnergyKwh * (1 - (m.busLoss ? m.busLoss / 100 : 0.1211)) : 0);
    const recOa = Number(recOaConsumer.toFixed(2));
    const recDiscom = Number(Math.max(0, (m.totalEnergyKwh || 0) - recOa).toFixed(2));

    const actualOa = Number((m.actualOa || 0).toFixed(2));
    const actualDiscom = Number(Math.max(0, (m.totalEnergyKwh || 0) - actualOa).toFixed(2));

    let coverage = m.oaCoverage ?? (m.totalEnergyKwh ? (recOa / m.totalEnergyKwh) * 100 : 0);
    if (coverage > 100) coverage = 100;
    const netRate = m.totalEnergyKwh ? (m.savings / m.totalEnergyKwh) : 0;
    const grossRate = m.totalEnergyKwh ? ((m.grossSavings || m.savings) / m.totalEnergyKwh) : 0;
    
    const optimizedCost = Number(((m.totalEnergyKwh || 0) * 5.5).toFixed(2)); 
    const actualCost = Number((optimizedCost + (m.savings || 0)).toFixed(2));

    return {
      monthLabel: m.month,
      monthShort: formatMonthTick(m.month),
      clientSaving: Number((m.savings || 0).toFixed(2)),
      grossSaving: Number((m.grossSavings || (m.savings || 0)).toFixed(2)),
      coverage: Number(coverage.toFixed(2)),
      netRate: Number(netRate.toFixed(2)),
      grossRate: Number(grossRate.toFixed(2)),
      actualDiscom,
      actualOa,
      recDiscom,
      recOa,
      totalUnits: Number((m.totalEnergyKwh || 0).toFixed(2)),
      actualCost,
      recCost: optimizedCost
    };
  });

  // Calculate Insights
  const bestMonth = chartData.reduce((prev: any, current: any) => (prev.clientSaving > current.clientSaving) ? prev : current, chartData[0]);
  const strongestSpreadMonth = chartData.reduce((prev: any, current: any) => (prev.grossRate > current.grossRate) ? prev : current, chartData[0]);
  const lowestCoverageMonth = chartData.reduce((prev: any, current: any) => (prev.coverage < current.coverage) ? prev : current, chartData[0]);

  return (
    <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 4 }}>
      
      {/* 1. Monthly savings and Open Access coverage */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '18px', mb: 0.5 }}>
              Monthly savings and Open Access coverage
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Click a month in the matrix below to open its linked sub-report.
            </Typography>
            
            <Box sx={{ flex: 1, minHeight: 300 }}>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9'} />
                  <XAxis dataKey="monthShort" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748b' }} dy={10} interval={0} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? '#94A3B8' : '#64748b' }} tickFormatter={formatLakhs} />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: isDark ? '#94A3B8' : '#64748b' }} 
                    tickFormatter={(val: number) => `${Number(val).toFixed(2)}%`} 
                    domain={[0, 100]} 
                  />
                  <Tooltip 
                    cursor={{ fill: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc' }} 
                    contentStyle={{ borderRadius: '8px', border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : '#e2e8f0'}`, backgroundColor: isDark ? '#0E1422' : '#ffffff', color: isDark ? '#F8FAFC' : '#0F172A', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    labelFormatter={(label: any) => formatMonthLabel(label)}
                    formatter={(val: any, name: string) => [
                      typeof val === 'number' 
                        ? (name === 'Coverage' ? `${Number(val.toFixed(2))}%` : formatLakhs(val)) 
                        : val, 
                      name
                    ]}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                  <Bar yAxisId="left" dataKey="grossSaving" name="Gross saving" fill="#93c5fd" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar yAxisId="left" dataKey="clientSaving" name="Client saving" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                  <Line yAxisId="right" type="monotone" dataKey="coverage" name="Coverage" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </Box>

            <Box 
              sx={{ 
                mt: 2, 
                pt: 1.5, 
                borderTop: '1px solid', 
                borderColor: 'divider',
                display: 'flex', 
                alignItems: 'center', 
                gap: 1 
              }}
            >
              <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: 18 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '12px' }}>
                <strong>What is Coverage?</strong> Coverage represents the percentage of total monthly electricity consumption met through Open Access procurement (Consumer-bus Open Access Energy ÷ Total Billed Consumption × 100).
              </Typography>
            </Box>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '18px', mb: 0.5, color: 'text.primary' }}>
              Overall insights
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Commercial priorities derived from the 12-month summary
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
              <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: isDark ? 'rgba(34, 197, 94, 0.3)' : '#86efac', bgcolor: isDark ? 'rgba(34, 197, 94, 0.08)' : '#f0fdf4', borderLeft: '4px solid #22c55e' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, color: 'text.primary' }}>Best client-saving month: {formatMonthLabel(bestMonth?.monthLabel || bestMonth?.month)}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatLakhs(bestMonth?.clientSaving)} final saving with {bestMonth?.coverage.toFixed(2)}% OA coverage.
                </Typography>
              </Box>
              
              <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#fff', borderLeft: '4px solid #3b82f6' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, color: 'text.primary' }}>Strongest price advantage: {formatMonthLabel(strongestSpreadMonth?.monthLabel || strongestSpreadMonth?.month)}</Typography>
                <Typography variant="body2" color="text.secondary">
                  This means this month had the highest gross saving per unit: ₹{strongestSpreadMonth?.grossRate.toFixed(2)}/kWh (before platform/service fees).
                </Typography>
              </Box>
              
              <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#fff', borderLeft: '4px solid #eab308' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, color: 'text.primary' }}>Lowest coverage: {formatMonthLabel(lowestCoverageMonth?.monthLabel || lowestCoverageMonth?.month)}</Typography>
                <Typography variant="body2" color="text.secondary">
                  This means only {lowestCoverageMonth?.coverage.toFixed(2)}% of total consumption was served through OA in this month. Review scheduling, approvals, availability and forecasting constraints.
                </Typography>
              </Box>

              <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#fff', borderLeft: '4px solid #6366f1' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, color: 'text.primary' }}>Volume and price must be optimized together</Typography>
                <Typography variant="body2" color="text.secondary">
                  High coverage does not always guarantee the highest saving if market prices are unfavorable.
                </Typography>
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>


      {/* 3. Original Charts: Monthly Consumption Mix & Monthly Spend Comparison */}
      <Grid container spacing={3}>
        {/* Monthly Consumption Mix */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none', height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '18px', mb: 0.5, color: 'text.primary' }}>
              Monthly Consumption Mix - DISCOM vs OA
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Compare your actual energy source mix with Prolt's recommended distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} barCategoryGap="20%" margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9'} />
                <XAxis dataKey="monthShort" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748b' }} dy={10} interval={0} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? '#94A3B8' : '#64748b' }} tickFormatter={(v) => formatIndianNumber(v)} />
                <Tooltip
                  cursor={{ fill: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : '#e2e8f0'}`, backgroundColor: isDark ? '#0E1422' : '#ffffff', color: isDark ? '#F8FAFC' : '#0F172A', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelFormatter={(label: any) => formatMonthLabel(label)}
                  formatter={(val: number, name: string) => [
                    typeof val === 'number' ? `${Number(val.toFixed(2)).toLocaleString('en-IN', { maximumFractionDigits: 2 })} kWh` : val, 
                    name
                  ]}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                <Bar dataKey="actualDiscom" name="Actual DISCOM" stackId="actual" fill={isDark ? '#64748B' : '#94A3B8'} />
                <Bar dataKey="actualOa" name="Actual OA" stackId="actual" fill="#4ADE80" radius={[4, 4, 0, 0]} />
                <Bar dataKey="recDiscom" name="Prolt DISCOM" stackId="recommended" fill={isDark ? '#334155' : '#475569'} />
                <Bar dataKey="recOa" name="Prolt OA" stackId="recommended" fill="#16A34A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        {/* Monthly Spend Comparison */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none', height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '18px', mb: 0.5, color: 'text.primary' }}>
              Monthly Spend Comparison
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Compare actual costs versus the estimated optimized costs.
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9'} />
                <XAxis dataKey="monthShort" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748b' }} dy={10} interval={0} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? '#94A3B8' : '#64748b' }} tickFormatter={(v) => formatLakhs(v)} />
                <Tooltip
                  cursor={{ fill: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : '#e2e8f0'}`, backgroundColor: isDark ? '#0E1422' : '#ffffff', color: isDark ? '#F8FAFC' : '#0F172A', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelFormatter={(label: any) => formatMonthLabel(label)}
                  formatter={(val: number) => typeof val === 'number' ? formatCurrency(Number(val.toFixed(2))) : val}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                <Bar dataKey="actualCost" name="Actual" fill={isDark ? '#64748B' : '#94A3B8'} radius={[4, 4, 0, 0]} />
                <Bar dataKey="recCost" name="Optimized" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Grid>
      </Grid>
      
    </Box>
  );
};
