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
