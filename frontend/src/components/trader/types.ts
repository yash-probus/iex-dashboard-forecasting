// Trader module types

export interface PortfolioSettings {
  groupingPreference: 'portfolio' | 'state' | 'discom' | 'category';
  showLostSavingsRanking: boolean;
  showAnomalies: boolean;
}

export interface ConsumerRow {
  consumer_id: string;
  consumer_name: string;
  state: string;
  discom: string;
  consumer_category: string;
  voltage_level_kv: number;
  sanctioned_load_mw: number;
  bill_month: string;
  total_bill_amount: number;
  tod1_kwh: number;
  tod2_kwh: number;
  tod3_kwh: number;
  tod4_kwh: number;
  oa_bill_uploaded: boolean;
  oa_bill_path: string;
  discom_bill_path: string;
}

export interface ValidationResult {
  row: ConsumerRow;
  rowIndex: number;
  errors: string[];
  warnings: string[];
  stateValid: boolean;
  discomValid: boolean;
  billMonthValid: boolean;
  discomBillAttached: boolean;
  oaBillAttached: boolean;
  todDataAvailable: boolean;
  status: 'passed' | 'error' | 'warning';
}

export interface UploadedFile {
  id: string;
  name: string;
  type: 'discom' | 'oa' | 'obligation';
  file: File;
  matchedConsumerId?: string;
}

export interface ProcessingStep {
  label: string;
  status: 'pending' | 'running' | 'complete';
}

export interface TraderSummary {
  totalConsumers: number;
  totalMonths: number;
  discomBillsDetected: number;
  oaBillsDetected: number;
  missingOaBills: number;
}

// OA Row from OA CSV
export interface OARow {
  trader_id?: string;
  consumer_id: string;
  bill_month: string;
  iex_energy_kwh: number;
  iex_amount: number;
  stu_charges: number;
  sldc_charges: number;
  transmission_charges: number;
  other_oa_charges: number;
  total_oa_amount: number;
}

// Merged Month Object (DISCOM + OA combined)
export interface MergedMonthData {
  consumer_id: string;
  consumer_name: string;
  state: string;
  discom: string;
  consumer_category: string;
  voltage_level_kv: number;
  sanctioned_load_mw: number;
  bill_month: string;
  // DISCOM data
  total_consumption_kwh: number;
  actual_discom_bill: number;
  tod1_kwh: number;
  tod2_kwh: number;
  tod3_kwh: number;
  tod4_kwh: number;
  // OA data (0 if not available)
  oa_energy_kwh: number;
  actual_oa_bill: number;
  oa_share: number;
  hasOaData: boolean;
  // Calculated totals
  actual_total_spend: number;
  // Prolt recommended values
  ideal_oa_units: number;
  ideal_oa_cost: number;
  ideal_discom_units: number;
  ideal_discom_cost: number;
  ideal_total_cost: number;
  savings_opportunity: number;
}

// CSV Validation error
export interface CsvValidationError {
  csvType: 'discom' | 'oa';
  rowNumber: number;
  field?: string;
  message: string;
}

// OA Matching Result
export interface OAMatchResult {
  matchedRows: OARow[];
  unmatchedRows: { row: OARow; rowNumber: number; reason: string }[];
}

// Phase-2 Dashboard Types

export interface ConsumerAnalytics {
  consumerId: string;
  consumerName: string;
  state: string;
  discom: string;
  category: string;
  months: string[];
  actualSpend: number;
  recommendedSpend: number;
  savings: number;
  savingsPercent: number;
  oaShareActual: number;
  oaShareOptimal: number;
  missingOaBill: boolean;
  todPattern: {
    tod1: number;
    tod2: number;
    tod3: number;
    tod4: number;
  };
  priceVsPredicted: {
    hour: number;
    actualPrice: number;
    optimalPrice: number;
  }[];
}

