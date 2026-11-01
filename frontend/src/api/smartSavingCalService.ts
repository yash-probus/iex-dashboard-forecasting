import { getApiClient } from "./apiClient";
import API_ENDPOINTS from "./endpoints";

export const smartSavingCalService = {
  async saveTodConsumptionDetails(data: any, params?: any) {
    const endpoint = API_ENDPOINTS.SAVING_CALCULATOR.SAVE_TOD_CONSUMPTION;
    const apiClient = getApiClient(endpoint.service);
    const response = await apiClient.post(endpoint.path, data, { params });
    return response.data;
  },
  async guestSavingEstimatorCalc(data: any) {
    const endpoint =
      API_ENDPOINTS.SAVING_CALCULATOR.LANDING_GUEST_SAVE_ESTIMATOR;
    const apiClient = getApiClient(endpoint.service);
    const response = await apiClient.post(endpoint.path, data);
    return response.data;
  },

  async saveConsumerAndTodConsumptionDetails(data: any) {
    const endpoint =
      API_ENDPOINTS.SAVING_CALCULATOR.SAVE_CONSUMER_AND_TOD_CONSUMPTION;
    const apiClient = getApiClient(endpoint.service);
    const response = await apiClient.post(endpoint.path, data);
    return response.data;
  },

  async userAllRunId() {
    const endpoint = API_ENDPOINTS.SAVING_CALCULATOR.USER_ALL_RUN_ID;
    const apiClient = getApiClient(endpoint.service);
    const response = await apiClient.get(endpoint.path);
    return response.data;
  },
  async completeOverviewReportFull(data?: any) {
    const endpoint =
      API_ENDPOINTS.SAVING_CALCULATOR.COMPLETE_OVERVIEW_REPORT_FULL;
    const apiClient = getApiClient(endpoint.service);
    const response = await apiClient.get(endpoint.path, { params: data });
    return response.data;
  },
  async completeCalcDashOverviewReportFull(data?: any) {
    const endpoint =
      API_ENDPOINTS.SAVING_CALCULATOR.COMPLETE_CALC_DASH_OVERVIEW_REPORT_FULL;
    const apiClient = getApiClient(endpoint.service);
    const response = await apiClient.get(endpoint.path, { params: data });
    return response.data;
  },
  async completeMonthlyReportFull(data: any) {
    const endpoint =
      API_ENDPOINTS.SAVING_CALCULATOR.COMPLETE_MONTHLY_REPORT_FULL;
    const apiClient = getApiClient(endpoint.service);
    const response = await apiClient.get(endpoint.path, { params: data });
    return response.data;
  },
  async getConsumerDataInfo() {
    const endpoint = API_ENDPOINTS.SAVING_CALCULATOR.CONSUMER_CONFIG_DATA_INFO;
    const apiClient = getApiClient(endpoint.service);
    const response = await apiClient.get(`${endpoint.path}`);
    return response.data;
  },
  async consumerTodConsumptionByRunId(data: any) {
    const endpoint =
      API_ENDPOINTS.SAVING_CALCULATOR.CONSUMER_TOD_CONSUMPTION_BY_RUN_ID;
    const apiClient = getApiClient(endpoint.service);
    const response = await apiClient.get(`${endpoint.path}/${data.runId}`);
    return response.data;
  },

  async getMonthWiseData(data: any) {
    const endpoint = API_ENDPOINTS.SAVING_CALCULATOR.GET_MONTH_DATA;
    const apiClient = getApiClient(endpoint.service);
    const response = await apiClient.get(endpoint.path, { params: data });
    return response.data;
  },
  async getTodConfig(params: {
    state: string;
    discom: string;
    month: string;
    year: number;
    hvCategory?: string;
  }) {
    const endpoint = API_ENDPOINTS.LOOKUP_DATA.GET_TOD_CONFIG;
    const apiClient = getApiClient(endpoint.service);
    const response = await apiClient.get(endpoint.path, { params });
    return response.data;
  },
  async getUserRecentCalculation() {
    const endpoint = API_ENDPOINTS.LOOKUP_DATA.GET_USER_RECENT_CALCULATION;
    const apiClient = getApiClient(endpoint.service);
    const response = await apiClient.get(endpoint.path);
    return response.data;
  },

  async uploadBillForTodCalculation(files: File[], params: any) {
    const formData = new FormData();
    files.forEach((file: File) => {
      formData.append("files", file);
    });

    const endpoint =
      API_ENDPOINTS.SAVING_CALCULATOR.UPLOAD_BILL_FOR_TOD_CALCULATION;
    const apiClient = getApiClient(endpoint.service);
    const response = await apiClient.post(endpoint.path, formData, {
      params,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  async uploadBillForOaCalculation(files: File[], params: any) {
    const formData = new FormData();
    files.forEach((file: File) => {
      formData.append("files", file);
    });

    const endpoint =
      API_ENDPOINTS.SAVING_CALCULATOR.UPLOAD_BILL_FOR_OA_CALCULATION;
    const apiClient = getApiClient(endpoint.service);
    const response = await apiClient.post(endpoint.path, formData, {
      params,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
  async getMonthlyCostVsConsumption(params: any) {
    const endpoint = API_ENDPOINTS.SAVING_CALCULATOR.COST_VS_CONSIMPTION_DATA;
    const apiClient = getApiClient(endpoint.service);
    const response = await apiClient.get(endpoint.path, { params });
    return response.data;
  },
};
