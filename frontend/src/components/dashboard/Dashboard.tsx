import React, { useState, useMemo, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { ClientOverviewResult, MarketDecisionResult, SavingsCalculatorEntry } from '../../api/savingsCalculator.api';
import { OverallVisualAnalytics } from './OverallVisualAnalytics';
import { VisualAnalyticsCharts } from '../insights/VisualAnalyticsCharts';

import { DashboardHero } from './native/DashboardHero';
import { DashboardKPIs, KPI } from './native/DashboardKPIs';
import { DashboardFlow } from './native/DashboardFlow';
import { DashboardMatrix, MonthData } from './native/DashboardMatrix';
import { DashboardDataTable } from './native/DashboardDataTable';
import { DashboardMonthlyInsights } from './native/DashboardMonthlyInsights';
import { DashboardMarketMix } from './native/DashboardMarketMix';
import { DashboardBillEconomics } from './native/DashboardBillEconomics';
import { DashboardTodCoverage } from './native/DashboardTodCoverage';
import { DashboardHeatmap } from './native/DashboardHeatmap';
import { DashboardSimulationTabs } from './native/DashboardSimulationTabs';
import { DashboardEnergySummary } from './native/DashboardEnergySummary';
import { OverallMonthlyRegisterTable } from './native/OverallMonthlyRegisterTable';


interface DashboardProps {
  clientName?: string;
  calcEntry?: SavingsCalculatorEntry | null;
  clientOverview?: ClientOverviewResult | null;
  marketDecisionResult?: MarketDecisionResult | null;
  demandShiftInsights?: any;
  selectedMonth?: string;
  calcResult?: any;
}

const formatIndianCurrency = (num: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

const formatIndianNumber = (num: number) => {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 1,
  }).format(num);
};

