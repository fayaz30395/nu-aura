import { apiClient } from './client';
import { LoginRequest, AuthResponse, ChangePasswordRequest, GoogleLoginRequest } from '../types/auth';

/**
 * Authentication API service.
 *
 * Security: All token handling is now done via httpOnly cookies.
 * The refresh token is automatically sent in cookies with requests to /auth endpoints.
 */
export const authApi = {
  /**
   * Login with email/password.
   * Tokens are set via httpOnly cookies by the backend.
   */
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/v1/auth/login', data);
    return response.data;
  },

  /**
   * Logout and revoke tokens.
   * Backend clears cookies and blacklists tokens.
   */
  logout: async (): Promise<void> => {
    await apiClient.post('/v1/auth/logout');
    apiClient.clearTokens();
  },

  /**
   * Refresh access token.
   * Refresh token is sent automatically via httpOnly cookie.
   */
  refresh: async (): Promise<AuthResponse> => {
    // No need to manually pass refresh token - it's in httpOnly cookie
    const response = await apiClient.post<AuthResponse>('/v1/auth/refresh', null);
    return response.data;
  },

  /**
   * Change password for authenticated user.
   */
  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    await apiClient.post('/v1/auth/change-password', data);
  },

  /**
   * Login with Google OAuth.
   * Tokens are set via httpOnly cookies by the backend.
   */
  googleLogin: async (data: GoogleLoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/v1/auth/google', data);
    return response.data;
  },
};
