import React from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';

interface DailyMarketSummaryTableProps {
  daily?: any[];
}

const formatNumber = (val: number) => {
  if (val === undefined || val === null) return '-';
  return val.toLocaleString('en-IN', { maximumFractionDigits: 1 });
};

const formatCurrency = (val: number) => {
  if (val === undefined || val === null) return '-';
  return '₹' + val.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

export const DailyMarketSummaryTable: React.FC<DailyMarketSummaryTableProps> = ({ daily }) => {
  return (
    <Box>
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px', overflowX: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary', backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#f8fafc', fontSize: '11px', px: 1 }}>Date</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', color: 'text.secondary', backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#f8fafc', fontSize: '11px', px: 1 }}>Active<br/>Slots</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', color: 'text.secondary', backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#f8fafc', fontSize: '11px', px: 1 }}>Dominant<br/>Market</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.secondary', backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#f8fafc', fontSize: '11px', px: 1 }}>DAM<br/>(MWh)</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.secondary', backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#f8fafc', fontSize: '11px', px: 1 }}>GDAM<br/>(MWh)</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.secondary', backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#f8fafc', fontSize: '11px', px: 1 }}>RTM<br/>(MWh)</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.secondary', backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#f8fafc', fontSize: '11px', px: 1 }}>Wtd Rate</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {daily && daily.length > 0 ? (
              daily.map((row, idx) => (
                <TableRow key={idx} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '11px', px: 1 }}>{row.date}</TableCell>
                  <TableCell align="center" sx={{ fontSize: '11px', px: 1 }}>{row.activeSlots}</TableCell>
                  <TableCell align="center" sx={{ px: 1 }}>
                    <Chip 
                      label={row.dominantMarket} 
                      size="small" 
                      sx={{ 
                        fontSize: '9px', 
                        fontWeight: 'bold',
                        backgroundColor: row.dominantMarket === 'DAM' ? '#fdf4dc' : row.dominantMarket === 'GDAM' ? '#e2f7ed' : '#fce9eb',
                        color: row.dominantMarket === 'DAM' ? '#b47306' : row.dominantMarket === 'GDAM' ? '#11734b' : '#ab3444',
                        height: '18px'
                      }} 
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ color: row.DAM > 0 ? '#b47306' : '#cbd5e1', fontSize: '11px', px: 1 }}>{formatNumber(row.DAM)}</TableCell>
                  <TableCell align="right" sx={{ color: row.GDAM > 0 ? '#11734b' : '#cbd5e1', fontSize: '11px', px: 1 }}>{formatNumber(row.GDAM)}</TableCell>
                  <TableCell align="right" sx={{ color: row.RTM > 0 ? '#ab3444' : '#cbd5e1', fontSize: '11px', px: 1 }}>{formatNumber(row.RTM)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '11px', px: 1 }}>{formatCurrency(row.weightedRate)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3, color: '#94a3b8' }}>
                  No daily market data available.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
