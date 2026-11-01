import React from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';

interface DashboardMarketMixProps {
  detail: any;
}

export const DashboardMarketMix: React.FC<DashboardMarketMixProps> = ({ detail }) => {
  const summary = detail?.marketSummary || [];
  
  const mktColor = (m: string) => m === 'DAM' ? '#eab308' : m === 'GDAM' ? '#10b981' : '#f43f5e';

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: '12px', height: '100%', bgcolor: 'background.paper' }}>
      <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 'bold', color: 'text.primary' }}>Market mix</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '11px', mb: 2 }}>Volume share, weighted rate and scheduling footprint</Typography>
      
      <Grid container spacing={2}>
        {['DAM', 'GDAM', 'RTM'].map((mkt) => {
          const s = summary.find((x: any) => x.market === mkt) || { share: 0, qtyMWh: 0, weightedRate: 0, activeSlots: 0, activeDays: 0 };
          return (
            <Grid item xs={4} key={mkt}>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px', p: 1.5, position: 'relative', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#fff' }}>
                <Box sx={{ position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: '2px', bgcolor: mktColor(mkt) }} />
                <Typography sx={{ fontWeight: 'bold', fontSize: '12px', color: 'text.primary' }}>{mkt}</Typography>
                <Typography sx={{ fontWeight: 'bold', fontSize: '20px', mt: 1, color: 'text.primary' }}>{Number(s.share || 0).toFixed(1)}%</Typography>
                <Typography sx={{ fontSize: '10px', color: 'text.secondary', mt: 0.5 }}>{Number(s.qtyMWh || 0).toFixed(2)} MWh - ₹{Number(s.weightedRate || 0).toFixed(2)}/kWh weighted rate</Typography>
                <Typography sx={{ fontSize: '10px', color: 'text.secondary', mt: 0.5 }}>{s.activeSlots} positive slots across {s.activeDays} day(s)</Typography>
              </Box>
            </Grid>
          );
        })}
      </Grid>
      
      <Box sx={{ mt: 2, p: 1.5, border: '1px solid', borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(234, 179, 8, 0.3)' : '#fef08a', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(234, 179, 8, 0.1)' : '#fefce8', borderRadius: '6px' }}>
        <Typography sx={{ fontSize: '10px', color: (theme) => theme.palette.mode === 'dark' ? '#fde047' : '#854d0e' }}>
          Market-rate calculations use positive scheduled quantity only. Zero-quantity market entries remain visible in the blockwise heatmap as light cells.
        </Typography>
      </Box>
    </Paper>
  );
};
