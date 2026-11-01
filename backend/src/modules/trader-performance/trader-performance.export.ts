import * as ExcelJS from 'exceljs';
import { TraderPerformanceService } from './trader-performance.service';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const getShortSheetName = (monthStr?: string, fallback = 'Savings Analysis') => {
  if (!monthStr || monthStr === 'all') return fallback;
  const parts = monthStr.split('-');
  if (parts.length < 2) return fallback;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  return `${MONTHS_SHORT[monthIdx]} ${year}`;
};

const getLongMonthName = (monthStr?: string) => {
  if (!monthStr || monthStr === 'all') return '';
  const parts = monthStr.split('-');
  if (parts.length < 2) return '';
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  return `${MONTHS_LONG[monthIdx]} ${year}`;
};

const getShortHeaderName = (monthStr: string) => {
  const parts = monthStr.split('-');
  if (parts.length < 2) return monthStr;
  const year2Digit = parts[0].substring(2);
  const monthIdx = parseInt(parts[1], 10) - 1;
  return `${MONTHS_SHORT[monthIdx]}-${year2Digit}`;
};

export const sortTodSlabs = (slabs: string[]): string[] => {
  const getSeasonWeight = (slab: string): number => {
    const s = slab.toUpperCase();
    if (
      s.includes('SUMMER') ||
      s.includes('APR-SEP') ||
      s.includes('APR - SEP') ||
      s.includes('APRIL-SEPTEMBER') ||
      s.includes('APR TO SEP') ||
      s.includes('APRIL TO SEPTEMBER') ||
      s.includes('APR-OCT')
    ) {
      return 100;
    }
    if (s.includes('MONSOON')) return 150;
    if (
      s.includes('WINTER') ||
      s.includes('OCT-MAR') ||
      s.includes('OCT - MAR') ||
      s.includes('OCTOBER-MARCH') ||
      s.includes('OCT TO MAR') ||
      s.includes('OCTOBER TO MARCH') ||
      s.includes('NOV-FEB')
    ) {
      return 200;
    }
    const summerMonths = ['APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP'];
    const winterMonths = ['OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR'];
    for (const m of summerMonths) {
      if (new RegExp(`\\b${m}\\b`, 'i').test(s)) return 100;
    }
    for (const m of winterMonths) {
      if (new RegExp(`\\b${m}\\b`, 'i').test(s)) return 200;
    }

    // Time signature recognition for Summer vs Winter
    if (
      /\b(?:0?5|5):00\s*-\s*10:00\b/.test(s) ||
      /\b10:00\s*-\s*19:00\b/.test(s) ||
      /\b19:00\s*-\s*(?:0?3|3):00\b/.test(s) ||
      /\b(?:0?3|3):00\s*-\s*(?:0?5|5):00\b/.test(s) ||
      /\b19:00\s*-\s*24:00\b/.test(s) ||
      /\b00:00\s*-\s*(?:0?3|3):00\b/.test(s)
    ) {
      return 100;
    }

    if (
      /\b(?:0?5|5):00\s*-\s*11:00\b/.test(s) ||
      /\b11:00\s*-\s*17:00\b/.test(s) ||
      /\b17:00\s*-\s*23:00\b/.test(s) ||
      /\b23:00\s*-\s*(?:0?5|5):00\b/.test(s) ||
      /\b17:00\s*-\s*24:00\b/.test(s) ||
      /\b00:00\s*-\s*(?:0?5|5):00\b/.test(s)
    ) {
      return 200;
    }

    return 150;
  };

  const getTodNumber = (slab: string): number | null => {
    const match = slab.match(/TOD\s*[-_]?\s*(\d+)/i) || slab.match(/SLAB\s*[-_]?\s*(\d+)/i) || slab.match(/\bT(\d+)\b/i);
    if (match) return parseInt(match[1], 10);
    return null;
  };

  const getStartTimeMinutes = (slab: string): number | null => {
    const match = slab.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      const h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      return h * 60 + m;
    }
    return null;
  };

  return slabs.slice().sort((a, b) => {
    const seasonA = getSeasonWeight(a);
    const seasonB = getSeasonWeight(b);
    if (seasonA !== seasonB) return seasonA - seasonB;

    const todNumA = getTodNumber(a);
    const todNumB = getTodNumber(b);
    if (todNumA !== null && todNumB !== null && todNumA !== todNumB) {
      return todNumA - todNumB;
    }

    const timeA = getStartTimeMinutes(a);
    const timeB = getStartTimeMinutes(b);
    if (timeA !== null && timeB !== null && timeA !== timeB) {
      return timeA - timeB;
    }

    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });
};

const getCalculationBase = (entry: any) => {
  const loadMw = (Number(entry?.sanctionedLoadKw) || 0) / 1000;
  return `${Number(loadMw.toFixed(2))} MW`;
};

const addExportHeader = (sheet: ExcelJS.Worksheet, entry: any) => {
  const headerRows = [
    [`Industry Name: ${entry.industryName || entry.clientName || ''}`],
    [`Location / Address: ${entry.address || ''}`],
    [`Connectivity: ${entry.voltageLevel || ''}`],
    [],
    [`Calculation Base: ${getCalculationBase(entry)}`]
  ];

  headerRows.forEach((values, index) => {
    const row = sheet.addRow(values);
    row.font = index === 4
      ? { bold: true, color: { argb: 'FFFF0000' } }
      : { bold: true };
  });

  sheet.addRow([]);
};

