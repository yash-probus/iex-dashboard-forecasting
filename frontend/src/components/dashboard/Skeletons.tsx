import React from 'react';
import { Paper, Box, Skeleton } from '@mui/material';

export function SummaryCardSkeleton() {
  return (
    <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', backgroundColor: 'surface.main' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
        <Skeleton variant="text" width="40%" height={24} />
        <Skeleton variant="circular" width={32} height={32} />
      </Box>
      <Skeleton variant="text" width="60%" height={48} />
      <Skeleton variant="text" width="30%" height={20} sx={{ mt: 1.5 }} />
    </Paper>
  );
}

export function ChartSkeleton() {
  return (
    <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', backgroundColor: 'surface.main', height: 480, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Skeleton variant="text" width={200} height={40} />
        <Skeleton variant="rectangular" width={100} height={32} sx={{ borderRadius: 1 }} />
      </Box>
      <Skeleton variant="rectangular" width="100%" height="100%" sx={{ borderRadius: 1 }} />
    </Paper>
  );
}

export function TableSkeleton() {
  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', backgroundColor: 'surface.main', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
        <Skeleton variant="text" width={200} height={40} />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Skeleton variant="rectangular" width={220} height={32} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: 1 }} />
        </Box>
      </Box>
      <Box sx={{ p: 2 }}>
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} variant="rectangular" width="100%" height={40} sx={{ mb: 1, borderRadius: 1 }} />
        ))}
      </Box>
    </Paper>
  );
}