export interface PortfolioAnalytics {
  totalActualSpend: number;
  totalRecommendedSpend: number;
  totalSavings: number;
  savingsPercent: number;
  totalConsumers: number;
  totalMonths: number;
  groupingMode: 'portfolio' | 'state' | 'discom' | 'category';
  consumersWithMissingData: number;
  consumers: ConsumerAnalytics[];
  oaVsDiscomMix: {
    actualOaPercent: number;
    actualDiscomPercent: number;
    optimalOaPercent: number;
    optimalDiscomPercent: number;
  };
  tradingEfficiencyScore: number;
  priceEfficiencyMap: {
    hour: number;
    deviation: number;
  }[];
}

export interface InsightItem {
  id: string;
  icon: 'lightbulb' | 'trending-up' | 'alert' | 'zap' | 'clock';
  title: string;
  description: string;
  impact: string;
  chartRef?: string;
}

export interface GroupedData {
  name: string;
  actualSpend: number;
  recommendedSpend: number;
  savings: number;
  savingsPercent: number;
  consumers: ConsumerAnalytics[];
}

// Trader Onboarding Types

export interface TraderCustomer {
  id: string;
  customerId: string;
  accountNumber?: string;
  consumerName: string;
  state: string;
  discom: string;
  category: string;
  voltageLevel: string;
  sanctionedLoadMw: number;
  months: TraderCustomerMonth[];
}

export interface TraderCustomerMonth {
  id: string;
  month: string; // YYYY-MM
  totalBillAmount: number;
  billedUnitsKwh: number;
  tod1Kwh: number;
  tod2Kwh: number;
  tod3Kwh: number;
  tod4Kwh: number;
  avgDailyDemandKw?: number;
  discomBillFile?: File | null;
  discomBillFilename?: string;
  oaBillFile?: File | null;
  oaBillFilename?: string;
  oaDailyCsvFile?: File | null;
  oaDailyCsvFilename?: string;
}

export interface ProcessedCustomer {
  customerId: string;
  customerName: string;
  state: string;
  discom: string;
  category: string;
  voltageLevel: string;
  sanctionedLoadMw: number;
  monthsAvailable: number;
  actualSpend: number;
  recommendedSpend: number;
  savingsOpportunity: number;
  oaPercentActual: number;
  oaPercentRecommended: number;
  months: ProcessedCustomerMonth[];
}

export interface ProcessedCustomerMonth {
  month: string;
  totalConsumptionKwh: number;
  tod1Kwh: number;
  tod2Kwh: number;
  tod3Kwh: number;
  tod4Kwh: number;
  actualDiscomBill: number;
  actualOaBill: number;
  actualTotalSpend: number;
  recommendedDiscomBill: number;
  recommendedOaBill: number;
  recommendedTotalSpend: number;
  savingsOpportunity: number;
  oaPercentActual: number;
  oaPercentRecommended: number;
}

export type TraderOnboardingStep = 
  | 'welcome' 
  | 'manual' 
  | 'bulk' 
  | 'parsing' 
  | 'portfolio' 
  | 'detail';

export interface BulkUploadValidationResult {
  isValid: boolean;
  totalRows: number;
  consumersDetected: number;
  monthsDetected: number;
  errors: { row: number; message: string }[];
  parsedData: TraderCustomer[];
}

// ==========================================
// ENHANCED DASHBOARD TYPES (Phase 3)
// ==========================================

export interface EnhancedConsumerData {
  // Basic Info
  id: string;
  name: string;
  state: string;
  discom: string;
  category: string;
  status: 'online' | 'offline' | 'alarm';
  
  // Load & Capacity
  connectedLoadMw: number;
  sanctionedLoadMw: number;
  peakDemandKw: number;
  demandUtilizationPercent: number;
  demandLimitRisk: 'safe' | 'warning' | 'critical';
  
  // Energy Metrics
  monthlyConsumptionMwh: number;
  dailyConsumptionKwh: number;
  weeklyConsumptionMwh: number;
  lifetimeConsumptionMwh: number;
  
