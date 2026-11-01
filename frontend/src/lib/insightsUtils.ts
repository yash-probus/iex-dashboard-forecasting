// Insights Engine - Determines which insights to show based on upload type

export type UploadType = 'discom_and_oa' | 'discom_only' | 'tod_only';

export interface CostBreakdownItem {
  name: string;
  value: number;
  color: string;
  tooltip: string;
}

export interface HeatmapCell {
  hour: number;
  day: number;
  price: number;
  consumption: number;
  isHighConsumption: boolean;
}

export interface SankeyNode {
  name: string;
  value: number;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface AssumedData {
  totalBill: number;
  actualBill: number;
  possibleBill: number;
  oaPercent: number;
  discomPercent: number;
  recommendedOaPercent: number;
  sanctionedLoad: number;
  estimatedMaxDemand: number;
  fixedChargePerUnit: number;
  tod1: number;
  tod2: number;
  tod3: number;
  tod4: number;
  currentRate: number;
  isEstimated: boolean;
  estimationReason: string;
}

// Determine upload type from wizard data
export function detectUploadType(
  hasDiscomBills: boolean,
  hasOaBills: boolean,
  hasTodData: boolean
): UploadType {
  if (hasDiscomBills && hasOaBills) return 'discom_and_oa';
  if (hasDiscomBills) return 'discom_only';
  return 'tod_only';
}

// Generate assumed data when inputs are missing
export function generateAssumedData(params: {
  sanctionedLoad?: number;
  workingHours?: number;
  category?: string;
  voltageLevel?: string;
  hasTodData?: boolean;
  hasDiscomBill?: boolean;
  hasOaBill?: boolean;
  tod1?: number;
  tod2?: number;
  tod3?: number;
  tod4?: number;
  billAmount?: number;
}): AssumedData {
  const {
    sanctionedLoad = 1, // 1 MW default
    workingHours = 8, // 8 hours/day default
    category = 'industrial_general',
    voltageLevel = '11',
    hasTodData = false,
    hasDiscomBill = false,
    hasOaBill = false,
    tod1 = 0,
    tod2 = 0,
    tod3 = 0,
    tod4 = 0,
    billAmount = 0,
  } = params;

  // Determine estimation reason
  let estimationReason = '';
  if (!hasDiscomBill && !hasOaBill && !hasTodData) {
    estimationReason = 'Using sample data to demonstrate Prolt capabilities. Upload bills or enter ToD values for accurate insights.';
  } else if (!hasOaBill && hasDiscomBill) {
    estimationReason = 'OA charges estimated using standard regional benchmarks and historical IEX patterns.';
  } else if (!hasDiscomBill && hasTodData) {
    estimationReason = 'DISCOM charges estimated using UP tariff schedule based on entered ToD distribution.';
  } else if (hasTodData && !hasDiscomBill && !hasOaBill) {
    estimationReason = 'Bill amounts estimated using entered ToD distribution and UP tariff benchmarks.';
  }

  // Calculate consumption
  const load = sanctionedLoad || 1;
  const hours = workingHours || 8;
  const monthlyConsumption = load * hours * 30 * 1000; // Monthly kWh

  // Use provided ToD or generate synthetic
  const finalTod1 = tod1 > 0 ? tod1 : monthlyConsumption * 0.35; // Morning peak
  const finalTod2 = tod2 > 0 ? tod2 : monthlyConsumption * 0.25; // Evening peak
  const finalTod3 = tod3 > 0 ? tod3 : monthlyConsumption * 0.25; // Off-peak
  const finalTod4 = tod4 > 0 ? tod4 : monthlyConsumption * 0.15; // Night

  const totalConsumption = finalTod1 + finalTod2 + finalTod3 + finalTod4;

  // Calculate rates based on category (no OA cap - maximize OA when cheaper)
  const categoryRates: Record<string, { base: number }> = {
    industrial_general: { base: 6.5 },
    commercial: { base: 7.2 },
    energy_intensive: { base: 5.8 },
  };
  const rates = categoryRates[category] || categoryRates.industrial_general;

  // Calculate bills
  const estimatedDiscomBill = billAmount > 0 ? billAmount : totalConsumption * rates.base;
  const estimatedOaBill = totalConsumption * 4.5; // Avg IEX price
  const optimizedBill = estimatedDiscomBill * 0.85; // 15% savings estimate

  const isEstimated = !hasDiscomBill || !hasOaBill || !hasTodData;

  // Calculate optimal OA percent based on price comparison (maximize when cheaper)
  const optimalOaPercent = 75; // Typical optimal when OA is cheaper in most slots

  return {
    totalBill: estimatedDiscomBill,
    actualBill: estimatedDiscomBill,
    possibleBill: optimizedBill,
    oaPercent: hasOaBill ? 45 : optimalOaPercent * 0.7,
    discomPercent: hasOaBill ? 55 : 100 - optimalOaPercent * 0.7,
    recommendedOaPercent: optimalOaPercent,
    sanctionedLoad: load,
    estimatedMaxDemand: load * 0.75,
    fixedChargePerUnit: 350,
    tod1: finalTod1,
    tod2: finalTod2,
    tod3: finalTod3,
    tod4: finalTod4,
    currentRate: rates.base,
    isEstimated,
    estimationReason,
  };
}

// Generate cost structure breakdown data for DISCOM + OA bills
export function generateCostBreakdown(totalBill: number, discomOnly: boolean = false): CostBreakdownItem[] {
  if (discomOnly) {
    // DISCOM-only breakdown (no OA charges)
    return [
      { 
        name: 'Energy Charges', 
        value: totalBill * 0.58, 
        color: 'hsl(175 55% 40%)',
        tooltip: 'The base cost of electricity consumed, calculated per unit (kWh) at your tariff rate.'
      },
      { 
        name: 'Fixed Charges', 
        value: totalBill * 0.14, 
        color: 'hsl(175 55% 50%)',
        tooltip: 'Monthly charges based on your sanctioned load, paid regardless of consumption.'
      },
      { 
        name: 'Wheeling + STU', 
        value: totalBill * 0.09, 
        color: 'hsl(175 55% 60%)',
        tooltip: 'Transmission charges for moving power through the state grid infrastructure.'
      },
      { 
        name: 'SLDC + Scheduling', 
        value: totalBill * 0.06, 
        color: 'hsl(217 55% 50%)',
        tooltip: 'State Load Dispatch Center charges for coordinating power flow and scheduling.'
      },
      { 
        name: 'Cross-Subsidy', 
        value: totalBill * 0.09, 
        color: 'hsl(217 55% 60%)',
        tooltip: 'Surcharge paid by industrial/commercial consumers to subsidize agricultural/domestic users.'
      },
      { 
        name: 'PPAC', 
        value: totalBill * 0.04, 
        color: 'hsl(217 55% 70%)',
        tooltip: 'Power Purchase Adjustment Cost - adjustments for fuel price variations.'
      },
    ];
  }
  
  // DISCOM + OA breakdown
  return [
    { 
      name: 'Energy Charges', 
      value: totalBill * 0.55, 
      color: 'hsl(175 55% 40%)',
      tooltip: 'The base cost of electricity consumed, calculated per unit (kWh) at your tariff rate.'
    },
    { 
      name: 'Fixed Charges', 
      value: totalBill * 0.12, 
      color: 'hsl(175 55% 50%)',
      tooltip: 'Monthly charges based on your sanctioned load, paid regardless of consumption.'
    },
    { 
      name: 'Wheeling + STU', 
      value: totalBill * 0.08, 
      color: 'hsl(175 55% 60%)',
      tooltip: 'Transmission charges for moving power through the state grid infrastructure.'
    },
    { 
      name: 'SLDC + Scheduling', 
      value: totalBill * 0.05, 
      color: 'hsl(217 55% 50%)',
      tooltip: 'State Load Dispatch Center charges for coordinating power flow and scheduling.'
    },
    { 
      name: 'Cross-Subsidy', 
      value: totalBill * 0.10, 
      color: 'hsl(217 55% 60%)',
      tooltip: 'Surcharge paid by industrial/commercial consumers to subsidize agricultural/domestic users.'
    },
    { 
      name: 'PPAC', 
      value: totalBill * 0.04, 
      color: 'hsl(217 55% 70%)',
      tooltip: 'Power Purchase Adjustment Cost - adjustments for fuel price variations.'
    },
    { 
      name: 'OA Charges', 
      value: totalBill * 0.06, 
      color: 'hsl(142 55% 50%)',
      tooltip: 'Open Access related charges including IEX trading fees and transmission.'
    },
  ];
}

// Generate heatmap data for slot-level visualization
export function generateHeatmapData(month: number, avgConsumption: number): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  const daysInMonth = new Date(2024, month, 0).getDate();
  
