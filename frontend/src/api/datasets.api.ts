import { apiClient } from './client';

export interface Dataset {
  id: string;
  market: string;
  deliveryDate: string;
  status: 'ACTIVE' | 'REPLACED' | 'DELETED';
  fileName: string;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DatasetSummary {
  totalDatasets: number;
  activeDatasets: number;
  replacedDatasets: number;
  deletedDatasets: number;
  totalUploadHistoryRecords: number;
  latestUploadTimestamp: string | null;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const datasetsApi = {
  getSummary: async (): Promise<ApiResponse<DatasetSummary>> => {
    const response = await apiClient.get<ApiResponse<DatasetSummary>>('/datasets/summary');
    return response.data;
  },
  
  getDatasets: async (page = 1, limit = 20, status?: string): Promise<PaginatedResponse<Dataset>> => {
    const url = status 
      ? `/datasets?page=${page}&limit=${limit}&status=${status}`
      : `/datasets?page=${page}&limit=${limit}`;
    const response = await apiClient.get<PaginatedResponse<Dataset>>(url);
    return response.data;
  },

  deleteDataset: async (id: string, signal?: AbortSignal): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/datasets/${id}`, { signal });
    return response.data;
  }
};
