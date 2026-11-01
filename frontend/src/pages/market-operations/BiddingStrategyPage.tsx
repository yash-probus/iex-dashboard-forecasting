import React, { useState } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, CircularProgress,
  Button, TextField, Card, CardContent, Divider, FormControl, InputLabel, Select, MenuItem,
  Alert, Grid
} from '@mui/material';
import { formatTimeblock } from '../../utils/date';
import { apiClient } from '../../api/client';
import { exportToCSV } from '../../utils/export';
import DownloadIcon from '@mui/icons-material/Download';
import PriceCheckIcon from '@mui/icons-material/PriceCheck';
import BoltIcon from '@mui/icons-material/Bolt';

interface ForecastData {
  timeBlock: number;
  mcp: number;
}

interface StrategyRow {
  timeblock: number;
  market: string;
  amountMw: number;
  expectedMcp: number;
  recommendedBidPrice: number;
  expectedCost: number;
}

export default function BiddingStrategyPage() {
  const getTodayFormatted = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [date, setDate] = useState(getTodayFormatted());
  const [market, setMarket] = useState('dam');
  const [totalVolume, setTotalVolume] = useState<number>(100); // Total MW to distribute
  const [maxPrice, setMaxPrice] = useState<number>(5000); // Max price willing to pay

  const [loading, setLoading] = useState(false);
  const [strategy, setStrategy] = useState<StrategyRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (totalVolume <= 0 || maxPrice <= 0) {
      setError("Please enter valid Volume and Max Price.");
      return;
    }
    setLoading(true);
    setError(null);
    setStrategy([]);

    try {
      // Fetch forecasted prices for the selected date
      const endpoint = `/forecast/price?market=${market}&startDate=${date}&endDate=${date}&interval=15min&model=Model1`;
      const res = await apiClient.get(endpoint);
      
      if (res.data && res.data.success && res.data.data.intervals) {
        const intervals: ForecastData[] = res.data.data.intervals;
        
        // Filter blocks where forecasted MCP is below max price
        const eligibleBlocks = intervals.filter(block => block.mcp <= maxPrice);

        if (eligibleBlocks.length === 0) {
          setError(`No time blocks found where the forecasted MCP is below your max price of ₹${maxPrice}/MWh.`);
          setLoading(false);
          return;
        }

        // Sort by cheapest MCP first
        const sortedBlocks = [...eligibleBlocks].sort((a, b) => a.mcp - b.mcp);
        
        // Simple heuristic: Distribute the total volume evenly across the cheapest 50% of the eligible blocks, 
        // or all eligible blocks if there are few. Let's just distribute across ALL eligible blocks for now to minimize risk.
        // Wait, if they want total 100 MW across the day, we divide by eligibleBlocks.length.
        const blocksToTarget = sortedBlocks; // Or could take top N cheapest
        const amountPerBlock = totalVolume / blocksToTarget.length;

        const newStrategy: StrategyRow[] = blocksToTarget.map(block => {
          return {
            timeblock: block.timeBlock,
            market: market.toUpperCase(),
            amountMw: amountPerBlock,
            expectedMcp: block.mcp,
            recommendedBidPrice: maxPrice, // Bid at max willingness to pay to ensure clearance
            expectedCost: amountPerBlock * (block.mcp) * 0.25 // Expected cost for this 15-min block (Amount * MCP / 4)
          };
        });

        // Sort back by timeblock for display
        newStrategy.sort((a, b) => a.timeblock - b.timeblock);

        setStrategy(newStrategy);
      } else {
        setError('Failed to fetch forecast data or no data available for this date.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'An error occurred while generating the strategy.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (strategy.length === 0) return;
    const columns = [
      { field: 'timeblock', headerName: 'Timeblock' },
      { field: 'market', headerName: 'Market' },
      { field: 'amountMw', headerName: 'Amount (MW)' },
      { field: 'recommendedBidPrice', headerName: 'Bid Price (₹/MWh)' },
      { field: 'expectedMcp', headerName: 'Expected Clear Price (₹/MWh)' },
      { field: 'expectedCost', headerName: 'Expected Cost (₹)' }
    ];
    exportToCSV(strategy, `Bidding_Strategy_${market.toUpperCase()}_${date}`, columns);
  };

  // Metrics
  const totalCost = strategy.reduce((acc, row) => acc + row.expectedCost, 0);
  const totalMw = strategy.reduce((acc, row) => acc + row.amountMw, 0);
  const avgClearPrice = totalCost > 0 && totalMw > 0 ? (totalCost / (totalMw * 0.25)) : 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, height: '100%', gap: 3 }}>
      <Card
        elevation={0}
        sx={{
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        }}
      >
        <CardContent sx={{ p: { xs: 2, md: 4 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                <PriceCheckIcon fontSize="large" color="primary" /> Bidding Strategy
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Generate an optimal bidding plan based on forecasted market clearing prices.
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Form */}
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Market</InputLabel>
                <Select
                  value={market}
                  label="Market"
                  onChange={(e) => setMarket(e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="dam">DAM</MenuItem>
                  <MenuItem value="rtm">RTM</MenuItem>
                  <MenuItem value="gdam">GDAM</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Total Volume (MW)"
                type="number"
                value={totalVolume}
                onChange={(e) => setTotalVolume(Number(e.target.value))}
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Max Price (₹/MWh)"
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleGenerate}
                disabled={loading}
                startIcon={<BoltIcon />}
                sx={{ height: '40px', borderRadius: 2, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
              >
                Generate
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ borderRadius: 3 }}>
          {error}
        </Alert>
      )}

      {/* Results */}
      {strategy.length > 0 && (
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
          <CardContent sx={{ p: { xs: 2, md: 4 }, display: 'flex', flexDirection: 'column', gap: 3, flexGrow: 1 }}>
            
            {/* KPI Cards */}
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #E2E8F0', flex: 1, minWidth: '200px', bgcolor: '#F8FAFC' }}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>Total Expected Cost</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', mt: 1 }}>
                  ₹{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Paper>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #E2E8F0', flex: 1, minWidth: '200px', bgcolor: '#F8FAFC' }}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>Targeted Blocks</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', mt: 1 }}>
                  {strategy.length} / 96
                </Typography>
              </Paper>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #E2E8F0', flex: 1, minWidth: '200px', bgcolor: '#F8FAFC' }}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>Avg Expected Clear Price</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#2e7d32', mt: 1 }}>
                  ₹{avgClearPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Paper>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Strategy Distribution</Typography>
              <Button
                variant="outlined"
                onClick={handleExport}
                startIcon={<DownloadIcon />}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              >
                Export Strategy
              </Button>
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '10px', flexGrow: 1, maxHeight: 'calc(100vh - 450px)' }}>
              <Table stickyHeader sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow>
                    <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>Timeblock</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>Market</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>Amount (MW)</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>Recommended Bid Price (₹/MWh)</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>Expected Clear Price (₹/MWh)</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#F8FAFC' }}>Expected Cost (₹)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : (
                    strategy.map((row) => (
                      <TableRow key={row.timeblock} hover sx={{ '&:nth-of-type(odd)': { backgroundColor: '#F9FAFB' } }}>
                        <TableCell align="center">{formatTimeblock(row.timeblock)}</TableCell>
                        <TableCell align="center">{row.market}</TableCell>
                        <TableCell align="center">
                          <Box component="span" sx={{ fontWeight: 600, color: '#1976d2' }}>
                            {row.amountMw.toFixed(2)}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box component="span" sx={{ fontWeight: 600 }}>
                            {row.recommendedBidPrice.toFixed(2)}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box component="span" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                            {row.expectedMcp.toFixed(2)}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box component="span" sx={{ fontWeight: 600 }}>
                            {row.expectedCost.toFixed(2)}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
