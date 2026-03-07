import { apiClient } from './client';

/**
 * MFA (Multi-Factor Authentication) API service.
 */
export const mfaApi = {
  /**
   * Get MFA status for the authenticated user.
   */
  getStatus: async (): Promise<{ enabled: boolean; setupAt?: string }> => {
    const response = await apiClient.get<{ enabled: boolean; setupAt?: string }>('/v1/auth/mfa/status');
    return response.data;
  },

  /**
   * Get MFA setup data including QR code URL, secret, and backup codes.
   */
  getSetup: async (): Promise<{ qrCodeUrl: string; secret: string; backupCodes: string[] }> => {
    const response = await apiClient.get<{ qrCodeUrl: string; secret: string; backupCodes: string[] }>('/v1/auth/mfa/setup');
    return response.data;
  },

  /**
   * Verify and enable MFA with a 6-digit code.
   */
  verify: async (code: string): Promise<{ backupCodes: string[] }> => {
    const response = await apiClient.post<{ backupCodes: string[] }>('/v1/auth/mfa/verify', { code });
    return response.data;
  },

  /**
   * Disable MFA with a verification code.
   */
  disable: async (code: string): Promise<void> => {
    await apiClient.delete('/v1/auth/mfa/disable', { data: { code } });
  },

  /**
   * Complete MFA login during authentication.
   */
  mfaLogin: async (userId: string, code: string): Promise<{ accessToken: string; refreshToken: string; tokenType: string; expiresIn: number }> => {
    const response = await apiClient.post('/v1/auth/mfa-login', { userId, code });
    return response.data;
  },
};
