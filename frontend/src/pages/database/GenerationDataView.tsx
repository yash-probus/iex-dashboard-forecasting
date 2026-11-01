import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  alpha,
  ToggleButton,
  ToggleButtonGroup,
  Grid,
  FormControl,
  Select,
  MenuItem
} from '@mui/material';import { ElectricBolt as ElectricBoltIcon } from '@mui/icons-material';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface RawGenData {
  timeStr: string;
  thermal: number;
  gas: number;
  nuclear: number;
  hydro: number;
  wind: number;
  solar: number;
  dataUpdatedAt?: string;
  fetchedAt?: string;
}

interface AdjustedGenData {
  timeStr: string;
  thermal: number;
  gas: number;
  nuclear: number;
  hydro: number;
  wind: number;
  solar: number;
}

interface GenerationDataViewProps {
  data: {
    raw: RawGenData[];
    adjusted: AdjustedGenData[];
  } | null;
  startDate: string;
  endDate: string;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  onExport: () => void;
  selectedSource: string;
  onSourceChange: (val: string) => void;
}

const COLORS = {
  thermal: '#EA580C', // Orange
  gas: '#F59E0B',     // Amber
  nuclear: '#8B5CF6', // Purple
  hydro: '#3B8FF3',   // Blue
  wind: '#10B981',    // Emerald
  solar: '#EAB308'    // Yellow
};

