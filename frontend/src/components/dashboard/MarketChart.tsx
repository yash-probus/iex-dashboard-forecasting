import React, { useState } from 'react';
import { Paper, Box, Typography, IconButton, Button } from '@mui/material';
import { CalendarToday as CalendarIcon } from '@mui/icons-material';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { formatTimeblock } from '../../utils/date';

export interface ChartMetric {
  key: string;
  name: string;
  color: string;
  type: 'area' | 'line';
  yAxisId: 'left' | 'right';
  unit?: string;
  stackId?: string;
}

interface MarketChartProps {
  title: string;
  data: any[];
  metrics: ChartMetric[];
  dateRangeLabel: string;
  interval?: string;
  height?: number;
}

export default function MarketChart({ title, data, metrics, dateRangeLabel, interval = '15min', height = 540 }: MarketChartProps) {
  // State to handle toggling metric visibility
  const [hiddenMetrics, setHiddenMetrics] = useState<Record<string, boolean>>({});

  const handleLegendClick = (e: any) => {
    const key = e.dataKey;
    setHiddenMetrics(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Format X-Axis dynamically. If data is hourly/daily/etc it will just print the string.
  const formatXAxis = (tickItem: any) => {
    if (!tickItem) return '';
    // If it's a raw number, it's a timeblock. Let's just return it using unified formatting.
    if (typeof tickItem === 'number') return formatTimeblock(tickItem);
    // If it's a string like "2026-06-19-12" (hourly), format it
    if (typeof tickItem === 'string' && tickItem.split('-').length === 4) {
      const parts = tickItem.split('-');
      return `${parts[3]}:00`; // Return the hour
    }
    // If it's a date string like "2026-06-19" or "14-01-2026", format as nice date
    if (typeof tickItem === 'string' && tickItem.split('-').length === 3) {
      const parts = tickItem.split('-');
      let d = new Date(tickItem); // Try default parsing first

      // If it looks like DD-MM-YYYY (e.g. 14-01-2026)
      if (parts[0].length <= 2 && parts[2].length === 4) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        d = new Date(year, month, day);
      }
      // If it looks like YYYY-MM-DD (e.g. 2026-01-14)
      else if (parts[0].length === 4 && parts[2].length <= 2) {
        d = new Date(tickItem);
      }

      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    }
    return tickItem;
  };

  const handleShowAll = () => {
    setHiddenMetrics({});
  };

  const hiddenKeys = Object.keys(hiddenMetrics).filter(k => hiddenMetrics[k]);
  const hiddenCount = hiddenKeys.length;
  const hasHiddenMetrics = hiddenCount > 0;
  const allHidden = metrics.length > 0 && hiddenCount === metrics.length;

  const getXAxisKey = () => {
    if (interval === 'daily' || interval === 'monthly') return 'label';
    if (data.length > 0) {
      // If it's timeBlock data but passed as strings like "00:00-00:15"
      if (interval === '15min' || interval === 'hourly') return 'label';
    }
    return 'label';
  };

  // Derive a generic label for the X axis
  let chartData = data.map(d => {
    let label = d.date;
    if (interval === '15min') {
      label = d.timeBlock || d.intervalTime || d.date;
    } else if (interval === 'hourly') {
      label = d.hour ? `${d.date}-${d.hour}` : d.date;
    }
    return { ...d, label };
  });

  // Daily interval requires oldest first graph sorting
  if (interval === 'daily') {
    chartData = [...chartData].reverse();
  }

  const xAxisKey = getXAxisKey();
  const hasLeftAxis = metrics.some(m => m.yAxisId === 'left' && !hiddenMetrics[m.key]);
  const hasRightAxis = metrics.some(m => m.yAxisId === 'right' && !hiddenMetrics[m.key]);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        borderRadius: 2,
        height: height,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h2" sx={{ color: 'text.primary', fontWeight: 700, letterSpacing: '-0.5px' }}>
            {title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', backgroundColor: 'background.default', px: 1.5, py: 0.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
            <CalendarIcon sx={{ fontSize: 14 }} />
            <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {dateRangeLabel}
            </Typography>
          </Box>
        </Box>
        {hasHiddenMetrics && (
          <Button
            size="small"
            variant="outlined"
            onClick={handleShowAll}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '12px',
              color: '#8B5CF6',
              borderColor: '#8B5CF6',
              py: 0.5,
              px: 1.5,
              '&:hover': { bgcolor: 'rgba(139, 92, 246, 0.08)', borderColor: '#7C3AED' }
            }}
          >
            Show All Series ({metrics.length - hiddenCount}/{metrics.length})
          </Button>
        )}
      </Box>

      <Box sx={{ flexGrow: 1, width: '100%', minHeight: 0, position: 'relative' }}>
        {allHidden && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              zIndex: 10,
              bgcolor: 'rgba(255, 255, 255, 0.95)',
              p: 3,
              borderRadius: 3,
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
              border: '1px solid #E2E8F0',
              backdropFilter: 'blur(4px)'
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1E293B', mb: 0.5 }}>
              All Chart Series Hidden
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B', mb: 2 }}>
              You have hidden all series by clicking legend items.
            </Typography>
            <Button
              variant="contained"
              onClick={handleShowAll}
              sx={{
                bgcolor: '#8B5CF6',
                '&:hover': { bgcolor: '#7C3AED' },
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              Show All Series
            </Button>
          </Box>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
            <defs>
              {metrics.map(metric => (
                <linearGradient key={`grad-${metric.key}`} id={`grad-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={metric.color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={metric.color} stopOpacity={0.0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
            <XAxis
              dataKey={xAxisKey}
              tickFormatter={formatXAxis}
              tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 500 }}
              axisLine={{ stroke: '#F0F0F0' }}
              tickLine={false}
              dy={10}
            />
            {/* Left Y Axis for Volume */}
            {hasLeftAxis && (
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
                width={60}
                domain={
                  metrics.some(m => m.yAxisId === 'left' && (m.key.toLowerCase().includes('mcp') || m.key.toLowerCase().includes('price') || m.name.toLowerCase().includes('price')))
                    ? [(dataMin: number) => Math.max(0, Number((dataMin - 0.5).toFixed(2))), (dataMax: number) => Number((dataMax + 0.5).toFixed(2))]
                    : [0, 'auto']
                }
              />
            )}
            {/* Right Y Axis for Price */}
            {hasRightAxis && (
              <YAxis
                yAxisId="right"
                orientation={hasLeftAxis ? "right" : "left"}
                tick={{ fontSize: 11, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
                width={55}
                domain={
                  metrics.some(m => m.yAxisId === 'right' && (m.key.toLowerCase().includes('mcp') || m.key.toLowerCase().includes('price') || m.name.toLowerCase().includes('price')))
                    ? [(dataMin: number) => Math.max(0, Number((dataMin - 0.5).toFixed(2))), (dataMax: number) => Number((dataMax + 0.5).toFixed(2))]
                    : [0, 'auto']
                }
              />
            )}

            <Tooltip
              contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '13px', padding: '12px' }}
              labelStyle={{ color: '#1E293B', fontWeight: 700, marginBottom: '8px', borderBottom: '1px solid #F0F0F0', paddingBottom: '4px' }}
              itemStyle={{ padding: '3px 0', fontWeight: 600 }}
              formatter={(value: any, name: string) => {
                if (typeof value === 'number') {
                  const metric = metrics.find(m => m.name === name);
                  const unitStr = metric && metric.unit ? ` ${metric.unit}` : '';
                  return [`${Number(value.toFixed(2)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}${unitStr}`, name];
                }
                return [value, name];
              }}
            />

            <Legend
              verticalAlign="bottom"
              wrapperStyle={{ fontSize: '13px', fontWeight: 600, paddingTop: '16px' }}
              onClick={handleLegendClick}
              iconType="circle"
            />

            {metrics.map(metric => {
              if (hiddenMetrics[metric.key]) return null;

              if (metric.type === 'area') {
                const isStacked = Boolean(metric.stackId);
                return (
                  <Area
                    key={metric.key}
                    yAxisId={metric.yAxisId}
                    type="monotone"
                    dataKey={metric.key}
                    name={metric.name}
                    fill={isStacked ? metric.color : `url(#grad-${metric.key})`}
                    stroke={metric.color}
                    strokeWidth={isStacked ? 1.5 : 2}
                    fillOpacity={isStacked ? 0.95 : 1}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    connectNulls={true}
                    stackId={metric.stackId}
                  />
                );
              }
              return (
                <Line
                  key={metric.key}
                  yAxisId={metric.yAxisId}
                  type="monotone"
                  dataKey={metric.key}
                  name={metric.name}
                  stroke={metric.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  connectNulls={true}
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
}
