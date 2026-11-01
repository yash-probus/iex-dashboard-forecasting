import React from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

interface OaChargeRegisterTableProps {
  oaCharges?: any[];
}

const formatCurrency = (val: number) => {
  if (val === undefined || val === null || isNaN(Number(val))) return '-';
  return '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

export const OaChargeRegisterTable: React.FC<OaChargeRegisterTableProps> = ({ oaCharges }) => {
  return (
    <Box>
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Charge Component</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Basis</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Rate</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {oaCharges && oaCharges.length > 0 ? (
              oaCharges.map((row, idx) => (
                <TableRow key={idx} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell align="right">{row.basis}</TableCell>
                  <TableCell align="right">{row.rate}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCurrency(row.amount)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 3, color: '#94a3b8' }}>
                  No OA charge data available.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