export class TraderPerformanceExportService {
  private static async addSavingsSheet(workbook: ExcelJS.Workbook, monthName: string, result: any, entry: any, monthStr?: string, isActualTrader = false): Promise<Record<string, number>> {
    const { slotsData, todSummaries, oaDetailed } = result;
    const actualBreakdown = oaDetailed?.breakdown || [];
    const hasDetailedActualSettlement = Boolean(result.actualTrader);
    const actualResidualDiscomCost = actualBreakdown.reduce((sum: number, row: any) => sum + Number(row.traderDiscomBillTotal || 0), 0) + Number(result.miscellaneousCharges || 0);
    const actualTrader = result.actualTrader || {
      marketEnergyKwh: Number(result.totalTraderMarketEnergy || 0),
      consumerBusEnergyKwh: Number(result.totalTraderConsumerBusEnergy || 0),
      residualDiscomEnergyKwh: actualBreakdown.reduce((sum: number, row: any) => sum + Number(row.traderLeftoverDiscomEnergy || 0), 0),
      marketEnergyCost: actualBreakdown.reduce((sum: number, row: any) => sum + Number(row.traderExactCost || 0), 0),
      totalOaCost: Math.max(0, Number(result.totalTraderLandedCost || 0) - actualResidualDiscomCost),
      residualDiscomCost: actualResidualDiscomCost,
      totalCost: Number(result.totalTraderLandedCost || 0),
      baselineDiscomCost: Number(result.totalBaselineCost || 0),
      savings: Number(result.actualTraderSavings || 0),
      traderMargin: Number(result.totalTraderMarketEnergy || 0) * Number(entry.traderMargin || 0)
    };

    // Remove invalid characters for worksheet names
    const safeSheetName = monthName.replace(/[\/*?\[\]]/g, '').substring(0, 31);
    const sheet = workbook.addWorksheet(safeSheetName, {
      views: [{ state: 'frozen', xSplit: 1, ySplit: 2 }]
    });

    const rowMapping: Record<string, number> = {};

    addExportHeader(sheet, entry);

    // We need all unique days sorted
    const daysSet = new Set<string>();
    slotsData.forEach((s: any) => daysSet.add(s.date));
    const days = Array.from(daysSet).sort();

    // Headers
    const headerRow1 = ['Blockwise DAM Rates on IEX'];
    const headerRow2 = [''];
    days.forEach(d => {
      // Format day like '1-May'
      const dateObj = new Date(d);
      const dayStr = `${dateObj.getDate()}-${MONTHS_SHORT[dateObj.getMonth()]}`;
      headerRow1.push(dayStr, '', '');
      headerRow2.push('Qty (MW)', 'Rate (Rs/kWh)', 'Market');
    });

    const hr1 = sheet.addRow(headerRow1);
    const hr2 = sheet.addRow(headerRow2);
    hr1.height = 28;
    hr2.height = 28;
    
    // Merge cells for headerRow1
    let colIndex = 2;
    days.forEach(() => {
      sheet.mergeCells(1, colIndex, 1, colIndex + 2);
      colIndex += 3;
    });

    hr1.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    hr1.eachCell(c => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003366' } };
      c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });
    
    hr2.font = { bold: true };
    hr2.eachCell(c => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDDDDD' } };
      c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });

    // Create 96 blocks
    // Helper to format block time (e.g., '00:00 - 00:15')
    const formatBlock = (blockIdx: number) => {
      const startMin = (blockIdx - 1) * 15;
      const endMin = blockIdx * 15;
      const h1 = Math.floor(startMin / 60).toString().padStart(2, '0');
      const m1 = (startMin % 60).toString().padStart(2, '0');
      const h2 = Math.floor(endMin / 60).toString().padStart(2, '0');
      const m2 = (endMin % 60).toString().padStart(2, '0');
      return `${h1}:${m1} - ${h2}:${m2}`;
    };

    // Matrix [96][days.length]
    for (let b = 1; b <= 96; b++) {
      const row: any[] = [formatBlock(b)];
      days.forEach(day => {
        const slot = slotsData.find((s: any) => s.date === day && (s.timeblock === b || s.slot === b)) as any;
        const isMarket = slot ? (slot.shouldBuyFromMarket ?? (slot.selectedSource && slot.selectedSource !== 'DISCOM')) : false;
        
        if (isActualTrader && slot && slot.actualTrades && slot.actualTrades.length > 0) {
          let totalQtyMw = 0;
          let totalCost = 0;
          let marketNames = new Set<string>();
          
          slot.actualTrades.forEach((t: any) => {
            const vol = Number(t.qty_mw || t.purchase || t.volume || 0);
            const rate = Math.abs(Number(t.rate_mwh || t.price || t.mcp || 0));
            const market = t.oa_market_type || 'RTM'; // Default to RTM if missing

            if (vol <= 0) return;

            totalQtyMw += vol;
            totalCost += (vol * rate);
            marketNames.add(market.toUpperCase());
          });
          
          const avgRate = totalQtyMw > 0 ? (totalCost / totalQtyMw) : 0;
          const marketSource = marketNames.size > 0 ? Array.from(marketNames).join('+') : '-';
          
          row.push(Number(totalQtyMw.toFixed(2)));
          row.push(Number((avgRate / 1000).toFixed(2))); // Rate in Rs/kWh
          row.push(marketSource);
          
        } else if (!isActualTrader && slot && isMarket) {
          // If won, show the MCP (base price) of the selected market
          const marketSource = slot.selectedSource || slot.marketSource || 'DISCOM';
          let mcp = 0;
          if (marketSource === 'DAM') mcp = slot.damLandingPrice ?? slot.damMcp ?? slot.comparedLowestPrice ?? 0;
          else if (marketSource === 'RTM') mcp = slot.rtmLandingPrice ?? slot.rtmMcp ?? slot.comparedLowestPrice ?? 0;
          else if (marketSource === 'GDAM') mcp = slot.gdamLandingPrice ?? slot.gdamMcp ?? slot.comparedLowestPrice ?? 0;
          
          const energyKwh = slot.marketEnergy ?? slot.maxEnergyPerSlot ?? 0;
          const powerMw = energyKwh > 0 ? (energyKwh / 250) : 0;
          row.push(Number(powerMw.toFixed(2)));
          row.push(Number(mcp.toFixed(2)));
          row.push(marketSource || '-');
        } else {
          row.push('-', '-', '-');
        }
      });
      const r = sheet.addRow(row);
      r.eachCell((cell) => {
        if (cell.value === 'DAM') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE599' } }; // Light Yellow
        } else if (cell.value === 'RTM') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4CCCC' } }; // Light Pink/Red
        } else if (cell.value === 'GDAM') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } }; // Light Green
        }
      });
    }

    const totalRow: any[] = ['Total Quantity (MWh)'];
    days.forEach(day => {
      let dayTotal = 0;
      slotsData.filter((s: any) => s.date === day).forEach((s: any) => {
        if (isActualTrader && s.actualTrades && s.actualTrades.length > 0) {
           s.actualTrades.forEach((t: any) => {
              const vol = Number(t.qty_mw || t.purchase || t.volume || 0);
              if (vol <= 0) return;
              dayTotal += (vol * 1000 * 0.25); // kWh
           });
        } else if (!isActualTrader && (s.shouldBuyFromMarket ?? (s.selectedSource && s.selectedSource !== 'DISCOM'))) {
           dayTotal += (s.marketEnergy ?? s.maxEnergyPerSlot ?? 0);
        }
      });
      totalRow.push(Number((dayTotal / 1000).toFixed(4)), '-', '-');
    });
    const tr = sheet.addRow(totalRow);
    tr.font = { bold: true };
    tr.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } });

    // Add empty rows before summary
    sheet.addRow([]);
    
    // Add Billing Dates info row
    const monthData = entry.todConsumptions?.[monthStr || ''];
    const startDate = monthData?.startDate || monthData?.['Start Date'] || '-';
    const endDate = monthData?.endDate || monthData?.['End Date'] || '-';
    
    const formatToDDMM = (dStr: string) => {
      if (!dStr || dStr === '-') return '-';
      const parts = dStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}`;
      }
      return dStr;
    };
    
    const billingPeriodRow = sheet.addRow([`Billing Period: ${formatToDDMM(startDate)} to ${formatToDDMM(endDate)}`]);
    billingPeriodRow.font = { bold: true, italic: true };

    sheet.addRow([]);

    // Just output the general OA breakdown
    const breakdownHeader = [
      'TOD Slab',
      'Actual DISCOM Units (kWh)',
      'Actual DISCOM Units (kVAh)',
      'Actual DISCOM Rate (Rs./kWh)',
      'Actual DISCOM Rate (Rs./kVAh)',
      'Actual DISCOM Bill (Rs.)',
      'OA Units (kWh, Regional Bus)',
      'OA Units (kWh, Consumer Bus)',
      'OA Energy Charges (Rs.)',
      'DISCOM Units after OA (kWh)',
      'DISCOM Units after OA (kVAh)',
      'DISCOM Bill after OA (Rs.)'
    ];
    const breakdownHeaderRow = sheet.addRow(breakdownHeader);
    breakdownHeaderRow.height = 32;
    breakdownHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    breakdownHeaderRow.eachCell(c => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003366' } };
      c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });
    for (let col = 2; col <= 12; col++) {
      sheet.getColumn(col).width = 18;
    }

    rowMapping['breakdownTableStart'] = sheet.rowCount + 1;

    let totalDiscomURounded = 0;
    let totalDiscomKvahRounded = 0;
    let totalDiscomBRounded = 0;
    let totalOaURounded = 0;
    let totalConsumerURounded = 0;
    let totalOaBRounded = 0;
    let totalDiscomUnitsAfterOARounded = 0;
    let totalDiscomUnitsAfterOAKvahRounded = 0;
    let totalNetBRounded = 0;

    // Pre-calculate visibleTotalOa to distribute overheads across TOD slabs
    const preT = oaDetailed.totals;
    const preTotalMarketEnergyCost = todSummaries.reduce((sum: number, s: any) => sum + (s.marketCostBase || 0), 0);
    const preTradedDays = { DAM: new Set<string>(), GDAM: new Set<string>(), RTM: new Set<string>() };
    slotsData.forEach((s: any) => {
      const isMarket = s.shouldBuyFromMarket ?? (s.selectedSource && s.selectedSource !== 'DISCOM');
      const mkt = s.selectedSource || s.marketSource;
      const energy = s.marketEnergy ?? s.maxEnergyPerSlot ?? 0;
      if (isMarket && mkt && energy > 0) {
        if (mkt === 'DAM') preTradedDays.DAM.add(s.date);
        else if (mkt === 'GDAM') preTradedDays.GDAM.add(s.date);
        else if (mkt === 'RTM') preTradedDays.RTM.add(s.date);
      }
    });
    const damSldcCostPre = preTradedDays.DAM.size * 1500;
    const gdamSldcCostPre = preTradedDays.GDAM.size * 1500;
    const rtmSldcCostPre = preTradedDays.RTM.size * 1500;
    const nldcCostPre = (oaDetailed as any).nldcSchedulingCost || 0;
    const preVisibleTotalOa = Math.round(preTotalMarketEnergyCost) + 
      Math.round(preT.cssCharge) + Math.round(preT.rpoCharge) + Math.round(preT.pocCharge) + 
      Math.round(preT.stuCharge) + Math.round(preT.dcCharge) + Math.round(preT.iexFee) + 
      Math.round(damSldcCostPre) + Math.round(gdamSldcCostPre) + Math.round(rtmSldcCostPre) + 
      Math.round(nldcCostPre) + Math.round(oaDetailed.bidApplicationFees);

    const totalOaBaseCostAllSlabs = oaDetailed.breakdown.reduce((sum: number, b: any) => sum + Math.round(b.oaBill), 0);
    const overheadsToDistribute = preVisibleTotalOa - totalOaBaseCostAllSlabs;
    let runningOaBillAcc = 0;
    const fppaPercent = result.fppaPercent || 0;

    oaDetailed.breakdown.forEach((b: any, index: number) => {
      const fppaMultiplier = fppaPercent > 0 && !((result as any).fppaCharge !== undefined || (result as any).fppaSurcharge !== undefined) ? (1 + (fppaPercent / 100)) : 1;
      const discomU = Math.round(b.discomUnits);
      const discomB = Math.round(b.discomBill);
      const oaU = isActualTrader ? Math.round(b.traderMarketEnergy || 0) : Math.round(b.oaUnits);
      const consumerU = isActualTrader ? Math.round(b.traderConsumerBusUnits || 0) : Math.round(b.consumerBusUnits);
      let oaB = isActualTrader ? Math.round(b.traderSlabOaBill || 0) : Math.round(b.oaBill);
      
      if (!isActualTrader) {
        if (totalOaBaseCostAllSlabs > 0) {
          oaB += Math.round((Math.round(b.oaBill) / totalOaBaseCostAllSlabs) * overheadsToDistribute);
        }
        if (index === oaDetailed.breakdown.length - 1 && totalOaBaseCostAllSlabs > 0) {
           oaB = preVisibleTotalOa - runningOaBillAcc;
        }
      }
      runningOaBillAcc += oaB;

      const discomUnitsAfterOA = isActualTrader ? Math.round(b.traderLeftoverDiscomEnergy || 0) : Math.max(0, discomU - consumerU);
      const netB = isActualTrader ? Math.round(b.traderDiscomBillTotal || b.discomBill) : Math.round(b.proltDiscomBill);

      const pf = result.powerFactor || 0.99;
      const discomKvah = Math.round(discomU / pf);
      const discomUnitsAfterOAKvah = Math.round(discomUnitsAfterOA / pf);
      const rateKwh = Number((b.discomRate || 0).toFixed(4));
      const rateKvah = Number(((b.discomRate || 0) * pf).toFixed(4));

      sheet.addRow([
        b.slabName,
        discomU,
        discomKvah,
        rateKwh,
        rateKvah,
        discomB,
        oaU,
        consumerU,
        oaB,
        discomUnitsAfterOA,
        discomUnitsAfterOAKvah,
        netB
      ]);
      totalDiscomURounded += discomU;
      totalDiscomKvahRounded += discomKvah;
      totalDiscomBRounded += discomB;
      totalOaURounded += oaU;
      totalConsumerURounded += consumerU;
      totalOaBRounded += oaB;
      totalDiscomUnitsAfterOARounded += discomUnitsAfterOA;
      totalDiscomUnitsAfterOAKvahRounded += discomUnitsAfterOAKvah;
      totalNetBRounded += netB;
    });

    rowMapping['breakdownTableEnd'] = sheet.rowCount;

    const todTotalRow = sheet.addRow([
      'Total', 
      totalDiscomURounded, 
      totalDiscomKvahRounded,
      '-',
      '-',
      totalDiscomBRounded, 
      totalOaURounded, 
      totalConsumerURounded, 
      totalOaBRounded,
      totalDiscomUnitsAfterOARounded,
      totalDiscomUnitsAfterOAKvahRounded,
      totalNetBRounded
    ]);
    todTotalRow.font = { bold: true };
    todTotalRow.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } });

    rowMapping['todTotalRow'] = todTotalRow.number;

    sheet.addRow([]);

    // --- NEW: DISCOM Baseline Breakdown ---
    const baseHeaderRow = sheet.addRow(['DISCOM Baseline Breakdown', 'Amount (Rs.)']);
    baseHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    baseHeaderRow.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003366' } });
    
    const isNpcl = result.discom === 'NPCL';
    
    const misc = result.miscellaneousCharges || 0;
    let energyCharges = (result as any).baselineEnergyCharges ?? ((result.totalBaselineCost || 0) - (result.demandCharge || 0) - (result.electricityDuty || 0) - misc);
    let demandCharges = (result as any).demandAndFixedChargesApplied ?? (result.demandCharge || 0);
    const ed = result.electricityDuty || 0;
    const arrear = result.arrearAmount || 0;
    const lpsc = result.currentLpsc || 0;
    
    

    if (isNpcl) {
      const npclMultiplier = 0.90 * 0.99;
      const grossEnergy = energyCharges / npclMultiplier;
      const grossDemand = demandCharges / npclMultiplier;
      const grossTotal = grossEnergy + grossDemand;
      
      const energyRebate10 = grossEnergy * 0.10;
      const energyRebate1 = (grossEnergy - energyRebate10) * 0.01;
      const demandRebate10 = grossDemand * 0.10;
      const demandRebate1 = (grossDemand - demandRebate10) * 0.01;
      
      const baseGrossTotal = grossTotal / (1 + (fppaPercent / 100));
      const fppaCharges = grossTotal - baseGrossTotal;
      const energyShare = grossTotal > 0 ? grossEnergy / grossTotal : 0;
      const baseGrossEnergy = baseGrossTotal * energyShare;
      const baseGrossDemand = baseGrossTotal - baseGrossEnergy;
      
      const energyRow = sheet.addRow(['Gross Base Energy Charges', Math.round(baseGrossEnergy)]);
      rowMapping['energyChargesRow'] = energyRow.number;
      
      sheet.addRow(['FPPA Surcharge', Math.round(fppaCharges)]);
      sheet.addRow(['Gross Demand & Fixed Charges', Math.round(baseGrossDemand)]);
      sheet.addRow(['NPCL Rebate (10%)', -Math.round(energyRebate10 + demandRebate10)]);
      sheet.addRow(['NPCL Prompt Payment Rebate (1%)', -Math.round(energyRebate1 + demandRebate1)]);
      sheet.addRow(['Net Energy & Demand Charges', Math.round(energyCharges + demandCharges)]);
    } else {
      const hasExplicitFppa = (isActualTrader && result.actualTrader) ? (result.actualTrader.residualFppaCharge !== undefined) : ((result as any).fppaCharge !== undefined || (result as any).fppaSurcharge !== undefined);
      let fppaCharges = Math.round((isActualTrader && result.actualTrader) ? (result.actualTrader.residualFppaCharge || 0) : ((result as any).fppaCharge || (result as any).fppaSurcharge || 0));
      let baseEnergyCharges = Math.round(energyCharges);
      const baseDemandCharges = Math.round(demandCharges || 0);

      const energyRow = sheet.addRow(['Energy Charges', baseEnergyCharges]);
      rowMapping['energyChargesRow'] = energyRow.number;
      
      sheet.addRow(['FPPA Surcharge', fppaCharges]);
      sheet.addRow(['Demand & Fixed Charges', baseDemandCharges]);
    }
    
    sheet.addRow(['Electricity Duty', Math.round(ed)]);
    if (misc !== 0) {
      const miscRow = sheet.addRow(['Miscellaneous Charges', Math.round(misc)]);
      rowMapping['miscellaneousChargesRow'] = miscRow.number;
    }
    if (arrear !== 0) sheet.addRow(['Arrear Amount', Math.round(arrear)]);
    if (lpsc !== 0) sheet.addRow(['Current LPSC', Math.round(lpsc)]);
    
    const hasExplicitFppa = (isActualTrader && result.actualTrader) ? (result.actualTrader.residualFppaCharge !== undefined) : ((result as any).fppaCharge !== undefined || (result as any).fppaSurcharge !== undefined);
    let correctBaseEnergy = (result as any).pureEnergyCost || (result as any).baselineEnergyCharges || result.totalBaselineCost || 0;
    let correctFppa = (result as any).fppaCharge || (result as any).fppaSurcharge || 0;
    const totalBaselineWithMisc = correctBaseEnergy + correctFppa + demandCharges + ed + arrear + lpsc + misc;
    const baseTotalRow = sheet.addRow(['Total DISCOM Baseline Bill', Math.round(totalBaselineWithMisc)]);
    rowMapping['totalBaselineBillRow'] = baseTotalRow.number;baseTotalRow.font = { bold: true };
    baseTotalRow.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } });

    rowMapping['discomBaselineTotal'] = baseTotalRow.number;

    sheet.addRow([]);

    // --- NEW: DISCOM Bill After Open Access Breakdown ---
    const afterHeaderRow = sheet.addRow(['DISCOM Bill After Open Access Breakdown', 'Amount (Rs.)']);
    afterHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    afterHeaderRow.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003366' } });
    
    const electricityDutyAfterOA = (result as any).electricityDutyAfterOA ?? (result.electricityDuty || 0);
    let energyChargesAfterOA = isActualTrader ? totalNetBRounded : ((result as any).discomEnergyChargesAfterOA ?? (result.totalDiscomAfterProlt || 0));
    
    if (isActualTrader) {
      sheet.addRow(['Residual DISCOM Units (kWh)', Math.round((result as any).actualTrader?.residualDiscomEnergyKwh || 0)]);
      sheet.addRow(['Energy Charges', Math.round((result as any).actualTrader?.residualEnergyCost || 0)]);
      sheet.addRow(['FPPA Surcharge', Math.round((result as any).actualTrader?.residualFppaCharge || 0)]);
      sheet.addRow(['Demand & Fixed Charges', Math.round((result as any).actualTrader?.residualDemandCharge || 0)]);
      sheet.addRow(['Electricity Duty', Math.round((result as any).actualTrader?.residualElectricityDuty || 0)]);
      if (misc > 0) sheet.addRow(['Miscellaneous Charges', Math.round(misc)]);
    } else if (isNpcl) {
      const npclMultiplier = 0.90 * 0.99;
      const grossEnergyAfterOA = energyChargesAfterOA / npclMultiplier;
      const grossDemand = demandCharges / npclMultiplier;
      const grossTotalAfterOA = grossEnergyAfterOA + grossDemand;
      
      const energyRebate10AfterOA = grossEnergyAfterOA * 0.10;
      const energyRebate1AfterOA = (grossEnergyAfterOA - energyRebate10AfterOA) * 0.01;
      const demandRebate10 = grossDemand * 0.10;
      const demandRebate1 = (grossDemand - demandRebate10) * 0.01;
      
      const baseGrossTotalAfterOA = grossTotalAfterOA;
      const fppaChargesAfterOA = Math.round((result as any).fppaChargeAfterOA || 0);
      const energyShareAfterOA = grossTotalAfterOA > 0 ? grossEnergyAfterOA / grossTotalAfterOA : 0;
      const baseGrossEnergyAfterOA = baseGrossTotalAfterOA * energyShareAfterOA;
      const baseGrossDemandAfterOA = baseGrossTotalAfterOA - baseGrossEnergyAfterOA;
      
      sheet.addRow(['Gross Base Energy Charges', Math.round(baseGrossEnergyAfterOA)]);
      sheet.addRow(['FPPA Surcharge', Math.round(fppaChargesAfterOA)]);
      sheet.addRow(['Gross Demand & Fixed Charges', Math.round(baseGrossDemandAfterOA)]);
      sheet.addRow(['NPCL Rebate (10%)', -Math.round(energyRebate10AfterOA + demandRebate10)]);
      sheet.addRow(['NPCL Prompt Payment Rebate (1%)', -Math.round(energyRebate1AfterOA + demandRebate1)]);
      sheet.addRow(['Net Energy & Demand Charges', Math.round(energyChargesAfterOA + demandCharges)]);
    } else {
      let fppaChargesAfterOA = Math.round((result as any).fppaChargeAfterOA || 0);
      const baseDemandChargesAfterOA = Math.round(result.demandCharge || 0);
      let baseEnergyChargesAfterOA = Math.round((result as any).discomEnergyChargesAfterOA ?? (result.totalDiscomAfterProlt || 0));

      sheet.addRow(['Energy Charges', baseEnergyChargesAfterOA]);
      sheet.addRow(['FPPA Surcharge', fppaChargesAfterOA]);
      sheet.addRow(['Demand & Fixed Charges', baseDemandChargesAfterOA]);
    }
    
    if (!isActualTrader) {
      sheet.addRow(['Electricity Duty', Math.round(electricityDutyAfterOA)]);
      if (misc > 0) sheet.addRow(['Miscellaneous Charges', Math.round(misc)]);
      if (arrear > 0) sheet.addRow(['Arrear Amount', Math.round(arrear)]);
      if (lpsc > 0) sheet.addRow(['Current LPSC', Math.round(lpsc)]);
    }
    
    let correctFppaAfterOA = (result as any).fppaChargeAfterOA || 0;
    let correctEnergyAfterOA = energyChargesAfterOA;
    
    const totalDiscomAfterOAWithMisc = isActualTrader
      ? Number((result as any).actualTrader?.residualDiscomCost || 0)
      : (correctEnergyAfterOA + correctFppaAfterOA + (isNpcl ? demandCharges : (result.demandCharge || 0)) + electricityDutyAfterOA + misc) + arrear + lpsc;
    const afterTotalRow = sheet.addRow(['Total DISCOM Bill After Open Access', Math.round(totalDiscomAfterOAWithMisc)]);
    afterTotalRow.font = { bold: true };
    afterTotalRow.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } });

    rowMapping['discomBillAfterOATotal'] = afterTotalRow.number;

    sheet.addRow([]);
    
    const totalMarketEnergy = isActualTrader ? Number(actualTrader?.marketEnergyKwh || 0) : result.totalMarketEnergyKwh;
    const totalMarketEnergyCost = isActualTrader
      ? Number(actualTrader?.marketEnergyCost || 0)
      : todSummaries.reduce((sum: number, s: any) => sum + (s.marketCostBase || 0), 0);
    const avgMarketPrice = totalMarketEnergy > 0 ? totalMarketEnergyCost / totalMarketEnergy : 0;

    // Add charges header with rate/kWh information
    const chargesHeader = ['Open Access Charge Type', 'Total Amount (₹)', 'Rate per kWh (₹)', 'Basis (kWh)', 'Percentage (%)'];
    const chargesHeaderRow = sheet.addRow(chargesHeader);
    chargesHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    chargesHeaderRow.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003366' } });
    
    const t = isActualTrader ? {
      cssCharge: Number(actualTrader?.cssCharge || 0),
      cssRate: Number(oaDetailed.totals?.cssRate || 0),
      rpoCharge: Number(actualTrader?.rpoCharge || 0),
      pocCharge: Number(actualTrader?.pocCharge || 0),
      stuCharge: Number(actualTrader?.stuCharge || 0),
      dcCharge: Number(actualTrader?.wheelingCharge || 0),
      iexFee: Number(actualTrader?.iexFee || 0)
    } : oaDetailed.totals;
    
    // Calculate and add each charge with rate information
    const addChargeRow = (name: string, amount: number, ratePerKwh: number, basisKwh: number, percentage: number = 0) => {
      const r = sheet.addRow([
        name,
        Math.round(amount),
        ratePerKwh > 0 ? Number(ratePerKwh.toFixed(4)) : '-',
        basisKwh > 0 ? Math.round(basisKwh) : '-',
        percentage > 0 ? Number(percentage.toFixed(2)) : '-'
      ]);
    };
    
    // Energy Charges (Market)
    addChargeRow('Energy Charges (Market) (inc losses)', totalMarketEnergyCost, avgMarketPrice, totalMarketEnergy);
    if (isActualTrader && !hasDetailedActualSettlement) {
      const consolidatedOaCharges = Math.max(0, Number(actualTrader.totalOaCost || 0) - totalMarketEnergyCost);
      addChargeRow('All OA Charges and Overheads', consolidatedOaCharges, totalMarketEnergy > 0 ? consolidatedOaCharges / totalMarketEnergy : 0, totalMarketEnergy);
    }

    // Cross Subsidy (applied to consumer bus units after losses)
    const cssRate = (t as any).cssRate || 0;
    const consumerBusBasis = isActualTrader
      ? Number(actualTrader?.consumerBusEnergyKwh || 0)
      : result.totalConsumerBusEnergyKwh || totalConsumerURounded;
    addChargeRow('Cross Subsidy', t.cssCharge, cssRate, consumerBusBasis);
    
    // RPPO (flat rate of ₹0.25/kWh, also applied to consumer bus units)
    addChargeRow('RPPO', t.rpoCharge, 0.25, consumerBusBasis);

    // POC charges (CTU charges)
    const pocRate = totalMarketEnergy > 0 ? t.pocCharge / totalMarketEnergy : 0;
    addChargeRow('POC charges', t.pocCharge, pocRate, totalMarketEnergy);
    
    // STU charges
    const stuRate = totalMarketEnergy > 0 ? t.stuCharge / totalMarketEnergy : 0;
    addChargeRow('STU charges', t.stuCharge, stuRate, totalMarketEnergy);
    
    // Discom charges (Distribution/Wheeling charges)
    const dcRate = totalMarketEnergy > 0 ? t.dcCharge / totalMarketEnergy : 0;
    addChargeRow('Discom charges', t.dcCharge, dcRate, totalMarketEnergy);
    
    // IEX fee (fixed at ₹0.02/kWh)
    addChargeRow('IEX fee', t.iexFee, 0.02, totalMarketEnergy, 0.02);
    
    // SLDC Operating charges (per market per day)
    // Calculate SLDC breakdown by market
    const tradedDays = { DAM: new Set<string>(), GDAM: new Set<string>(), RTM: new Set<string>() };
    slotsData.forEach((s: any) => {
      if (isActualTrader) {
        (s.actualTrades || []).forEach((trade: any) => {
          const volumeMw = Number(trade.qty_mw || trade.purchase || trade.volume || 0);
          if (volumeMw <= 0) return;
          const market = String(trade.oa_market_type || 'RTM').toUpperCase();
          if (market === 'DAM' || market === 'GDAM' || market === 'RTM') tradedDays[market].add(s.date);
        });
        return;
      }
      const isMarket = s.shouldBuyFromMarket ?? (s.selectedSource && s.selectedSource !== 'DISCOM');
      const mkt = s.selectedSource || s.marketSource;
      const energy = s.marketEnergy ?? s.maxEnergyPerSlot ?? 0;
      if (isMarket && mkt && energy > 0) {
        if (mkt === 'DAM') tradedDays.DAM.add(s.date);
        else if (mkt === 'GDAM') tradedDays.GDAM.add(s.date);
        else if (mkt === 'RTM') tradedDays.RTM.add(s.date);
      }
    });
    
    const totalMarketDays = tradedDays.DAM.size + tradedDays.GDAM.size + tradedDays.RTM.size;
    const sldcFeePerDay = isActualTrader && totalMarketDays > 0
      ? Number(actualTrader?.sldcSchedulingCost || 0) / totalMarketDays
      : 1500;
    const damSldcCost = tradedDays.DAM.size * sldcFeePerDay;
    const gdamSldcCost = tradedDays.GDAM.size * sldcFeePerDay;
    const rtmSldcCost = tradedDays.RTM.size * sldcFeePerDay;
    const computedTotalSldc = damSldcCost + gdamSldcCost + rtmSldcCost;
    const sldcCost = (oaDetailed as any).sldcSchedulingCost || computedTotalSldc;
    
    sheet.addRow(['SLDC Operating charges - DAM', Math.round(damSldcCost), '-', `${tradedDays.DAM.size} days`, '-']);
    sheet.addRow(['SLDC Operating charges - GDAM', Math.round(gdamSldcCost), '-', `${tradedDays.GDAM.size} days`, '-']);
    sheet.addRow(['SLDC Operating charges - RTM', Math.round(rtmSldcCost), '-', `${tradedDays.RTM.size} days`, '-']);
    
    // NLDC Scheduling charges (fixed per unique day)
    const nldcCost = isActualTrader
      ? Number(actualTrader?.nldcSchedulingCost || 0)
      : (oaDetailed as any).nldcSchedulingCost || 0;
    const uniqueDays = new Set([...tradedDays.DAM, ...tradedDays.GDAM, ...tradedDays.RTM]).size;
    sheet.addRow(['NLDC Scheduling charges', Math.round(nldcCost), '-', `${uniqueDays} unique days`, '-']);
    
    // NLDC application charges (fixed per bid)
    const bidApplicationFees = isActualTrader
      ? Number(actualTrader?.bidApplicationFees || 0)
      : Number(oaDetailed.bidApplicationFees || 0);
    sheet.addRow(['NLDC application charges', Math.round(bidApplicationFees), '-', '-', '-']);
    
    const calculatedVisibleTotalOa = Math.round(totalMarketEnergyCost) +
                           Math.round(t.cssCharge) + 
                           Math.round(t.rpoCharge) + 
                           Math.round(t.pocCharge) + 
                           Math.round(t.stuCharge) + 
                           Math.round(t.dcCharge) + 
                           Math.round(t.iexFee) + 
                           Math.round(damSldcCost) + 
                           Math.round(gdamSldcCost) + 
                           Math.round(rtmSldcCost) + 
                           Math.round(nldcCost) + 
                           Math.round(bidApplicationFees);
    const visibleTotalOa = isActualTrader
      ? Math.round(actualTrader?.totalOaCost || calculatedVisibleTotalOa)
      : calculatedVisibleTotalOa;

    sheet.addRow([]);
    const totalEstRow = sheet.addRow(['Total Estimated OA Bill (Inc. Overheads)', visibleTotalOa]);
    totalEstRow.font = { bold: true };
    totalEstRow.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } });
    
    const baselineCostForGross = isActualTrader ? totalBaselineWithMisc : result.fullBaselineDiscomCost || totalBaselineWithMisc;
    const grossSavingsVal = isActualTrader
      ? Number(actualTrader?.savings || 0)
      : result.grossSavings ?? Math.max(0, baselineCostForGross - ((result.totalLandedExchangeCost || 0) + (result.totalDiscomAfterProlt || 0) + oaDetailed.dailyFixedOverhead + oaDetailed.bidApplicationFees));
    
    // Calculate exact visual values for Discom to prevent any rounding arithmetic mismatch
    const visibleDiscomBefore = Math.round(isActualTrader ? actualTrader?.baselineDiscomCost || totalBaselineWithMisc : totalBaselineWithMisc);
    const visibleDiscomAfter = Math.round(isActualTrader ? actualTrader?.residualDiscomCost || 0 : totalDiscomAfterOAWithMisc);
    
    const visibleTotalGrossBill = visibleTotalOa + visibleDiscomAfter;
    
    const totalGrossRow = sheet.addRow([isActualTrader ? 'Total Actual Trader Bill (OA + Residual DISCOM)' : 'Total Bill (OA + DISCOM After PROLT)', visibleTotalGrossBill]);
    totalGrossRow.font = { bold: true };
    totalGrossRow.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } });

    rowMapping['totalBillOADiscomAfterProltRow'] = totalGrossRow.number;
    
    sheet.addRow([]);
    
    // Add Losses header (Informational)
    let lossesHeaderRow: any;
    if (result.totalMarketEnergyKwh > 0) {
      const lossesHeader = ['Physical Transmission Losses (Informational)', 'Cost Eq. (₹)', 'Rate per kWh (₹)', 'Basis (kWh)', 'Percentage (%)'];
      lossesHeaderRow = sheet.addRow(lossesHeader);
      lossesHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      lossesHeaderRow.eachCell((c: any) => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF808080' } });

      const istsLoss = slotsData.length > 0 ? (slotsData[0] as any).istsLoss || 0 : 0;
      const stuLoss = slotsData.length > 0 ? (slotsData[0] as any).stuLoss || 0 : 0;
      const wheelingLoss = slotsData.length > 0 ? (slotsData[0] as any).wheelingLoss || 0 : 0;
      
      const istsBasis = totalMarketEnergy;
      const istsLostUnits = istsBasis * (istsLoss / 100);
      const istsLossAmount = istsLostUnits * avgMarketPrice;
      
      const stuBasis = istsBasis - istsLostUnits;
      const stuLostUnits = stuBasis * (stuLoss / 100);
      const stuLossAmount = stuLostUnits * avgMarketPrice;
      
      const wheelingBasis = stuBasis - stuLostUnits;
      const wheelingLostUnits = wheelingBasis * (wheelingLoss / 100);
      const wheelingLossAmount = wheelingLostUnits * avgMarketPrice;

      const addInformationalRow = (name: string, amount: number, ratePerKwh: number, basisKwh: number, percentage: number = 0) => {
        sheet.addRow([
          name,
          Math.round(amount),
          ratePerKwh > 0 ? Number(ratePerKwh.toFixed(4)) : '-',
          basisKwh > 0 ? Math.round(basisKwh) : '-',
          percentage > 0 ? Number(percentage.toFixed(2)) : '-'
        ]);
      };

      addInformationalRow('ISTS Loss', istsLossAmount, avgMarketPrice, istsBasis, istsLoss);
      addInformationalRow('STU Loss', stuLossAmount, avgMarketPrice, stuBasis, stuLoss);
      addInformationalRow('Wheeling Loss', wheelingLossAmount, avgMarketPrice, wheelingBasis, wheelingLoss);
      sheet.addRow([]);
    } else {
      lossesHeaderRow = { number: sheet.rowCount + 1 };
    }

    
    const discomBeforeRow = sheet.addRow([isActualTrader ? 'DISCOM Bill Before OA' : 'DISCOM Bill Before PROLT', visibleDiscomBefore]);
    sheet.addRow(['Total Estimated OA Bill (Inc. Overheads)', visibleTotalOa]);
    sheet.addRow([isActualTrader ? 'DISCOM Bill After OA' : 'DISCOM Bill After PROLT', visibleDiscomAfter]);
    
    // Instead of using Math.round(grossSavingsVal) which might be off by 1 or 2 due to rounding individual parts,
    // we use the exact visual difference to ensure the math always looks perfect on the sheet.
    const visibleGrossSavings = visibleDiscomBefore - visibleTotalGrossBill;
    const grossSavingsRow = sheet.addRow(['Gross Savings', visibleGrossSavings]);
    grossSavingsRow.font = { bold: true };
    grossSavingsRow.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } });
    rowMapping['grossSavingsRow'] = grossSavingsRow.number;
    
    const nocFee = isActualTrader
      ? Number(actualTrader?.nocFee || 0)
      : (result as any).oaDetailed?.totals?.nocFee !== undefined ? (result as any).oaDetailed.totals.nocFee : (entry.nocFee !== undefined && entry.nocFee !== null ? Number(entry.nocFee) : 0);
    const regFee = isActualTrader
      ? Number(actualTrader?.registrationFee || 0)
      : (result as any).oaDetailed?.totals?.regFee !== undefined ? (result as any).oaDetailed.totals.regFee : (entry.iexRegFee !== undefined && entry.iexRegFee !== null ? Number(entry.iexRegFee) : 0);
    const consultancyFeeVal = (result as any).oaDetailed?.totals?.consultancyFee !== undefined ? (result as any).oaDetailed.totals.consultancyFee : ((result as any).aggregatedTotals?.consultancyFee || (entry.consultancyFee !== null && entry.consultancyFee !== undefined ? Number(entry.consultancyFee) : 0));
    const platformFeeRate = entry.probusPlatformFee !== null && entry.probusPlatformFee !== undefined ? Number(entry.probusPlatformFee) : 0.02;
    const probusPlatformFee = (result as any).oaDetailed?.totals?.probusPlatformFee !== undefined ? (result as any).oaDetailed.totals.probusPlatformFee : ((result as any).aggregatedTotals?.probusPlatformFee || Math.round(result.totalMarketEnergyKwh * platformFeeRate));
    const proltMarginVal = (result as any).oaDetailed?.totals?.proltMarginCost || (result as any).aggregatedTotals?.proltMarginCost || (result as any).proltMarginCost || 0;
    const nocRow = sheet.addRow(['Monthly NOC Fee', nocFee]);
    rowMapping['nocFeeRow'] = nocRow.number;

    const regRow = sheet.addRow(['IEX Registration Fee', regFee]);
    rowMapping['iexRegFeeRow'] = regRow.number;

    if (!isActualTrader) {
      const consultancyRow = sheet.addRow(['Consultancy Fee', consultancyFeeVal]);
      rowMapping['consultancyFeeRow'] = consultancyRow.number;

      const savingsAfterFixedFees = Math.max(0, grossSavingsVal - (nocFee + regFee + consultancyFeeVal));
      const savingsAfterFixedFeesRow = sheet.addRow(['Saving after Fixed Fees', Math.round(savingsAfterFixedFees)]);
      savingsAfterFixedFeesRow.font = { bold: true };
      savingsAfterFixedFeesRow.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } });

      const platformRow = sheet.addRow(['Platform Fee', probusPlatformFee]);
      rowMapping['platformFeeRow'] = platformRow.number;

      const valueShareRow = sheet.addRow(['Value-Share for Energy Platform', Math.round(proltMarginVal)]);
      rowMapping['valueShareRow'] = valueShareRow.number;
    }
    
    const traderMarginVal = isActualTrader
      ? Number(actualTrader?.traderMargin || 0) + Number(actualTrader?.traderMarginGst || 0)
      : (result as any).oaDetailed?.totals?.traderMargin || (result as any).aggregatedTotals?.traderMargin || (result as any).traderMarginCost || 0;
    const traderMarginSumRow = sheet.addRow(['Trader Margin', Math.round(traderMarginVal)]);
    rowMapping['traderMarginChargeRow'] = traderMarginSumRow.number;
    
    let finalSavings = 0;
    if (isActualTrader) {
      finalSavings = Number(actualTrader?.savings || 0);
    } else {
      finalSavings = result.totalSavings ?? Math.max(0, grossSavingsVal - (nocFee + regFee + consultancyFeeVal + probusPlatformFee + proltMarginVal + traderMarginVal));
    }
    
    const finalSavingsRow = sheet.addRow(['Final Client Savings (Saving for your business)', Math.round(finalSavings)]);
    finalSavingsRow.font = { bold: true };
    finalSavingsRow.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } });
    rowMapping['finalSavingsRow'] = finalSavingsRow.number;
    
    if (sheet.lastRow) {
      sheet.lastRow.font = { bold: true, color: { argb: 'FF000000' } };
    }
    
    // Auto-fit column A
    sheet.getColumn(1).width = 40;

    // Apply borders to the 6 tables
    const applyBordersRange = (start: number, end: number, cols: number) => {
      for (let i = start; i <= end; i++) {
        const r = sheet.getRow(i);
        if (r.getCell(1).value !== null && r.getCell(1).value !== undefined && r.getCell(1).value !== '') {
          for (let j = 1; j <= cols; j++) {
            r.getCell(j).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          }
        }
      }
    };

    applyBordersRange(breakdownHeaderRow.number, todTotalRow.number, 8);
    applyBordersRange(baseHeaderRow.number, baseTotalRow.number, 2);
    applyBordersRange(afterHeaderRow.number, afterTotalRow.number, 2);
    applyBordersRange(lossesHeaderRow.number, lossesHeaderRow.number + 3, 5);
    applyBordersRange(chargesHeaderRow.number, totalGrossRow.number, 5);
    applyBordersRange(discomBeforeRow.number, finalSavingsRow.number, 2);

    return rowMapping;
  }

  static async exportToExcel(id: string, monthStr?: string, version?: number, isActualTrader = false): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    
    if (monthStr === 'all') {
      const entry = await TraderPerformanceService.getEntryOrVersion(id, version);
      const months = Object.keys(entry?.todConsumptions || {}).filter(k => /^\d{4}-\d{2}$/.test(k)).sort();
      const allResults = [];
      
      for (const m of months) {
        const result = await TraderPerformanceService.calculateMarketDecision(id, m, version);
        allResults.push({ monthStr: m, result });
      }
      
      if (allResults.length > 0) {
        const summarySheet = workbook.addWorksheet('Summary');
        const monthRowMap: Record<string, any> = {};
        
        for (const r of allResults) {
          let sheetName = getShortSheetName(r.monthStr, 'Savings Analysis');
          let idx = 2;
          while (workbook.getWorksheet(sheetName)) {
            sheetName = `${getShortSheetName(r.monthStr, 'Savings Analysis')} ${idx}`;
            idx++;
          }
          const rowMapping = await TraderPerformanceExportService.addSavingsSheet(workbook, sheetName, r.result, entry, r.monthStr, isActualTrader);
          monthRowMap[r.monthStr] = { sheetName, ...rowMapping };
        }
        
        await TraderPerformanceExportService.populateSummarySheet(summarySheet, entry, allResults, monthRowMap, isActualTrader);
      }
    } else {
      const entry = await TraderPerformanceService.getEntryOrVersion(id, version);
      const result = await TraderPerformanceService.calculateMarketDecision(id, monthStr, version);
      const sheetName = getShortSheetName(monthStr, 'Savings Analysis');
      await TraderPerformanceExportService.addSavingsSheet(workbook, sheetName, result, entry, monthStr, isActualTrader);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  static async exportActualTraderToExcel(id: string, monthStr?: string, version?: number): Promise<Buffer> {
    return this.exportToExcel(id, monthStr, version, true);
  }

  private static async populateSummarySheet(sheet: ExcelJS.Worksheet, entry: any, allResults: any[], monthRowMap: Record<string, any>, isActualTrader = false) {
    addExportHeader(sheet, entry);

    // Sort results chronologically
    allResults.sort((a, b) => a.monthStr.localeCompare(b.monthStr));

    const monthHeaders = allResults.map(r => getShortHeaderName(r.monthStr));

    const numMonths = allResults.length;

    const uniqueTods = new Set<string>();
    allResults.forEach(r => {
      r.result.todSummaries.forEach((t: any) => uniqueTods.add(t.slabName));
    });
    const todSlabs = sortTodSlabs(Array.from(uniqueTods));

    // Savings section
    const savingsHeaderRow = sheet.addRow(['Savings', ...monthHeaders]);
    savingsHeaderRow.height = 25;
    savingsHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    savingsHeaderRow.eachCell(c => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002060' } };
      c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });

    // Billing Period header row below the Savings header row
    const billingPeriodRowData = ['Billing Period'];
    allResults.forEach(r => {
      const monthData = entry.todConsumptions?.[r.monthStr];
      const start = monthData?.startDate || monthData?.['Start Date'] || '-';
      const end = monthData?.endDate || monthData?.['End Date'] || '-';
      
      const formatToDDMM = (dStr: string) => {
        if (!dStr || dStr === '-') return '-';
        const parts = dStr.split('-');
        if (parts.length === 3) {
          return `${parts[2]}-${parts[1]}`;
        }
        return dStr;
      };
      
      billingPeriodRowData.push(`${formatToDDMM(start)} to ${formatToDDMM(end)}`);
    });
    const bPeriodRow = sheet.addRow(billingPeriodRowData);
    bPeriodRow.height = 25;
    bPeriodRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    bPeriodRow.eachCell(c => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002060' } };
      c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });

    const getColLetter = (colIdx: number) => {
      let temp = colIdx;
      let letter = '';
      while (temp > 0) {
        let modulo = (temp - 1) % 26;
        letter = String.fromCharCode(65 + modulo) + letter;
        temp = Math.floor((temp - modulo) / 26);
      }
      return letter;
    };

    const todUnitsRowNums: Record<string, number> = {};
    todSlabs.forEach(tod => {
      const rowData: any[] = [`Cleared Units@Consumer bus ${tod}`];
      allResults.forEach((r, idx) => {
        const mMapping = monthRowMap[r.monthStr];
        const formula = `IFERROR(VLOOKUP("${tod}", '${mMapping.sheetName}'!$A$${mMapping.breakdownTableStart}:$L$${mMapping.breakdownTableEnd}, 8, FALSE), 0)`;
        rowData.push({ formula });
      });
      const addedRow = sheet.addRow(rowData);
      for (let i = 2; i <= numMonths + 1; i++) addedRow.getCell(i).numFmt = '#,##,##0';
      todUnitsRowNums[tod] = addedRow.number;
    });

    const totalClearedRowData: any[] = ['Total Cleared Units@Consumer bus'];
    allResults.forEach((r, idx) => {
      const colChar = getColLetter(idx + 2);
      const startRow = todUnitsRowNums[todSlabs[0]];
      const endRow = todUnitsRowNums[todSlabs[todSlabs.length - 1]];
      const formula = `SUM(${colChar}${startRow}:${colChar}${endRow})`;
      totalClearedRowData.push({ formula });
    });
    const totalClearedRow = sheet.addRow(totalClearedRowData);
    totalClearedRow.font = { bold: true };
    for (let i = 2; i <= numMonths + 1; i++) totalClearedRow.getCell(i).numFmt = '#,##,##0';
    const totalClearedRowNumber = totalClearedRow.number;

    const totalConsumptionRowData: any[] = ['Total Consumption As per Ebill'];
    allResults.forEach((r, idx) => {
      const mMapping = monthRowMap[r.monthStr];
      const formula = `'${mMapping.sheetName}'!B${mMapping.todTotalRow}`;
      totalConsumptionRowData.push({ formula });
    });
    const totalConsumptionRow = sheet.addRow(totalConsumptionRowData);
    totalConsumptionRow.font = { bold: true };
    for (let i = 2; i <= numMonths + 1; i++) totalConsumptionRow.getCell(i).numFmt = '#,##,##0';
    const totalConsumptionRowNumber = totalConsumptionRow.number;

    const clearedVsActualRowData: any[] = ['Cleared vs Actual consumption %'];
    allResults.forEach((r, idx) => {
      const colChar = getColLetter(idx + 2);
      const formula = `${colChar}${totalClearedRowNumber}/${colChar}${totalConsumptionRowNumber}`;
      clearedVsActualRowData.push({ formula });
    });
    const clearedVsActualRow = sheet.addRow(clearedVsActualRowData);
    for (let i = 2; i <= numMonths + 1; i++) clearedVsActualRow.getCell(i).numFmt = '0%';

    const totalPowerCostRowData: any[] = ['Total Power Cost through Open Access'];
    allResults.forEach((r, idx) => {
      const mMapping = monthRowMap[r.monthStr];
      const formula = `'${mMapping.sheetName}'!B${mMapping.totalBillOADiscomAfterProltRow}`;
      totalPowerCostRowData.push({ formula });
    });
    const totalPowerCostOARow = sheet.addRow(totalPowerCostRowData);
    totalPowerCostOARow.font = { bold: true };
    for (let i = 2; i <= numMonths + 1; i++) totalPowerCostOARow.getCell(i).numFmt = '"₹"#,##,##0';
    const totalPowerCostOARowNumber = totalPowerCostOARow.number;

    const discomCostRowData: any[] = ['Discom Cost'];
    allResults.forEach((r, idx) => {
      const mMapping = monthRowMap[r.monthStr];
      const formula = `'${mMapping.sheetName}'!B${mMapping.discomBaselineTotal}`;
      discomCostRowData.push({ formula });
    });
    const discomCostRow = sheet.addRow(discomCostRowData);
    discomCostRow.font = { bold: true };
    for (let i = 2; i <= numMonths + 1; i++) discomCostRow.getCell(i).numFmt = '"₹"#,##,##0';
    const discomCostRowNumber = discomCostRow.number;

    const summaryMiscRowData: any[] = ['Miscellaneous Charges'];
    allResults.forEach((r, idx) => {
      const mMapping = monthRowMap[r.monthStr];
      if (mMapping.miscellaneousChargesRow) {
        const formula = `'${mMapping.sheetName}'!B${mMapping.miscellaneousChargesRow}`;
        summaryMiscRowData.push({ formula });
      } else {
        summaryMiscRowData.push(0);
      }
    });
    const summaryMiscRow = sheet.addRow(summaryMiscRowData);
    for (let i = 2; i <= numMonths + 1; i++) summaryMiscRow.getCell(i).numFmt = '"₹"#,##,##0';

    sheet.addRow([]);

    const ppcDiscomRowData: any[] = ['Blended Cost per Unit (Discom Only) [Inc. Fixed Charges]'];
    allResults.forEach((r, idx) => {
      const colChar = getColLetter(idx + 2);
      const formula = `${colChar}${discomCostRowNumber}/${colChar}${totalConsumptionRowNumber}`;
      ppcDiscomRowData.push({ formula });
    });
    const ppcDiscomRow = sheet.addRow(ppcDiscomRowData);
    ppcDiscomRow.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } });
    ppcDiscomRow.font = { bold: true };
    for (let i = 2; i <= numMonths + 1; i++) ppcDiscomRow.getCell(i).numFmt = '"₹"0.00';

    const ppcProltRowData: any[] = [isActualTrader ? 'Blended Cost per Unit (With OA) [Inc. Fixed Charges]' : 'Blended Cost per Unit (With Prolt) [Inc. Fixed Charges]'];
    allResults.forEach((r, idx) => {
      const colChar = getColLetter(idx + 2);
      const formula = `${colChar}${totalPowerCostOARowNumber}/${colChar}${totalConsumptionRowNumber}`;
      ppcProltRowData.push({ formula });
    });
    const ppcProltRow = sheet.addRow(ppcProltRowData);
    ppcProltRow.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C6E7' } });
    ppcProltRow.font = { bold: true };
    for (let i = 2; i <= numMonths + 1; i++) ppcProltRow.getCell(i).numFmt = '"₹"0.00';

    const totalSavingRowData: any[] = ['Total Saving'];
    allResults.forEach((r, idx) => {
      const mMapping = monthRowMap[r.monthStr];
      const formula = `'${mMapping.sheetName}'!B${mMapping.grossSavingsRow}`;
      totalSavingRowData.push({ formula });
    });
    const totalSavingRow = sheet.addRow(totalSavingRowData);
    totalSavingRow.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } });
    totalSavingRow.font = { bold: true };
    for (let i = 2; i <= numMonths + 1; i++) totalSavingRow.getCell(i).numFmt = '"₹"#,##,##0';
    const totalSavingRowNumber = totalSavingRow.number;

    const savingUnitRowData: any[] = ['Saving/Unit'];
    allResults.forEach((r, idx) => {
      const colChar = getColLetter(idx + 2);
      const formula = `${colChar}${totalSavingRowNumber}/${colChar}${totalConsumptionRowNumber}`;
      savingUnitRowData.push({ formula });
    });
    const savingUnitRow = sheet.addRow(savingUnitRowData);
    savingUnitRow.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } });
    savingUnitRow.font = { bold: true };
    for (let i = 2; i <= numMonths + 1; i++) savingUnitRow.getCell(i).numFmt = '"₹"0.00';

    const nocFeeRowData: any[] = ['Monthly NOC Fee'];
    allResults.forEach((r, idx) => {
      const mMapping = monthRowMap[r.monthStr];
      const formula = `'${mMapping.sheetName}'!B${mMapping.nocFeeRow}`;
      nocFeeRowData.push({ formula });
    });
    const nocFeeRow = sheet.addRow(nocFeeRowData);
    for (let i = 2; i <= numMonths + 1; i++) nocFeeRow.getCell(i).numFmt = '"₹"#,##,##0';
    const nocFeeRowNumber = nocFeeRow.number;

    const iexRegRowData: any[] = ['IEX Registration Fee'];
    allResults.forEach((r, idx) => {
      const mMapping = monthRowMap[r.monthStr];
      const formula = `'${mMapping.sheetName}'!B${mMapping.iexRegFeeRow}`;
      iexRegRowData.push({ formula });
    });
    const iexRegRow = sheet.addRow(iexRegRowData);
    for (let i = 2; i <= numMonths + 1; i++) iexRegRow.getCell(i).numFmt = '"₹"#,##,##0';
    const iexRegRowNumber = iexRegRow.number;

    let consultancyRowNumber = 0;
    if (!isActualTrader) {
      const consultancyRowData: any[] = ['Consultancy Fee'];
      allResults.forEach((r, idx) => {
        const mMapping = monthRowMap[r.monthStr];
        const formula = `'${mMapping.sheetName}'!B${mMapping.consultancyFeeRow}`;
        consultancyRowData.push({ formula });
      });
      const consultancyRow = sheet.addRow(consultancyRowData);
      for (let i = 2; i <= numMonths + 1; i++) consultancyRow.getCell(i).numFmt = '"₹"#,##,##0';
      consultancyRowNumber = consultancyRow.number;
    }

    sheet.addRow([]);

    const marginHeaderRow = sheet.addRow(['Margin Details', ...monthHeaders]);
    marginHeaderRow.height = 25;
    marginHeaderRow.font = { bold: true };
    marginHeaderRow.eachCell(c => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAEAEA' } };
      c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });

    const traderMarginRowData: any[] = [`Trader Margin (Rs ${entry.traderMargin !== null && entry.traderMargin !== undefined ? entry.traderMargin : 0.02}/kWh)`];
    allResults.forEach((r, idx) => {
      const mMapping = monthRowMap[r.monthStr];
      const formula = `'${mMapping.sheetName}'!B${mMapping.traderMarginChargeRow}`;
      traderMarginRowData.push({ formula });
    });
    const traderMarginRow = sheet.addRow(traderMarginRowData);
    for (let i = 2; i <= numMonths + 1; i++) traderMarginRow.getCell(i).numFmt = '"₹"#,##,##0';
    const traderMarginRowNumber = traderMarginRow.number;

    if (!isActualTrader) {
      const platformFeeRate = entry.probusPlatformFee !== null && entry.probusPlatformFee !== undefined ? Number(entry.probusPlatformFee) : 0.02;
      const platformFeeRowData: any[] = [`Platform Fee (Rs ${platformFeeRate}/kWh)`];
      allResults.forEach((r, idx) => {
        const mMapping = monthRowMap[r.monthStr];
        const formula = `'${mMapping.sheetName}'!B${mMapping.platformFeeRow}`;
        platformFeeRowData.push({ formula });
      });
      const platformFeeRow = sheet.addRow(platformFeeRowData);
      for (let i = 2; i <= numMonths + 1; i++) platformFeeRow.getCell(i).numFmt = '"₹"#,##,##0';
      const platformFeeRowNumber = platformFeeRow.number;

      const valueShareRowData: any[] = ['Value-Share for Energy Platform (15% of Saving)'];
      allResults.forEach((r, idx) => {
        const mMapping = monthRowMap[r.monthStr];
        const formula = `'${mMapping.sheetName}'!B${mMapping.valueShareRow}`;
        valueShareRowData.push({ formula });
      });
      const valueShareRow = sheet.addRow(valueShareRowData);
      for (let i = 2; i <= numMonths + 1; i++) valueShareRow.getCell(i).numFmt = '"₹"#,##,##0';
      const valueShareRowNumber = valueShareRow.number;

      const totalAmountRowData: any[] = ['Total Margin Amount'];
      allResults.forEach((r, idx) => {
        const colChar = getColLetter(idx + 2);
        const formula = `${colChar}${traderMarginRowNumber}+${colChar}${platformFeeRowNumber}+${colChar}${valueShareRowNumber}`;
        totalAmountRowData.push({ formula });
      });
      const totalAmountRow = sheet.addRow(totalAmountRowData);
      totalAmountRow.font = { bold: true };
      for (let i = 2; i <= numMonths + 1; i++) totalAmountRow.getCell(i).numFmt = '"₹"#,##,##0';
      totalAmountRow.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C6E7' } });
      const totalAmountRowNumber = totalAmountRow.number;

      const probusRevUnitRowData: any[] = ['Probus Revenue /Unit'];
      allResults.forEach((r, idx) => {
        const colChar = getColLetter(idx + 2);
        const formula = `${colChar}${totalAmountRowNumber}/${colChar}${totalConsumptionRowNumber}`;
        probusRevUnitRowData.push({ formula });
      });
      const probusRevUnitRow = sheet.addRow(probusRevUnitRowData);
      for (let i = 2; i <= numMonths + 1; i++) probusRevUnitRow.getCell(i).numFmt = '"₹"0.00';
    }

    sheet.addRow([]);

    const savingForBizRowData: any[] = ['Saving for your business'];
    allResults.forEach((r, idx) => {
      const mMapping = monthRowMap[r.monthStr];
      const formula = `'${mMapping.sheetName}'!B${mMapping.finalSavingsRow}`;
      savingForBizRowData.push({ formula });
    });
    const savingForBizRow = sheet.addRow(savingForBizRowData);
    savingForBizRow.font = { bold: true };
    for (let i = 2; i <= numMonths + 1; i++) savingForBizRow.getCell(i).numFmt = '"₹"#,##,##0';
    savingForBizRow.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } });
    const savingForBizRowNumber = savingForBizRow.number;

    const savingForBizUnitRowData: any[] = ['Saving/Unit'];
    allResults.forEach((r, idx) => {
      const colChar = getColLetter(idx + 2);
      const formula = `${colChar}${savingForBizRowNumber}/${colChar}${totalConsumptionRowNumber}`;
      savingForBizUnitRowData.push({ formula });
    });
    const savingForBizUnitRow = sheet.addRow(savingForBizUnitRowData);
    savingForBizUnitRow.font = { bold: true };
    savingForBizUnitRow.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } });
    for (let i = 2; i <= numMonths + 1; i++) savingForBizUnitRow.getCell(i).numFmt = '"₹"0.00';

    sheet.addRow([]);

    const lastColChar = getColLetter(numMonths + 1);
    const avgMonthlySavingFormula = `AVERAGE(B${savingForBizRowNumber}:${lastColChar}${savingForBizRowNumber})`;
    const avgMonthlySavingRow = sheet.addRow(['Average Monthly Saving', { formula: avgMonthlySavingFormula }]);
    avgMonthlySavingRow.font = { bold: true };
    avgMonthlySavingRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
    avgMonthlySavingRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
    for (let i = 2; i <= numMonths + 1; i++) avgMonthlySavingRow.getCell(i).numFmt = '"₹"#,##,##0';
    const avgMonthlySavingRowNumber = avgMonthlySavingRow.number;

    const avgAnnualSavingFormula = `B${avgMonthlySavingRowNumber}*12`;
    const avgAnnualSavingRow = sheet.addRow(['Average Annual Saving', { formula: avgAnnualSavingFormula }]);
    avgAnnualSavingRow.font = { bold: true };
    avgAnnualSavingRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
    avgAnnualSavingRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
    for (let i = 2; i <= numMonths + 1; i++) avgAnnualSavingRow.getCell(i).numFmt = '"₹"#,##,##0';
    const avgAnnualSavingRowNumber = avgAnnualSavingRow.number;

    const fiveYearsSavingFormula = `B${avgAnnualSavingRowNumber} + B${avgAnnualSavingRowNumber}*1.1 + B${avgAnnualSavingRowNumber}*POWER(1.1,2) + B${avgAnnualSavingRowNumber}*POWER(1.1,3) + B${avgAnnualSavingRowNumber}*POWER(1.1,4)`;
    const fiveYearsSavingRow = sheet.addRow(['5 Years Saving', { formula: fiveYearsSavingFormula }]);
    fiveYearsSavingRow.font = { bold: true };
    fiveYearsSavingRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
    fiveYearsSavingRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
    for (let i = 2; i <= numMonths + 1; i++) fiveYearsSavingRow.getCell(i).numFmt = '"₹"#,##,##0';

    // Set column width for A
    sheet.getColumn(1).width = 50;

    // Add borders to all populated cells
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        if (cell.value !== null && cell.value !== '') {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        }
      });
    });
  }

  static async exportDemandShiftToExcel(id: string, monthStr?: string, version?: number): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    
    if (monthStr === 'all') {
      const entry = await TraderPerformanceService.getEntryOrVersion(id, version);
      const months = Object.keys(entry?.todConsumptions || {}).filter(k => /^\d{4}-\d{2}$/.test(k)).sort();
      const allResults = [];
      
      for (const m of months) {
        const result = await TraderPerformanceService.calculateMarketDecision(id, m, version, true);
        allResults.push({ monthStr: m, result });
      }
      
      if (allResults.length > 0) {
        const summarySheet = workbook.addWorksheet('Summary');
        const monthRowMap: Record<string, any> = {};
        
        for (const r of allResults) {
          let sheetName = getShortSheetName(r.monthStr, 'Demand Shift');
          let idx = 2;
          while (workbook.getWorksheet(sheetName)) {
            sheetName = `${getShortSheetName(r.monthStr, 'Demand Shift')} ${idx}`;
            idx++;
          }
          const rowMapping = await TraderPerformanceExportService.addSavingsSheet(workbook, sheetName, r.result, entry, r.monthStr);
          monthRowMap[r.monthStr] = { sheetName, ...rowMapping };
        }
        
        await TraderPerformanceExportService.populateSummarySheet(summarySheet, entry, allResults, monthRowMap);
      }
    } else {
      const entry = await TraderPerformanceService.getEntryOrVersion(id, version);
      const result = await TraderPerformanceService.calculateMarketDecision(id, monthStr, version, true);
      const sheetName = getShortSheetName(monthStr, 'Demand Shift');
      await TraderPerformanceExportService.addSavingsSheet(workbook, sheetName, result, entry, monthStr);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
