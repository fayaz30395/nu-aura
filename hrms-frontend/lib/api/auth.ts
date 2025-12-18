import { apiClient } from './client';
import { LoginRequest, AuthResponse, ChangePasswordRequest, GoogleLoginRequest } from '../types/auth';

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
    apiClient.clearTokens();
  },

  refresh: async (): Promise<AuthResponse> => {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await apiClient.post<AuthResponse>('/auth/refresh', null, {
      headers: {
        'X-Refresh-Token': refreshToken,
      },
    });
    return response.data;
  },

  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    await apiClient.post('/auth/change-password', data);
  },

  googleLogin: async (data: GoogleLoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/google', data);
    return response.data;
  },
};
