import React, { useState } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, CircularProgress,
  Button, Card, CardContent, Divider, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import Papa from 'papaparse';
import { fetchMarketOperations, MarketOperation } from '../../api/marketOperations.api';
import { formatTimeblock } from '../../utils/date';

interface ParsedBlock {
  timeblock: number;
  bidPrice: number | null;
  amount: number | null;
}

export default function McpAnalystPage() {
  const getTodayFormatted = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [date, setDate] = useState(getTodayFormatted());
  const [market, setMarket] = useState('DAM');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [parsedData, setParsedData] = useState<ParsedBlock[]>([]);
  const [marketData, setMarketData] = useState<MarketOperation[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      alert('Please upload a CSV file first.');
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch Market Operations data for the selected date
      const data = await fetchMarketOperations(date, date);
      setMarketData(data);

      // 2. Parse CSV File
      Papa.parse(file, {
        complete: (results) => {
          const rows = results.data as string[][];
          
          if (rows.length < 3) {
            alert('Invalid CSV format. Expected at least 3 rows.');
            setLoading(false);
            return;
          }

          // Row 1 (index 1) has the price buckets
          const priceBucketsRow = rows[1];
          const timeBlockRows = rows.slice(2);

          const blocks: ParsedBlock[] = [];

          let timeblockCounter = 1;
          for (const row of timeBlockRows) {
            // Stop if empty row
            if (!row || row.length < 3 || !row[0]) continue;

            let bidPrice: number | null = null;
            let amount: number | null = null;
            
            // Search for first non-zero bid starting from column 3
            for (let i = 3; i < row.length; i++) {
              const val = parseFloat(row[i]);
              if (!isNaN(val) && val !== 0) {
                // Found a non-zero bid (Amount). The price bucket is at the same index in row 1
                amount = val;
                const price = parseFloat(priceBucketsRow[i]);
                if (!isNaN(price)) {
                  bidPrice = price;
                }
                break;
              }
            }

            blocks.push({
              timeblock: timeblockCounter,
              bidPrice,
              amount
            });

            timeblockCounter++;
            if (timeblockCounter > 96) break;
          }

          setParsedData(blocks);
          setLoading(false);
        },
        error: (error) => {
          console.error("CSV Parse Error", error);
          alert('Error parsing CSV file.');
          setLoading(false);
        }
      });
    } catch (error) {
      console.error('Failed to load market operations', error);
      alert('Failed to load market data from server.');
      setLoading(false);
    }
  };

  const getColor = (val: number | null, allMarkets: (number | null)[]) => {
    if (val === null) return 'inherit';
    const validValues = allMarkets.filter((v): v is number => v !== null && !isNaN(v));
    const values = Array.from(new Set(validValues)).sort((a, b) => a - b);
    
    if (values.length <= 1) return 'inherit';
    
    const min = values[0];
    const max = values[values.length - 1];
    
    if (val === min) return '#2e7d32'; // Green
    if (val === max) return '#c62828'; // Red
    
    if (values.length === 3 && val === values[1]) return '#f57f17'; // Yellow/Orange
    
    return 'inherit';
  };



  const getMarketVal = (op: MarketOperation | undefined, m: string): number | null => {
    if (!op) return null;
    let val: number | null = null;
    if (m === 'DAM') val = Number(op.damMcp);
    else if (m === 'RTM') val = Number(op.rtmMcp);
    else if (m === 'GDAM') val = Number(op.gdamMcp);
    
    // If the value is 0 (or NaN), it usually means the data hasn't been scraped yet for this block
    if (val === 0 || val === null || isNaN(val)) return null;
    return val;
  };

  // Calculate total savings and clearance percentage
  const calculateKPIs = () => {
    let totalSavings = 0;
    let totalBids = 0;
    let clearedBids = 0;

    parsedData.forEach(row => {
      const op = marketData.find(m => m.timeblock === row.timeblock);
      if (!op || row.bidPrice === null || row.amount === null) return;
      
      const damMcp = getMarketVal(op, 'DAM');
      const gdamMcp = getMarketVal(op, 'GDAM');
      const rtmMcp = getMarketVal(op, 'RTM');
      
      let actualPaidPrice: number | null = null;
      if (market === 'DAM') actualPaidPrice = damMcp;
      else if (market === 'RTM') actualPaidPrice = rtmMcp;
      else if (market === 'GDAM') actualPaidPrice = gdamMcp;

      totalBids++;

      // Only calculate if the bid cleared (Actual Paid Price <= Bid Price)
      if (actualPaidPrice !== null && actualPaidPrice <= row.bidPrice) {
        clearedBids++;
        const validMcps = [damMcp, gdamMcp, rtmMcp].filter(v => v !== null) as number[];
        if (validMcps.length > 0) {
          const lowestMcp = Math.min(...validMcps);
          const blockSavings = (actualPaidPrice - lowestMcp) * (row.amount / 4);
          if (blockSavings > 0) {
            totalSavings += blockSavings;
          }
        }
      }
    });

    const clearancePercentage = totalBids > 0 ? (clearedBids / totalBids) * 100 : 0;

    return { totalSavings, clearancePercentage, clearedBids, totalBids };
  };

  const { totalSavings, clearancePercentage, clearedBids, totalBids } = calculateKPIs();

  const handleDownload = () => {
    if (parsedData.length === 0) return;
    
    const csvData = parsedData.map(row => {
      const op = marketData.find(m => m.timeblock === row.timeblock);
      const damMcp = getMarketVal(op, 'DAM');
      const gdamMcp = getMarketVal(op, 'GDAM');
      const rtmMcp = getMarketVal(op, 'RTM');
      
      let actualPaidPrice: number | null = null;
      if (market === 'DAM') actualPaidPrice = damMcp;
      else if (market === 'RTM') actualPaidPrice = rtmMcp;
      else if (market === 'GDAM') actualPaidPrice = gdamMcp;

      let blockSavings = 0;
      let cleared = 'No';
      if (actualPaidPrice !== null && row.bidPrice !== null && actualPaidPrice <= row.bidPrice) {
        cleared = 'Yes';
        const validMcps = [damMcp, gdamMcp, rtmMcp].filter(v => v !== null) as number[];
        if (validMcps.length > 0 && row.amount) {
          const lowestMcp = Math.min(...validMcps);
          const savings = (actualPaidPrice - lowestMcp) * (row.amount / 4);
          if (savings > 0) blockSavings = savings;
        }
      }

      return {
        'Timeblock': formatTimeblock(row.timeblock),
        'Amount (MW)': row.amount !== null ? row.amount : '-',
        'Bid Price (₹/MWh)': row.bidPrice !== null ? row.bidPrice : '-',
        'DAM MCP (₹/MWh)': damMcp !== null ? damMcp : '-',
        'GDAM MCP (₹/MWh)': gdamMcp !== null ? gdamMcp : '-',
        'RTM MCP (₹/MWh)': rtmMcp !== null ? rtmMcp : '-',
        'Cleared': cleared,
        'Savings (₹)': blockSavings.toFixed(2)
      };
    });

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('url'); // dummy element, using standard anchor tag approach below
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `MCP_Analysis_${market}_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
                MCP Analyst
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Upload bid CSV and compare your bought rate against other markets.
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  height: '42px',
                  fontFamily: 'inherit',
                  outline: 'none'
                }}
              />
              
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Market</InputLabel>
                <Select
                  value={market}
                  label="Market"
                  onChange={(e) => setMarket(e.target.value)}
                  sx={{ borderRadius: '10px', height: '42px' }}
                >
                  <MenuItem value="DAM">DAM</MenuItem>
                  <MenuItem value="RTM">RTM</MenuItem>
                  <MenuItem value="GDAM">GDAM</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="outlined"
                component="label"
                sx={{ height: '42px', borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
              >
                {file ? file.name : 'Upload CSV'}
                <input
                  type="file"
                  accept=".csv"
                  hidden
                  onChange={handleFileUpload}
                />
              </Button>

              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading || !file}
                sx={{ px: 3, height: '42px', borderRadius: '10px', textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
              >
                Analyze
              </Button>
              
              {parsedData.length > 0 && (
                <Button
                  variant="outlined"
                  onClick={handleDownload}
                  startIcon={<DownloadIcon />}
                  sx={{ px: 3, height: '42px', borderRadius: '10px', textTransform: 'none', fontWeight: 600, color: 'primary.main', borderColor: 'primary.main' }}
                >
                  Export Data
                </Button>
              )}
            </Box>
          </Box>

          {/* KPI Cards */}
          {parsedData.length > 0 && (
            <Box sx={{ display: 'flex', gap: 3, mb: 1, flexWrap: 'wrap' }}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #E2E8F0', flex: 1, minWidth: '200px', bgcolor: '#F8FAFC' }}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>Total Potential Savings</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#2e7d32', mt: 1 }}>
                  ₹{totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Paper>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #E2E8F0', flex: 1, minWidth: '200px', bgcolor: '#F8FAFC' }}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>Bid Clearance</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: clearancePercentage >= 80 ? '#2e7d32' : clearancePercentage >= 50 ? '#f57f17' : '#c62828', mt: 1 }}>
                  {clearancePercentage.toFixed(1)}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {clearedBids} out of {totalBids} blocks cleared
                </Typography>
              </Paper>
            </Box>
          )}

          <Divider />

          {/* Data Table */}
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '10px', flexGrow: 1, maxHeight: 'calc(100vh - 280px)' }}>
            <Table stickyHeader sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>Timeblock</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>Bid Price (₹/MWh)</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>DAM MCP (₹/MWh)</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>GDAM MCP (₹/MWh)</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>RTM MCP (₹/MWh)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : parsedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      Upload a CSV and click Analyze to view data.
                    </TableCell>
                  </TableRow>
                ) : (
                  parsedData.map((row) => {
                    // Match with marketData by timeblock
                    const op = marketData.find(m => m.timeblock === row.timeblock);
                    const bidPrice = row.bidPrice;
                    const damMcp = getMarketVal(op, 'DAM');
                    const gdamMcp = getMarketVal(op, 'GDAM');
                    const rtmMcp = getMarketVal(op, 'RTM');
                    
                    const allMarkets = [damMcp, gdamMcp, rtmMcp];

                    return (
                      <TableRow key={row.timeblock} hover sx={{ '&:nth-of-type(odd)': { backgroundColor: '#F9FAFB' } }}>
                        <TableCell align="center">{formatTimeblock(row.timeblock)}</TableCell>
                        <TableCell align="center">
                          <Box component="span" sx={{ fontWeight: 600 }}>
                            {bidPrice !== null ? bidPrice.toFixed(2) : '-'}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box component="span" sx={{ color: getColor(damMcp, allMarkets), fontWeight: 600 }}>
                            {damMcp !== null ? damMcp.toFixed(2) : '-'}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box component="span" sx={{ color: getColor(gdamMcp, allMarkets), fontWeight: 600 }}>
                            {gdamMcp !== null ? gdamMcp.toFixed(2) : '-'}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box component="span" sx={{ color: getColor(rtmMcp, allMarkets), fontWeight: 600 }}>
                            {rtmMcp !== null ? rtmMcp.toFixed(2) : '-'}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