export default function GenerationDataView({ 
  data, 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange,
  onExport,
  selectedSource,
  onSourceChange
}: GenerationDataViewProps) {
  const [viewType, setViewType] = useState<'raw' | 'adjusted'>('adjusted');

  const showAllSources = selectedSource === 'all';
  const shouldShowSource = (source: 'thermal' | 'gas' | 'nuclear' | 'hydro' | 'wind' | 'solar') => showAllSources || selectedSource === source;

  const handleLegendClick = (payload: any) => {
    if (!payload || !payload.dataKey) return;
    const key = String(payload.dataKey).toLowerCase();
    if (!['thermal', 'gas', 'nuclear', 'hydro', 'wind', 'solar'].includes(key)) return;
    onSourceChange(selectedSource === key ? 'all' : key);
  };

  const handleViewChange = (
    event: React.MouseEvent<HTMLElement>,
    newView: 'raw' | 'adjusted' | null,
  ) => {
    if (newView !== null) {
      setViewType(newView);
    }
  };

  const chartData = viewType === 'raw' ? data?.raw : data?.adjusted;
  const latestSnapshot: any = chartData && chartData.length > 0 ? chartData[chartData.length - 1] : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Latest Snapshot Cards */}
      <Box>
        <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>Latest Snapshot</Typography>
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          overflowX: 'auto', 
          pb: 2,
          '&::-webkit-scrollbar': { height: '6px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: 'rgba(0,0,0,0.1)', borderRadius: '10px' },
          '&::-webkit-scrollbar-thumb:hover': { background: 'rgba(0,0,0,0.2)' }
        }}>
          <Box sx={{ minWidth: 160, flexShrink: 0, flex: 1 }}>
            <Card elevation={0} sx={{ bgcolor: alpha('#3B82F6', 0.08), borderRadius: 3, border: '1px solid', borderColor: alpha('#3B82F6', 0.2) }}>
              <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">LATEST TIME</Typography>
                <Typography variant="h6" color="#3B82F6">
                  {latestSnapshot?.timeStr
                    ? latestSnapshot.timeStr.length > 16
                      ? latestSnapshot.timeStr.slice(0, 16)
                      : latestSnapshot.timeStr
                    : '-'}
                </Typography>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ minWidth: 160, flexShrink: 0, flex: 1 }}>
            <Card elevation={0} sx={{ bgcolor: alpha(COLORS.thermal, 0.1), borderRadius: 3, border: '1px solid', borderColor: alpha(COLORS.thermal, 0.2), cursor: 'pointer', opacity: selectedSource === 'all' || selectedSource === 'thermal' ? 1 : 0.5 }} onClick={() => onSourceChange(selectedSource === 'thermal' ? 'all' : 'thermal')}>
              <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">THERMAL (MW)</Typography>
                <Typography variant="h6" color={COLORS.thermal}>{latestSnapshot?.thermal?.toLocaleString('en-IN') || '-'}</Typography>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ minWidth: 160, flexShrink: 0, flex: 1 }}>
            <Card elevation={0} sx={{ bgcolor: alpha(COLORS.gas, 0.1), borderRadius: 3, border: '1px solid', borderColor: alpha(COLORS.gas, 0.2), cursor: 'pointer', opacity: selectedSource === 'all' || selectedSource === 'gas' ? 1 : 0.5 }} onClick={() => onSourceChange(selectedSource === 'gas' ? 'all' : 'gas')}>
              <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">GAS (MW)</Typography>
                <Typography variant="h6" color={COLORS.gas}>{latestSnapshot?.gas?.toLocaleString('en-IN') || '-'}</Typography>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ minWidth: 160, flexShrink: 0, flex: 1 }}>
            <Card elevation={0} sx={{ bgcolor: alpha(COLORS.nuclear, 0.1), borderRadius: 3, border: '1px solid', borderColor: alpha(COLORS.nuclear, 0.2), cursor: 'pointer', opacity: selectedSource === 'all' || selectedSource === 'nuclear' ? 1 : 0.5 }} onClick={() => onSourceChange(selectedSource === 'nuclear' ? 'all' : 'nuclear')}>
              <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">NUCLEAR (MW)</Typography>
                <Typography variant="h6" color={COLORS.nuclear}>{latestSnapshot?.nuclear?.toLocaleString('en-IN') || '-'}</Typography>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ minWidth: 160, flexShrink: 0, flex: 1 }}>
            <Card elevation={0} sx={{ bgcolor: alpha(COLORS.hydro, 0.1), borderRadius: 3, border: '1px solid', borderColor: alpha(COLORS.hydro, 0.2), cursor: 'pointer', opacity: selectedSource === 'all' || selectedSource === 'hydro' ? 1 : 0.5 }} onClick={() => onSourceChange(selectedSource === 'hydro' ? 'all' : 'hydro')}>
              <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">HYDRO (MW)</Typography>
                <Typography variant="h6" color={COLORS.hydro}>{latestSnapshot?.hydro?.toLocaleString('en-IN') || '-'}</Typography>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ minWidth: 160, flexShrink: 0, flex: 1 }}>
            <Card elevation={0} sx={{ bgcolor: alpha(COLORS.wind, 0.1), borderRadius: 3, border: '1px solid', borderColor: alpha(COLORS.wind, 0.2), cursor: 'pointer', opacity: selectedSource === 'all' || selectedSource === 'wind' ? 1 : 0.5 }} onClick={() => onSourceChange(selectedSource === 'wind' ? 'all' : 'wind')}>
              <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">WIND (MW)</Typography>
                <Typography variant="h6" color={COLORS.wind}>{latestSnapshot?.wind?.toLocaleString('en-IN') || '-'}</Typography>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ minWidth: 160, flexShrink: 0, flex: 1 }}>
            <Card elevation={0} sx={{ bgcolor: alpha(COLORS.solar, 0.1), borderRadius: 3, border: '1px solid', borderColor: alpha(COLORS.solar, 0.2), cursor: 'pointer', opacity: selectedSource === 'all' || selectedSource === 'solar' ? 1 : 0.5 }} onClick={() => onSourceChange(selectedSource === 'solar' ? 'all' : 'solar')}>
              <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">SOLAR (MW)</Typography>
                <Typography variant="h6" color={COLORS.solar}>{latestSnapshot?.solar?.toLocaleString('en-IN') || '-'}</Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>Tip: Click on a card to filter the graph by that source.</Typography>
      </Box>

      {/* Date Pickers removed from here as they are now adjoining the heading in the parent */}

    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: alpha('#F29F67', 0.1),
                color: '#F29F67',
                mr: 2,
              }}
            >
              <ElectricBoltIcon />
            </Box>
            <Typography variant="h6" fontWeight="600">
              Graph Dashboard
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={selectedSource}
                onChange={(e) => onSourceChange(e.target.value as string)}
                displayEmpty
              >
                <MenuItem value="all">All Sources</MenuItem>
                <MenuItem value="thermal">Thermal</MenuItem>
                <MenuItem value="hydro">Hydro</MenuItem>
                <MenuItem value="nuclear">Nuclear</MenuItem>
                <MenuItem value="wind">Wind</MenuItem>
                <MenuItem value="solar">Solar</MenuItem>
                <MenuItem value="gas">Gas</MenuItem>
              </Select>
            </FormControl>
            <ToggleButtonGroup
              color="primary"
              value={viewType}
              exclusive
              onChange={handleViewChange}
              aria-label="View Type"
              size="small"
            >
              <ToggleButton value="adjusted">Adjusted (15-min)</ToggleButton>
              <ToggleButton value="raw">Raw (4-min)</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {(!data || (data.raw.length === 0 && data.adjusted.length === 0)) ? (
          <Typography color="text.secondary">No NPP Generation Data available for the selected date range.</Typography>
        ) : (
          <>
              <Box sx={{ width: '100%', mb: 2, mt: 2 }}>
                <ResponsiveContainer width="100%" height={450}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis 
                      dataKey="timeStr" 
                      tick={{ fontSize: 12, fill: '#64748B' }}
                      tickMargin={10}
                      tickFormatter={(val) => val.split(' ')[1] || val}
                      minTickGap={30}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: '#64748B' }}
                      tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                      width={45}
                    />
                    <Tooltip 
                      formatter={(value: any, name: string) => [`${Number(value).toLocaleString('en-IN')} MW`, name]}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                      itemStyle={{ fontWeight: 500 }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', cursor: 'pointer' }} onClick={handleLegendClick} />
                    {shouldShowSource('thermal') && <Area type="monotone" dataKey="thermal" name="Thermal" stackId="1" stroke={COLORS.thermal} fill={COLORS.thermal} />}
                    {shouldShowSource('gas') && <Area type="monotone" dataKey="gas" name="Gas" stackId="1" stroke={COLORS.gas} fill={COLORS.gas} />}
                    {shouldShowSource('nuclear') && <Area type="monotone" dataKey="nuclear" name="Nuclear" stackId="1" stroke={COLORS.nuclear} fill={COLORS.nuclear} />}
                    {shouldShowSource('hydro') && <Area type="monotone" dataKey="hydro" name="Hydro" stackId="1" stroke={COLORS.hydro} fill={COLORS.hydro} />}
                    {shouldShowSource('wind') && <Area type="monotone" dataKey="wind" name="Wind" stackId="1" stroke={COLORS.wind} fill={COLORS.wind} />}
                    {shouldShowSource('solar') && <Area type="monotone" dataKey="solar" name="Solar" stackId="1" stroke={COLORS.solar} fill={COLORS.solar} />}
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
          </>
        )}
      </CardContent>
    </Card>

    {/* Alerts History / Data Table */}
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" fontWeight="600">Generation Data Table</Typography>
          <button 
            onClick={onExport}
            style={{ 
              backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '8px 16px', 
              borderRadius: '8px', border: '1px solid #BFDBFE', cursor: 'pointer', fontWeight: 600
            }}
          >
            Export CSV
          </button>
        </Box>
        {(!data || (data.raw.length === 0 && data.adjusted.length === 0)) ? (
          <Typography color="text.secondary">No NPP Generation Data available.</Typography>
        ) : (
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #eee', maxHeight: 400, mt: 2 }}>
                <Table stickyHeader sx={{ tableLayout: 'fixed' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>Time</TableCell>
                      {shouldShowSource('thermal') && <TableCell align="center" sx={{ fontWeight: 'bold' }}>Thermal (MW)</TableCell>}
                      {shouldShowSource('gas') && <TableCell align="center" sx={{ fontWeight: 'bold' }}>Gas (MW)</TableCell>}
                      {shouldShowSource('nuclear') && <TableCell align="center" sx={{ fontWeight: 'bold' }}>Nuclear (MW)</TableCell>}
                      {shouldShowSource('hydro') && <TableCell align="center" sx={{ fontWeight: 'bold' }}>Hydro (MW)</TableCell>}
                      {shouldShowSource('wind') && <TableCell align="center" sx={{ fontWeight: 'bold' }}>Wind (MW)</TableCell>}
                      {shouldShowSource('solar') && <TableCell align="center" sx={{ fontWeight: 'bold' }}>Solar (MW)</TableCell>}
                      {viewType === 'raw' && (
                        <>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>Updated At</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>Fetched At</TableCell>
                        </>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {chartData?.map((row: any, i: number) => (
                      <TableRow key={i} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#F9FAFB' } }}>
                        <TableCell align="center">{row.timeStr}</TableCell>
                        {shouldShowSource('thermal') && <TableCell align="center">{row.thermal?.toLocaleString('en-IN') || 0}</TableCell>}
                        {shouldShowSource('gas') && <TableCell align="center">{row.gas?.toLocaleString('en-IN') || 0}</TableCell>}
                        {shouldShowSource('nuclear') && <TableCell align="center">{row.nuclear?.toLocaleString('en-IN') || 0}</TableCell>}
                        {shouldShowSource('hydro') && <TableCell align="center">{row.hydro?.toLocaleString('en-IN') || 0}</TableCell>}
                        {shouldShowSource('wind') && <TableCell align="center">{row.wind?.toLocaleString('en-IN') || 0}</TableCell>}
                        {shouldShowSource('solar') && <TableCell align="center">{row.solar?.toLocaleString('en-IN') || 0}</TableCell>}
                        {viewType === 'raw' && (
                          <>
                            <TableCell align="center">{row.dataUpdatedAt ? new Date(row.dataUpdatedAt).toLocaleString('en-IN') : '-'}</TableCell>
                            <TableCell align="center">{row.fetchedAt ? new Date(row.fetchedAt).toLocaleString('en-IN') : '-'}</TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
        )}
      </CardContent>
    </Card>

    </Box>
  );
}
