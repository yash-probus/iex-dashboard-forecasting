import React, { useMemo } from 'react';
import { Box, Typography, Paper, Divider } from '@mui/material';

interface DashboardMonthlyInsightsProps {
  detail: any;
}

export const DashboardMonthlyInsights: React.FC<DashboardMonthlyInsightsProps> = ({ detail }) => {
  const insights = useMemo(() => {
    if (!detail) return [];
    
    const items = [];
    
    // Retention
    if (detail.customerRetention !== undefined) {
      items.push({
        title: `${Number(detail.customerRetention || 0).toFixed(1)}% of gross savings retained`,
        desc: `The client retained ${formatLakh(detail.finalClientSaving)} after ${formatLakh(detail.totalFees)} of reported fees.`,
        color: '#10b981'
      });
    }

    // Dominant Market
    if (detail.marketSummary && detail.marketSummary.length > 0) {
      let maxMarket = detail.marketSummary[0];
      for (const m of detail.marketSummary) {
        if (m.qtyMWh > maxMarket.qtyMWh) maxMarket = m;
      }
      
      const rtmNote = maxMarket.market === 'RTM' ? ', indicating a strong reliance on near-term flexibility.' : '.';
      items.push({
        title: `${maxMarket.market} is the primary procurement channel`,
        desc: `${Number(maxMarket.share || 0).toFixed(1)}% of scheduled volume came through ${maxMarket.market}${rtmNote}`,
        color: maxMarket.market === 'DAM' ? '#eab308' : maxMarket.market === 'GDAM' ? '#10b981' : '#f43f5e'
      });
    }

    // TOD Opportunity (Max actual units but lowest coverage?)
    if (detail.tod && detail.tod.length > 0) {
      let maxOpp = detail.tod[0];
      let maxPen = detail.tod[0];
      for (const t of detail.tod) {
        if (t.actualUnits - t.oaConsumer > maxOpp.actualUnits - maxOpp.oaConsumer) maxOpp = t;
        if (t.coverage > maxPen.coverage) maxPen = t;
      }
      
      items.push({
        title: `Largest TOD opportunity: ${maxOpp.tod}`,
        desc: `Coverage was only ${Number(maxOpp.coverage || 0).toFixed(1)}% despite ${formatNumber((maxOpp.actualUnits || 0) / 1000)} MWh consumption. Validate eligibility, price and operational constraints before increasing volume.`,
        color: '#1769e0'
      });
      
      items.push({
        title: `Strongest TOD penetration: ${maxPen.tod}`,
        desc: `${Number(maxPen.coverage || 0).toFixed(1)}% of consumption was met through Open Access.`,
        color: '#10b981'
      });
    }

    // Best Windows
    if (detail.daily && detail.daily.length > 0) {
      let maxVol = detail.daily[0];
      let minRate = detail.daily[0];
      for (const d of detail.daily) {
        if (d.qty > maxVol.qty) maxVol = d;
        if (d.weightedRate > 0 && (d.weightedRate < minRate.weightedRate || minRate.weightedRate === 0)) minRate = d;
      }
      
      items.push({
        title: 'Best daily volume and rate windows',
        desc: `${maxVol.date} delivered ${formatNumber(maxVol.qty)} MWh. ${minRate.date} had the lowest quantity-weighted market rate at ₹${Number(minRate.weightedRate || 0).toFixed(2)}/kWh.`,
        color: '#8b5cf6'
      });
    }
    
    return items;
  }, [detail]);

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: '12px', height: '100%', bgcolor: 'background.paper' }}>
      <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 'bold', color: 'text.primary' }}>Monthly management insights</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '11px', mb: 2 }}>Actions supported by the detailed cycle data</Typography>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
        {insights.map((ins, idx) => (
          <Box key={idx} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '6px', p: 1.5, borderLeft: `4px solid ${ins.color}`, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#fff' }}>
            <Typography sx={{ fontWeight: 'bold', fontSize: '13px', color: 'text.primary' }}>{ins.title}</Typography>
            <Typography sx={{ fontSize: '12px', color: 'text.secondary', mt: 0.5 }}>{ins.desc}</Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};

function formatLakh(val: number) {
  return '₹' + (Number(val || 0) / 100000).toFixed(2) + 'L';
}

function formatNumber(val: number) {
  return val.toLocaleString('en-IN', { maximumFractionDigits: 1 });
}
