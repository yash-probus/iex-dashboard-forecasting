// Consumer Dashboard Data Types

// ===== TOD Forecast Types =====

export interface TODSlot {
  name: string; // 'Off-Peak', 'Normal', 'Peak', 'Super Peak'
  startTime: string; // '06:00'
  endTime: string; // '17:00'
  predictedKwh: number;
  historicalAvgKwh: number;
}

export interface TODForecastDay {
  date: string;
  dayLabel: string; // 'Today', 'Tomorrow', 'Wed'
  todSlots: TODSlot[];
  totalPredictedKwh: number;
  totalHistoricalAvgKwh: number;
}

export interface TODForecast7Day {
  days: TODForecastDay[];
  total7DayPrediction: number;
  total7DayHistoricalAvg: number;
}

// ===== Energy Request Types =====

export interface EnergyRequestTODSlot {
  slotName: string; // 'Off-Peak', 'Normal', 'Peak', 'Super Peak'
  loadMW: number;
}

export interface EnergyRequest {
  id: string;
  profileId: string;
  deliveryDateStart: string;
  deliveryDateEnd: string;
  marketType: "DAM" | "TAM";
  todSlots: EnergyRequestTODSlot[];
  totalLoadMW: number;
  priority: "low" | "medium" | "high";
  remarks: string;
  status: "draft" | "pending" | "acknowledged" | "processed";
  createdAt: string;
  updatedAt: string;
}

export interface EnergyRequestLog {
  id: string;
  requestId: string;
  action: "created" | "modified" | "sent" | "acknowledged";
  timestamp: string;
  details: string;
}

export interface DailyConsumption {
  date: string;
  discomUnits: number;
  oaUnits: number;
  totalUnits: number;
}

export interface DeliveryStatus {
  scheduled: number;
  confirmed: number;
  partiallyConfirmed: number;
  failed: number;
}

export interface PeakConsumptionPoint {
  day: number;
  peakKwh: number;
  peakTime: string;
  date: string;
}

export interface EnergyForecast {
  date: string;
  forecastedKwh: number;
  historicalAverage: number;
  dayLabel: string;
}

export interface OARecommendation {
  id: string;
  timeSlot: string;
  expectedPrice: number;
  suggestedQuantity: number;
  discomPrice: number;
  savingsAmount: number;
  savingsPercent: number;
}

export interface SavingsPotential {
  date: string;
  dayLabel: string;
  savingsRs: number;
  bestSlots: string[];
  scheduledMWh?: number;
}

// Market price slot for market window intelligence
export interface MarketPriceSlot {
  date: string;
  dayLabel: string;
  lowestSlotTime: string;
  lowestPrice: number;
  opportunityAmount: number;
}

export interface ConsumerKPIs {
  totalEnergyThisMonth: number;
  discomEnergy: number;
  oaEnergy: number;
  savingsAchieved: number;
  expectedSavings: number;
  billingEstimate: number;
  oaPercentage: number;
}

// NEW: Enhanced types for redesigned dashboard

export interface HourlyUsage {
  interval: string;
  kWh: number;
  savingsRs: number;
}

export interface DailyUsageWithSavings {
  date: string;
  dayLabel: string;
  kWh: number;
  savingsRs: number;
}

export interface MonthlyUsageWithSavings {
  month: string;
  kWh: number;
  savingsRs: number;
}

export interface PeakPatternData {
  label: string;
  kWh: number;
  isMax: boolean;
}

export interface EnhancedConsumerKPIs {
  usageTillNow: number;
  savingsTillNow: number;
  dailyConsumptionMTD: number;
  savingsThisMonth: number;
  monthlyConsumptionYTD: number;
  savingsThisYear: number;
  estimatedBill: number;
  usualBill: number;
  estimatedSavings: number;
  savingsPercent: number;
}

export interface EnhancedForecast extends EnergyForecast {
  expectedSavings: number;
}

