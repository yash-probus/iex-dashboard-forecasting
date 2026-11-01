import React from 'react';
import { Box, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, Grid } from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import DownloadIcon from '@mui/icons-material/Download';

interface DashboardUsageRecommendationsProps {
  demandShiftInsights: any;
  marketDecisionResult: any;
  setDemandShiftGraphOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setDynamicDemandShiftGraphOpen: React.Dispatch<React.SetStateAction<boolean>>;
  exportInsightsToExcel: () => void;
}

export const DashboardUsageRecommendations: React.FC<DashboardUsageRecommendationsProps> = ({ 
  demandShiftInsights,
  marketDecisionResult,
  setDemandShiftGraphOpen,
  setDynamicDemandShiftGraphOpen,
  exportInsightsToExcel
}) => {
  if (!demandShiftInsights) return null;

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>Usage Recommendations: Demand Shifting</Typography>
      </Box>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Box sx={{ bgcolor: 'background.paper', p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Original Energy Cost</Typography>
            <Typography variant="h4" fontWeight={700}>₹{demandShiftInsights.originalTotalCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={3}>
          <Box sx={{ bgcolor: 'background.paper', p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Shifted Energy Cost</Typography>
            <Typography variant="h4" fontWeight={700}>₹{demandShiftInsights.newTotalCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={3}>
          <Box sx={{ bgcolor: '#F0FDF4', p: 3, borderRadius: 3, border: '1px solid', borderColor: '#BBF7D0', height: '100%' }}>
            <Typography variant="subtitle2" color="#166534" sx={{ mb: 1 }}>Potential Extra Savings</Typography>
            <Typography variant="h4" fontWeight={700} color="#15803D">₹{demandShiftInsights.savingsAchieved.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Typography>
            <Typography variant="body2" color="#166534" sx={{ mt: 1 }}>by shifting {demandShiftInsights.shiftedEnergy.toLocaleString('en-IN', { maximumFractionDigits: 0 })} kWh to cheaper slots</Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={3}>
          <Box sx={{ bgcolor: '#EFF6FF', p: 3, borderRadius: 3, border: '1px solid', borderColor: '#BFDBFE', height: '100%' }}>
            <Typography variant="subtitle2" color="#1E40AF" sx={{ mb: 1 }}>Total Potential Savings</Typography>
            {(() => {
              const baseRawSavings = marketDecisionResult ? marketDecisionResult.totalSavings : 0;
              const baseSavings = Math.max(0, baseRawSavings);
              const totalCombinedSavings = baseSavings + demandShiftInsights.savingsAchieved;
              return (
                <>
                  <Typography variant="h4" fontWeight={700} color="#1D4ED8">₹{totalCombinedSavings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Typography>
                  <Typography variant="body2" color="#1E40AF" sx={{ mt: 1 }}>(Base OA Savings + Demand Shifting)</Typography>
                </>
              );
            })()}
          </Box>
        </Grid>
      </Grid>

      <Typography variant="h6" fontWeight={700} sx={{ mt: 4, mb: 2 }}>TOD Shifting Summary</Typography>
      <Box sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#F8FAFC' }}>
              <TableCell sx={{ fontWeight: 600, fontSize: '11px', px: 1 }}>TOD</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '11px', px: 1 }}>Orig.<br/>(kWh)</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '11px', px: 1 }}>Orig. Mkt<br/>(kWh)</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '11px', px: 1 }}>New<br/>(kWh)</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '11px', px: 1 }}>New Mkt<br/>(kWh)</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '11px', px: 1 }}>Diff.<br/>(kWh)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {demandShiftInsights.todShiftSummary.map((row: any) => (
              <TableRow key={row.tod}>
                <TableCell sx={{ px: 1, fontSize: '12px' }}>{row.tod}</TableCell>
                <TableCell align="right" sx={{ px: 1, fontSize: '12px' }}>{row.originalEnergy.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                <TableCell align="right" sx={{ color: 'text.secondary', px: 1, fontSize: '12px' }}>{row.originalMarketEnergy?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || 0}</TableCell>
                <TableCell align="right" sx={{ px: 1, fontSize: '12px' }}>{row.newEnergy.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                <TableCell align="right" sx={{ color: 'text.secondary', px: 1, fontSize: '12px' }}>{row.newMarketEnergy?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || 0}</TableCell>
                <TableCell align="right" sx={{ px: 1, fontSize: '12px', color: row.diff > 0 ? '#16A34A' : row.diff < 0 ? '#DC2626' : 'inherit', fontWeight: row.diff !== 0 ? 600 : 400 }}>
                  {row.diff > 0 ? '+' : ''}{row.diff.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ bgcolor: '#F1F5F9' }}>
              <TableCell sx={{ fontWeight: 700, px: 1, fontSize: '12px' }}>Total</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, px: 1, fontSize: '12px' }}>
                {demandShiftInsights.todShiftSummary.reduce((sum: number, row: any) => sum + (row.originalEnergy || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', px: 1, fontSize: '12px' }}>
                {demandShiftInsights.todShiftSummary.reduce((sum: number, row: any) => sum + (row.originalMarketEnergy || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, px: 1, fontSize: '12px' }}>
                {demandShiftInsights.todShiftSummary.reduce((sum: number, row: any) => sum + (row.newEnergy || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', px: 1, fontSize: '12px' }}>
                {demandShiftInsights.todShiftSummary.reduce((sum: number, row: any) => sum + (row.newMarketEnergy || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, px: 1, fontSize: '12px' }}>
                {(() => {
                  const totalDiff = demandShiftInsights.todShiftSummary.reduce((sum: number, row: any) => sum + (row.diff || 0), 0);
                  return (
                    <Box component="span" sx={{ color: totalDiff > 0 ? '#16A34A' : totalDiff < 0 ? '#DC2626' : 'inherit' }}>
                      {totalDiff > 0 ? '+' : ''}{totalDiff.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </Box>
                  );
                })()}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
};
