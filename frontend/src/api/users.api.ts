import { apiClient } from './client';
import { AppUser } from './auth.api';

export const usersApi = {
  getAllUsers: async (): Promise<AppUser[]> => {
    const response = await apiClient.get('/users');
    return response.data.data;
  },

  createUser: async (data: any): Promise<AppUser> => {
    const response = await apiClient.post('/users', data);
    return response.data.data;
  },

  updateUser: async (id: string, data: any): Promise<AppUser> => {
    const response = await apiClient.put(`/users/${id}`, data);
    return response.data.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },

  getAuditLogs: async (): Promise<any[]> => {
    const response = await apiClient.get('/users/audit-logs');
    return response.data.data;
  }
};
