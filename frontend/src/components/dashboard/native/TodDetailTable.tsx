import React from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

interface TodDetailTableProps {
  tod?: any[];
}

const formatNumber = (val: number) => {
  if (val === undefined || val === null || isNaN(Number(val))) return '-';
  return Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

const formatCurrency = (val: number) => {
  if (val === undefined || val === null || isNaN(Number(val))) return '-';
  return '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

export const TodDetailTable: React.FC<TodDetailTableProps> = ({ tod }) => {
  return (
    <Box>
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Slab</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Actual Units</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Baseline Bill</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>OA Consumer Delivery</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Delivered Efficiency</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Avoided DISCOM</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tod && tod.length > 0 ? (
              tod.map((row, idx) => (
                <TableRow key={idx} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>{row.tod}</TableCell>
                  <TableCell align="right">{formatNumber(row.actualUnits)} kWh</TableCell>
                  <TableCell align="right">{formatCurrency(row.baselineBill)}</TableCell>
                  <TableCell align="right" sx={{ color: '#10b981' }}>{formatNumber(row.oaConsumer)} kWh</TableCell>
                  <TableCell align="right">{row.deliveredEfficiency}%</TableCell>
                  <TableCell align="right">{formatCurrency(row.avoidedDiscomBill)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3, color: '#94a3b8' }}>
                  No TOD detail available.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