  // Financial Metrics
  monthlySpend: number;
  effectiveTariff: number; // ₹/kWh
  optimizedSpend: number;
  savingsOpportunity: number;
  savingsPercent: number;
  
  // OA Metrics
  oaEnabled: boolean;
  oaUtilized: boolean;
  oaEnergyMwh: number;
  oaPenetrationPercent: number;
  
  // TOD Metrics
  peakHourSharePercent: number;
  offPeakUtilizationPercent: number;
  highCostTodSpend: number;
  
  // Risk Flags
  missingBills: boolean;
  missingOaData: boolean;
  arrearsAmount: number;
  estimatedPenalty: number;
  riskFlag: 'low' | 'medium' | 'high';
  
  // Time-series data for graphs
  hourlyData: { hour: string; oa: number; discom: number; consumed: number }[];
  dailyData: { date: string; oa: number; discom: number; consumed: number }[];
  weeklyData: { week: string; oa: number; discom: number; consumed: number }[];
  monthlyData: { month: string; oa: number; discom: number; consumed: number }[];
}

export interface EnhancedPortfolioAnalytics {
  // Portfolio Size
  totalConsumers: number;
  activeConsumersThisMonth: number;
  
  // Power Delivered (new simplified KPIs)
  totalDailyPowerDeliveredKwh: number;
  totalWeeklyPowerDeliveredMwh: number;
  totalMonthlyPowerDeliveredMwh: number;
  
  // Money Spent KPIs
  dailySpend: number;
  weeklySpend: number;
  monthlySpend: number;
  monthlySavingsOpportunity: number;
  monthlySavingsPercent: number;
  
  // Capacity
  totalConnectedLoadMw: number;
  
  // Energy
  totalMonthlyConsumptionMwh: number;
  
  // Financial
  totalPortfolioSpend: number;
  optimizedSpend: number;
  savingsOpportunity: number;
  savingsPercent: number;
  
  // Tariff Analysis
  avgEffectiveTariff: number;
  highestTariff: { consumer: string; tariff: number };
  lowestTariff: { consumer: string; tariff: number };
  
  // OA Analysis
  oaPenetrationPercent: number;
  consumersWithOaEnabled: number;
  consumersUnderutilizingOa: number;
  totalOaEnergyMwh: number;
  
  // Demand Analysis
  portfolioPeakDemandMw: number;
  avgDemandUtilization: number;
  consumersNearDemandLimit: number;
  estimatedPenaltyExposure: number;
  
  // Risk Metrics
  totalArrearsExposure: number;
  consumersMissingBills: number;
  consumersMissingOaData: number;
  
  // TOD Analysis
  peakHourEnergySharePercent: number;
  offPeakUtilizationPercent: number;
  highCostTodSpend: number;
  
  // Trends (month-on-month)
  spendTrend: { month: string; value: number }[];
  demandTrend: { month: string; value: number }[];
  oaTrend: { month: string; value: number }[];
  savingsTrend: { month: string; value: number }[];
  
  // Overall Score
  traderEfficiencyScore: number;
  
  // Consumer Data
  consumers: EnhancedConsumerData[];
}

export interface ActionAlert {
  id: string;
  type: 'demand_risk' | 'oa_optimization' | 'missing_data' | 'arrears';
  severity: 'warning' | 'critical';
  title: string;
  description: string;
  affectedConsumers: string[];
}

// ==========================================
// FINTECH DASHBOARD TYPES (Zerodha-Style)
// ==========================================

export interface ValueGapDataPoint {
  day: number;
  discomCost: number;
  proltCost: number;
}

export interface SlotData15Min {
  time: string;
  consumption: number;
  isPeak: boolean;
}

