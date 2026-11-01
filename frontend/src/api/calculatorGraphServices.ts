import { getApiClient } from "./apiClient";
import API_ENDPOINTS from "./endpoints";

export const calculatorGraphsServices = {
  async getMonthlyDayWiseData(params: { month: string; year: number }) {
    const endpoint =
      API_ENDPOINTS.MONTHLY_CALCULATOR_GRAPH_DATA.GET_MONTHLY_DAY_WISE_DATA;
    const apiClient = getApiClient();
    const response = await apiClient.get(endpoint.path, { params });
    return response.data;
  },
  async getMonthlyDayWiseActualData(params: { month: string; year: number }) {
    const endpoint =
      API_ENDPOINTS.MONTHLY_CALCULATOR_GRAPH_DATA
        .GET_MONTHLY_DAY_WISE_ACTUAL_CONSUMPTION;
    const apiClient = getApiClient();
    const response = await apiClient.get(endpoint.path, { params });
    return response.data;
  },
  async getMonthlyDayWiseProltData(params: { month: string; year: number }) {
    const endpoint =
      API_ENDPOINTS.MONTHLY_CALCULATOR_GRAPH_DATA
        .GET_MONTHLY_DAY_WISE_PROLT_CONSUMPTION;
    const apiClient = getApiClient();
    const response = await apiClient.get(endpoint.path, { params });
    return response.data;
  },
  async getDailyBreakdownData(params: { month: string; year: number }) {
    const endpoint =
      API_ENDPOINTS.MONTHLY_CALCULATOR_GRAPH_DATA.GET_DAILY_BREAKDOWN_DATA;
    const apiClient = getApiClient();
    const response = await apiClient.get(endpoint.path, { params });
    return response.data;
  },
};
