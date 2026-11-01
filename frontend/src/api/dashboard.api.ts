import { apiClient } from './client';
import { MarketSummary } from '../types/market';
import { DashboardOverviewResponse } from '../types/overview';

export const dashboardApi = {
  getMarketData: async (market: string, startDate: string, endDate: string, interval: string = '15min') => {
    const response = await apiClient.get(`/dashboard/${market.toLowerCase()}?startDate=${startDate}&endDate=${endDate}&interval=${interval}`);
    return response.data;
  },
  getMarketAnalytics: async (market: string, startDate: string, endDate: string, interval: string = '15min') => {
    const response = await apiClient.get(`/dashboard/${market.toLowerCase()}/analytics?startDate=${startDate}&endDate=${endDate}&interval=${interval}`);
    return response.data;
  },
  getMarketOverview: async (): Promise<DashboardOverviewResponse> => {
    const response = await apiClient.get<DashboardOverviewResponse>('/dashboard/overview');
    return response.data;
  }
};
