import React from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from '@mui/material';

interface CommercialSummaryTableProps {
  baselineBreakdown?: any[];
  detail?: any;
}

const formatCurrency = (val: number) => {
  if (val === undefined || val === null || isNaN(Number(val))) return '-';
  return '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

export const CommercialSummaryTable: React.FC<CommercialSummaryTableProps> = ({ baselineBreakdown, detail }) => {
  return (
    <Box>
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Metric</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Baseline / Source</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>After OA / Result</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Change</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {baselineBreakdown && baselineBreakdown.length > 0 ? (
              baselineBreakdown.map((row, idx) => (
                <TableRow key={idx} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell align="right">{formatCurrency(row.baseline)}</TableCell>
                  <TableCell align="right">{formatCurrency(row.afterOA)}</TableCell>
                  <TableCell align="right" sx={{ color: (row.baseline - row.afterOA) > 0 ? '#10b981' : 'inherit' }}>
                    {formatCurrency(row.baseline - row.afterOA)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  No breakdown data available for this cycle.
                </TableCell>
              </TableRow>
            )}
            {/* Summary Row */}
            {detail && (
              <TableRow sx={{ backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#f1f5f9' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Overall Economics</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCurrency(detail.baselineBill)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCurrency(detail.combinedBill)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: '#10b981' }}>
                  {formatCurrency(detail.baselineBill - detail.combinedBill)}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