export interface EnhancedConsumerDashboardData {
  enhancedKpis: EnhancedConsumerKPIs;
  hourlyUsage: HourlyUsage[];
  dailyUsageWithSavings: DailyUsageWithSavings[];
  monthlyUsageWithSavings: MonthlyUsageWithSavings[];
  peakPatternDay: PeakPatternData[];
  peakPatternWeek: PeakPatternData[];
  peakPatternMonth: PeakPatternData[];
  enhancedForecast: EnhancedForecast[];
  savingsPotential: SavingsPotential[];
  totalPotentialSavings7Days: number;
  marketPriceSlots: MarketPriceSlot[];
  totalMarketOpportunity7Days: number;
  todayUsageDetail?: TodayUsageDetail;
  monthlyUsageDetail?: MonthlyUsageDetail;
  yearlyUsageDetail?: YearlyUsageDetail;
}

// Execution status for OA bids
export type OAExecutionStatus =
  | "confirmed"
  | "partial"
  | "failed"
  | "discom-only";

// 15-minute slot data with OA execution details
export interface FifteenMinuteSlotData {
  slotStart: string;
  slotEnd: string;
  slotLabel: string;
  usageKwh: number;
  bidPlacedKwh: number;
  bidPricePerMwh: number;
  confirmedLoadKwh: number;
  executionStatus: OAExecutionStatus;
  savingsRs: number;
}

// Today's detailed usage summary
export interface TodayUsageDetail {
  totalUsageTillNow: number;
  totalSavingsTillNow: number;
  confirmedOAEnergy: number;
  totalBidAmountToday: number;
  slots: FifteenMinuteSlotData[];
  highestUsageSlot: { time: string; kWh: number };
  lowestPriceSlot: { time: string; price: number };
}

// Daily data with OA execution details (for MTD view)
export interface DailyDetailData {
  date: string;
  dayLabel: string;
  usageKwh: number;
  bidPlacedKwh: number;
  avgBidPricePerMwh: number;
  confirmedLoadKwh: number;
  executionStatus: OAExecutionStatus;
  savingsRs: number;
  oaSharePercent: number;
}

// Monthly detail summary (MTD)
export interface MonthlyUsageDetail {
  totalMonthlyUsage: number;
  savingsThisMonth: number;
  confirmedOAEnergy: number;
  totalBidAmountMonth: number;
  days: DailyDetailData[];
  peakConsumptionDay: { date: string; kWh: number };
  bestSavingsDay: { date: string; savingsRs: number };
}

// Monthly data with OA execution details (for YTD view)
export interface MonthlyDetailData {
  month: string;
  monthIndex: number;
  usageKwh: number;
  bidPlacedKwh: number;
  avgBidPricePerMwh: number;
  confirmedLoadKwh: number;
  executionStatus: OAExecutionStatus;
  savingsRs: number;
  oaSharePercent: number;
}

// Yearly detail summary (YTD)
export interface YearlyUsageDetail {
  totalYTDUsage: number;
  savingsThisYear: number;
  confirmedOAEnergy: number;
  totalBidAmountYear: number;
  months: MonthlyDetailData[];
  peakConsumptionMonth: { month: string; kWh: number };
  bestSavingsMonth: { month: string; savingsRs: number };
}

// ============================================
// 15-Minute Slot Transparency Dashboard Types
// ============================================

// 15-minute slot with complete OA trading data for timeline chart
export interface SlotTimelineData {
  slotStart: string; // "00:00"
  slotEnd: string; // "00:15"
  slotLabel: string; // "00:00-00:15"
  requiredLoadKwh: number; // Actual usage (orange line)
  bidPlacedKwh: number; // Bid placed (yellow line)
  confirmedLoadKwh: number; // Confirmed OA (teal line)
  executionStatus: OAExecutionStatus;
  bidPricePerMwh: number;
  costWithoutProlt: number; // DISCOM cost
  costWithProlt: number; // OA + remaining DISCOM cost
  savingsRs: number;
}

// Daily aggregated data for Month view
export interface DayTimelineData {
  date: string;
  dayLabel: string; // "13 Mon"
  totalLoadKwh: number;
  totalBidKwh: number;
  totalConfirmedKwh: number;
  totalSavingsRs: number;
}

