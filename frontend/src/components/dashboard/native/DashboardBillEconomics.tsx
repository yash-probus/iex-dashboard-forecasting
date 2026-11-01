import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

interface DashboardBillEconomicsProps {
  detail: any;
}

export const DashboardBillEconomics: React.FC<DashboardBillEconomicsProps> = ({ detail }) => {
  if (!detail) return null;

  const maxVal = Math.max(detail.baselineBill, detail.combinedBill, detail.discomAfterOA + detail.oaBill);
  
  const bars = [
    { label: 'DISCOM baseline bill', color: '#64748b', val: detail.baselineBill },
    { label: 'DISCOM bill after OA', color: '#3b82f6', val: detail.discomAfterOA },
    { label: 'Estimated OA bill', color: '#0ea5e9', val: detail.oaBill },
    { label: 'Combined bill', color: '#8b5cf6', val: detail.combinedBill },
    { label: 'Gross saving', color: '#d97706', val: detail.grossSaving },
    { label: 'Final client saving', color: '#10b981', val: detail.finalClientSaving },
  ];

  const formatCurrency = (val: number) => {
    return '₹' + (val / 100000).toFixed(2) + 'L';
  };

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: '12px', height: '100%', bgcolor: 'background.paper' }}>
      <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 'bold', color: 'text.primary' }}>Bill economics</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '11px', mb: 3 }}>From baseline DISCOM bill to final client benefit</Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {bars.map((b, i) => {
          const pct = Math.max(1, (b.val / maxVal) * 100);
          return (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ width: '130px', fontSize: '10px', fontWeight: 'bold', color: 'text.secondary' }}>{b.label}</Typography>
              <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: `${pct}%`, height: '12px', bgcolor: b.color, borderRadius: '6px' }} />
              </Box>
              <Typography sx={{ width: '60px', textAlign: 'right', fontSize: '10px', fontWeight: 'bold', color: 'text.primary' }}>{formatCurrency(b.val)}</Typography>
            </Box>
          );
        })}
      </Box>

      <Box sx={{ mt: 3, p: 1.5, border: '1px solid', borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(234, 179, 8, 0.3)' : '#fef08a', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(234, 179, 8, 0.1)' : '#fefce8', borderRadius: '6px' }}>
        <Typography sx={{ fontSize: '10px', color: (theme) => theme.palette.mode === 'dark' ? '#fde047' : '#854d0e' }}>
          The reported OA bill reconciles as {formatCurrency(detail.oaEnergyCharges)} OA energy charges + {formatCurrency(detail.oaOperatingCharges)} operating/scheduling charges = {formatCurrency(detail.oaBill)}.
        </Typography>
      </Box>
    </Paper>
  );
};
