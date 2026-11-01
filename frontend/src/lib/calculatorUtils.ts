// @ts-nocheck

// Types
export interface MonthEntry {
  id: string;
  monthISO: string;
  expanded: boolean;
  billAmount: string;
  tod1?: string;
  tod2?: string;
  tod3?: string;
  tod4?: string;
  // Optional OA data when OA bill is uploaded
  oaUnits?: number;
  oaSpend?: number;
  oaBillAmount?: string;
  peakDemand?: number | string;
  peakDemandUnit?: string;
  [key: string]: any; // Allow dynamic tod keys like tod1Discom, tod1Oa, etc.
}

export interface SlotData {
  month: string;
  date: string;
  hour: number;
  block: number;
  interval: string;
  slot_kwh: number;
  actual_source: string;
  actual_cost: number;
  pred_price_kwh: number;
  rec_source: string;
  rec_cost: number;
  discom_rate: number;
  slot_saving: number;
}

export interface MonthSummary {
  monthISO?: string;
  monthLabel?: string;
  actualCost?: number;
  recCost?: number;
  savings?: number;
  savingsPercent?: number;
  oaShare?: number;
  totalUnits?: number;
  // Units breakdown for consumption mix chart
  actualOaUnits?: number; // Actual units from OA (0 if no OA bill)
  actualDiscomUnits?: number; // Actual units from DISCOM
  recommendedOaUnits?: number; // Recommended units from OA
  recommendedDiscomUnits?: number; // Recommended units from DISCOM
  monthName?: string;
}

export interface CalculationResult {
  totalActualCost: number;
  totalRecCost: number;
  totalSavings: number;
  adjustedSavings?: number;
  savingsPercent?: number;
  totalUnits?: number;
  oaSharePercent?: number; // Recommended OA share (capped by category)
  discomSharePercent?: number; // Recommended DISCOM share
  actualOaSharePercent?: number; // Actual OA share (0 if no OA bills uploaded)
  actualDiscomSharePercent?: number; // Actual DISCOM share
  monthlySummaries?: MonthSummary[];
  slotData?: SlotData[];
  iexRowsCount?: number;
  hasOaBills?: boolean; // Whether OA bills were uploaded
}

export interface TariffConfig {
  baseEnergy: number;
  demandRate: number;
  todMultipliers: {
    tod1: { summer: number; winter: number };
    tod2: { summer: number; winter: number };
    tod3: { summer: number; winter: number };
    tod4: { summer: number; winter: number };
  };
}

// Get max OA share by consumer category
// No limitation - customers can purchase up to 100% from OA when it's cheaper
export function getMaxOAShare(category: string): number {
  // All categories can now purchase up to 100% from OA to maximize savings
  return 100;
}

// UP Tariff Configuration
export function getUPTariffConfig(
  category: string,
  voltageLevel: string,
): TariffConfig {
  // Base energy rates by category (₹/kWh)
  const baseRates: Record<string, number> = {
    industrial_general: 6.5,
    commercial: 7.2,
    energy_intensive: 5.8,
  };

  // Demand rates by voltage level (₹/kVA)
  const demandRates: Record<string, number> = {
    "11": 350,
    "22": 320,
    "33": 300,
    "66": 280,
    "110": 260,
    "132": 250,
    "220": 240,
  };

  // ToD multipliers for UP
  const todMultipliers = {
    tod1: { summer: 1.0, winter: 1.0 }, // Normal (06:00-17:00 summer, 06:00-17:00 winter)
    tod2: { summer: 1.2, winter: 1.0 }, // Peak (17:00-23:00 summer, 17:00-23:00 winter)
    tod3: { summer: 0.9, winter: 1.15 }, // Night (23:00-06:00)
    tod4: { summer: 1.1, winter: 1.2 }, // Super peak (specific hours)
  };

  return {
    baseEnergy: baseRates[category] || 6.5,
    demandRate: demandRates[voltageLevel] || 350,
    todMultipliers,
  };
}

