import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { ClientOverviewResult, MarketDecisionResult, DemandShiftInsightsResult } from '../../api/savingsCalculator.api';
import './proposal-dashboard.css';
import { VisualAnalyticsCharts } from '../insights/VisualAnalyticsCharts';

interface ProposalDashboardExportProps {
  clientOverview: ClientOverviewResult | null;
  marketDecisionResult: MarketDecisionResult | null;
  demandShiftInsights: DemandShiftInsightsResult | null;
  selectedMonth: string;
}

const formatIndianCurrency = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatLakhs = (num: number) => {
    return (num / 100000).toFixed(2) + 'L';
  };

export const ProposalDashboardExport: React.FC<ProposalDashboardExportProps> = ({
  clientOverview,
  marketDecisionResult,
  demandShiftInsights,
  selectedMonth
}) => {
  const { 
    totalSavings, 
    reductionPct, 
    actualSpend, 
    optimizedSpend, 
    totalUnits, 
    monthLabel 
  } = useMemo(() => {
    let totalSavings = 0;
    let actualSpend = 0;
    let optimizedSpend = 0;
    let totalUnits = 0;
    let monthLabel = selectedMonth || 'Overall';

    if (marketDecisionResult) {
      totalSavings = marketDecisionResult.totalSavings || 0;
      actualSpend = marketDecisionResult.totalBaselineCost || 0;
      optimizedSpend = actualSpend - totalSavings;
      
      marketDecisionResult.todSummaries?.forEach(t => {
        totalUnits += t.totalEnergyKwh || 0;
      });
    }

    const reductionPct = actualSpend > 0 ? ((totalSavings / actualSpend) * 100).toFixed(2) : '0.00';

    return { totalSavings, reductionPct, actualSpend, optimizedSpend, totalUnits, monthLabel };
  }, [marketDecisionResult, selectedMonth]);

  if (!marketDecisionResult) return null;

  return (
    <div className="dashboard-container" style={{ width: '1200px', backgroundColor: '#f8fafc', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        {/* Cover Banner */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: '400px',
          backgroundColor: '#0C1826',
          overflow: 'hidden',
          borderRadius: '16px 16px 0 0',
          marginBottom: '24px'
        }}>
          {/* Green Circle */}
          <div style={{
            position: 'absolute',
            width: '1200px',
            height: '1200px',
            borderRadius: '50%',
            backgroundColor: '#22C55E',
            top: '-400px',
            right: '-300px',
          }}></div>
          
          {/* Yellow Circle */}
          <div style={{
            position: 'absolute',
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            backgroundColor: '#BEF264',
            top: '60px',
            right: '400px',
          }}></div>
          
          {/* Logo container */}
          <div style={{
            position: 'absolute',
            top: '175px',
            left: '570px',
            zIndex: 10
          }}>
            <img src="/assets/logo.png" alt="Prolt Energy By Probus" style={{ height: '70px', objectFit: 'contain' }} />
          </div>

          {/* Report text */}
          <div style={{
            position: 'absolute',
            bottom: '30px',
            left: '40px',
            color: 'white',
            fontSize: '64px',
            fontWeight: 'bold',
            zIndex: 10,
            letterSpacing: '1px'
          }}>
            Report
          </div>
        </div>

        {/* Banner */}
        <div className="savings-banner">
            <div className="headline">
                <span role="img" aria-label="party">🎉</span> Great news! Your bill could drop by <span className="amount">₹{formatLakhs(totalSavings)}</span> <span className="badge">({reductionPct}% reduction)</span>
            </div>
            <div className="subhead">
                Total potential savings for {monthLabel.toUpperCase()}.
            </div>
            
            <div className="spend-comparison">
                <div className="spend-box">
                    <div className="label">ACTUAL SPEND</div>
                    <div className="value">₹{formatLakhs(actualSpend)}</div>
                </div>
                <div className="arrow-icon">→</div>
                <div className="spend-box optimized">
                    <div className="label">PROLT OPTIMIZED SPEND</div>
                    <div className="value">₹{formatLakhs(optimizedSpend)}</div>
                </div>
            </div>

            <div className="analyzed-units">
                Total Units : <strong>{Math.round(totalUnits)} kWh</strong> analyzed
            </div>
        </div>

        {/* Charts */}
        <div style={{ pointerEvents: 'none' }}>
            <VisualAnalyticsCharts 
                marketDecisionResult={marketDecisionResult} 
                demandShiftInsights={demandShiftInsights || ({ slotsData: [] } as any)}
                maxEnergyPerSlot={500} 
            />
        </div>
    </div>
  );
};