// Monthly aggregated data for Year view
export interface MonthTimelineData {
  month: string; // "Jan"
  monthIndex: number;
  totalLoadKwh: number;
  totalBidKwh: number;
  totalConfirmedKwh: number;
  totalSavingsRs: number;
}

// Lifetime summary
export interface LifetimeSummary {
  totalLoadKwh: number;
  totalSavingsRs: number;
  monthsActive: number;
}

// Live meter data for real-time current load indicator
export interface LiveMeterData {
  // Voltage readings (R, Y, B phases)
  voltageR: number;
  voltageY: number;
  voltageB: number;
  // Current readings (R, Y, B phases)
  currentR: number;
  currentY: number;
  currentB: number;
  // Load readings
  loadKW: number;
  loadKVA: number;
  loadKVAr: number;
  // Power factor
  powerFactor: number;
  // Frequency (Hz)
  frequency: number;
  // Slot info
  currentSlotStart: string;
  currentSlotEnd: string;
  // Status
  isActive: boolean;
  lastUpdated: Date;
}

// Peak power with duration data
export interface PeakPowerToday {
  power: number; // Peak power in kW
  duration: string; // "45 minutes" or "2h 15m"
  startTime: string; // "10:30"
  endTime: string; // "11:15"
}

export interface PeakPowerMonth {
  power: number; // Peak power in kW
  totalHours: number; // Total hours at peak
  peakDate: string; // Date of highest peak
}

export interface PeakPowerYear {
  power: number; // Peak power in kW
  totalHours: number; // Total hours at peak
  peakMonth: string; // Month with highest peak
}

// Energy Usage Timeline complete data
export interface EnergyUsageTimeline {
  slotData: SlotTimelineData[]; // 96 slots for selected day
  dailyData: DayTimelineData[]; // Days of selected month
  monthlyData: MonthTimelineData[]; // Months of selected year
  lifetime: LifetimeSummary;
  peakSlotToday: { time: string; kWh: number };
  cheapestSlotToday: { time: string; price: number };
  peakDayThisMonth: { date: string; kWh: number };
  peakMonthThisYear: { month: string; kWh: number };
  liveData?: LiveMeterData; // Live meter data for current load indicator
  // Peak power with duration
  peakPowerToday?: PeakPowerToday;
  peakPowerThisMonth?: PeakPowerMonth;
  peakPowerThisYear?: PeakPowerYear;
  peakSlot?: { dateTime: string; energy: number };
  energyUsageList?: { dateTime: string; energy: number }[];
}

// Savings summary card data - cumulative till date
export interface SavingsAchievedData {
  savedAmount: number; // Total saved till date
  percentLower: number;
  withoutProlt: number;
  withProlt: number;
  // Cumulative breakdown
  savingsTillToday: number; // Savings till today in current month
  savingsThisMonth: number; // Total savings this month (projected)
  savingsThisYear: number; // Total savings this year
  lifetimeSavings: number; // All-time savings
  dayOfMonth: number; // Current day of month
  daysInMonth: number; // Total days in month
  monthlyBreakdown: { day: number; cumulative: number }[]; // Daily cumulative for progress
}

// Future savings opportunity data
export interface FutureSavingsData {
  potentialSavings: number;
  percentReduction: number;
  dailyForecast: { day: string; savingsRs: number }[];
}

// Estimated bill data
export interface EstimatedBillData {
  estimatedBill: number;
  usualBill: number;
  percentLower: number;
  estimatedSavings: number;
}

export interface ConsumerDashboardData {
  kpis: ConsumerKPIs;
  dailyConsumption: DailyConsumption[];
  deliveryStatus: DeliveryStatus;
  peakConsumption: PeakConsumptionPoint[];
  forecast: EnergyForecast[];
  recommendations: OARecommendation[];
  savingsPotential: SavingsPotential[];
  // Enhanced data
  enhanced?: EnhancedConsumerDashboardData;
  // New timeline data
  energyTimeline?: EnergyUsageTimeline;
  savingsAchieved?: SavingsAchievedData;
  futureSavings?: FutureSavingsData;
  estimatedBillData?: EstimatedBillData;
}
