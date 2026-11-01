import React, { useMemo, useState } from 'react';
import { Box, Typography, Paper, ToggleButtonGroup, ToggleButton, useTheme, Tooltip as MuiTooltip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { MarketDecisionResult, DemandShiftInsightsResult } from '../../api/savingsCalculator.api';

interface VisualAnalyticsChartsProps {
  marketDecisionResult: MarketDecisionResult;
  demandShiftInsights: DemandShiftInsightsResult;
  maxEnergyPerSlot: number;
}

export const VisualAnalyticsCharts: React.FC<VisualAnalyticsChartsProps> = ({
  marketDecisionResult,
  demandShiftInsights,
  maxEnergyPerSlot,
}) => {
  const theme = useTheme();
  const [sourceView, setSourceView] = useState<'PROLT' | 'INSIGHTS'>('PROLT');

  const { costData, sourceDataProlt, sourceDataInsights } = useMemo(() => {
    const dailyData: Record<string, any> = {};

    if (!marketDecisionResult || !marketDecisionResult.slotsData) {
      return { costData: [], sourceDataProlt: [], sourceDataInsights: [] };
    }

    // 1. Process Market Decision (PROLT)
    marketDecisionResult.slotsData.forEach((slot: any) => {
      let dayNum: number = 0;
      if (slot.date) {
        if (typeof slot.date === 'string' && slot.date.includes('-')) {
          const parts = slot.date.split('-');
          if (parts[0].length === 4) dayNum = parseInt(parts[2], 10);
          else if (parts[2].length === 4) dayNum = parseInt(parts[0], 10);
          else dayNum = parseInt(parts[0], 10);
        } else if (!isNaN(Date.parse(slot.date))) {
          dayNum = new Date(slot.date).getDate();
        }
      }
      if (!dayNum || isNaN(dayNum)) {
        dayNum = slot.timeblock || slot.slot || 1;
      }
      const day = dayNum.toString();

      if (!dailyData[day]) {
        dailyData[day] = {
          day,
          discomCost: 0,
          proltCost: 0,
          insightsCost: 0,
          proltDiscomEnergy: 0,
          proltDamEnergy: 0,
          proltRtmEnergy: 0,
          proltGdamEnergy: 0,
          insightsDiscomEnergy: 0,
          insightsDamEnergy: 0,
          insightsRtmEnergy: 0,
          insightsGdamEnergy: 0,
          baselineDiscomEnergy: 0,
        };
      }

      const allocatedEnergy = slot.maxEnergyPerSlot ?? slot.energyKwh ?? ((slot.marketEnergy || 0) + (slot.discomEnergy || 0));
      const marketSource = slot.selectedSource ?? slot.marketSource ?? 'DISCOM';
      const isMarket = marketSource !== 'DISCOM';

      const marketEnergy = slot.marketEnergy ?? (isMarket ? allocatedEnergy : 0);
      const discomEnergy = slot.discomEnergy ?? (isMarket ? 0 : allocatedEnergy);
      const totalEnergyForSlot = allocatedEnergy;

      const discomLanding = slot.discomLandingPrice ?? slot.discomLanding ?? 0;
      const bestMarketLanding = slot.comparedLowestPrice ?? slot.bestMarketLanding ?? 0;

      const slotBaselineCost = slot.baselineCost ?? (discomLanding * totalEnergyForSlot);
      const slotOptimizedCost = slot.optimizedCost ?? (isMarket ? (bestMarketLanding * allocatedEnergy) : slotBaselineCost);

      dailyData[day].discomCost += slotBaselineCost;
      dailyData[day].proltCost += slotOptimizedCost;
      dailyData[day].baselineDiscomEnergy += totalEnergyForSlot;

      if (isMarket && allocatedEnergy > 0) {
        if (marketSource === 'DAM') dailyData[day].proltDamEnergy += allocatedEnergy;
        else if (marketSource === 'RTM') dailyData[day].proltRtmEnergy += allocatedEnergy;
        else if (marketSource === 'GDAM') dailyData[day].proltGdamEnergy += allocatedEnergy;
      } else {
        dailyData[day].proltDiscomEnergy += totalEnergyForSlot;
      }
    });

    // Add daily fixed overheads to PROLT Cost and Insights Cost
    if (marketDecisionResult.oaDetailed) {
      const { dailyFixedOverhead, bidApplicationFees } = marketDecisionResult.oaDetailed;
      const totalOverheadForMonth = (dailyFixedOverhead || 0) + (bidApplicationFees || 0);
      const daysInMonth = Object.keys(dailyData).length || 30;
      const extraDailyCost = totalOverheadForMonth / daysInMonth;

      Object.keys(dailyData).forEach(day => {
        dailyData[day].proltCost += extraDailyCost;
        dailyData[day].insightsCost += extraDailyCost;
      });
    }

    // 2. Process Industry Insights
    if (demandShiftInsights && demandShiftInsights.slotsData) {
      demandShiftInsights.slotsData.forEach((slot: any) => {
        let dayNum: number = 0;
        if (slot.date) {
          if (typeof slot.date === 'string' && slot.date.includes('-')) {
            const parts = slot.date.split('-');
            if (parts[0].length === 4) dayNum = parseInt(parts[2], 10);
            else if (parts[2].length === 4) dayNum = parseInt(parts[0], 10);
            else dayNum = parseInt(parts[0], 10);
          } else if (!isNaN(Date.parse(slot.date))) {
            dayNum = new Date(slot.date).getDate();
          }
        }
        const day = (dayNum || 1).toString();
        if (!dailyData[day]) return;

        const cost = (slot.costPerKwh || 0) * (slot.newEnergy || 0);
        dailyData[day].insightsCost += cost;

        const marketEnergy = slot.marketEnergy || 0;
        const discomEnergy = slot.discomEnergy || 0;
        const marketSource = slot.marketSource || 'DISCOM';

        if (marketEnergy > 0) {
          if (marketSource === 'DAM') dailyData[day].insightsDamEnergy += marketEnergy;
          else if (marketSource === 'RTM') dailyData[day].insightsRtmEnergy += marketEnergy;
          else if (marketSource === 'GDAM') dailyData[day].insightsGdamEnergy += marketEnergy;
        }
        dailyData[day].insightsDiscomEnergy += discomEnergy;
      });
    }

    const finalData = Object.values(dailyData).sort((a, b) => parseInt(a.day) - parseInt(b.day));

    return {
      costData: finalData,
      sourceDataProlt: finalData,
      sourceDataInsights: finalData,
    };
  }, [marketDecisionResult, demandShiftInsights, maxEnergyPerSlot]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, mt: 3 }}>
      {/* GRAPH 1: Price Comparison */}
      <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mr: 1 }}>
            Daily Cost Comparison (₹)
          </Typography>
          <MuiTooltip title="Compares the daily energy costs under your original DISCOM plan, the PROLT optimized plan, and the Usage Recommendations plan." placement="top">
            <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary', cursor: 'help' }} />
          </MuiTooltip>
        </Box>
        <Box sx={{ width: '100%', height: 400 }}>
          <ResponsiveContainer>
            <BarChart data={costData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12 }}
                tickFormatter={(val) => `₹${(val / 1000).toLocaleString('en-IN')}k`}
              />
              <Tooltip 
                cursor={{ fill: 'transparent' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [`₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, '']}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              <Bar name="Actual DISCOM Cost" dataKey="discomCost" fill="#94A3B8" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              <Bar name="PROLT Cost" dataKey="proltCost" fill="#0EA5E9" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              <Bar name="Usage Recommendations Cost" dataKey="insightsCost" fill="#8B5CF6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      {/* GRAPH 2: Source Breakdown */}
      <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mr: 1 }}>
              Energy Purchase Comparison (kWh)
            </Typography>
            <MuiTooltip title="Breaks down the daily energy purchased from the DISCOM versus the different power exchange markets (DAM, RTM, GDAM) across all scenarios." placement="top">
              <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary', cursor: 'help' }} />
            </MuiTooltip>
          </Box>
        </Box>
        
        <Box sx={{ width: '100%', height: 400 }}>
          <ResponsiveContainer>
            <BarChart 
              data={sourceDataProlt} 
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12 }}
                tickFormatter={(val) => `${(val / 1000).toLocaleString('en-IN')}k`}
              />
              <Tooltip 
                cursor={{ fill: 'transparent' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number, name: string) => [`${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })} kWh`, name]}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              
              {/* BASELINE (DISCOM Only) Bars */}
              <Bar name="BASELINE DISCOM" dataKey="baselineDiscomEnergy" stackId="baseline" fill="#94A3B8" radius={[4, 4, 4, 4]} isAnimationActive={false} />

              {/* PROLT Bars */}
              <Bar name="PROLT DISCOM" dataKey="proltDiscomEnergy" stackId="prolt" fill="#8B5CF6" radius={[0, 0, 4, 4]} isAnimationActive={false} />
              <Bar name="PROLT DAM" dataKey="proltDamEnergy" stackId="prolt" fill="#F59E0B" isAnimationActive={false} />
              <Bar name="PROLT RTM" dataKey="proltRtmEnergy" stackId="prolt" fill="#EF4444" isAnimationActive={false} />
              <Bar name="PROLT GDAM" dataKey="proltGdamEnergy" stackId="prolt" fill="#10B981" radius={[4, 4, 0, 0]} isAnimationActive={false} />

              {/* INSIGHTS Bars (different opacity to distinguish visually) */}
              <Bar name="INSIGHTS DISCOM" dataKey="insightsDiscomEnergy" stackId="insights" fill="#C4B5FD" radius={[0, 0, 4, 4]} isAnimationActive={false} />
              <Bar name="INSIGHTS DAM" dataKey="insightsDamEnergy" stackId="insights" fill="#FCD34D" isAnimationActive={false} />
              <Bar name="INSIGHTS RTM" dataKey="insightsRtmEnergy" stackId="insights" fill="#FCA5A5" isAnimationActive={false} />
              <Bar name="INSIGHTS GDAM" dataKey="insightsGdamEnergy" stackId="insights" fill="#6EE7B7" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </Box>
  );
};