export interface FintechConsumerData extends EnhancedConsumerData {
  voltageLevel: string;
  bidEfficiencyScore: number;
  riskStatus: 'Stable' | 'Volatile' | 'Tariff Risk';
  realizedSavings: number;
  realizedSavingsPercent: number;
  slotData15min: SlotData15Min[];
  creditRating: 'A' | 'B' | 'C' | 'D';
}

export interface FintechPortfolioAnalytics extends EnhancedPortfolioAnalytics {
  traderEarnings: number;
  totalEnergyTradedGwh: number;
  bidSuccessRate: number;
  bidFailureRate: number;
  valueGapData: ValueGapDataPoint[];
  fintechConsumers: FintechConsumerData[];
  
  // New KPIs for restructured dashboard
  energyScheduledMwh: number;
  energySuccessfullyTradedMwh: number;
  deviationObservedMwh: number;
  deviationPercent: number;
  
  // Portfolio Analysis KPIs
  topCustomerName: string;
  topCustomerVolume: number;
  topSectorTradedIn: string;
  topSectorVolume: number;
}

// ==========================================
// PROFIT DASHBOARD TYPES (Trader Earnings)
// ==========================================

export interface ProfitAnalytics {
  totalCommissionEarned: number;
  commissionRatePerKwh: number;
  commissionGrowthPercent: number;
  profitGap: number;
  profitGapChangePercent: number;
  portfolioBidSuccessRate: number;
  successfulBidsCount: number;
  totalBidsPlaced: number;
  bidSuccessChangePercent: number;
  mvcName: string;
  mvcEarningsShare: number;
  earningsBridgeData: EarningsBridgeDataPoint[];
  profitCustomers: ProfitCustomerData[];
  heatmapData: ProfitHeatmapSlot[];
}

export interface EarningsBridgeDataPoint {
  day: number;
  actualEarnings: number;
  potentialEarnings: number;
}

export interface ProfitCustomerData {
  id: string;
  name: string;
  energyTradedKwh: number;
  yourEarnings: number;
  earningsSharePercent: number;
  untappedProfitGap: number;
  actionableAdvice: string;
}

export interface ProfitHeatmapSlot {
  day: number;
  timeSlot: string;
  commissionEarned: number;
  commissionMissed: number;
}

// ==========================================
// MARKET INTELLIGENCE TYPES
// ==========================================

export interface MCPDataPoint {
  blockNumber: number;     // 1-96
  time: string;           // "00:00", "00:15", etc.
  price: number;          // ₹/kWh
  timestamp: Date;
}

export interface MarketSegmentData {
  segment: 'DAM' | 'RTM' | 'G-DAM';
  currentPrice: number;
  previousPrice: number;
  changePercent: number;
  premiumDiscount?: number;  // For G-DAM vs DAM comparison
}

export interface MarketMover {
  id: string;
  entityName: string;
  volumeMw: number;
  marketSharePercent: number;
  type: 'buyer' | 'seller';
  trend: 'up' | 'down' | 'stable';
}

export interface CreditAlert {
  id: string;
  customerId: string;
  customerName: string;
  type: 'insufficient_balance' | 'payment_due' | 'overdue';
  severity: 'warning' | 'critical';
  message: string;
  daysRemaining?: number;
  overdueDays?: number;
  amount?: number;
  actionType: 'pause_trade' | 'send_reminder';
}

export interface MarketIntelligenceData {
  mcpToday: MCPDataPoint[];
  mcpYesterday: MCPDataPoint[];
  mcpPredicted: MCPDataPoint[];
  marketSegments: MarketSegmentData[];
  topBuyers: MarketMover[];
  topSellers: MarketMover[];
  creditAlerts: CreditAlert[];
  lastUpdated: Date;
}

export interface PricePredictionData {
  blockNumber: number;
  time: string;
  actual: number;
  predicted: number;
  confidence: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  volatilityIndex: number;
}

export interface MLIndicator {
  name: string;
  value: number;
  signal: 'buy' | 'sell' | 'hold';
  strength: number;
}