// Get ToD period for a given hour
export function getToDPeriod(
  hour: number,
  month: number,
): "tod1" | "tod2" | "tod3" | "tod4" {
  // Summer: April to September (months 4-9)
  // Winter: October to March (months 10-12, 1-3)
  const isSummer = month >= 4 && month <= 9;

  if (isSummer) {
    if (hour >= 6 && hour < 17) return "tod1"; // Normal
    if (hour >= 17 && hour < 23) return "tod2"; // Peak
    return "tod3"; // Night (23:00-06:00)
  } else {
    if (hour >= 6 && hour < 17) return "tod1"; // Normal
    if ((hour >= 17 && hour < 19) || (hour >= 21 && hour < 23)) return "tod2"; // Peak
    if (hour >= 19 && hour < 21) return "tod4"; // Super Peak
    return "tod3"; // Night
  }
}

// Get ToD multiplier
export function getToDMultiplier(
  hour: number,
  month: number,
  config: TariffConfig,
): number {
  const isSummer = month >= 4 && month <= 9;
  const season = isSummer ? "summer" : "winter";
  const todPeriod = getToDPeriod(hour, month);
  return config.todMultipliers[todPeriod][season];
}

// Generate mock IEX price (simulating prediction)
export function predictIEXPrice(hour: number, month: number): number {
  // Base price varies by time of day
  let basePrice = 3.5; // ₹/kWh

  // Morning peak (6-10)
  if (hour >= 6 && hour < 10) basePrice = 4.2;
  // Afternoon (10-17)
  else if (hour >= 10 && hour < 17) basePrice = 3.8;
  // Evening peak (17-22)
  else if (hour >= 17 && hour < 22) basePrice = 5.5;
  // Night (22-6)
  else basePrice = 2.8;

  // Seasonal adjustment
  const isSummer = month >= 4 && month <= 9;
  if (isSummer) basePrice *= 1.15;

  // Add some randomness (±15%)
  const randomFactor = 0.85 + Math.random() * 0.3;
  return Math.round(basePrice * randomFactor * 100) / 100;
}

// Get days in month
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// Parse month ISO string to year and month
export function parseMonthISO(monthISO: string): {
  year: number;
  month: number;
} {
  const [year, month] = monthISO.split("-").map(Number);
  return { year, month };
}

