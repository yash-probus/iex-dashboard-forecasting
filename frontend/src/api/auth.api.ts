import { apiClient } from './client';

export interface AppUser {
  id: string;
  username: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'CLIENT';
  hiddenModules?: string[];
  readOnlyModules?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: AppUser;
}

export const authApi = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', { username, password });
    return response.data;
  },
  sendOtp: async (email: string): Promise<{success: boolean, message: string}> => {
    const response = await apiClient.post('/auth/send-otp', { email });
    return response.data;
  },
  verifyOtp: async (email: string, otp: string): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/verify-otp', { email, otp });
    return response.data;
  }
};
