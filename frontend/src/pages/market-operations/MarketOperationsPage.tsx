import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, CircularProgress,
  Button, TextField, Card, CardContent, Divider, TablePagination
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import Papa from 'papaparse';
import { fetchMarketOperations, MarketOperation } from '../../api/marketOperations.api';
import { formatOverviewDate, formatTimeblock } from '../../utils/date';
import DateRangePicker from '../../components/common/DateRangePicker';

export default function MarketOperationsPage() {
  const getTodayFormatted = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [records, setRecords] = useState<MarketOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(getTodayFormatted());
  const [endDate, setEndDate] = useState(getTodayFormatted());
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(96);


  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async (overrideStart?: string, overrideEnd?: string) => {
    try {
      setLoading(true);
      const sDate = overrideStart !== undefined ? overrideStart : startDate;
      const eDate = overrideEnd !== undefined ? overrideEnd : endDate;
      const data = await fetchMarketOperations(sDate || undefined, eDate || undefined);
      setRecords(data);
      setPage(0);
    } catch (error) {
      console.error('Failed to load market operations', error);
    } finally {
      setLoading(false);
    }
  };



  // Helper function to determine text color based on the lowest, middle, and highest prices
  const getTextColor = (value: number, dam: number, rtm: number, gdam: number) => {
    if (dam === 0 && rtm === 0 && gdam === 0) return 'inherit';
    
    const uniqueValues = Array.from(new Set([dam, rtm, gdam])).sort((a, b) => a - b);
    if (uniqueValues.length === 1) return 'inherit';
    
    const lowest = uniqueValues[0];
    const highest = uniqueValues[uniqueValues.length - 1];
    
    if (value === lowest) return '#2e7d32'; // Green text
    if (value === highest) return '#c62828'; // Red text
    if (uniqueValues.length === 3 && value === uniqueValues[1]) return '#f57f17'; // Orange text
    
    return 'inherit';
  };

  // Helper for difference column color (positive = green, negative = red, zero = neutral)
  const getDiffColor = (diff: number) => {
    if (diff > 0) return '#2e7d32';
    if (diff < 0) return '#c62828';
    return 'inherit';
  };

  const formatDiff = (diff: number) => {
    const sign = diff > 0 ? '+' : '';
    return `${sign}${diff.toFixed(2)}`;
  };

  const handleExport = () => {
    if (records.length === 0) return;
    
    const csvData = records.map(row => {
      const dam = Number(row.damMcp);
      const rtm = Number(row.rtmMcp);
      const gdam = Number(row.gdamMcp);
      const damVsRtm = dam - rtm;
      const damVsGdam = dam - gdam;
      
      return {
        'Date': formatOverviewDate(row.date),
        'Timeblock': formatTimeblock(row.timeblock),
        'DAM MCP (₹/MWh)': dam.toFixed(2),
        'RTM MCP (₹/MWh)': rtm.toFixed(2),
        'GDAM MCP (₹/MWh)': gdam.toFixed(2),
        'DAM vs RTM': formatDiff(damVsRtm),
        'DAM vs GDAM': formatDiff(damVsGdam)
      };
    });

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `Market_Operations_${startDate}_to_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const avgDam = records.length ? records.reduce((acc, r) => acc + Number(r.damMcp), 0) / records.length : 0;
  const avgRtm = records.length ? records.reduce((acc, r) => acc + Number(r.rtmMcp), 0) / records.length : 0;
  const avgGdam = records.length ? records.reduce((acc, r) => acc + Number(r.gdamMcp), 0) / records.length : 0;
  const avgDamVsRtm = records.length ? records.reduce((acc, r) => acc + (Number(r.damMcp) - Number(r.rtmMcp)), 0) / records.length : 0;
  const avgDamVsGdam = records.length ? records.reduce((acc, r) => acc + (Number(r.damMcp) - Number(r.gdamMcp)), 0) / records.length : 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, height: '100%' }}>
      <Card
        elevation={0}
        sx={{
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
        }}
      >
        <CardContent sx={{ p: { xs: 2, md: 4 }, display: 'flex', flexDirection: 'column', gap: 4, flexGrow: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Market Operations
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Compare Market Clearing Prices (MCP) across DAM, RTM, and GDAM.
              </Typography>
            </Box>
            
            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <DateRangePicker 
                startDate={startDate}
                endDate={endDate}
                onChange={(s, e) => {
                  setStartDate(s);
                  setEndDate(e);
                }}
              />
              <Button
                variant="contained"
                onClick={() => loadRecords()}
                disabled={!startDate && !endDate}
                sx={{ px: 3, height: '42px', borderRadius: '10px', textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
              >
                Submit
              </Button>
              <Button
                variant="outlined"
                onClick={handleExport}
                disabled={records.length === 0}
                startIcon={<DownloadIcon />}
                sx={{ px: 3, height: '42px', borderRadius: '10px', textTransform: 'none', fontWeight: 600, color: 'primary.main', borderColor: 'primary.main' }}
              >
                Export Data
              </Button>
            </Box>
          </Box>

          <Divider />

          {/* Data Table */}
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '10px', flexGrow: 1, maxHeight: 'calc(100vh - 350px)' }}>
            <Table stickyHeader sx={{ minWidth: 850 }}>
              <TableHead>
                <TableRow>
                  <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>Date</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>Timeblock</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>DAM MCP (₹/MWh)</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>RTM MCP (₹/MWh)</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>GDAM MCP (₹/MWh)</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>DAM vs RTM</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>DAM vs GDAM</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No records found. Upload data to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  records
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row, index) => {
                      const dam = Number(row.damMcp);
                    const rtm = Number(row.rtmMcp);
                    const gdam = Number(row.gdamMcp);
                    const damVsRtm = dam - rtm;
                    const damVsGdam = dam - gdam;

                    return (
                      <TableRow key={row.id} hover sx={{ '&:nth-of-type(odd)': { backgroundColor: '#F9FAFB' } }}>
                        <TableCell align="center">{formatOverviewDate(row.date)}</TableCell>
                        <TableCell align="center">{formatTimeblock(row.timeblock)}</TableCell>
                        <TableCell align="center">
                          <Box component="span" sx={{ color: getTextColor(dam, dam, rtm, gdam), fontWeight: 600 }}>
                            {dam.toFixed(2)}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box component="span" sx={{ color: getTextColor(rtm, dam, rtm, gdam), fontWeight: 600 }}>
                            {rtm.toFixed(2)}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box component="span" sx={{ color: getTextColor(gdam, dam, rtm, gdam), fontWeight: 600 }}>
                            {gdam.toFixed(2)}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box component="span" sx={{ color: getDiffColor(damVsRtm), fontWeight: 600 }}>
                            {formatDiff(damVsRtm)}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box component="span" sx={{ color: getDiffColor(damVsGdam), fontWeight: 600 }}>
                            {formatDiff(damVsGdam)}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
                {records.length > 0 && !loading && (
                  <TableRow sx={{ backgroundColor: '#F1F5F9', borderTop: '2px solid #E2E8F0' }}>
                    <TableCell colSpan={2} align="center" sx={{ fontWeight: 'bold' }}>Average</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {avgDam.toFixed(2)}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {avgRtm.toFixed(2)}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {avgGdam.toFixed(2)}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', color: getDiffColor(avgDamVsRtm) }}>
                      {formatDiff(avgDamVsRtm)}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', color: getDiffColor(avgDamVsGdam) }}>
                      {formatDiff(avgDamVsGdam)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[24, 48, 96, 192]}
            component="div"
            count={records.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </CardContent>
      </Card>
    </Box>
  );
}

