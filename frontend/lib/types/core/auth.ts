export interface LoginRequest {
  tenantId?: string;
  email: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  userId: string;
  employeeId?: string;
  tenantId: string;
  email: string;
  fullName: string;
  profilePictureUrl?: string;
  // CRIT-001: permissions in response body (not JWT) to keep cookie under 4KB
  roles?: string[];
  permissions?: string[];
  // M-2 / SEC (3c): when the account has MFA enabled, /login returns NO tokens —
  // only mfaRequired=true plus a short-lived opaque pre-auth handle that must be
  // presented to /mfa-login together with the TOTP/backup code.
  mfaRequired?: boolean;
  mfaToken?: string;
  // SEC: admin-reset or newly-created accounts must change their temp password on first login.
  mustChangePassword?: boolean;
}

/**
 * Signal returned by `useAuth.login` when the backend requires a second factor.
 * No session exists yet — the caller must complete /mfa-login with this token.
 */
export interface MfaChallenge {
  mfaRequired: true;
  mfaToken: string;
}

export interface User {
  id: string;
  employeeId?: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  status: string;
  roles: Role[];
  profilePictureUrl?: string;
  mustChangePassword?: boolean;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  permissions: Permission[];
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  resource: string;
  action: string;
}

export interface GoogleLoginRequest {
  credential: string;
  tenantId?: string;
  accessToken?: boolean;  // Maps to isAccessToken in backend (Jackson serializes boolean is* fields without prefix)
}
