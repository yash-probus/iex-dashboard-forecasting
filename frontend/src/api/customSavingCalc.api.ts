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

export interface CustomSavingCalcEntry {
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
  fullBaselineDiscomCost?: number;
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

export const fetchCustomSavingCalcEntries = async (): Promise<CustomSavingCalcEntry[]> => {
  const response = await apiClient.get('/custom-saving-calc/entries');
  return response.data.data;
};

export const fetchCustomSavingCalcEntryById = async (id: string, version?: number): Promise<CustomSavingCalcEntry> => {
  const url = version ? `/custom-saving-calc/entries/${id}?version=${version}` : `/custom-saving-calc/entries/${id}`;
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
  const response = await apiClient.get('/custom-saving-calc/entries/resource-defaults', { params });
  return response.data.data || { fppaChargePercent: 10.0, demandChargeKwRate: 250.0, electricityDutyPercent: 5.0 };
};

export const createCustomSavingCalcEntry = async (data: Partial<CustomSavingCalcEntry>): Promise<CustomSavingCalcEntry> => {
  const response = await apiClient.post('/custom-saving-calc/entries', data);
  return response.data.data;
};

export const updateCustomSavingCalcEntry = async (id: string, data: Partial<CustomSavingCalcEntry>): Promise<CustomSavingCalcEntry> => {
  const response = await apiClient.put(`/custom-saving-calc/entries/${id}`, data);
  return response.data.data;
};

export const deleteCustomSavingCalcEntry = async (id: string): Promise<void> => {
  await apiClient.delete(`/custom-saving-calc/entries/${id}`);
};

export const calculateCustomSavingCalc = async (id: string, month?: string, version?: number): Promise<CalculationResult> => {
  let url = `/custom-saving-calc/entries/${id}/calculate`;
  const params: string[] = [];
  if (month) params.push(`month=${month}`);
  if (version) params.push(`version=${version}`);
  if (params.length > 0) url += `?${params.join('&')}`;

  const response = await apiClient.get(url);
  return response.data.data;
};

export const calculateMarketDecisionCustom = async (id: string, month?: string, version?: number): Promise<MarketDecisionResult> => {
  let url = `/custom-saving-calc/entries/${id}/market-decision`;
  const params: string[] = [];
  if (month) params.push(`month=${month}`);
  if (version) params.push(`version=${version}`);
  if (params.length > 0) url += `?${params.join('&')}`;

  const response = await apiClient.get(url);
  return response.data.data;
};

export const fetchClientOverviewCustom = async (id: string): Promise<any> => {
  const response = await apiClient.get(`/custom-saving-calc/entries/${id}/client-overview`);
  return response.data.data;
};

export const fetchEntryHistoryCustom = async (id: string): Promise<any[]> => {
  const response = await apiClient.get(`/custom-saving-calc/entries/${id}/history`);
  return response.data.data;
};

export const exportSavingsExcelCustom = async (id: string, targetMonth?: string, version?: number, customerName?: string): Promise<void> => {
  const queryParams: string[] = [`_t=${Date.now()}`];
  if (targetMonth && targetMonth !== 'all') {
    queryParams.push(`month=${targetMonth}`);
  }
  if (version) {
    queryParams.push(`version=${version}`);
  }
  const queryString = `?${queryParams.join('&')}`;

  const response = await apiClient.get(`/custom-saving-calc/entries/${id}/export-excel${queryString}`, {
    responseType: 'blob'
  });

  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const safeName = (customerName || 'Client').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const filename = `${safeName}_Custom_Savings_Analysis${targetMonth ? `_${targetMonth}` : ''}.xlsx`;

  downloadBlob(blob, filename);
};

export const exportDemandShiftExcelCustom = async (id: string, targetMonth?: string, version?: number, customerName?: string): Promise<void> => {
  const queryParams: string[] = [`_t=${Date.now()}`];
  if (targetMonth && targetMonth !== 'all') {
    queryParams.push(`month=${targetMonth}`);
  }
  if (version) {
    queryParams.push(`version=${version}`);
  }
  const queryString = `?${queryParams.join('&')}`;

  const response = await apiClient.get(`/custom-saving-calc/entries/${id}/demand-shift-insights/export-excel${queryString}`, {
    responseType: 'blob'
  });

  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const safeName = (customerName || 'Client').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const filename = `${safeName}_Custom_Demand_Shift_Analysis${targetMonth ? `_${targetMonth}` : ''}.xlsx`;

  downloadBlob(blob, filename);
};
