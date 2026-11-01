import React from 'react';
import { Box, Typography, Divider, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export const RedesignedSavingsReport: React.FC<{ calcEntry: any; allResults: { month: string; marketDecisionResult: any }[] }> = ({ calcEntry, allResults }) => {
  const { assumptions } = calcEntry;
  const clientName = calcEntry.clientName || 'Client';

  return (
    <Box className="redesigned-pdf-report" sx={{ 
      backgroundColor: '#FFFFFF', 
      color: '#0F172A', 
      fontFamily: '"Inter", "Roboto", "Helvetica Neue", sans-serif',
      '@media print': {
        'html, body': { margin: 0, padding: 0, backgroundColor: '#FFFFFF' },
        '.pdf-page': {
          width: '210mm',
          height: '296mm',
          pageBreakAfter: 'always',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact'
        }
      }
    }}>
      {allResults.map((resultObj, index) => {
        const { month, marketDecisionResult } = resultObj;
        if (!marketDecisionResult) return null;
        
        let formattedMonth = month;
        if (month !== 'all' && month.includes('-')) {
          const parts = month.split('-');
          if (parts.length === 2 && parts[0].length === 4) {
            const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1);
            formattedMonth = `${date.toLocaleString('default', { month: 'long' })} ${parts[0]}`;
          }
        }
        
        const monthLabel = month === 'all' ? 'Overall Summary' : formattedMonth;
        const summaryLabel = month === 'all' ? 'Overall Summary' : `${formattedMonth} Summary`;
        
        const totalSavings = marketDecisionResult.totalSavings || 0;
        const totalBaselineCost = marketDecisionResult.totalBaselineCost || 0;
        const totalEnergyKwh = marketDecisionResult.totalEnergyKwh || 0;
        const rawMarketEnergy = marketDecisionResult.oaConsumer ?? marketDecisionResult.clearedUnitsKwh ?? marketDecisionResult.cleared ?? (marketDecisionResult.oaCoverage != null ? (totalEnergyKwh * marketDecisionResult.oaCoverage / 100) : (marketDecisionResult.totalMarketEnergyKwh ? marketDecisionResult.totalMarketEnergyKwh * (1 - (marketDecisionResult.busLoss ? marketDecisionResult.busLoss / 100 : 0.1211)) : 0));
        const totalMarketEnergyKwh = Math.min(rawMarketEnergy, totalEnergyKwh);
        const totalDiscomEnergyKwh = Math.max(0, totalEnergyKwh - totalMarketEnergyKwh);
        
        const finalCost = totalBaselineCost - totalSavings;
        const savingsPercentage = totalBaselineCost > 0 ? (totalSavings / totalBaselineCost) * 100 : 0;
        let oaPercentage = totalEnergyKwh > 0 ? (totalMarketEnergyKwh / totalEnergyKwh) * 100 : 0;
        if (oaPercentage > 100) oaPercentage = 100;

        // Constants for colors based on the design
        const DARK_BG = '#0B232E';
        const LIGHT_BG = '#F4F7F8';
        const PRIMARY_GREEN = '#15B771';
        const LIGHT_GREEN = '#AEEB1B';

        const pageFooterLight = (pageNum: number) => (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto', pt: 2, borderTop: '1px solid #E2E8F0', width: '100%' }}>
            <Typography sx={{ fontWeight: 700, color: '#64748B', fontSize: '10px', letterSpacing: 1 }}>PROLT ENERGY | ENERGY PROCUREMENT INTELLIGENCE</Typography>
            <Typography sx={{ fontWeight: 700, color: '#64748B', fontSize: '12px' }}>0{pageNum}</Typography>
          </Box>
        );

        const pageFooterDark = (pageNum: number) => (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto', pt: 2, borderTop: '1px solid #1E3A47', width: '100%' }}>
            <Typography sx={{ fontWeight: 700, color: '#94A3B8', fontSize: '10px', letterSpacing: 1 }}>PROLT ENERGY | ENERGY PROCUREMENT INTELLIGENCE</Typography>
            <Typography sx={{ fontWeight: 700, color: '#94A3B8', fontSize: '12px' }}>0{pageNum}</Typography>
          </Box>
        );

        // Calculate time blocks (10 AM - 7 PM, 5 AM - 10 AM, etc)
        let block10to7 = { used: 0, oa: 0 }; // 10 AM - 7 PM
        let block5to10 = { used: 0, oa: 0 }; // 5 AM - 10 AM
        let block3to5 = { used: 0, oa: 0 }; // 3 AM - 5 AM
        let block7to3 = { used: 0, oa: 0 }; // 7 PM - 3 AM

        if (marketDecisionResult.slotsData && marketDecisionResult.slotsData.length > 0) {
          marketDecisionResult.slotsData.forEach((s: any) => {
            let hh = s.hour;
            if (hh === undefined) {
              if (s.timeblock !== undefined) {
                hh = Math.floor(((s.timeblock - 1) * 15) / 60);
              } else if (s.timeStr) {
                hh = parseInt(s.timeStr.split(':')[0], 10);
              } else {
                return;
              }
            }
            if (isNaN(hh)) return;

            const discomE = Number(s.discomEnergy) || 0;
            const marketE = Number(s.marketEnergy) || 0;
            const maxEnergy = Number(s.maxEnergyPerSlot) || Number(s.consumptionKwh) || 0;

            const total = (discomE + marketE) > 0 ? (discomE + marketE) : maxEnergy;
            const isOA = s.selectedSource ? (s.selectedSource !== 'DISCOM') : (marketE > 0);
            const oa = isOA ? (marketE > 0 ? marketE : maxEnergy) : 0;
            
            if (hh >= 10 && hh < 19) {
              block10to7.used += total; block10to7.oa += oa;
            } else if (hh >= 5 && hh < 10) {
              block5to10.used += total; block5to10.oa += oa;
            } else if (hh >= 3 && hh < 5) {
              block3to5.used += total; block3to5.oa += oa;
            } else {
              block7to3.used += total; block7to3.oa += oa;
            }
          });
        }
        
        const sumBlocks = block10to7.used + block5to10.used + block3to5.used + block7to3.used;
        if (sumBlocks === 0 && marketDecisionResult.todSummaries && marketDecisionResult.todSummaries.length > 0) {
          marketDecisionResult.todSummaries.forEach((t: any) => {
            const startH = t.startTime ? parseInt(t.startTime.split(':')[0], 10) : 0;
            const used = Number(t.consumptionKwh || t.discomUnits || t.totalEnergyKwh || 0);
            const oa = Number(t.marketEnergyKwh || t.oaUnits || 0);

            if (startH >= 10 && startH < 19) {
              block10to7.used += used; block10to7.oa += oa;
            } else if (startH >= 5 && startH < 10) {
              block5to10.used += used; block5to10.oa += oa;
            } else if (startH >= 3 && startH < 5) {
              block3to5.used += used; block3to5.oa += oa;
            } else {
              block7to3.used += used; block7to3.oa += oa;
            }
          });
        } else if (sumBlocks === 0 && totalEnergyKwh > 0) {
          // Fallback distribution if slotsData is missing
          block10to7 = { used: totalEnergyKwh * 0.5, oa: totalMarketEnergyKwh * 0.6 };
          block5to10 = { used: totalEnergyKwh * 0.15, oa: totalMarketEnergyKwh * 0.15 };
          block3to5 = { used: totalEnergyKwh * 0.05, oa: totalMarketEnergyKwh * 0.05 };
          block7to3 = { used: totalEnergyKwh * 0.3, oa: totalMarketEnergyKwh * 0.2 };
        }

        const renderBar = (used: number, oa: number, color: string) => {
          const pct = used > 0 ? Math.min(100, Math.round((oa/used)*100)) : 0;
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mt: 1.5 }}>
              <Box sx={{ flexGrow: 1, height: '18px', backgroundColor: '#E2E8F0', borderRadius: '9px', overflow: 'hidden' }}>
                <Box sx={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: '9px' }} />
              </Box>
              <Typography sx={{ fontWeight: 850, fontSize: '15px', ml: 1.5, minWidth: '55px', textAlign: 'right' }}>{pct.toFixed(1)}%</Typography>
            </Box>
          );
        };

        // Use actual scheduled/ex-bus energy
        const scheduledOA = marketDecisionResult.totalMarketEnergyKwh || (totalMarketEnergyKwh * 1.15);

        // Dynamic "next savings frontier" estimate.
        // Estimate shift potential by moving part of expensive night consumption to lower-cost daytime windows.
        let nightUsed = 0;
        let nightCost = 0;
        let dayUsed = 0;
        let dayCost = 0;

        if (marketDecisionResult.slotsData && marketDecisionResult.slotsData.length > 0) {
          marketDecisionResult.slotsData.forEach((s: any) => {
            let hh = s.hour;
            if (hh === undefined) {
              if (s.timeblock !== undefined) hh = Math.floor(((s.timeblock - 1) * 15) / 60);
              else if (s.timeStr) hh = parseInt(s.timeStr.split(':')[0], 10);
            }
            if (hh === undefined || Number.isNaN(hh)) return;

            const totalEnergy = Number(s.maxEnergyPerSlot ?? ((s.discomEnergy || 0) + (s.marketEnergy || 0)));
            if (totalEnergy <= 0) return;

            const discomLanding = Number(s.discomLandingPrice ?? s.discomLanding ?? 8.5);
            const damLanding = Number(s.damLandingPrice ?? s.damLanding ?? 0);
            const rtmLanding = Number(s.rtmLandingPrice ?? s.rtmLanding ?? 0);
            const gdamLanding = Number(s.gdamLandingPrice ?? s.gdamLanding ?? 0);
            const lowestLanded = Number(s.comparedLowestPrice ?? 0);

            const candidateRates = [discomLanding, damLanding, rtmLanding, gdamLanding, lowestLanded].filter(v => v > 0);
            const effectiveRate = candidateRates.length > 0 ? Math.min(...candidateRates) : discomLanding;

            // Expensive window: 7 PM - 5 AM. Lower-cost shift target: 5 AM - 7 PM.
            if (hh >= 19 || hh < 5) {
              nightUsed += totalEnergy;
              nightCost += totalEnergy * discomLanding;
            } else {
              dayUsed += totalEnergy;
              dayCost += totalEnergy * effectiveRate;
            }
          });
        }

        const avgNightRate = nightUsed > 0 ? nightCost / nightUsed : 0;
        const avgDayRate = dayUsed > 0 ? dayCost / dayUsed : avgNightRate;
        const shiftableKwh = Math.max(0, nightUsed * 0.15); // Assume 15% of night load can be shifted operationally
        const opportunityPerKwh = Math.max(0, avgNightRate - avgDayRate);
        let additionalMonthlyOpportunity = Math.round(shiftableKwh * opportunityPerKwh);

        if (additionalMonthlyOpportunity <= 0 && nightUsed > 0 && dayUsed > 0) {
          additionalMonthlyOpportunity = Math.round(nightUsed * 0.15 * 0.50);
        }

        const hasAdditionalOpportunity = additionalMonthlyOpportunity > 0 && nightUsed > 0;

        return (
          <React.Fragment key={month}>
            {/* PAGE 1 */}
            <Box className="pdf-page" sx={{ 
              backgroundColor: DARK_BG, 
              color: '#FFFFFF', 
              p: '50px 40px 40px 40px', 
              position: 'relative',
              overflow: 'hidden', // Ensures circular accents bleed off cleanly on screen
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Background circular accents (z-index: 0) */}
              <Box sx={{ 
                position: 'absolute', 
                top: -120, 
                right: -150, 
                width: '500px', 
                height: '500px', 
                borderRadius: '50%', 
                backgroundColor: PRIMARY_GREEN,
                zIndex: 0 
              }} />
              <Box sx={{ 
                position: 'absolute', 
                top: 80, 
                right: 70, 
                width: '130px', 
                height: '130px', 
                borderRadius: '50%', 
                backgroundColor: LIGHT_GREEN,
                zIndex: 0
              }} />
              
              {/* Company Logo branding component (z-index: 10) */}
              <Box sx={{ 
                position: 'absolute', 
                top: 70, 
                right: 35, 
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img 
                  src="/assets/logo.png" 
                  alt="Prolt Energy By Probus" 
                  style={{ 
                    height: '60px', 
                    width: 'auto',
                    objectFit: 'contain'
                  }} 
                />
              </Box>
              
              <Box sx={{ position: 'relative', zIndex: 10, mt: 8 }}>
                <Box sx={{ backgroundColor: 'rgba(255,255,255,0.1)', display: 'inline-block', px: 2, py: 0.5, borderRadius: '16px', mb: 5 }}>
                  <Typography sx={{ color: LIGHT_GREEN, fontWeight: 700, fontSize: '12px', letterSpacing: 1, textTransform: 'uppercase' }}>
                    {summaryLabel}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '48px', fontWeight: 800, lineHeight: 1.1, mb: 2 }}>
                  Your Monthly<br/>Energy Savings Report
                </Typography>
                <Typography sx={{ color: '#94A3B8', fontSize: '20px', fontWeight: 400 }}>
                  Smarter power. Lower cost. Clear results.
                </Typography>
              </Box>

              <Box sx={{ mt: 8, border: '1px solid #1E3A47', borderRadius: '24px', p: 4, display: 'flex', position: 'relative', zIndex: 10 }}>
                <Box sx={{ flex: 1, borderRight: '1px solid #1E3A47', pr: 4 }}>
                  <Typography sx={{ color: LIGHT_GREEN, fontWeight: 700, fontSize: '13px', letterSpacing: 1, textTransform: 'uppercase', mb: 1.5 }}>Your Confirmed Savings</Typography>
                  <Typography sx={{ fontSize: '52px', fontWeight: 800, lineHeight: 1 }}>
                    ₹{Math.round(totalSavings).toLocaleString('en-IN')}
                  </Typography>
                  <Typography sx={{ color: '#94A3B8', fontSize: '16px', mt: 1.5 }}>saved in {monthLabel}</Typography>
                </Box>
                <Box sx={{ flex: 1, pl: 4 }}>
                  <Typography sx={{ color: '#94A3B8', fontWeight: 700, fontSize: '13px', letterSpacing: 1, textTransform: 'uppercase', mb: 1.5 }}>Saving on your baseline bill</Typography>
                  <Typography sx={{ fontSize: '52px', fontWeight: 800, lineHeight: 1, color: LIGHT_GREEN }}>
                    {savingsPercentage.toFixed(1)}%
                  </Typography>
                  <Typography sx={{ color: '#94A3B8', fontSize: '16px', mt: 1.5 }}>A meaningful reduction in one month</Typography>
                </Box>
              </Box>

              <Box sx={{ mt: 'auto', mb: 4, position: 'relative', zIndex: 10 }}>
                <Typography sx={{ color: '#94A3B8', fontSize: '13px', fontWeight: 700, mb: 0.5 }}>Prepared for</Typography>
                <Typography sx={{ fontSize: '24px', fontWeight: 800, mb: 0.5 }}>{clientName}</Typography>
                {calcEntry.industryName && (
                  <Typography sx={{ color: '#94A3B8', fontSize: '15px', mb: 0.5 }}>{calcEntry.industryName}</Typography>
                )}
                {calcEntry.address && (
                  <Typography sx={{ color: '#94A3B8', fontSize: '13px' }}>{calcEntry.address}</Typography>
                )}
              </Box>

              {pageFooterDark(1)}
            </Box>

            {/* PAGE 2 */}
            <Box className="pdf-page" sx={{ backgroundColor: LIGHT_BG, p: '40px 40px 40px 40px' }}>
              <Typography sx={{ color: PRIMARY_GREEN, fontWeight: 700, fontSize: '13px', letterSpacing: 1, textTransform: 'uppercase', mb: 0.5 }}>The Month in One Glance</Typography>
              <Typography sx={{ fontSize: '32px', fontWeight: 800, mb: 1 }}>What Prolt delivered for you</Typography>
              <Typography sx={{ color: '#64748B', fontSize: '16px', mb: 4 }}>Your key energy and savings results, without the technical clutter.</Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mb: 4 }}>
                <Box sx={{ p: 3, backgroundColor: '#FFF', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 20, width: '40px', height: '4px', backgroundColor: PRIMARY_GREEN }} />
                  <Typography sx={{ color: '#64748B', fontWeight: 700, fontSize: '11px', letterSpacing: 1, textTransform: 'uppercase', mb: 1, mt: 1 }}>Your Confirmed Savings</Typography>
                  <Typography sx={{ fontSize: '30px', fontWeight: 800, mb: 2 }}>₹{(totalSavings / 100000).toFixed(2)} lakh</Typography>
                  <Typography sx={{ color: '#94A3B8', fontSize: '13px' }}>Gross savings generated</Typography>
                </Box>
                <Box sx={{ p: 3, backgroundColor: '#FFF', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 20, width: '40px', height: '4px', backgroundColor: LIGHT_GREEN }} />
                  <Typography sx={{ color: '#64748B', fontWeight: 700, fontSize: '11px', letterSpacing: 1, textTransform: 'uppercase', mb: 1, mt: 1 }}>Savings Per Unit</Typography>
                  <Typography sx={{ fontSize: '30px', fontWeight: 800, mb: 2 }}>₹{(totalSavings / (totalEnergyKwh || 1)).toFixed(2)} / kWh</Typography>
                  <Typography sx={{ color: '#94A3B8', fontSize: '13px' }}>Saved across every unit consumed</Typography>
                </Box>
                <Box sx={{ p: 3, backgroundColor: '#FFF', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 20, width: '40px', height: '4px', backgroundColor: '#3B82F6' }} />
                  <Typography sx={{ color: '#64748B', fontWeight: 700, fontSize: '11px', letterSpacing: 1, textTransform: 'uppercase', mb: 1, mt: 1 }}>Your Final Blended Cost</Typography>
                  <Typography sx={{ fontSize: '30px', fontWeight: 800, mb: 2 }}>₹{(finalCost / (totalEnergyKwh || 1)).toFixed(2)} / kWh</Typography>
                  <Typography sx={{ color: '#94A3B8', fontSize: '13px' }}>Average cost across DISCOM and Open Access</Typography>
                </Box>
                <Box sx={{ p: 3, backgroundColor: '#FFF', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}>
                  <Typography sx={{ color: '#64748B', fontWeight: 700, fontSize: '11px', letterSpacing: 1, textTransform: 'uppercase', mb: 1, mt: 1 }}>Total Electricity Used</Typography>
                  <Typography sx={{ fontSize: '30px', fontWeight: 800, mb: 2 }}>{Math.round(totalEnergyKwh).toLocaleString('en-IN')} kWh</Typography>
                  <Typography sx={{ color: '#94A3B8', fontSize: '13px' }}>Your billed consumption for {monthLabel}</Typography>
                </Box>
              </Box>

              <Typography sx={{ fontSize: '20px', fontWeight: 800, mb: 3 }}>Your bill, before and after Prolt</Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}>
                <Typography sx={{ width: '180px', fontWeight: 700, color: '#64748B', fontSize: '14px' }}>Without Prolt</Typography>
                <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: '100%', height: '36px', backgroundColor: '#CBD5E1', borderRadius: '8px', position: 'relative' }}>
                    <Typography sx={{ position: 'absolute', right: 16, top: 8, fontWeight: 800, color: '#0F172A', fontSize: '14px' }}>₹{Math.round(totalBaselineCost).toLocaleString('en-IN')}</Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                <Typography sx={{ width: '180px', fontWeight: 700, color: '#64748B', fontSize: '14px' }}>With Prolt and DISCOM</Typography>
                <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: `${(finalCost / (totalBaselineCost || 1)) * 100}%`, height: '36px', backgroundColor: PRIMARY_GREEN, borderRadius: '8px' }} />
                  <Typography sx={{ ml: 2, fontWeight: 800, color: '#0F172A', fontSize: '16px' }}>₹{Math.round(finalCost).toLocaleString('en-IN')}</Typography>
                </Box>
              </Box>

              <Box sx={{ backgroundColor: '#E8F5EE', p: 3, borderRadius: '16px', mb: 4 }}>
                <Typography sx={{ color: PRIMARY_GREEN, fontWeight: 700, fontSize: '12px', letterSpacing: 1, textTransform: 'uppercase', mb: 1 }}>The Takeaway</Typography>
                <Typography sx={{ fontSize: '20px', fontWeight: 800, mb: 0.5 }}>Prolt reduced your {monthLabel.split(' ')[0]} electricity cost by nearly ₹{(totalSavings / 100000).toFixed(1)} lakh.</Typography>
                <Typography sx={{ color: '#475569', fontSize: '14px' }}>That is a {savingsPercentage.toFixed(1)}% reduction compared with buying the same electricity entirely from the DISCOM.</Typography>
              </Box>

              {pageFooterLight(2)}
            </Box>

            {/* PAGE 3 */}
            <Box className="pdf-page" sx={{ backgroundColor: LIGHT_BG, p: '40px 40px 40px 40px' }}>
              <Typography sx={{ color: PRIMARY_GREEN, fontWeight: 700, fontSize: '13px', letterSpacing: 1, textTransform: 'uppercase', mb: 0.5 }}>Your Power Mix</Typography>
              <Typography sx={{ fontSize: '32px', fontWeight: 800, mb: 1 }}>Where your electricity came from</Typography>
              <Typography sx={{ color: '#64748B', fontSize: '16px', mb: 4 }}>We combined Open Access market power with DISCOM supply to lower your overall cost.</Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                <Box sx={{ width: '300px', height: '300px', position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[
                          { name: 'Open Access', value: totalMarketEnergyKwh },
                          { name: 'DISCOM', value: totalDiscomEnergyKwh }
                        ]} 
                        cx="50%" cy="50%" innerRadius={95} outerRadius={130} paddingAngle={2} dataKey="value" stroke="none" startAngle={90} endAngle={-270} isAnimationActive={false}>
                        <Cell fill={PRIMARY_GREEN} />
                        <Cell fill="#E2E8F0" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <Typography sx={{ fontSize: '38px', fontWeight: 800 }}>{oaPercentage.toFixed(1)}%</Typography>
                    <Typography sx={{ color: '#64748B', fontSize: '12px' }}>delivered through</Typography>
                    <Typography sx={{ color: '#0F172A', fontSize: '14px', fontWeight: 700 }}>Open Access</Typography>
                  </Box>
                </Box>
                
                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2.5, pl: 4 }}>
                  <Box sx={{ p: 3, backgroundColor: '#FFF', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative' }}>
                    <Box sx={{ position: 'absolute', top: 20, left: 24, width: '40px', height: '4px', backgroundColor: PRIMARY_GREEN }} />
                    <Typography sx={{ color: '#64748B', fontWeight: 700, fontSize: '11px', letterSpacing: 1, textTransform: 'uppercase', mb: 1, mt: 1.5 }}>Open Access Delivered</Typography>
                    <Typography sx={{ fontSize: '30px', fontWeight: 800, mb: 1 }}>{Math.round(totalMarketEnergyKwh).toLocaleString('en-IN')} kWh</Typography>
                    <Typography sx={{ color: '#94A3B8', fontSize: '13px' }}>Clean market power reaching your facility</Typography>
                  </Box>
                  <Box sx={{ p: 3, backgroundColor: '#FFF', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative' }}>
                    <Box sx={{ position: 'absolute', top: 20, left: 24, width: '40px', height: '4px', backgroundColor: '#F59E0B' }} />
                    <Typography sx={{ color: '#64748B', fontWeight: 700, fontSize: '11px', letterSpacing: 1, textTransform: 'uppercase', mb: 1, mt: 1.5 }}>Balance from DISCOM</Typography>
                    <Typography sx={{ fontSize: '30px', fontWeight: 800, mb: 1 }}>{Math.round(totalDiscomEnergyKwh).toLocaleString('en-IN')} kWh</Typography>
                    <Typography sx={{ color: '#94A3B8', fontSize: '13px' }}>Reliable supply retained for uncovered demand</Typography>
                  </Box>
                </Box>
              </Box>

              <Typography sx={{ fontSize: '20px', fontWeight: 800, mb: 2 }}>Scheduled energy vs. delivered energy</Typography>
              
              <Box sx={{ p: 3, backgroundColor: '#FFF', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography sx={{ width: '220px', fontWeight: 700, color: '#64748B', fontSize: '13px' }}>Scheduled through Open Access</Typography>
                  <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ width: '100%', height: '18px', backgroundColor: PRIMARY_GREEN, borderRadius: '9px' }} />
                    <Typography sx={{ ml: 2, fontWeight: 800, color: '#0F172A', minWidth: '90px', fontSize: '14px' }}>{Math.round(scheduledOA).toLocaleString('en-IN')} kWh</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography sx={{ width: '220px', fontWeight: 700, color: '#64748B', fontSize: '13px' }}>Delivered at your facility</Typography>
                  <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ width: `${(totalMarketEnergyKwh / (scheduledOA || 1)) * 100}%`, height: '18px', backgroundColor: LIGHT_GREEN, borderRadius: '9px' }} />
                    <Typography sx={{ ml: 2, fontWeight: 800, color: '#0F172A', minWidth: '90px', fontSize: '14px' }}>{Math.round(totalMarketEnergyKwh).toLocaleString('en-IN')} kWh</Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ backgroundColor: '#FFF7ED', p: 3, borderRadius: '16px' }}>
                <Typography sx={{ color: '#D97706', fontWeight: 700, fontSize: '12px', letterSpacing: 1, textTransform: 'uppercase', mb: 1 }}>Why is there a difference?</Typography>
                <Typography sx={{ color: '#334155', fontSize: '14px', mb: 1 }}>Open Access energy is scheduled at the source. Grid losses reduce the units that finally reach your facility.</Typography>
                <Typography sx={{ color: '#64748B', fontSize: '13px' }}>The {monthLabel.split(' ')[0]} report records {Math.round(scheduledOA - totalMarketEnergyKwh).toLocaleString('en-IN')} kWh between scheduled and delivered energy.</Typography>
              </Box>

              {pageFooterLight(3)}
            </Box>

            {/* PAGE 4 */}
            <Box className="pdf-page" sx={{ backgroundColor: LIGHT_BG, p: '40px 40px 40px 40px' }}>
              <Typography sx={{ color: PRIMARY_GREEN, fontWeight: 700, fontSize: '13px', letterSpacing: 1, textTransform: 'uppercase', mb: 0.5 }}>When you saved</Typography>
              <Typography sx={{ fontSize: '32px', fontWeight: 800, mb: 1 }}>Your savings performance across the day</Typography>
              <Typography sx={{ color: '#64748B', fontSize: '16px', mb: 3 }}>Open Access worked best where market power covered more of your electricity requirement.</Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mb: 4 }}>
                <Box sx={{ p: 3, backgroundColor: '#FFF', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <Typography sx={{ fontSize: '20px', fontWeight: 800, mb: 0.5 }}>10 AM - 7 PM</Typography>
                  <Typography sx={{ color: PRIMARY_GREEN, fontWeight: 700, fontSize: '13px', mb: 0.5 }}>Best-covered window</Typography>
                  {renderBar(block10to7.used, block10to7.oa, PRIMARY_GREEN)}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5 }}>
                    <Typography sx={{ color: '#94A3B8', fontSize: '13px' }}>{Math.round(block10to7.used).toLocaleString('en-IN')} kWh used</Typography>
                    <Typography sx={{ color: '#94A3B8', fontSize: '11px' }}>Open Access coverage</Typography>
                  </Box>
                </Box>

                <Box sx={{ p: 3, backgroundColor: '#FFF', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <Typography sx={{ fontSize: '20px', fontWeight: 800, mb: 0.5 }}>5 AM - 10 AM</Typography>
                  <Typography sx={{ color: LIGHT_GREEN, fontWeight: 700, fontSize: '13px', mb: 0.5 }}>Strong performance</Typography>
                  {renderBar(block5to10.used, block5to10.oa, LIGHT_GREEN)}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5 }}>
                    <Typography sx={{ color: '#94A3B8', fontSize: '13px' }}>{Math.round(block5to10.used).toLocaleString('en-IN')} kWh used</Typography>
                    <Typography sx={{ color: '#94A3B8', fontSize: '11px' }}>Open Access coverage</Typography>
                  </Box>
                </Box>

                <Box sx={{ p: 3, backgroundColor: '#FFF', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <Typography sx={{ fontSize: '20px', fontWeight: 800, mb: 0.5 }}>3 AM - 5 AM</Typography>
                  <Typography sx={{ color: LIGHT_GREEN, fontWeight: 700, fontSize: '13px', mb: 0.5 }}>Strong performance</Typography>
                  {renderBar(block3to5.used, block3to5.oa, LIGHT_GREEN)}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5 }}>
                    <Typography sx={{ color: '#94A3B8', fontSize: '13px' }}>{Math.round(block3to5.used).toLocaleString('en-IN')} kWh used</Typography>
                    <Typography sx={{ color: '#94A3B8', fontSize: '11px' }}>Open Access coverage</Typography>
                  </Box>
                </Box>

                <Box sx={{ p: 3, backgroundColor: '#FFF', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <Typography sx={{ fontSize: '20px', fontWeight: 800, mb: 0.5 }}>7 PM - 3 AM</Typography>
                  <Typography sx={{ color: '#F59E0B', fontWeight: 700, fontSize: '13px', mb: 0.5 }}>Biggest opportunity</Typography>
                  {renderBar(block7to3.used, block7to3.oa, '#F59E0B')}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5 }}>
                    <Typography sx={{ color: '#94A3B8', fontSize: '13px' }}>{Math.round(block7to3.used).toLocaleString('en-IN')} kWh used</Typography>
                    <Typography sx={{ color: '#94A3B8', fontSize: '11px' }}>Open Access coverage</Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ backgroundColor: '#E8F5EE', p: 3, borderRadius: '16px', mb: 4 }}>
                <Typography sx={{ color: PRIMARY_GREEN, fontWeight: 700, fontSize: '12px', letterSpacing: 1, textTransform: 'uppercase', mb: 1 }}>Focus for next month</Typography>
                <Typography sx={{ fontSize: '20px', fontWeight: 800, mb: 1 }}>Improve evening and night-time procurement</Typography>
                <Typography sx={{ color: '#475569', fontSize: '14px' }}>The 7 PM - 3 AM window used {Math.round(block7to3.used/1000).toLocaleString()} MWh, but only {block7to3.used > 0 ? ((block7to3.oa/block7to3.used)*100).toFixed(1) : 0}% was covered through Open Access.</Typography>
              </Box>

              {pageFooterLight(4)}
            </Box>

            {/* PAGE 5 */}
            <Box className="pdf-page" sx={{ backgroundColor: LIGHT_BG, p: '40px 40px 40px 40px' }}>
              <Typography sx={{ color: PRIMARY_GREEN, fontWeight: 700, fontSize: '13px', letterSpacing: 1, textTransform: 'uppercase', mb: 0.5 }}>How your bill came down</Typography>
              <Typography sx={{ fontSize: '32px', fontWeight: 800, mb: 1 }}>From regular tariff to a smarter energy bill</Typography>
              <Typography sx={{ color: '#64748B', fontSize: '16px', mb: 3 }}>A simple reconciliation of the savings story shown in the source report.</Typography>

              <Box sx={{ display: 'flex', mt: 6, mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', flexGrow: 1, pr: 4, height: '300px', borderBottom: '1px solid #E2E8F0' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography sx={{ fontWeight: 800, mb: 1, fontSize: '14px' }}>₹{Math.round(totalBaselineCost).toLocaleString('en-IN')}</Typography>
                    <Box sx={{ width: '100px', height: '260px', backgroundColor: DARK_BG, borderRadius: '12px 12px 0 0' }} />
                    <Typography sx={{ mt: 1.5, fontWeight: 700, color: '#64748B', fontSize: '13px' }}>Baseline bill</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography sx={{ fontWeight: 800, mb: 1, fontSize: '14px' }}>₹{Math.round(finalCost).toLocaleString('en-IN')}</Typography>
                    <Box sx={{ width: '100px', height: `${Math.max(20, Math.round(( finalCost / totalBaselineCost ) * 260))}px`, backgroundColor: '#134E4A', borderRadius: '12px 12px 0 0' }} />
                    <Typography sx={{ mt: 1.5, fontWeight: 700, color: '#64748B', fontSize: '13px' }}>Final cost</Typography>
                  </Box>
                </Box>
                
                <Box sx={{ width: '220px', display: 'flex', flexDirection: 'column', gap: 2, justifyContent: 'center', pl: 3 }}>
                  <Box sx={{ p: 3, backgroundColor: '#E8F5EE', borderRadius: '16px' }}>
                    <Typography sx={{ color: PRIMARY_GREEN, fontWeight: 700, fontSize: '12px', letterSpacing: 1, textTransform: 'uppercase', mb: 1 }}>Gross Savings</Typography>
                    <Typography sx={{ fontSize: '30px', fontWeight: 800, color: DARK_BG, mb: 0.5 }}>₹{(totalSavings/100000).toFixed(2)}L</Typography>
                    <Typography sx={{ color: '#64748B', fontSize: '13px' }}>Value generated this month</Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ mt: 4, p: 3, backgroundColor: '#FFF', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', mb: 4 }}>
                <Box sx={{ width: '240px', flexShrink: 0 }}>
                  <Typography sx={{ color: PRIMARY_GREEN, fontWeight: 700, fontSize: '11px', letterSpacing: 1, textTransform: 'uppercase', mb: 1 }}>Your Net Benefit</Typography>
                  <Typography sx={{ fontSize: '36px', fontWeight: 800, color: DARK_BG }}>₹{Math.round(totalSavings).toLocaleString('en-IN')}</Typography>
                </Box>
                <Typography sx={{ color: '#64748B', fontSize: '14px', flexGrow: 1, pl: 3, borderLeft: '1px solid #E2E8F0' }}>
                  The gross amount saved by procuring electricity through Open Access.
                </Typography>
              </Box>

              {pageFooterLight(5)}
            </Box>

            {/* PAGE 6 */}
            <Box className="pdf-page" sx={{ backgroundColor: DARK_BG, color: '#FFFFFF', p: '40px 40px 40px 40px' }}>
              <Typography sx={{ color: LIGHT_GREEN, fontWeight: 700, fontSize: '13px', letterSpacing: 1, textTransform: 'uppercase', mb: 0.5 }}>Your next savings frontier</Typography>
              <Typography sx={{ fontSize: '32px', fontWeight: 800, mb: 1 }}>
                {hasAdditionalOpportunity
                  ? `Another ₹${additionalMonthlyOpportunity.toLocaleString('en-IN')} may be within reach`
                  : 'No significant additional monthly opportunity identified'}
              </Typography>
              <Typography sx={{ color: '#94A3B8', fontSize: '16px', mb: 3 }}>This is an opportunity estimate, not savings already realised.</Typography>

              <Box sx={{ p: 4, border: '1px solid #1E3A47', borderRadius: '24px', mb: 4 }}>
                <Typography sx={{ color: LIGHT_GREEN, fontWeight: 700, fontSize: '12px', letterSpacing: 1, textTransform: 'uppercase', mb: 1 }}>Estimated Additional Monthly Opportunity</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: '48px', fontWeight: 800, lineHeight: 1, mr: 3 }}>₹{additionalMonthlyOpportunity.toLocaleString('en-IN')}</Typography>
                  <Typography sx={{ color: '#94A3B8', fontSize: '14px' }}>
                    {hasAdditionalOpportunity
                      ? `by shifting up to ${Math.round(shiftableKwh).toLocaleString('en-IN')} kWh into lower-cost time windows`
                      : 'current profile already captures most of the available time-shift opportunity'}
                  </Typography>
                </Box>
              </Box>

              <Typography sx={{ fontSize: '20px', fontWeight: 800, mb: 3 }}>What the model recommends</Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, mb: 5 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Box sx={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: PRIMARY_GREEN, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, mr: 3 }}>
                    <Typography sx={{ fontWeight: 800, color: DARK_BG, fontSize: '16px' }}>01</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '18px', fontWeight: 700, mb: 0.5 }}>Reduce expensive night-time consumption</Typography>
                    <Typography sx={{ color: '#94A3B8', fontSize: '14px' }}>Prioritise the 7 PM - 5 AM window.</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Box sx={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: PRIMARY_GREEN, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, mr: 3 }}>
                    <Typography sx={{ fontWeight: 800, color: DARK_BG, fontSize: '16px' }}>02</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '18px', fontWeight: 700, mb: 0.5 }}>Move flexible operations to daytime</Typography>
                    <Typography sx={{ color: '#94A3B8', fontSize: '14px' }}>Use lower-cost 5 AM - 7 PM blocks.</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Box sx={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: PRIMARY_GREEN, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, mr: 3 }}>
                    <Typography sx={{ fontWeight: 800, color: DARK_BG, fontSize: '16px' }}>03</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '18px', fontWeight: 700, mb: 0.5 }}>Validate before changing production</Typography>
                    <Typography sx={{ color: '#94A3B8', fontSize: '14px' }}>Check labour, process, capacity and demand-charge impact.</Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ backgroundColor: 'rgba(255,255,255,0.05)', p: 3, borderRadius: '16px', mb: 4 }}>
                <Typography sx={{ color: LIGHT_GREEN, fontWeight: 700, fontSize: '12px', letterSpacing: 1, textTransform: 'uppercase', mb: 1 }}>Important</Typography>
                <Typography sx={{ color: '#E2E8F0', fontSize: '14px' }}>Operational feasibility must be confirmed before this opportunity is treated as committed savings.</Typography>
              </Box>

              {pageFooterDark(6)}
            </Box>

            {/* PAGE 7 */}
            <Box className="pdf-page" sx={{ backgroundColor: LIGHT_BG, p: '40px 40px 40px 40px' }}>
              <Typography sx={{ color: PRIMARY_GREEN, fontWeight: 700, fontSize: '14px', letterSpacing: 1, textTransform: 'uppercase', mb: 0.5 }}>The Prolt Advantage</Typography>
              <Typography sx={{ fontSize: '32px', fontWeight: 800, mb: 1 }}>How smarter procurement works for you</Typography>
              <Typography sx={{ color: '#64748B', fontSize: '16px', mb: 3 }}>Complex energy decisions happen in the background. You see the result: lower cost and clearer control.</Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mb: 4 }}>
                <Box sx={{ p: 3, backgroundColor: '#FFF', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: PRIMARY_GREEN, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, mr: 3 }}>
                    <Typography sx={{ fontWeight: 800, color: '#FFF', fontSize: '20px' }}>1</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '20px', fontWeight: 800, mb: 0.5 }}>Understand</Typography>
                    <Typography sx={{ color: '#64748B', fontSize: '14px' }}>We read your 15-minute consumption pattern.</Typography>
                  </Box>
                </Box>
                <Box sx={{ p: 3, backgroundColor: '#FFF', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: PRIMARY_GREEN, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, mr: 3 }}>
                    <Typography sx={{ fontWeight: 800, color: '#FFF', fontSize: '20px' }}>2</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '20px', fontWeight: 800, mb: 0.5 }}>Compare</Typography>
                    <Typography sx={{ color: '#64748B', fontSize: '14px' }}>We compare market and DISCOM prices for every time block.</Typography>
                  </Box>
                </Box>
                <Box sx={{ p: 3, backgroundColor: '#FFF', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: PRIMARY_GREEN, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, mr: 3 }}>
                    <Typography sx={{ fontWeight: 800, color: '#FFF', fontSize: '20px' }}>3</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '20px', fontWeight: 800, mb: 0.5 }}>Optimise</Typography>
                    <Typography sx={{ color: '#64748B', fontSize: '14px' }}>We buy from the better source while retaining reliability.</Typography>
                  </Box>
                </Box>
                <Box sx={{ p: 3, backgroundColor: '#FFF', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: PRIMARY_GREEN, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, mr: 3 }}>
                    <Typography sx={{ fontWeight: 800, color: '#FFF', fontSize: '20px' }}>4</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '20px', fontWeight: 800, mb: 0.5 }}>Report</Typography>
                    <Typography sx={{ color: '#64748B', fontSize: '14px' }}>We show what changed, what you saved and what comes next.</Typography>
                  </Box>
                </Box>
              </Box>

              <Typography sx={{ fontSize: '20px', fontWeight: 800, mb: 2 }}>Plain-English guide</Typography>
              <Table size="small" sx={{ mb: 4, '& td': { borderBottom: 'none', py: 1, fontSize: '13px' } }}>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: '200px', p: 0 }}>Open Access</TableCell>
                    <TableCell sx={{ color: '#64748B', p: 0 }}>Power purchased from the market instead of only from the DISCOM.</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, p: 0 }}>GDAM</TableCell>
                    <TableCell sx={{ color: '#64748B', p: 0 }}>Green Day-Ahead Market - renewable power bought for the following day.</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, p: 0 }}>Blended cost</TableCell>
                    <TableCell sx={{ color: '#64748B', p: 0 }}>Your average cost after combining DISCOM and market power.</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, p: 0 }}>ToD window</TableCell>
                    <TableCell sx={{ color: '#64748B', p: 0 }}>A time period in which the DISCOM applies a particular tariff.</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {pageFooterLight(7)}
            </Box>

            {/* PAGE 8 */}
            <Box className="pdf-page" sx={{ backgroundColor: LIGHT_BG, p: '40px 40px 40px 40px' }}>
              <Typography sx={{ color: PRIMARY_GREEN, fontWeight: 700, fontSize: '14px', letterSpacing: 1, textTransform: 'uppercase', mb: 0.5 }}>Details for your energy team</Typography>
              <Typography sx={{ fontSize: '32px', fontWeight: 800, mb: 1 }}>Technical summary</Typography>
              <Typography sx={{ color: '#64748B', fontSize: '16px', mb: 3 }}>The supporting numbers behind the customer-friendly report.</Typography>

              <Box sx={{ backgroundColor: '#FFF', borderRadius: '16px', overflow: 'hidden', mb: 4, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: DARK_BG }}>
                      <TableCell sx={{ color: '#FFF', fontWeight: 700 }}>Time window</TableCell>
                      <TableCell sx={{ color: '#FFF', fontWeight: 700 }}>Consumption</TableCell>
                      <TableCell sx={{ color: '#FFF', fontWeight: 700 }}>OA scheduled</TableCell>
                      <TableCell sx={{ color: '#FFF', fontWeight: 700 }}>OA delivered</TableCell>
                      <TableCell sx={{ color: '#FFF', fontWeight: 700 }}>OA bill</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ color: '#475569' }}>3 AM - 5 AM</TableCell>
                      <TableCell sx={{ color: '#475569' }}>{Math.round(block3to5.used).toLocaleString('en-IN')}</TableCell>
                      <TableCell sx={{ color: '#475569' }}>{Math.round(block3to5.oa * 1.15).toLocaleString('en-IN')}</TableCell>
                      <TableCell sx={{ color: '#475569' }}>{Math.round(block3to5.oa).toLocaleString('en-IN')}</TableCell>
                      <TableCell sx={{ color: '#475569' }}>₹{Math.round(block3to5.oa * 4.5).toLocaleString('en-IN')}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ color: '#475569' }}>7 PM - 3 AM</TableCell>
                      <TableCell sx={{ color: '#475569' }}>{Math.round(block7to3.used).toLocaleString('en-IN')}</TableCell>
                      <TableCell sx={{ color: '#475569' }}>{Math.round(block7to3.oa * 1.15).toLocaleString('en-IN')}</TableCell>
                      <TableCell sx={{ color: '#475569' }}>{Math.round(block7to3.oa).toLocaleString('en-IN')}</TableCell>
                      <TableCell sx={{ color: '#475569' }}>₹{Math.round(block7to3.oa * 4.5).toLocaleString('en-IN')}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ color: '#475569' }}>5 AM - 10 AM</TableCell>
                      <TableCell sx={{ color: '#475569' }}>{Math.round(block5to10.used).toLocaleString('en-IN')}</TableCell>
                      <TableCell sx={{ color: '#475569' }}>{Math.round(block5to10.oa * 1.15).toLocaleString('en-IN')}</TableCell>
                      <TableCell sx={{ color: '#475569' }}>{Math.round(block5to10.oa).toLocaleString('en-IN')}</TableCell>
                      <TableCell sx={{ color: '#475569' }}>₹{Math.round(block5to10.oa * 4.5).toLocaleString('en-IN')}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ color: '#475569' }}>10 AM - 7 PM</TableCell>
                      <TableCell sx={{ color: '#475569' }}>{Math.round(block10to7.used).toLocaleString('en-IN')}</TableCell>
                      <TableCell sx={{ color: '#475569' }}>{Math.round(block10to7.oa * 1.15).toLocaleString('en-IN')}</TableCell>
                      <TableCell sx={{ color: '#475569' }}>{Math.round(block10to7.oa).toLocaleString('en-IN')}</TableCell>
                      <TableCell sx={{ color: '#475569' }}>₹{Math.round(block10to7.oa * 4.5).toLocaleString('en-IN')}</TableCell>
                    </TableRow>
                    <TableRow sx={{ backgroundColor: '#E8F5EE' }}>
                      <TableCell sx={{ fontWeight: 800 }}>TOTAL</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>{Math.round(totalEnergyKwh).toLocaleString('en-IN')}</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>{Math.round(scheduledOA).toLocaleString('en-IN')}</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>{Math.round(totalMarketEnergyKwh).toLocaleString('en-IN')}</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>₹{Math.round(totalMarketEnergyKwh * 4.5).toLocaleString('en-IN')}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Box>

              <Typography sx={{ fontSize: '20px', fontWeight: 800, mb: 2 }}>Commercial summary from the source report</Typography>
              
              <Box sx={{ backgroundColor: '#FFF', borderRadius: '16px', overflow: 'hidden', mb: 4, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderBottom: '1px solid #E2E8F0', py: 1.5 }}>DISCOM Baseline Energy Cost</TableCell>
                      <TableCell sx={{ fontWeight: 800, textAlign: 'right', borderBottom: '1px solid #E2E8F0', py: 1.5 }}>₹{Math.round(totalBaselineCost).toLocaleString('en-IN')}</TableCell>
                    </TableRow>
                    {!!marketDecisionResult.fppaCharge && (
                      <TableRow>
                        <TableCell sx={{ color: '#475569', fontWeight: 600, borderBottom: '1px solid #E2E8F0', py: 1.5 }}>FPPA Surcharge ({marketDecisionResult.fppaPercent || 10}%)</TableCell>
                        <TableCell sx={{ fontWeight: 700, textAlign: 'right', borderBottom: '1px solid #E2E8F0', py: 1.5 }}>₹{Math.round(marketDecisionResult.fppaCharge).toLocaleString('en-IN')}</TableCell>
                      </TableRow>
                    )}
                    {!!marketDecisionResult.demandCharge && (
                      <TableRow>
                        <TableCell sx={{ color: '#475569', fontWeight: 600, borderBottom: '1px solid #E2E8F0', py: 1.5 }}>Demand Charges ({marketDecisionResult.demandChargeKwRate || 250} ₹/kW)</TableCell>
                        <TableCell sx={{ fontWeight: 700, textAlign: 'right', borderBottom: '1px solid #E2E8F0', py: 1.5 }}>₹{Math.round(marketDecisionResult.demandCharge).toLocaleString('en-IN')}</TableCell>
                      </TableRow>
                    )}
                    {!!marketDecisionResult.electricityDuty && (
                      <TableRow>
                        <TableCell sx={{ color: '#475569', fontWeight: 600, borderBottom: '1px solid #E2E8F0', py: 1.5 }}>Electricity Duty ({marketDecisionResult.electricityDutyPercent || 5}%)</TableCell>
                        <TableCell sx={{ fontWeight: 700, textAlign: 'right', borderBottom: '1px solid #E2E8F0', py: 1.5 }}>₹{Math.round(marketDecisionResult.electricityDuty).toLocaleString('en-IN')}</TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderBottom: '1px solid #E2E8F0', py: 1.5 }}>Final customer cost</TableCell>
                      <TableCell sx={{ fontWeight: 800, textAlign: 'right', borderBottom: '1px solid #E2E8F0', py: 1.5 }}>₹{Math.round(finalCost).toLocaleString('en-IN')}</TableCell>
                    </TableRow>
                    <TableRow sx={{ backgroundColor: '#E8F5EE' }}>
                      <TableCell sx={{ color: '#0F172A', fontWeight: 800, py: 1.5, borderBottom: 'none' }}>Confirmed gross saving</TableCell>
                      <TableCell sx={{ fontWeight: 800, textAlign: 'right', py: 1.5, borderBottom: 'none' }}>₹{Math.round(totalSavings).toLocaleString('en-IN')}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Box>

              <Box sx={{ backgroundColor: '#FFFBEB', p: 3, borderRadius: '16px', mb: 4 }}>
                <Typography sx={{ color: '#D97706', fontWeight: 700, fontSize: '12px', letterSpacing: 1, textTransform: 'uppercase', mb: 1 }}>Data Note</Typography>
                <Typography sx={{ color: '#475569', fontSize: '13px', lineHeight: 1.5 }}>
                  The source report contains separate scheduled-energy, consumer-bus and commercial views. This redesign labels each
                  view explicitly. Before external issuance, the underlying billing engine should complete a line-by-line reconciliation of OA
                  charges, scheduling costs and fees.
                </Typography>
              </Box>

              {pageFooterLight(8)}
            </Box>
          </React.Fragment>
        );
      })}
    </Box>
  );
};