  for (let day = 1; day <= Math.min(daysInMonth, 7); day++) {
    for (let hour = 0; hour < 24; hour++) {
      // Price varies by hour
      let price = 3.5;
      if (hour >= 6 && hour < 10) price = 4.5;
      if (hour >= 17 && hour < 22) price = 6.0;
      if (hour >= 22 || hour < 6) price = 2.8;
      
      // Add some randomness
      price *= (0.9 + Math.random() * 0.2);
      
      // Consumption pattern
      let consumption = avgConsumption / 24;
      if (hour >= 9 && hour < 17) consumption *= 1.5;
      if (hour >= 22 || hour < 6) consumption *= 0.3;
      
      const isHighConsumption = consumption > (avgConsumption / 24) * 1.3;
      
      cells.push({ hour, day, price, consumption, isHighConsumption });
    }
  }
  
  return cells;
}

// Calculate shiftability index based on ToD distribution
export function calculateShiftabilityIndex(
  tod1: number,
  tod2: number,
  tod3: number,
  tod4: number
): number {
  const total = tod1 + tod2 + tod3 + tod4;
  if (total === 0) return 50;
  
  // Higher score if more consumption is in off-peak (tod3) vs peak (tod2, tod4)
  const peakShare = (tod2 + tod4) / total;
  const offPeakShare = tod3 / total;
  
  // Score 0-100: higher means more shiftable
  const score = Math.round((offPeakShare * 0.3 + (1 - peakShare) * 0.7) * 100);
  return Math.min(100, Math.max(0, score));
}

