import React from 'react';
import { Box, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';

interface DashboardMarketBuyDecisionProps {
  marketDecisionResult: any;
  setGraphDialogOpen: (open: boolean) => void;
}

export const DashboardMarketBuyDecision: React.FC<DashboardMarketBuyDecisionProps> = ({ 
  marketDecisionResult, 
  setGraphDialogOpen 
}) => {
  if (!marketDecisionResult) return null;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4, mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
          Slot-wise Market Simulation
        </Typography>
        <Button
          variant="outlined"
          startIcon={<BarChartIcon />}
          onClick={() => setGraphDialogOpen(true)}
          sx={{ textTransform: 'none', borderRadius: 2 }}
        >
          View Daily Simulation Graph
        </Button>
      </Box>
      
      <Box sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC', fontSize: '11px', px: 1 }}>Date</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC', fontSize: '11px', px: 1 }}>Time</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC', fontSize: '11px', px: 1 }}>TOD</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC', fontSize: '11px', px: 1 }}>Source</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC', fontSize: '11px', px: 1 }}>Mkt Land<br/>(₹)</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC', fontSize: '11px', px: 1 }}>DISCOM<br/>(₹)</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC', fontSize: '11px', px: 1 }}>Buy?</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC', fontSize: '11px', px: 1 }}>Savings<br/>(₹)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {marketDecisionResult.slotsData?.slice(0, 150).map((row: any, idx: number) => {
              const isOaEligible = (marketDecisionResult.totalSavings - (marketDecisionResult.oaDetailed?.dailyFixedOverhead || 0) - (marketDecisionResult.oaDetailed?.bidApplicationFees || 0)) > 0;
              const buyDecision = isOaEligible && row.shouldBuyFromMarket;
              
              return (
                <TableRow key={idx} hover sx={{ '&:nth-of-type(odd)': { bgcolor: 'rgba(0,0,0,0.01)' } }}>
                  <TableCell sx={{ fontSize: '11px', px: 1 }}>{row.date}</TableCell>
                  <TableCell align="center" sx={{ fontSize: '11px', px: 1 }}>{row.timeStr || `${String(row.hour).padStart(2, '0')}:${String((row.timeblock - 1) * 15 % 60).padStart(2, '0')}`}</TableCell>
                  <TableCell align="center" sx={{ px: 1 }}>
                    <span style={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: 700, color: '#64748b' }}>
                      {row.tod}
                    </span>
                  </TableCell>
                  <TableCell align="right" sx={{ px: 1 }}>
                    <span style={{ 
                      textTransform: 'uppercase', 
                      fontSize: '9px', 
                      fontWeight: 800, 
                      color: row.marketSource === 'DAM' ? '#3B82F6' : row.marketSource === 'GDAM' ? '#10B981' : '#8B5CF6',
                      backgroundColor: row.marketSource === 'DAM' ? '#EFF6FF' : row.marketSource === 'GDAM' ? '#ECFDF5' : '#F5F3FF',
                      padding: '2px 4px',
                      borderRadius: '4px'
                    }}>
                      {row.marketSource}
                    </span>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, fontSize: '11px', px: 1 }}>₹{(row.bestMarketLanding || row.comparedLowestPrice) > 0 ? Number(row.bestMarketLanding || row.comparedLowestPrice).toFixed(2) : '-'}</TableCell>
                  <TableCell align="right" sx={{ fontSize: '11px', px: 1 }}>₹{Number(row.discomLanding ?? row.discomLandingPrice ?? 0).toFixed(2)}</TableCell>
                  <TableCell align="center" sx={{ px: 1 }}>
                    <span style={{ 
                      textTransform: 'uppercase', 
                      fontSize: '9px', 
                      fontWeight: 800, 
                      color: buyDecision ? '#16A34A' : '#DC2626',
                      backgroundColor: buyDecision ? '#DCFCE7' : '#FEE2E2',
                      padding: '2px 4px',
                      borderRadius: '4px'
                    }}>
                      {buyDecision ? 'Y' : 'N'}
                    </span>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: (row.savingsPerKwh || 0) > 0 ? '#16A34A' : 'inherit', fontSize: '11px', px: 1 }}>
                    {(row.savingsPerKwh || 0) > 0 ? `₹${Number(row.savingsPerKwh).toFixed(2)}` : '-'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
};