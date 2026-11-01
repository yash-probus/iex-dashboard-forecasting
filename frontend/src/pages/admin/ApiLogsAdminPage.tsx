import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Chip, CircularProgress,
  TextField, Select, MenuItem, FormControl, InputLabel, Button,
  TablePagination, Grid, alpha
} from '@mui/material';
import { 
  Percent as AccuracyIcon, 
  History as HistoryIcon, 
  CheckCircleOutline as SuccessIcon, 
  Warning as ErrorIcon 
} from '@mui/icons-material';
import { fetchApiLogs, fetchUniqueApiNames, ApiLog, fetchApiLogStats, ApiLogStats } from '../../api/apiLog.api';
import DateRangePicker from '../../components/common/DateRangePicker';

export default function ApiLogsAdminPage() {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // Stats State
  const [stats, setStats] = useState<ApiLogStats>({
    total: 0,
    success: 0,
    error: 0,
    accuracy: 100
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Filter States
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const getTodayFormatted = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState<string>(getTodayFormatted());
  const [endDate, setEndDate] = useState<string>(getTodayFormatted());
  const [selectedApiName, setSelectedApiName] = useState<string>('');
  
  const [committedStartDate, setCommittedStartDate] = useState<string>(getTodayFormatted());
  const [committedEndDate, setCommittedEndDate] = useState<string>(getTodayFormatted());
  const [committedApiName, setCommittedApiName] = useState<string>('');

  const [apiNamesList, setApiNamesList] = useState<string[]>([]);

  useEffect(() => {
    loadApiNames();
  }, []);

  useEffect(() => {
    loadLogs();
    loadStats();
  }, [page, rowsPerPage, committedStartDate, committedEndDate, committedApiName]);

  const loadApiNames = async () => {
    try {
      const names = await fetchUniqueApiNames();
      setApiNamesList(names);
    } catch (error) {
      console.error('Failed to load API names', error);
    }
  };

  const loadLogs = async () => {
    try {
      setLoading(true);
      // Backend expects 1-based page, MUI is 0-based
      const result = await fetchApiLogs(
        page + 1, 
        rowsPerPage, 
        committedStartDate || undefined, 
        committedEndDate || undefined, 
        committedApiName || undefined
      );
      setLogs(result.data);
      setTotalRecords(result.total);
    } catch (error) {
      console.error('Failed to load API logs', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const result = await fetchApiLogStats(
        committedStartDate || undefined,
        committedEndDate || undefined,
        committedApiName || undefined
      );
      setStats(result);
    } catch (error) {
      console.error('Failed to load API log stats', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleSubmitFilters = () => {
    setCommittedStartDate(startDate);
    setCommittedEndDate(endDate);
    setCommittedApiName(selectedApiName);
    setPage(0);
  };

  const handleClearFilters = () => {
    const today = getTodayFormatted();
    setStartDate(today);
    setEndDate(today);
    setSelectedApiName('');
    
    setCommittedStartDate(today);
    setCommittedEndDate(today);
    setCommittedApiName('');
    setPage(0);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box sx={{ pb: 2, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
          API Health Logs
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Monitor the background fetching operations for external APIs.
        </Typography>
      </Box>

      {/* KPI Cards Section */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { 
            title: 'API Accuracy', 
            value: `${stats.accuracy.toFixed(1)}%`, 
            icon: <AccuracyIcon color="success" sx={{ fontSize: 32 }} />, 
            color: 'success.main', 
            bgcolor: 'rgba(46, 204, 113, 0.1)' 
          },
          { 
            title: 'Total Requests', 
            value: stats.total, 
            icon: <HistoryIcon color="primary" sx={{ fontSize: 32 }} />, 
            color: 'primary.main', 
            bgcolor: 'rgba(59, 143, 243, 0.1)' 
          },
          { 
            title: 'Successful Calls', 
            value: stats.success, 
            icon: <SuccessIcon color="success" sx={{ fontSize: 32 }} />, 
            color: 'success.main', 
            bgcolor: 'rgba(46, 204, 113, 0.1)' 
          },
          { 
            title: 'Failed Calls', 
            value: stats.error, 
            icon: <ErrorIcon color="error" sx={{ fontSize: 32 }} />, 
            color: 'error.main', 
            bgcolor: 'rgba(231, 76, 60, 0.1)' 
          },
        ].map((card, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 3, 
                border: '1px solid', 
                borderColor: 'divider', 
                background: (theme) => `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2, 
                borderRadius: 2,
                transition: 'all 0.2s', 
                '&:hover': { 
                  borderColor: card.color, 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)' 
                } 
              }}
            >
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: card.bgcolor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {statsLoading ? <CircularProgress size={32} /> : card.icon}
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                  {statsLoading ? '...' : card.value}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  {card.title}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Filters Section */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <DateRangePicker 
            startDate={startDate}
            endDate={endDate}
            onChange={(s, e) => {
              setStartDate(s);
              setEndDate(e);
            }}
          />
          
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="api-name-select-label">API Name</InputLabel>
            <Select
              labelId="api-name-select-label"
              value={selectedApiName}
              label="API Name"
              onChange={(e) => setSelectedApiName(e.target.value)}
            >
              <MenuItem value="">
                <em>All APIs</em>
              </MenuItem>
              {apiNamesList.map(name => (
                <MenuItem key={name} value={name}>{name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmitFilters}
            sx={{ height: 40 }}
          >
            Submit
          </Button>

          <Button 
            variant="outlined" 
            color="inherit" 
            onClick={handleClearFilters}
            disabled={!startDate && !endDate && !selectedApiName}
            sx={{ height: 40 }}
          >
            Clear Filters
          </Button>
        </Box>
      </Paper>

      {/* Table Section */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
        <TableContainer sx={{ flexGrow: 1, overflow: 'auto' }}>
          <Table stickyHeader sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>Timestamp</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>API Name</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>Endpoint</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>Message</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No logs found for the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell>{log.apiName}</TableCell>
                    <TableCell>
                      <Chip 
                        label={log.status} 
                        size="small" 
                        color={log.status === 'SUCCESS' ? 'success' : 'error'} 
                        variant="outlined" 
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.endpoint || '-'}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.message || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={totalRecords}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Box>
  );
}
