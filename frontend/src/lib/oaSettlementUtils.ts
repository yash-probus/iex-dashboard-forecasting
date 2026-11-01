// OA Settlement Utilities - Types and Functions for OA Bill Processing

export interface OASlotData {
  deliveryDate: string;
  periodStart: string;
  periodEnd: string;
  qtyMw: number;
  rateMwh: number;
  amount: number;
}

export interface ParsedOABillData {
  slots: OASlotData[];
  totalMwh: number;
  totalSpend: number;
  totalUnits: number; // kWh
}

export interface OAChargeBreakdown {
  energyCharges: number;
  ctuCharges: number;
  stuCharges: number;
  sldcCharges: number;
  wheelingCharges: number;
  schedulingFees: number;
  taxes: number;
  total: number;
}

export interface OASettlementData {
  month: string;
  chargeBreakdown: OAChargeBreakdown;
  totalMwh: number;
  totalUnits: number;
  avgRateMwh: number;
  avgRateKwh: number;
}

export interface OAAnomaly {
  type: 'missing_slot' | 'negative_amount' | 'zero_qty' | 'rate_spike';
  message: string;
  date?: string;
  slot?: string;
}

// Parse OA CSV content
export function parseOACSVContent(content: string): ParsedOABillData | null {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  
  if (lines.length < 2) return null;
  
  const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/['"]/g, ''));
  
  // Check if this is an OA format file
  const hasOAHeaders = headers.some(h => 
    h.includes('delivery_date') || h.includes('period_start') || 
    h.includes('qty_mw') || h.includes('rate_mwh')
  );
  
  if (!hasOAHeaders) return null;
  
  // Find column indices
  const dateIdx = headers.findIndex(h => h.includes('delivery_date') || h.includes('date'));
  const startIdx = headers.findIndex(h => h.includes('period_start') || h.includes('start'));
  const endIdx = headers.findIndex(h => h.includes('period_end') || h.includes('end'));
  const qtyIdx = headers.findIndex(h => h.includes('qty_mw') || h.includes('qty') || h.includes('mw'));
  const rateIdx = headers.findIndex(h => h.includes('rate_mwh') || h.includes('rate'));
  const amountIdx = headers.findIndex(h => h.includes('amount') || h.includes('total'));
  
  if (dateIdx === -1 || qtyIdx === -1) return null;
  
  const slots: OASlotData[] = [];
  let totalMwh = 0;
  let totalSpend = 0;
  
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim().replace(/['"]/g, ''));
    
    const qtyMw = parseFloat(parts[qtyIdx]) || 0;
    const rateMwh = rateIdx !== -1 ? parseFloat(parts[rateIdx]) || 0 : 0;
    const amount = amountIdx !== -1 ? parseFloat(parts[amountIdx]) || (qtyMw * rateMwh / 4) : (qtyMw * rateMwh / 4);
    
    const slot: OASlotData = {
      deliveryDate: parts[dateIdx] || '',
      periodStart: startIdx !== -1 ? parts[startIdx] : '',
      periodEnd: endIdx !== -1 ? parts[endIdx] : '',
      qtyMw,
      rateMwh,
      amount,
    };
    
    slots.push(slot);
    
    // Each 15-min slot: MWh = MW * 0.25 hours
    totalMwh += qtyMw * 0.25;
    totalSpend += amount;
  }
  
  return {
    slots,
    totalMwh,
    totalSpend,
    totalUnits: totalMwh * 1000, // Convert MWh to kWh
  };
}

// Generate actual OA settlement from parsed slots
export function generateActualOASettlement(
  parsedData: ParsedOABillData,
  monthISO: string
): OASettlementData {
  // Calculate energy charges (base cost from slots)
  const energyCharges = parsedData.totalSpend;
  
  // Estimate regulatory charges based on UP OA regulations
  const totalUnits = parsedData.totalUnits;
  const ctuCharges = totalUnits * 0.15;      // CTU @ ₹0.15/kWh
  const stuCharges = totalUnits * 0.12;      // STU @ ₹0.12/kWh
  const sldcCharges = totalUnits * 0.02;     // SLDC @ ₹0.02/kWh
  const wheelingCharges = totalUnits * 0.25; // Wheeling @ ₹0.25/kWh
  const schedulingFees = totalUnits * 0.03;  // Scheduling @ ₹0.03/kWh
  const taxes = (energyCharges + ctuCharges + stuCharges + sldcCharges + wheelingCharges) * 0.05; // 5% tax
  
  const total = energyCharges + ctuCharges + stuCharges + sldcCharges + wheelingCharges + schedulingFees + taxes;
  
  const avgRateMwh = parsedData.totalMwh > 0 ? parsedData.totalSpend / parsedData.totalMwh : 0;
  const avgRateKwh = avgRateMwh / 1000;
  
  return {
    month: monthISO,
    chargeBreakdown: {
      energyCharges,
      ctuCharges,
      stuCharges,
      sldcCharges,
      wheelingCharges,
      schedulingFees,
      taxes,
      total,
    },
    totalMwh: parsedData.totalMwh,
    totalUnits: parsedData.totalUnits,
    avgRateMwh,
    avgRateKwh,
  };
}

// Generate Prolt proposed OA settlement (optimized)
export function generateProposedOASettlement(
  parsedData: ParsedOABillData,
  monthISO: string,
  category: string
): OASettlementData {
  // Apply Prolt optimization rules
  // 1. Shift consumption to lower price periods (15% improvement assumption)
  const optimizedSpend = parsedData.totalSpend * 0.85;
  
  // 2. Use optimized regulatory charge assumptions
  const totalUnits = parsedData.totalUnits;
  const ctuCharges = totalUnits * 0.14;      // Optimized CTU
  const stuCharges = totalUnits * 0.11;      // Optimized STU
  const sldcCharges = totalUnits * 0.02;     // SLDC (fixed)
  const wheelingCharges = totalUnits * 0.22; // Optimized wheeling
  const schedulingFees = totalUnits * 0.025; // Optimized scheduling
  const taxes = (optimizedSpend + ctuCharges + stuCharges + sldcCharges + wheelingCharges) * 0.05;
  
  const total = optimizedSpend + ctuCharges + stuCharges + sldcCharges + wheelingCharges + schedulingFees + taxes;
  
  const avgRateMwh = parsedData.totalMwh > 0 ? optimizedSpend / parsedData.totalMwh : 0;
  const avgRateKwh = avgRateMwh / 1000;
  
  return {
    month: monthISO,
    chargeBreakdown: {
      energyCharges: optimizedSpend,
      ctuCharges,
      stuCharges,
      sldcCharges,
      wheelingCharges,
      schedulingFees,
      taxes,
      total,
    },
    totalMwh: parsedData.totalMwh,
    totalUnits: parsedData.totalUnits,
    avgRateMwh,
    avgRateKwh,
  };
}

// Detect anomalies in OA data
export function detectOAAnomalies(parsedData: ParsedOABillData): OAAnomaly[] {
  const anomalies: OAAnomaly[] = [];
  
  // Check for negative amounts
  parsedData.slots.forEach((slot, idx) => {
    if (slot.amount < 0) {
      anomalies.push({
        type: 'negative_amount',
        message: `Negative settlement amount (₹${slot.amount.toFixed(2)}) detected`,
        date: slot.deliveryDate,
        slot: `${slot.periodStart}-${slot.periodEnd}`,
      });
    }
    
    if (slot.qtyMw === 0 && slot.amount !== 0) {
      anomalies.push({
        type: 'zero_qty',
        message: `Zero quantity with non-zero amount detected`,
        date: slot.deliveryDate,
        slot: `${slot.periodStart}-${slot.periodEnd}`,
      });
    }
    
    // Check for rate spikes (>2x average)
    if (parsedData.slots.length > 0) {
      const avgRate = parsedData.totalSpend / parsedData.slots.length / (parsedData.totalMwh / parsedData.slots.length * 4);
      if (slot.rateMwh > avgRate * 2) {
        anomalies.push({
          type: 'rate_spike',
          message: `Unusually high rate (₹${slot.rateMwh}/MWh) - ${((slot.rateMwh / avgRate - 1) * 100).toFixed(0)}% above average`,
          date: slot.deliveryDate,
          slot: `${slot.periodStart}-${slot.periodEnd}`,
        });
      }
    }
  });
  
  // Check for missing slots (expected 96 per day)
  const slotsByDate = new Map<string, number>();
  parsedData.slots.forEach(slot => {
    const count = slotsByDate.get(slot.deliveryDate) || 0;
    slotsByDate.set(slot.deliveryDate, count + 1);
  });
  
  slotsByDate.forEach((count, date) => {
    if (count < 96 && count > 0) {
      anomalies.push({
        type: 'missing_slot',
        message: `Only ${count}/96 slots found for this day`,
        date,
      });
    }
  });
  
  return anomalies;
}

// Export settlement to CSV
export function exportSettlementCSV(settlement: OASettlementData, type: 'actual' | 'proposed'): string {
  const title = type === 'actual' ? 'Actual OA Settlement' : 'Prolt Proposed OA Settlement';
  const breakdown = settlement.chargeBreakdown;
  
  const rows = [
    `${title}`,
    `Month,${settlement.month}`,
    '',
    'Charge Component,Amount (₹)',
    `Energy Charges,${breakdown.energyCharges.toFixed(2)}`,
    `CTU Charges,${breakdown.ctuCharges.toFixed(2)}`,
    `STU Charges,${breakdown.stuCharges.toFixed(2)}`,
    `SLDC Charges,${breakdown.sldcCharges.toFixed(2)}`,
    `Wheeling Charges,${breakdown.wheelingCharges.toFixed(2)}`,
    `Scheduling Fees,${breakdown.schedulingFees.toFixed(2)}`,
    `Taxes,${breakdown.taxes.toFixed(2)}`,
    '',
    `Total Settlement,${breakdown.total.toFixed(2)}`,
    '',
    'Summary',
    `Total MWh,${settlement.totalMwh.toFixed(2)}`,
    `Total kWh,${settlement.totalUnits.toFixed(0)}`,
    `Avg Rate (₹/MWh),${settlement.avgRateMwh.toFixed(2)}`,
    `Avg Rate (₹/kWh),${settlement.avgRateKwh.toFixed(4)}`,
  ];
  
  return rows.join('\n');
}

// Download helper
export function downloadSettlement(settlement: OASettlementData, type: 'actual' | 'proposed', format: 'csv' | 'txt' = 'csv'): void {
  const content = exportSettlementCSV(settlement, type);
  const filename = `${type}_oa_settlement_${settlement.month}.${format}`;
  
  const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Generate reconciliation between actual and proposed
export function generateReconciliation(
  actual: OASettlementData,
  proposed: OASettlementData
): { savings: number; savingsPercent: number; breakdown: { component: string; actual: number; proposed: number; diff: number }[] } {
  const breakdown = [
    { component: 'Energy Charges', actual: actual.chargeBreakdown.energyCharges, proposed: proposed.chargeBreakdown.energyCharges, diff: actual.chargeBreakdown.energyCharges - proposed.chargeBreakdown.energyCharges },
    { component: 'CTU Charges', actual: actual.chargeBreakdown.ctuCharges, proposed: proposed.chargeBreakdown.ctuCharges, diff: actual.chargeBreakdown.ctuCharges - proposed.chargeBreakdown.ctuCharges },
    { component: 'STU Charges', actual: actual.chargeBreakdown.stuCharges, proposed: proposed.chargeBreakdown.stuCharges, diff: actual.chargeBreakdown.stuCharges - proposed.chargeBreakdown.stuCharges },
    { component: 'SLDC Charges', actual: actual.chargeBreakdown.sldcCharges, proposed: proposed.chargeBreakdown.sldcCharges, diff: actual.chargeBreakdown.sldcCharges - proposed.chargeBreakdown.sldcCharges },
    { component: 'Wheeling Charges', actual: actual.chargeBreakdown.wheelingCharges, proposed: proposed.chargeBreakdown.wheelingCharges, diff: actual.chargeBreakdown.wheelingCharges - proposed.chargeBreakdown.wheelingCharges },
    { component: 'Scheduling Fees', actual: actual.chargeBreakdown.schedulingFees, proposed: proposed.chargeBreakdown.schedulingFees, diff: actual.chargeBreakdown.schedulingFees - proposed.chargeBreakdown.schedulingFees },
    { component: 'Taxes', actual: actual.chargeBreakdown.taxes, proposed: proposed.chargeBreakdown.taxes, diff: actual.chargeBreakdown.taxes - proposed.chargeBreakdown.taxes },
  ];
  
  const savings = actual.chargeBreakdown.total - proposed.chargeBreakdown.total;
  const savingsPercent = actual.chargeBreakdown.total > 0 ? (savings / actual.chargeBreakdown.total) * 100 : 0;
  
  return { savings, savingsPercent, breakdown };
}
