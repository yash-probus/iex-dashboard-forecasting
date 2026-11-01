import { apiClient } from './client';
import { PaginatedResponse } from './datasets.api';

export interface UploadHistoryRecord {
  id: string;
  datasetId: string;
  market: string;
  deliveryDate: string;
  action: 'UPLOAD' | 'REPLACE' | 'DELETE';
  timestamp: string;
}

export interface UploadResponse {
  success: boolean;
  datasetId: string;
  market: string;
  deliveryDate: string;
  fileName: string;
  rowCount: number;
  parsed: boolean;
}

export const uploadApi = {
  getUploadHistory: async (page = 1, limit = 20): Promise<PaginatedResponse<UploadHistoryRecord>> => {
    const response = await apiClient.get<PaginatedResponse<UploadHistoryRecord>>(`/upload-history?page=${page}&limit=${limit}`);
    return response.data;
  },

  uploadDataset: async (
    market: string, 
    deliveryDate: string, 
    file: File, 
    action?: 'replace',
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('market', market);
    formData.append('deliveryDate', deliveryDate);
    formData.append('file', file);

    const url = action === 'replace' ? '/uploads?action=replace' : '/uploads';
    
    const response = await apiClient.post<UploadResponse>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress
    });
    
    return response.data;
  }
};
