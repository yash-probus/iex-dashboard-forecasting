import React from 'react';
import { Box, Typography, Grid, Card, CardContent } from '@mui/material';

interface DashboardEnergySummaryProps {
  calcResult: any;
  marketDecisionResult: any;
}

export const DashboardEnergySummary: React.FC<DashboardEnergySummaryProps> = ({
  calcResult,
  marketDecisionResult
}) => {
  if (!calcResult && !marketDecisionResult) return null;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', borderRadius: 2.5, height: '100%' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
              Total Sourced Energy
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: marketDecisionResult?.todSummaries ? 1.5 : 0 }}>
              {(marketDecisionResult ? marketDecisionResult.totalEnergyKwh : calcResult?.totalEnergyKwh || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} kWh
            </Typography>
            {marketDecisionResult?.todSummaries && (
              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {marketDecisionResult.todSummaries.map((summary: any, idx: number) => (
                  <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase' }}>{summary.slabName || summary.slotName}</Typography>
                    <Typography variant="caption" fontWeight={700}>{Number(summary.consumptionKwh ?? summary.totalEnergyKwh ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} kWh</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', borderRadius: 2.5, height: '100%' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
              Market Sourced Energy
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 700, color: '#16A34A', mb: marketDecisionResult?.todSummaries ? 1.5 : 0 }}>
              {Number(marketDecisionResult
                ? (marketDecisionResult.totalMarketEnergyKwh ?? marketDecisionResult.totalEnergyKwh)
                : (calcResult?.totalMarketEnergyKwh || 0)
              ).toLocaleString('en-IN', { maximumFractionDigits: 0 })} kWh
            </Typography>
            {marketDecisionResult?.todSummaries && (
              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {marketDecisionResult.todSummaries.map((summary: any, idx: number) => (
                  <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase' }}>{summary.slabName || summary.slotName}</Typography>
                    <Typography variant="caption" fontWeight={700} color="#16A34A">
                      {Number(summary.marketEnergyKwh ?? summary.consumptionKwh ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} kWh
                      {summary.marketCostBase !== undefined && summary.marketCostBase !== null && ` • ₹${Number(summary.marketCostBase).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};