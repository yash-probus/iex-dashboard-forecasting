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

export interface SavingsCalculatorNewEntry {
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

export const fetchSavingsNewEntries = async (): Promise<SavingsCalculatorNewEntry[]> => {
  const response = await apiClient.get('/savings-calculator-new/entries');
  return response.data.data;
};

export const fetchSavingsNewEntryById = async (id: string, version?: number): Promise<SavingsCalculatorNewEntry> => {
  const url = version ? `/savings-calculator-new/entries/${id}?version=${version}` : `/savings-calculator-new/entries/${id}`;
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
  const response = await apiClient.get('/savings-calculator-new/entries/resource-defaults', { params });
  return response.data.data || { fppaChargePercent: 10.0, demandChargeKwRate: 250.0, electricityDutyPercent: 5.0 };
};

export const createSavingsNewEntry = async (data: Partial<SavingsCalculatorNewEntry>): Promise<SavingsCalculatorNewEntry> => {
  const response = await apiClient.post('/savings-calculator-new/entries', data);
  return response.data.data;
};

export const updateSavingsNewEntry = async (id: string, data: Partial<SavingsCalculatorNewEntry>): Promise<SavingsCalculatorNewEntry> => {
  const response = await apiClient.put(`/savings-calculator-new/entries/${id}`, data);
  return response.data.data;
};

export const deleteSavingsNewEntry = async (id: string): Promise<void> => {
  await apiClient.delete(`/savings-calculator-new/entries/${id}`);
};

export const calculateSavingsNew = async (id: string, month?: string, version?: number): Promise<CalculationResult> => {
  let url = `/savings-calculator-new/entries/${id}/calculate`;
  const params: string[] = [];
  if (month) params.push(`month=${month}`);
  if (version) params.push(`version=${version}`);
  if (params.length > 0) url += `?${params.join('&')}`;

  const response = await apiClient.get(url);
  return response.data.data;
};

export const calculateMarketDecisionNew = async (id: string, month?: string, version?: number): Promise<MarketDecisionResult> => {
  let url = `/savings-calculator-new/entries/${id}/market-decision`;
  const params: string[] = [];
  if (month) params.push(`monthStr=${month}`);
  if (version) params.push(`version=${version}`);
  if (params.length > 0) url += `?${params.join('&')}`;

  const response = await apiClient.get(url);
  return response.data.data;
};

export const fetchClientOverviewNew = async (id: string): Promise<any> => {
  const response = await apiClient.get(`/savings-calculator-new/entries/${id}/client-overview`);
  return response.data.data;
};

export const fetchEntryHistoryNew = async (id: string): Promise<any[]> => {
  const response = await apiClient.get(`/savings-calculator-new/entries/${id}/history`);
  return response.data.data;
};

export const exportSavingsExcelNew = async (id: string, targetMonth?: string, version?: number, customerName?: string): Promise<void> => {
  const queryParams: string[] = [`_t=${Date.now()}`];
  if (targetMonth) {
    queryParams.push(`month=${targetMonth}`);
  }
  if (version) {
    queryParams.push(`version=${version}`);
  }
  const queryString = `?${queryParams.join('&')}`;

  const response = await apiClient.get(`/savings-calculator-new/entries/${id}/export-excel${queryString}`, {
    responseType: 'blob'
  });

  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const safeName = (customerName || 'Client').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const filename = `${safeName}_Custom_TOD_Savings_Analysis${targetMonth ? `_${targetMonth}` : ''}.xlsx`;

  downloadBlob(blob, filename);
};

export const exportDemandShiftExcelNew = async (id: string, targetMonth?: string, version?: number, customerName?: string): Promise<void> => {
  const queryParams: string[] = [`_t=${Date.now()}`];
  if (targetMonth) {
    queryParams.push(`month=${targetMonth}`);
  }
  if (version) {
    queryParams.push(`version=${version}`);
  }
  const queryString = `?${queryParams.join('&')}`;

  const response = await apiClient.get(`/savings-calculator-new/entries/${id}/demand-shift-insights/export-excel${queryString}`, {
    responseType: 'blob'
  });

  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const safeName = (customerName || 'Client').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const filename = `${safeName}_Custom_TOD_Demand_Shift_Analysis${targetMonth ? `_${targetMonth}` : ''}.xlsx`;

  downloadBlob(blob, filename);
};

export const fetchDemandShiftInsightsNew = async (id: string, targetMonth?: string, version?: number): Promise<any> => {
  let url = `/savings-calculator-new/entries/${id}/demand-shift-insights`;
  const params: string[] = [];
  if (targetMonth) params.push(`targetMonth=${targetMonth}`);
  if (version) params.push(`version=${version}`);
  if (params.length > 0) url += `?${params.join('&')}`;

  const response = await apiClient.post(url);
  return response.data.data;
};
