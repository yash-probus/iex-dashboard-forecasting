import React from 'react';
import { Box, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';

interface DashboardDetailedOASimulationProps {
  marketDecisionResult: any;
  exportDetailedOAToCSV: () => void;
}

export const DashboardDetailedOASimulation: React.FC<DashboardDetailedOASimulationProps> = ({
  marketDecisionResult,
  exportDetailedOAToCSV
}) => {
  const breakdownList = (marketDecisionResult?.oaDetailed?.breakdown && marketDecisionResult.oaDetailed.breakdown.length > 0)
    ? marketDecisionResult.oaDetailed.breakdown
    : (marketDecisionResult?.todSummaries || []).map((t: any) => ({
        slabName: t.slotName || t.slabName || 'TOD Slab',
        discomUnits: t.consumptionKwh ?? t.totalEnergyKwh ?? 0,
        oaUnits: t.marketEnergyKwh ?? t.oaUnits ?? 0,
        discomBill: t.baselineCost ?? t.discomBill ?? 0,
        proltDiscomBill: t.proltDiscomBill ?? 0,
        consumerBusUnits: t.marketEnergyKwh ?? t.consumerBusUnits ?? 0,
        oaBill: t.marketCostBase ?? t.oaBill ?? 0
      }));

  if (!breakdownList || breakdownList.length === 0) return null;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
          Detailed OA Savings Breakdown
        </Typography>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={exportDetailedOAToCSV}
          sx={{ textTransform: 'none', borderRadius: 2 }}
        >
          Export Detailed Report CSV
        </Button>
      </Box>
      <Box sx={{ overflowX: 'hidden', border: '1px solid', borderColor: 'divider', borderRadius: 2.5, overflow: 'hidden' }}>
        <Table size="small" sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC', color: (theme) => theme.palette.mode === 'dark' ? '#CBD5E1' : '#1E293B', fontSize: '11px', px: 1 }}>TOD Slab</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC', color: (theme) => theme.palette.mode === 'dark' ? '#CBD5E1' : '#1E293B', fontSize: '11px', px: 1 }}>Total<br />(DISCOM)</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC', color: (theme) => theme.palette.mode === 'dark' ? '#CBD5E1' : '#1E293B', fontSize: '11px', px: 1 }}>Market<br />(OA Units)</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC', color: (theme) => theme.palette.mode === 'dark' ? '#CBD5E1' : '#1E293B', fontSize: '11px', px: 1 }}>DISCOM<br />Bill</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC', color: (theme) => theme.palette.mode === 'dark' ? '#CBD5E1' : '#1E293B', fontSize: '11px', px: 1 }}>Prolt<br />DISCOM</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC', color: (theme) => theme.palette.mode === 'dark' ? '#CBD5E1' : '#1E293B', fontSize: '11px', px: 1 }}>OA Cons.<br />Bus</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#131A2B' : '#F8FAFC', color: (theme) => theme.palette.mode === 'dark' ? '#CBD5E1' : '#1E293B', fontSize: '11px', px: 1 }}>OA Bill</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {breakdownList.map((row: any, idx: number) => (
              <TableRow key={idx} hover>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '11px', px: 1 }}>{row.slabName || row.slotName}</TableCell>
                <TableCell align="right" sx={{ fontSize: '11px', px: 1 }}>{Number(row.discomUnits || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} kWh</TableCell>
                <TableCell align="right" sx={{ fontSize: '11px', px: 1 }}>{Number(row.oaUnits || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} kWh</TableCell>
                <TableCell align="right" sx={{ fontSize: '11px', px: 1 }}>₹{Number(row.discomBill || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                <TableCell align="right" sx={{ fontSize: '11px', px: 1 }}>₹{Number(row.proltDiscomBill || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                <TableCell align="right" sx={{ fontSize: '11px', px: 1 }}>{Number(row.consumerBusUnits || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} kWh</TableCell>
                <TableCell align="right" sx={{ fontSize: '11px', px: 1 }}>₹{Number(row.oaBill || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#141C2E' : '#F8FAFC' }}>
              <TableCell sx={{ fontWeight: 700, fontSize: '11px', px: 1 }}>Total</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '11px', px: 1 }}>
                {Number(breakdownList.reduce((sum: number, r: any) => sum + (r.discomUnits || 0), 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })} kWh
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '11px', px: 1 }}>
                {Number(breakdownList.reduce((sum: number, r: any) => sum + (r.oaUnits || 0), 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })} kWh
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '11px', px: 1 }}>
                ₹{Number(breakdownList.reduce((sum: number, r: any) => sum + (r.discomBill || 0), 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '11px', px: 1 }}>
                ₹{Number(breakdownList.reduce((sum: number, r: any) => sum + (r.proltDiscomBill || 0), 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '11px', px: 1 }}>
                {Number(breakdownList.reduce((sum: number, r: any) => sum + (r.consumerBusUnits || 0), 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })} kWh
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '11px', px: 1 }}>
                ₹{Number(breakdownList.reduce((sum: number, r: any) => sum + (r.oaBill || 0), 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, p: 2, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#141C2E' : '#F8FAFC', borderTop: '1px solid', borderColor: 'divider', minWidth: 'max-content' }}>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">SLDC Scheduling Cost</Typography>
            <Typography variant="body2" fontWeight={600}>₹{Number(marketDecisionResult.oaDetailed.sldcSchedulingCost || 0).toLocaleString('en-IN')} ({marketDecisionResult.oaDetailed.totalDaysTraded || 0} days)</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">NLDC Scheduling Cost</Typography>
            <Typography variant="body2" fontWeight={600}>₹{Number(marketDecisionResult.oaDetailed.nldcSchedulingCost || 0).toLocaleString('en-IN')} ({marketDecisionResult.oaDetailed.totalDaysTraded || 0} days)</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">Total Estimated OA Bill (Inc. Overheads)</Typography>
            <Typography variant="body2" fontWeight={700} color="#7C3AED">
              ₹{Number(
                (marketDecisionResult.oaDetailed.breakdown || []).reduce((sum: number, r: any) => sum + (r.oaBill || 0), 0) +
                (marketDecisionResult.oaDetailed.dailyFixedOverhead || 0) +
                (marketDecisionResult.oaDetailed.bidApplicationFees || 0)
              ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">Total Gross Bill (Net Landed OA Cost)</Typography>
            <Typography variant="body2" fontWeight={700} color="#E11D48">
              ₹{Number(
                (marketDecisionResult.totalLandedExchangeCost || 0) +
                (marketDecisionResult.oaDetailed.dailyFixedOverhead || 0) +
                (marketDecisionResult.oaDetailed.bidApplicationFees || 0)
              ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">Net Savings</Typography>
            {(() => {
              const rawSavings = marketDecisionResult.totalSavings;
              if (rawSavings <= 0) {
                return (
                  <Typography variant="body2" fontWeight={700} color="#DC2626">
                    Not Eligible for OA
                  </Typography>
                );
              }
              return (
                <Typography variant="body2" fontWeight={700} color="#16A34A">
                  ₹{rawSavings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Typography>
              );
            })()}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
