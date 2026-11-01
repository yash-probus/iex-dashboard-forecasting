import { apiClient } from './client';
import { downloadBlob } from '../utils/downloadBlob';

export interface CustomTodSlot {
  id?: string;
  name?: string;
  startTime: string; // "HH:MM" e.g. "05:00"
  endTime: string;   // "HH:MM" e.g. "08:00"
  consumptionKwh: number;
  effectivePrice: number; // Discom exact price in Rs/kWh
}

export interface TraderPerformanceEntry {
  id: string;
  clientName: string;
  industryName: string;
  address: string;
  sanctionedLoadKw?: number;
  stateCode?: string;
  discom?: string;
  consumerCategory?: string;
  voltageLevel?: string;
  proltMargin?: number;
  traderMargin?: number;
  meteringCharges?: number | null;
  consultancyFee?: number;
  probusPlatformFee?: number;
  todConsumptions?: Record<string, { slots: CustomTodSlot[] } | any>;
  applyElectricityDuty?: boolean;
  electricityDutyPercent?: number;
  fppaChargePercent?: number;
  demandChargeKwRate?: number;
  billedDemandKv?: number | null;
  powerFactor?: number | null;
  arrearAmount?: number | null;
  currentLpsc?: number | null;
  billDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface CalculationResult {
  clientId: string;
  clientName: string;
  sanctionedLoad: number;
  maxEnergyPerSlot: number;
  totalEnergyKwh: number;
  totalMarketEnergyKwh: number;
  totalBaselineCost: number;
  totalOptimizedCost: number;
  totalSavings: number;
}

export interface MarketDecisionResult {
  clientId: string;
  clientName: string;
  slotsData: any[];
  todSummaries: any[];
  totalEnergyKwh: number;
  totalMarketEnergyKwh: number;
  totalConsumerBusEnergyKwh?: number;
  totalTraderMarketEnergy?: number;
  totalTraderConsumerBusEnergy?: number;
  totalTraderLandedCost?: number;
  actualTraderSavings?: number;
  actualTrader?: {
    marketEnergyKwh: number;
    consumerBusEnergyKwh: number;
    residualDiscomEnergyKwh: number;
    marketEnergyCost: number;
    cssCharge: number;
    rpoCharge: number;
    pocCharge: number;
    stuCharge: number;
    wheelingCharge: number;
    iexFee: number;
    nldcSchedulingCost: number;
    sldcSchedulingCost: number;
    bidApplicationFees: number;
    nocFee: number;
    registrationFee: number;
    traderMargin: number;
    traderMarginGst: number;
    totalOaCost: number;
    residualEnergyCost: number;
    residualDemandCharge: number;
    residualFppaCharge: number;
    residualElectricityDuty: number;
    lapsedEnergyKwh?: number;
    residualDiscomCost: number;
    totalCost: number;
    baselineDiscomCost: number;
    savings: number;
  };
  totalBaselineCost: number;
  fullBaselineDiscomCost: number;
  totalLandedExchangeCost: number;
  totalDiscomAfterProlt: number;
  totalOptimizedCost: number;
  totalSavings: number;
  demandCharge: number;
  electricityDuty: number;
  arrearAmount: number;
  currentLpsc: number;
  discom?: string;
  oaDetailed?: any;
}

export const fetchTraderPerformanceEntries = async (): Promise<TraderPerformanceEntry[]> => {
  const response = await apiClient.get('/trader-performance');
  return response.data.data;
};

export const fetchTraderPerformanceEntryById = async (id: string, version?: number): Promise<TraderPerformanceEntry> => {
  const url = version ? `/trader-performance/${id}?version=${version}` : `/trader-performance/${id}`;
  const response = await apiClient.get(url);
  return response.data.data;
};

export const fetchResourceDefaults = async (params: {
  stateCode?: string;
  discom?: string;
  consumerCategory?: string;
  voltageLevel?: string;
  monthStr?: string;
}): Promise<{ fppaChargePercent: number; demandChargeKwRate: number; electricityDutyPercent: number }> => {
  const response = await apiClient.get('/trader-performance/resource-defaults', { params });
  return response.data.data || { fppaChargePercent: 10.0, demandChargeKwRate: 250.0, electricityDutyPercent: 5.0 };
};

export const createTraderPerformanceEntry = async (data: Partial<TraderPerformanceEntry>): Promise<TraderPerformanceEntry> => {
  const response = await apiClient.post('/trader-performance', data);
  return response.data.data;
};

export const updateTraderPerformanceEntry = async (id: string, data: Partial<TraderPerformanceEntry>): Promise<TraderPerformanceEntry> => {
  const response = await apiClient.put(`/trader-performance/${id}`, data);
  return response.data.data;
};

export const deleteTraderPerformanceEntry = async (id: string): Promise<void> => {
  await apiClient.delete(`/trader-performance/${id}`);
};

export const calculateTraderPerformance = async (id: string, month?: string, version?: number): Promise<CalculationResult> => {
  let url = `/trader-performance/${id}/calculate`;
  const params: string[] = [];
  if (month) params.push(`month=${month}`);
  if (version) params.push(`version=${version}`);
  if (params.length > 0) url += `?${params.join('&')}`;

  const response = await apiClient.get(url);
  return response.data.data;
};

export const calculateMarketDecisionTraderPerformance = async (id: string, month?: string, version?: number): Promise<MarketDecisionResult> => {
  let url = `/trader-performance/${id}/market-decision`;
  const params: string[] = [`_t=${Date.now()}`];
  if (month) params.push(`monthStr=${month}`);
  if (version) params.push(`version=${version}`);
  url += `?${params.join('&')}`;

  const response = await apiClient.get(url);
  return response.data.data;
};

export const fetchClientOverviewTraderPerformance = async (id: string): Promise<any> => {
  const response = await apiClient.get(`/trader-performance/${id}/client-overview`);
  return response.data.data;
};

export const fetchEntryHistoryTraderPerformance = async (id: string): Promise<any[]> => {
  const response = await apiClient.get(`/trader-performance/${id}/history`);
  return response.data.data;
};

export const exportTraderPerformanceExcel = async (id: string, targetMonth?: string, version?: number, customerName?: string): Promise<void> => {
  const queryParams: string[] = [`_t=${Date.now()}`];
  if (targetMonth) {
    queryParams.push(`month=${targetMonth}`);
  }
  if (version) {
    queryParams.push(`version=${version}`);
  }
  const queryString = `?${queryParams.join('&')}`;

  const response = await apiClient.get(`/trader-performance/${id}/export-excel${queryString}`, {
    responseType: 'blob'
  });

  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const safeName = (customerName || 'Client').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const filename = `${safeName}_Custom_TOD_Savings_Analysis${targetMonth ? `_${targetMonth}` : ''}.xlsx`;

  downloadBlob(blob, filename);
};

export const exportTraderPerformanceActualTraderExcel = async (id: string, targetMonth?: string, version?: number, customerName?: string): Promise<void> => {
  const queryParams: string[] = [`_t=${Date.now()}`];
  if (targetMonth) {
    queryParams.push(`month=${targetMonth}`);
  }
  if (version) {
    queryParams.push(`version=${version}`);
  }
  const queryString = `?${queryParams.join('&')}`;

  const response = await apiClient.get(`/trader-performance/${id}/actual-trader/export-excel${queryString}`, {
    responseType: 'blob'
  });

  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const safeName = (customerName || 'Client').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const filename = `${safeName}_Actual_Trader_Analysis${targetMonth ? `_${targetMonth}` : ''}.xlsx`;

  downloadBlob(blob, filename);
};

export const exportDemandShiftExcelTraderPerformance = async (id: string, targetMonth?: string, version?: number, customerName?: string): Promise<void> => {
  const queryParams: string[] = [`_t=${Date.now()}`];
  if (targetMonth) {
    queryParams.push(`month=${targetMonth}`);
  }
  if (version) {
    queryParams.push(`version=${version}`);
  }
  const queryString = `?${queryParams.join('&')}`;

  const response = await apiClient.get(`/trader-performance/${id}/demand-shift-insights/export-excel${queryString}`, {
    responseType: 'blob'
  });

  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const safeName = (customerName || 'Client').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const filename = `${safeName}_Custom_TOD_Demand_Shift_Analysis${targetMonth ? `_${targetMonth}` : ''}.xlsx`;

  downloadBlob(blob, filename);
};

export const fetchDemandShiftInsightsTraderPerformance = async (id: string, month?: string, version?: number): Promise<any> => {
  let url = `/trader-performance/${id}/demand-shift-insights`;
  const params: string[] = [];
  if (month) params.push(`monthStr=${month}`);
  if (version) params.push(`version=${version}`);
  if (params.length > 0) url += `?${params.join('&')}`;

  const response = await apiClient.get(url);
  return response.data.data;
};
