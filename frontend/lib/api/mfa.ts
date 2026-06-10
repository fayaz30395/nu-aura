import {
  disableMfa as disableMfaGenerated,
  getMfaStatus as getMfaStatusGenerated,
  setupMfa as setupMfaGenerated,
  verifyMfa as verifyMfaGenerated,
} from '@/lib/generated/api/mfa/mfa';
import {mfaLogin as mfaLoginGenerated} from '@/lib/generated/api/authentication/authentication';

/**
 * MFA (Multi-Factor Authentication) API service.
 *
 * T3-12 migration (wave 2): thin facade over the orval-generated `mfa` and
 * `authentication` clients (the `mfa-login` endpoint is tagged under
 * `authentication`). Public `mfaApi` surface preserved so callers
 * (`useMfa.ts` hooks, `MfaSetup.tsx`, `MfaVerification.tsx`) need no edits.
 *
 * Generated calls route through `apiClient` via `orvalMutator`, preserving
 * cookie auth, CSRF double-submit, refresh mutex, and tenant headers.
 */
export const mfaApi = {
  /**
   * Get MFA status for the authenticated user.
   */
  getStatus: async (): Promise<{ enabled: boolean; setupAt?: string }> => {
    const response = await getMfaStatusGenerated();
    return response as unknown as { enabled: boolean; setupAt?: string };
  },

  /**
   * Get MFA setup data including QR code URL, secret, and backup codes.
   */
  getSetup: async (): Promise<{ qrCodeUrl: string; secret: string; backupCodes: string[] }> => {
    const response = await setupMfaGenerated();
    return response as unknown as { qrCodeUrl: string; secret: string; backupCodes: string[] };
  },

  /**
   * Verify and enable MFA with a 6-digit code.
   */
  verify: async (code: string): Promise<{ backupCodes: string[] }> => {
    const response = await verifyMfaGenerated({code});
    return response as unknown as { backupCodes: string[] };
  },

  /**
   * Disable MFA with a verification code.
   */
  disable: async (code: string): Promise<void> => {
    await disableMfaGenerated({code});
  },

  /**
   * Complete MFA login during authentication.
   *
   * SEC (3c): the backend now REQUIRES the opaque `mfaToken` pre-auth handle
   * issued by /login (it binds the second factor to the first). The legacy
   * userId-based call is rejected server-side with 401.
   */
  mfaLogin: async (mfaToken: string, code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number
  }> => {
    const response = await mfaLoginGenerated({mfaToken, code});
    return response as unknown as {
      accessToken: string;
      refreshToken: string;
      tokenType: string;
      expiresIn: number;
    };
  },
};
