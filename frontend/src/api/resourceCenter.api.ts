import { apiClient } from './client';

export interface ResourceResponse<T = any> {
  success: boolean;
  data: T[];
  message?: string;
}

export const getResourceData = async <T>(resourceType: string): Promise<ResourceResponse<T>> => {
  const response = await apiClient.get(`/resource-center/${resourceType}`);
  return response.data;
};

export const createResource = async (resourceType: string, payload: any): Promise<ResourceResponse> => {
  const response = await apiClient.post(`/resource-center/${resourceType}`, payload);
  return response.data;
};

export const uploadBulk = async (resourceType: string, payloadArray: any[]): Promise<ResourceResponse> => {
  const response = await apiClient.post(`/resource-center/${resourceType}/bulk`, payloadArray);
  return response.data;
};

export const updateResource = async (resourceType: string, id: number, payload: any): Promise<ResourceResponse> => {
  const response = await apiClient.put(`/resource-center/${resourceType}/${id}`, payload);
  return response.data;
};

export const deleteResource = async (resourceType: string, id: number): Promise<ResourceResponse> => {
  const response = await apiClient.delete(`/resource-center/${resourceType}/${id}`);
  return response.data;
};