// Calculate load utilization percentage
export function calculateLoadUtilization(
  actualMaxDemand: number,
  sanctionedLoad: number
): { utilization: number; status: 'under' | 'optimal' | 'over' } {
  if (sanctionedLoad === 0) return { utilization: 0, status: 'under' };
  
  const utilization = (actualMaxDemand / sanctionedLoad) * 100;
  
  let status: 'under' | 'optimal' | 'over' = 'optimal';
  if (utilization < 60) status = 'under';
  if (utilization > 90) status = 'over';
  
  return { utilization: Math.round(utilization), status };
}

// Generate Sankey diagram data for OA settlement
export function generateSankeyData(totalBill: number): { nodes: SankeyNode[]; links: SankeyLink[] } {
  return {
    nodes: [
      { name: 'DISCOM Bill', value: totalBill * 0.6 },
      { name: 'OA Energy', value: totalBill * 0.25 },
      { name: 'Transmission', value: totalBill * 0.15 },
      { name: 'Consumer Bill', value: totalBill },
    ],
    links: [
      { source: 'DISCOM Bill', target: 'Consumer Bill', value: totalBill * 0.6 },
      { source: 'OA Energy', target: 'Consumer Bill', value: totalBill * 0.25 },
      { source: 'Transmission', target: 'Consumer Bill', value: totalBill * 0.15 },
    ],
  };
}