// Format month for display
export function formatMonthLabel(monthISO: string): string {
  const { year, month } = parseMonthISO(monthISO);
  const date = new Date(year, month - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// Main calculation function
export function computeSavings(
  entries: MonthEntry[],
  category: string,
  voltageLevel: string,
  sanctionedLoad: number,
): CalculationResult {
  const config = getUPTariffConfig(category, voltageLevel);
  const allSlotData: SlotData[] = [];
  const monthlySummaries: MonthSummary[] = [];

  let totalActualCost = 0;
  let totalRecCost = 0;
  let totalUnits = 0;
  let totalOaUnits = 0;
  let hasAnyOaBills = false;

  for (const entry of entries) {
    if (!entry.monthISO) continue;

    const { year, month } = parseMonthISO(entry.monthISO);
    const daysInMonth = getDaysInMonth(year, month);
    const isSummer = month >= 4 && month <= 9;
    const season = isSummer ? "summer" : "winter";

    // Parse ToD consumption values
    const tod1 = parseFloat(entry.tod1) || 0;
    const tod2 = parseFloat(entry.tod2) || 0;
    const tod3 = parseFloat(entry.tod3) || 0;
    const tod4 = parseFloat(entry.tod4) || 0;
    const totalMonthlyUnits = tod1 + tod2 + tod3 + tod4;

    if (totalMonthlyUnits === 0) continue;

    // Actual bill amount for calibration
    const actualBill = parseFloat(entry.billAmount) || 0;

    // Calculate ToD hours per day
    const tod1Hours = 11; // 06:00-17:00
    const tod2Hours = 6; // 17:00-23:00
    const tod3Hours = 7; // 23:00-06:00
    const tod4Hours = isSummer ? 0 : 2; // Super peak in winter only

    // Slots per ToD period per day
    const tod1SlotsPerDay = tod1Hours * 4;
    const tod2SlotsPerDay = tod2Hours * 4;
    const tod3SlotsPerDay = tod3Hours * 4;
    const tod4SlotsPerDay = tod4Hours * 4;

    // kWh per slot for each ToD
    const tod1PerSlot = tod1 / (daysInMonth * tod1SlotsPerDay) || 0;
    const tod2PerSlot = tod2 / (daysInMonth * tod2SlotsPerDay) || 0;
    const tod3PerSlot = tod3 / (daysInMonth * tod3SlotsPerDay) || 0;
    const tod4PerSlot =
      tod4Hours > 0 ? tod4 / (daysInMonth * tod4SlotsPerDay) : 0;

    // Get max OA share for this category to cap recommended OA
    const maxOAShare = getMaxOAShare(category);

    let monthActualCost = 0;
    let monthRecCost = 0;
    let monthOaUnits = 0;

    // Generate 15-min slots for each day
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
        day,
      ).padStart(2, "0")}`;

      for (let hour = 0; hour < 24; hour++) {
        for (let block = 1; block <= 4; block++) {
          const todPeriod = getToDPeriod(hour, month);
          const todMultiplier = config.todMultipliers[todPeriod][season];

          // Determine slot kWh based on ToD period
          let slotKwh = 0;
          switch (todPeriod) {
            case "tod1":
              slotKwh = tod1PerSlot;
              break;
            case "tod2":
              slotKwh = tod2PerSlot;
              break;
            case "tod3":
              slotKwh = tod3PerSlot;
              break;
            case "tod4":
              slotKwh = tod4PerSlot;
              break;
          }

          if (slotKwh === 0) continue;

          // DISCOM cost for this slot
          const discomRate = config.baseEnergy * todMultiplier;
          const discomCost = slotKwh * discomRate;

          // Predicted IEX price
          const predPrice = predictIEXPrice(hour, month);

          // Recommend cheaper source
          const recSource = predPrice < discomRate ? "OA" : "DISCOM";
          const recCost = recSource === "OA" ? slotKwh * predPrice : discomCost;

          const slotSaving = discomCost - recCost;

          monthActualCost += discomCost;
          monthRecCost += recCost;

          if (recSource === "OA") {
            monthOaUnits += slotKwh;
          }

          const intervalStart = (block - 1) * 15;
          const intervalEnd = block * 15;
          const interval = `${String(hour).padStart(2, "0")}:${String(
            intervalStart,
          ).padStart(2, "0")}-${String(hour).padStart(2, "0")}:${String(
            intervalEnd,
          ).padStart(2, "0")}`;

          allSlotData.push({
            month: formatMonthLabel(entry.monthISO),
            date: dateStr,
            hour,
            block,
            interval,
            slot_kwh: Math.round(slotKwh * 100) / 100,
            actual_source: "DISCOM",
            actual_cost: Math.round(discomCost * 100) / 100,
            pred_price_kwh: predPrice,
            rec_source: recSource,
            rec_cost: Math.round(recCost * 100) / 100,
            discom_rate: Math.round(discomRate * 100) / 100,
            slot_saving: Math.round(slotSaving * 100) / 100,
          });
        }
      }
    }

    // Calibrate to actual bill if provided
    let calibrationFactor = 1;
    if (actualBill > 0 && monthActualCost > 0) {
      calibrationFactor = actualBill / monthActualCost;
      monthActualCost = actualBill;
      monthRecCost = monthRecCost * calibrationFactor;
    }

    const monthSavings = monthActualCost - monthRecCost;
    const monthSavingsPercent =
      monthActualCost > 0 ? (monthSavings / monthActualCost) * 100 : 0;

    // No cap on OA units - maximize OA purchase when cheaper
    const oaShare =
      totalMonthlyUnits > 0 ? (monthOaUnits / totalMonthlyUnits) * 100 : 0;

    // Check if actual OA data was uploaded for this month
    const hasActualOa = (entry.oaUnits || 0) > 0;
    const actualOaUnits = hasActualOa ? Math.round(entry.oaUnits || 0) : 0;
    const actualDiscomUnits = hasActualOa
      ? Math.round(totalMonthlyUnits - actualOaUnits)
      : Math.round(totalMonthlyUnits);

    monthlySummaries.push({
      monthISO: entry.monthISO,
      monthLabel: formatMonthLabel(entry.monthISO),
      actualCost: Math.round(monthActualCost),
      recCost: Math.round(monthRecCost),
      savings: Math.round(monthSavings),
      savingsPercent: Math.round(monthSavingsPercent),
      oaShare: Math.round(oaShare),
      totalUnits: Math.round(totalMonthlyUnits),
      // Actual = from OA bill if uploaded, otherwise all DISCOM
      actualOaUnits,
      actualDiscomUnits,
      // Recommended = based on cheaper source calculation (no cap - maximize OA)
      recommendedOaUnits: Math.round(monthOaUnits),
      recommendedDiscomUnits: Math.round(totalMonthlyUnits - monthOaUnits),
    });

    // Track if any month has OA bills
    if (hasActualOa) hasAnyOaBills = true;

    totalActualCost += monthActualCost;
    totalRecCost += monthRecCost;
    totalUnits += totalMonthlyUnits;
    totalOaUnits += monthOaUnits; // No cap - maximize OA when cheaper
  }

  // Sort monthly summaries chronologically by monthISO (e.g., 2024-04, 2024-05, etc.)
  monthlySummaries.sort((a, b) => a.monthISO.localeCompare(b.monthISO));

  const totalSavings = totalActualCost - totalRecCost;
  const adjustedSavings = totalSavings * 0.9; // 90% prediction accuracy
  const savingsPercent =
    totalActualCost > 0 ? (totalSavings / totalActualCost) * 100 : 0;

  // Calculate recommended OA share (no cap - maximize OA when cheaper)
  const oaSharePercent =
    totalUnits > 0 ? Math.round((totalOaUnits / totalUnits) * 100) : 0;

  // Calculate actual OA share based on all monthly summaries
  const totalActualOaUnits = monthlySummaries.reduce(
    (sum, m) => sum + m.actualOaUnits,
    0,
  );
  const actualOaSharePercent =
    totalUnits > 0 ? Math.round((totalActualOaUnits / totalUnits) * 100) : 0;

  return {
    totalActualCost: Math.round(totalActualCost),
    totalRecCost: Math.round(totalRecCost),
    totalSavings: Math.round(totalSavings),
    adjustedSavings: Math.round(adjustedSavings),
    savingsPercent: Math.round(savingsPercent),
    totalUnits: Math.round(totalUnits),
    oaSharePercent: oaSharePercent, // Recommended OA
    discomSharePercent: Math.round(100 - oaSharePercent),
    actualOaSharePercent, // Actual OA share from uploaded bills
    actualDiscomSharePercent: Math.round(100 - actualOaSharePercent),
    monthlySummaries,
    slotData: allSlotData,
    iexRowsCount: allSlotData.length,
    hasOaBills: hasAnyOaBills,
  };
}

// Generate demo data
export function generateDemoData(): MonthEntry[] {
  return [
    {
      id: "1",
      monthISO: "2024-10",
      expanded: true,
      billAmount: "245000",
      tod1: "12000",
      tod2: "8500",
      tod3: "5500",
      tod4: "2000",
    },
    {
      id: "2",
      monthISO: "2024-11",
      expanded: false,
      billAmount: "268000",
      tod1: "13500",
      tod2: "9200",
      tod3: "6100",
      tod4: "2300",
    },
    {
      id: "3",
      monthISO: "2024-09",
      expanded: false,
      billAmount: "312000",
      tod1: "15000",
      tod2: "11000",
      tod3: "7000",
      tod4: "0",
    },
  ];
}

// Export slot data to CSV
export function exportToCSV(slotData: SlotData[]): string {
  const headers = [
    "Month",
    "Date",
    "Hour",
    "Block",
    "Interval",
    "kWh",
    "Actual Source",
    "Actual Cost (₹)",
    "Pred Price (₹/kWh)",
    "Rec Source",
    "Rec Cost (₹)",
    "DISCOM Rate (₹/kWh)",
    "Slot Saving (₹)",
  ];

  const rows = slotData.map((slot) =>
    [
      slot.month,
      slot.date,
      slot.hour,
      slot.block,
      slot.interval,
      slot.slot_kwh,
      slot.actual_source,
      slot.actual_cost,
      slot.pred_price_kwh,
      slot.rec_source,
      slot.rec_cost,
      slot.discom_rate,
      slot.slot_saving,
    ].join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}

// Download CSV
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// Format currency
export function formatCurrency(value: number): string {
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)}L`;
  }
  return `₹${value.toLocaleString("en-IN")}`;
}