export const Dashboard: React.FC<DashboardProps> = ({ 
  clientName, 
  calcEntry, 
  clientOverview, 
  marketDecisionResult, 
  demandShiftInsights, 
  selectedMonth,
  calcResult
}) => {
  const [activeMonth, setActiveMonth] = useState<string>(selectedMonth || 'all');

  useEffect(() => {
    if (selectedMonth) {
      setActiveMonth(selectedMonth);
    }
  }, [selectedMonth]);

  // Compute Overall KPI Data
  const { kpis, flowData, matrixData, periodText, detailedCycle, detail, isOverall, totalConsumption, totalMarketEnergy, annualizedSavings, avgMonthlySavings, potentialSavingsFiveYear } = useMemo(() => {
    let kpis: KPI[] = [];
    let flowData = { regionalBusOA: '0', efficiency: 100, consumerOA: '0' };
    let matrixData: MonthData[] = [];
    let periodText = 'Overall Period';
    let detailedCycle = 'Generated from API';
    let detail: any = null;
    let totalConsumption = 0;
    let totalMarketEnergy = 0;
    let annualizedSavings = 0;
    let avgMonthlySavings = 0;
    let potentialSavingsFiveYear = 0;
    
    const isOverall = activeMonth === 'all' || activeMonth === 'overall';

    if (clientOverview && clientOverview.months) {
      const validMonths = clientOverview.months.filter(m => !m.error);
      
      if (validMonths.length > 0) {
        periodText = `${validMonths[0].month} – ${validMonths[validMonths.length - 1].month}`;
      }

      if (marketDecisionResult && marketDecisionResult.slotsData.length > 0) {
        const firstDate = new Date(marketDecisionResult.slotsData[0].date);
        const lastDate = new Date(marketDecisionResult.slotsData[marketDecisionResult.slotsData.length - 1].date);
        detailedCycle = `${firstDate.getDate()} ${firstDate.toLocaleString('en-US', {month: 'short'})} – ${lastDate.getDate()} ${lastDate.toLocaleString('en-US', {month: 'short'})}`;
      }

      totalConsumption = 0;
      totalMarketEnergy = 0;
      let totalSavings = 0;
      let totalGrossSavings = 0;
      let totalBaselineCost = 0;
      let totalConsumerBusEnergy = 0;

      const monthsToProcess = isOverall ? validMonths : validMonths.filter(m => m.month === activeMonth);

      monthsToProcess.forEach(m => {
        totalConsumption += m.totalEnergyKwh || 0;
        totalMarketEnergy += m.totalMarketEnergyKwh || 0;
        const consumption = m.totalEnergyKwh || 0;
        const recOaConsumer = (m as any).oaConsumer ?? (m as any).clearedUnitsKwh ?? (m as any).cleared ?? ((m as any).oaCoverage != null ? (consumption * (m as any).oaCoverage / 100) : (m.totalMarketEnergyKwh ? m.totalMarketEnergyKwh * (1 - ((m as any).busLoss ? (m as any).busLoss / 100 : 0.1211)) : 0));
        totalConsumerBusEnergy += recOaConsumer;
        totalSavings += Math.round(m.savings || 0);
        const mGross = m.grossSavings ?? (m.totalBaselineCost ? Math.max(0, m.totalBaselineCost - (m.totalOptimizedCost || 0)) : m.savings || 0);
        totalGrossSavings += Math.round(mGross);
      });

      if (totalGrossSavings === 0 && marketDecisionResult) {
        const mTotals = (marketDecisionResult.oaDetailed as any)?.totals || {};
        totalGrossSavings = mTotals.grossSavings ?? (marketDecisionResult as any).grossSavings ?? marketDecisionResult.totalSavings ?? 0;
      }

      // Set baseline cost based on active view (Overall vs Monthly)
      if (isOverall) {
        if (clientOverview && clientOverview.aggregatedCosts) {
          totalBaselineCost = Math.round(clientOverview.aggregatedCosts.totalDiscomCost || 0);
        }
      } else if (marketDecisionResult) {
        totalBaselineCost = Math.round(marketDecisionResult.fullBaselineDiscomCost || marketDecisionResult.totalBaselineCost || 0);
      }

      let oaCoverage = totalConsumption > 0 ? (totalConsumerBusEnergy / totalConsumption) * 100 : 0;
      if (oaCoverage > 100) oaCoverage = 100;
      const blendedCost = totalConsumption > 0 ? (totalBaselineCost - totalSavings) / totalConsumption : 0;
      const avgDiscomCost = totalConsumption > 0 ? (totalBaselineCost / totalConsumption) : 0;
      const netSavingRate = totalConsumption > 0 ? (totalSavings / totalConsumption) : 0;
      const monthCount = monthsToProcess.length;
      avgMonthlySavings = monthCount > 0 ? totalSavings / monthCount : 0;
      const meteringCharges = Number(calcEntry?.meteringCharges || 0);
      const paybackMonths = avgMonthlySavings > 0 ? meteringCharges / avgMonthlySavings : 0;
      let paybackText = '0 months';
      if (paybackMonths > 0) {
        const wMonths = Math.floor(paybackMonths);
        const days = Math.round((paybackMonths - wMonths) * 30);
        if (days === 0) {
          paybackText = `${wMonths} months`;
        } else if (wMonths === 0) {
          paybackText = `${days} days`;
        } else {
          paybackText = `${wMonths} months and ${days} days`;
        }
      }
      annualizedSavings = avgMonthlySavings * 12;
      // 5 Years Saving calculation exactly matching the Excel Export formula:
      // avgAnnualSaving + avgAnnualSaving*1.1 + avgAnnualSaving*POWER(1.1,2) + avgAnnualSaving*POWER(1.1,3) + avgAnnualSaving*POWER(1.1,4)
      potentialSavingsFiveYear = annualizedSavings * (1 + 1.1 + Math.pow(1.1, 2) + Math.pow(1.1, 3) + Math.pow(1.1, 4));

      const monthCountText = `${monthCount} ${monthCount === 1 ? 'month' : 'months'}`;

      // Dynamic KPIs with clear annotations
      kpis = [
        { 
          label: isOverall ? `Aggregate client saving (${monthCountText})` : 'Client saving (1 month)', 
          value: formatIndianCurrency(totalSavings), 
          sub: isOverall ? `Cumulative savings across ${monthCountText}` : `Net savings for ${activeMonth}`, 
          color: 'green' 
        },
        { 
          label: 'Average monthly savings', 
          value: formatIndianCurrency(avgMonthlySavings), 
          sub: isOverall ? `Average client savings per month (${monthCountText})` : 'Average client savings per month', 
          color: 'green' 
        },
        { 
          label: 'Average annual savings', 
          value: formatIndianCurrency(annualizedSavings), 
          sub: 'Annualized savings (Monthly × 12)', 
          color: 'green' 
        },
        { 
          label: '5 Years Saving', 
          value: formatIndianCurrency(potentialSavingsFiveYear), 
          sub: 'Annual savings with 10% YoY escalation', 
          color: 'green' 
        },
        { label: 'Metering charge payback', value: paybackText, sub: 'Time to recover metering charges', color: 'amber' },
        { label: isOverall ? 'Weighted OA coverage' : 'OA coverage', value: `${(Number(oaCoverage) || 0).toFixed(1)}%`, sub: 'Average Monthly Energy Bought from OA', color: 'amber' },
        { label: 'Total consumption', value: `${formatIndianNumber(totalConsumption)} kWh`, sub: isOverall ? 'Annualized electricity consumption (12 months)' : 'Billed electricity consumption' },
        { label: 'Blended Cost - OA', value: `₹${(Number(blendedCost) || 0).toFixed(2)}/kWh`, sub: 'Average blended rate per kWh' },
        { label: 'Average DISCOM Cost', value: `₹${(Number(avgDiscomCost) || 0).toFixed(2)}/kWh`, sub: 'Baseline utility tariff without OA' },
        { label: 'Net saving rate', value: `₹${(Number(netSavingRate) || 0).toFixed(2)}/kWh`, sub: 'Final client saving per consumed unit', color: 'green' },
      ];

      flowData = {
        regionalBusOA: `${formatIndianNumber(totalMarketEnergy / 1000)} MWh`,
        efficiency: 100, // assuming 100% since no explicit bus loss data
        consumerOA: `${formatIndianNumber(totalConsumerBusEnergy / 1000)} MWh`
      };

      // Matrix is always all months
      matrixData = validMonths.map(m => {
        const consumption = m.totalEnergyKwh || 0;
        const recOaConsumer = (m as any).oaConsumer ?? (m as any).clearedUnitsKwh ?? (m as any).cleared ?? ((m as any).oaCoverage != null ? (consumption * (m as any).oaCoverage / 100) : (m.totalMarketEnergyKwh ? m.totalMarketEnergyKwh * (1 - ((m as any).busLoss ? (m as any).busLoss / 100 : 0.1211)) : 0));
        let cov = consumption > 0 ? (recOaConsumer / consumption) * 100 : 0;
        if (cov > 100) cov = 100;
        return {
          month: m.month,
          saving: formatIndianCurrency(Math.round(m.savings || 0)),
          grossSaving: formatIndianCurrency(Math.round(m.grossSavings || 0)),
          coverage: Math.round(cov)
        };
      });

      // Compute Detail (Data Tables) - only if not overall and we have detailed result
      if (!isOverall && marketDecisionResult && marketDecisionResult.slotsData) {
        const dailyMap: Record<string, any> = {};
        const heatmapRecords: any[] = [];
        const marketSummaryMap: Record<string, any> = { DAM: { qtyMWh: 0, activeSlots: 0, activeDays: new Set(), sumWeighted: 0 }, GDAM: { qtyMWh: 0, activeSlots: 0, activeDays: new Set(), sumWeighted: 0 }, RTM: { qtyMWh: 0, activeSlots: 0, activeDays: new Set(), sumWeighted: 0 } };
        
        marketDecisionResult.slotsData.forEach((slot: any) => {
          const marketSource = slot.selectedSource || slot.marketSource || 'DISCOM';
          const isMarket = marketSource !== 'DISCOM';
          const qtyKwh = slot.maxEnergyPerSlot ?? slot.marketEnergy ?? 0;
          const rate = isMarket
            ? (slot.comparedLowestPrice ?? (marketSource === 'GDAM' ? (slot.gdamLanding || 0) : marketSource === 'RTM' ? (slot.rtmLanding || 0) : (slot.damLanding || 0)))
            : (slot.discomLandingPrice || slot.discomLanding || 0);

          let dateStr = slot.date;
          if (slot.date && typeof slot.date === 'string' && slot.date.includes('-')) {
            const dParts = slot.date.split('-');
            if (dParts.length === 3) {
              if (dParts[0].length === 4) dateStr = `${dParts[2]}-${new Date(slot.date).toLocaleString('en-US', {month: 'short'})}`;
              else if (dParts[2].length === 4) dateStr = `${dParts[0]}-${new Date(dParts[2]+"-"+dParts[1]+"-"+dParts[0]).toLocaleString('en-US', {month: 'short'})}`;
              else dateStr = slot.date.substring(0, 6);
            } else if (slot.date.length > 6) {
              dateStr = slot.date.substring(0, 6);
            }
          }
          const date = dateStr;

          if (!dailyMap[date]) {
            dailyMap[date] = { date, iso: date, qty: 0, DAM: 0, GDAM: 0, RTM: 0, activeSlots: 0, sumWeighted: 0, dominantMarket: 'DAM' };
          }

          if (qtyKwh > 0) {
            const qtyMWh = qtyKwh / 1000;
            dailyMap[date].qty += qtyMWh;
            dailyMap[date].activeSlots += 1;
            dailyMap[date].sumWeighted += qtyMWh * rate;

            if (isMarket) {
              const mkt = marketSource as 'DAM' | 'GDAM' | 'RTM';
              dailyMap[date][mkt] += qtyMWh;

              marketSummaryMap[mkt].qtyMWh += qtyMWh;
              marketSummaryMap[mkt].activeSlots += 1;
              marketSummaryMap[mkt].activeDays.add(date);
              marketSummaryMap[mkt].sumWeighted += qtyMWh * rate;

              heatmapRecords.push({
                date: date,
                timeblock: Number(slot.timeblock ?? slot.slot ?? slot.intervalNumber ?? 1),
                qty: qtyMWh,
                rate: rate,
                market: mkt
              });
            }
          }
        });

        const daily = Object.values(dailyMap).map(d => {
          d.weightedRate = d.qty > 0 ? d.sumWeighted / d.qty : 0;
          d.dominantMarket = d.RTM > d.DAM && d.RTM > d.GDAM ? 'RTM' : d.GDAM > d.DAM && d.GDAM > d.RTM ? 'GDAM' : 'DAM';
          return d;
        });

        const tod = marketDecisionResult.todSummaries ? marketDecisionResult.todSummaries.map((t: any) => {
          const name = t.slotName || t.slabName || 'TOD Slot';
          const totalUnits = Number(t.consumptionKwh ?? t.totalEnergyKwh ?? 0);
          const baselineBill = Number(t.baselineCost ?? (totalUnits * (t.effectivePrice || 0)));
          const oaRegional = Number(t.marketEnergyKwh ?? totalUnits);
          const oaConsumer = Number(t.marketEnergyKwh ?? totalUnits);
          const oaEnergyCharges = Number(t.marketCostBase ?? (oaRegional * (t.effectivePrice || 0)));
          const discomAfterOA = Math.max(0, totalUnits - oaRegional);
          const coverage = totalUnits > 0 ? (oaRegional / totalUnits * 100) : 0;
          const avoidedDiscomBill = Number(t.savings ?? (baselineBill - oaEnergyCharges));

          return {
            tod: name,
            actualUnits: totalUnits,
            baselineBill: baselineBill,
            oaRegional: oaRegional,
            oaConsumer: oaConsumer,
            oaEnergyCharges: oaEnergyCharges,
            discomAfterOA: discomAfterOA,
            coverage: coverage,
            deliveredEfficiency: 100,
            avoidedDiscomBill: avoidedDiscomBill
          };
        }) : [];

        const mRes = marketDecisionResult as any;
        const marketKwh = mRes.totalMarketEnergyKwh || mRes.totalEnergyKwh || 0;

        let oaCharges: any[] = [];
        if (marketDecisionResult.oaDetailed?.breakdown && marketDecisionResult.oaDetailed.breakdown.length > 0) {
          oaCharges = marketDecisionResult.oaDetailed.breakdown.map((b: any) => ({
            name: b.slabName || b.slotName || 'OA Charge',
            amount: b.oaBill || 0,
            rate: b.rate || "---",
            basis: b.basis || `${b.oaUnits || 0} kWh`
          }));
        } else {
          if (mRes.proltMarginCost > 0) {
            oaCharges.push({
              name: 'PROLT Savings Margin',
              basis: 'Gross Savings Value Share',
              rate: `${mRes.proltMarginVal || 15}%`,
              amount: mRes.proltMarginCost
            });
          }
          if (mRes.traderMargin > 0) {
            oaCharges.push({
              name: 'Trader Margin (incl. 18% GST)',
              basis: `${(marketKwh / 1000).toFixed(2)} MWh`,
              rate: '₹0.02/kWh + GST',
              amount: mRes.traderMargin
            });
          }
          if (mRes.probusPlatformFee > 0) {
            oaCharges.push({
              name: 'Probus Platform Subscription Fee',
              basis: `${(marketKwh / 1000).toFixed(2)} MWh`,
              rate: '₹0.02/kWh',
              amount: mRes.probusPlatformFee
            });
          }
          if (mRes.meteringCharges > 0) {
            oaCharges.push({
              name: 'Metering Charges',
              basis: 'Monthly Fixed',
              rate: 'Lump Sum',
              amount: mRes.meteringCharges
            });
          }
          if (mRes.consultancyFee > 0) {
            oaCharges.push({
              name: 'Consultancy & Advisory Fee',
              basis: 'Monthly Fixed',
              rate: 'Lump Sum',
              amount: mRes.consultancyFee
            });
          }
          const overheads = (mRes.oaDetailed?.dailyFixedOverhead || 0) + (mRes.oaDetailed?.bidApplicationFees || 0);
          if (overheads > 0) {
            oaCharges.push({
              name: 'Operating & Scheduling Overheads',
              basis: 'Traded Days / Bids',
              rate: 'Standard Fee',
              amount: overheads
            });
          }
        }

        // Use the selected month from clientOverview to find fees
        const currentMonthData = clientOverview?.months?.find(m => m.month === activeMonth);
        const mTotals = (marketDecisionResult?.oaDetailed as any)?.totals || {};
        const grossSaving = currentMonthData?.grossSavings ?? mTotals.grossSavings ?? (marketDecisionResult as any)?.grossSavings ?? marketDecisionResult.totalSavings ?? 0;
        const finalSaving = currentMonthData?.savings ?? marketDecisionResult.totalSavings ?? 0;
        const fees = Math.max(0, grossSaving - finalSaving);

        const discomAfterOABill = (marketDecisionResult.todSummaries || []).reduce((acc: number, t: any) => {
          const totalUnits = Number(t.consumptionKwh ?? t.totalEnergyKwh ?? 0);
          const marketUnits = Number(t.marketEnergyKwh ?? totalUnits);
          const discomUnits = Math.max(0, totalUnits - marketUnits);
          return acc + (discomUnits * (t.effectivePrice || 8.5));
        }, 0);

        const oaEnergyBill = (marketDecisionResult.todSummaries || []).reduce((acc: number, t: any) => {
          return acc + Number(t.marketCostBase ?? t.baselineCost ?? 0);
        }, 0);

        const oaOperatingBill = (marketDecisionResult.oaDetailed?.dailyFixedOverhead || 0) + (marketDecisionResult.oaDetailed?.bidApplicationFees || 0);
        const proltFees = (mRes.proltMarginCost || 0) + (mRes.traderMargin || 0) + (mRes.consultancyFee || 0) + (mRes.probusPlatformFee || 0) + (mRes.meteringCharges || 0);

        const baselineBreakdown = [
          {
            name: 'Discom Energy & Capacity Charges',
            baseline: marketDecisionResult.totalBaselineCost || 0,
            afterOA: discomAfterOABill
          },
          {
            name: 'Open Access Market Power Procurement',
            baseline: 0,
            afterOA: oaEnergyBill
          },
          {
            name: 'Open Access Operating & Overhead Fees',
            baseline: 0,
            afterOA: oaOperatingBill
          },
          {
            name: 'PROLT Platform & Advisory Margins',
            baseline: 0,
            afterOA: proltFees
          }
        ];

        detail = {
          baselineBill: marketDecisionResult.totalBaselineCost,
          combinedBill: marketDecisionResult.totalBaselineCost - marketDecisionResult.totalSavings,
          finalClientSaving: finalSaving,
          totalFees: fees,
          grossSaving: grossSaving,
          customerRetention: grossSaving > 0 ? (finalSaving / grossSaving) * 100 : 0,
          discomAfterOA: discomAfterOABill,
          oaBill: (marketDecisionResult.oaDetailed?.breakdown || []).reduce((acc: number, b: any) => acc + (b.oaBill || 0), 0),
          oaEnergyCharges: oaEnergyBill,
          oaOperatingCharges: oaOperatingBill,
          daily,
          tod,
          baselineBreakdown,
          oaCharges,
          heatmapRecords,
          marketSummary: Object.keys(marketSummaryMap).map(mkt => ({
            market: mkt,
            qtyMWh: marketSummaryMap[mkt].qtyMWh,
            weightedRate: marketSummaryMap[mkt].qtyMWh > 0 ? marketSummaryMap[mkt].sumWeighted / marketSummaryMap[mkt].qtyMWh : 0,
            activeSlots: marketSummaryMap[mkt].activeSlots,
            activeDays: marketSummaryMap[mkt].activeDays.size,
            share: totalMarketEnergy > 0 ? ((marketSummaryMap[mkt].qtyMWh * 1000) / totalMarketEnergy) * 100 : 0
          }))
        };
      }
    }

    return { kpis, flowData, matrixData, periodText, detailedCycle, detail, isOverall, totalConsumption, totalMarketEnergy, annualizedSavings, avgMonthlySavings, potentialSavingsFiveYear };
  }, [clientOverview, marketDecisionResult, activeMonth]);

  const hasMeteringCharges = calcEntry?.meteringCharges !== undefined && calcEntry?.meteringCharges !== null;
  const meteringCharges = Number(calcEntry?.meteringCharges || 0);
  const roiFiveYear = potentialSavingsFiveYear > 0 ? meteringCharges / potentialSavingsFiveYear : 0;
  const paybackMonths = avgMonthlySavings > 0 ? meteringCharges / avgMonthlySavings : 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
      <Box id="dashboard-hero-kpis-screenshot-target" sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%', bgcolor: '#f8fafc', p: 1.5, borderRadius: 2 }}>
        <DashboardHero 
          clientName={clientName || 'Energy Dashboard'}
          industryName={calcEntry?.industryName || clientOverview?.industryName}
          location={calcEntry?.address || 'Location Unavailable'}
          connectivity={calcEntry?.voltageLevel || 'Connectivity Unavailable'}
          overallPeriod={periodText}
          detailedCycle={detailedCycle}
        />

        {/* Dynamic KPIs (Overall or Monthly depending on state) */}
        <Box sx={{ mt: 2 }}>
          <DashboardKPIs kpis={kpis} />
        </Box>
      </Box>

      {/* Energy Summary (Overall or Monthly) */}
      <Box sx={{ mt: 2, mb: 1 }}>
        <DashboardEnergySummary 
          calcResult={{
            totalEnergyKwh: totalConsumption,
            totalMarketEnergyKwh: totalMarketEnergy
          }} 
          marketDecisionResult={isOverall ? null : marketDecisionResult} 
        />
      </Box>

      {/* Tabs / Month Selection Matrix (Always shown to allow switching) */}
      <Box sx={{ mt: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 'bold' }}>
            Monthly savings and Open Access coverage
          </Typography>
          <Box sx={{ flexGrow: 1 }} />

        </Box>
        <Typography sx={{ fontSize: '12px', color: '#65758b', mb: 2, mt: -1 }}>
          Click a month in the matrix below to open its linked sub-report.
        </Typography>
        <DashboardMatrix 
          months={matrixData} 
          activeMonth={activeMonth} 
          onMonthClick={(m) => setActiveMonth(m)} 
        />
      </Box>

      {/* Monthly-only components */}
      {!isOverall && (
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Monthly Insights Row */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 3 }}>
            <Box>
              <DashboardMonthlyInsights detail={detail} />
            </Box>
          </Box>

          {/* Visual Analytics Charts & Market Mix */}
          {marketDecisionResult && (
            <>
              <Box sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: '12px', bgcolor: 'background.paper' }}>
                <VisualAnalyticsCharts 
                  marketDecisionResult={marketDecisionResult} 
                  demandShiftInsights={demandShiftInsights || { slotsData: [] }}
                  maxEnergyPerSlot={500} 
                />
              </Box>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: '61fr 39fr', gap: 3 }}>
                <DashboardMarketMix detail={detail} />
                <DashboardBillEconomics detail={detail} />
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 3 }}>
                <DashboardTodCoverage detail={detail} />
              </Box>
              
              <Box>
                <DashboardHeatmap detail={detail} />
              </Box>
            </>
          )}

          {detail && <DashboardDataTable detail={detail} />}
          
          <DashboardSimulationTabs 
            calcResult={calcResult}
            marketDecisionResult={marketDecisionResult}
            demandShiftInsights={demandShiftInsights}
          />
        </Box>
      )}

      {/* Overall-only components */}
      {isOverall && clientOverview && (
        <Box sx={{ mt: 4 }}>
          <OverallVisualAnalytics clientOverview={clientOverview} selectedMonth={selectedMonth} />
          <OverallMonthlyRegisterTable clientOverview={clientOverview} onDrillDown={(m) => setActiveMonth(m)} />
        </Box>
      )}

    </Box>
  );
};
