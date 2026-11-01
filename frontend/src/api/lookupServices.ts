import { getApiClient } from "./apiClient";
import API_ENDPOINTS from "./endpoints";

export const lookupServices = {
  async getStateAndDiscomLookup() {
    const endpoint = API_ENDPOINTS.LOOKUP_DATA.GET_STATE_AND_DSICOM_LOOKUP;
    const apiClient = getApiClient(endpoint.service);
    const response = await apiClient.get(endpoint.path);

    return response.data;
  },
  async getConsumerCategoryLookup() {
    const endpoint = API_ENDPOINTS.LOOKUP_DATA.GET_CONSUMER_CATEGORY_LOOKUP;
    const apiClient = getApiClient(endpoint.service);
    const response = await apiClient.get(endpoint.path);

    return response.data;
  },
  async getVoltageLevelLookup() {
    const endpoint = API_ENDPOINTS.LOOKUP_DATA.GET_VOLTAGE_LEVEL_LOOKUP;
    const apiClient = getApiClient(endpoint.service);
    const response = await apiClient.get(endpoint.path);

    return response.data;
  },
  async getHvCategoryLevelLookup() {
    const endpoint = API_ENDPOINTS.LOOKUP_DATA.GET_HV_CATEGORY_LOOKUP;
    const apiClient = getApiClient(endpoint.service);
    const response = await apiClient.get(endpoint.path);

    return response.data;
  },
};
