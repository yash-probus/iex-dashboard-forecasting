import { apiClient } from './client';

export const upMarketApi = {
  getMarketData: async (market: string, startDate: string, endDate: string) => {
    const response = await apiClient.get(`/up-market/${market.toLowerCase()}?startDate=${startDate}&endDate=${endDate}`);
    return response.data;
  }
};
