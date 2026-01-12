'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '../api/client';
import { authApi } from '../api/auth';
import { LoginRequest, GoogleLoginRequest, User, Role } from '../types/auth';
import { clearGoogleToken } from '../utils/googleToken';

// Decode JWT token to extract roles and permissions
function decodeJwt(token: string): { roles: string[]; permissions: string[] } {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    return {
      roles: payload.roles || [],
      permissions: payload.permissions || [],
    };
  } catch (e) {
    console.error('Failed to decode JWT:', e);
    return { roles: [], permissions: [] };
  }
}

// Convert string roles to Role objects
function convertRolesToObjects(roleStrings: string[], permissionStrings: string[]): Role[] {
  return roleStrings.map((roleCode) => ({
    id: roleCode,
    code: roleCode,
    name: roleCode.replace(/_/g, ' '),
    permissions: permissionStrings.map((permCode) => ({
      id: permCode,
      code: permCode,
      name: permCode,
      resource: permCode.split(':')[1] || '',
      action: permCode.split(':')[2] || '',
    })),
  }));
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
  login: (credentials: LoginRequest) => Promise<void>;
  googleLogin: (credentials: GoogleLoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      hasHydrated: false,

      setHasHydrated: (hasHydrated: boolean) => {
        set({ hasHydrated: hasHydrated });
      },

      login: async (credentials: LoginRequest) => {
        console.log('[Auth] Login started for:', credentials.email);
        set({ isLoading: true });
        try {
          console.log('[Auth] Calling authApi.login...');
          const response = await authApi.login(credentials);
          console.log('[Auth] Login response received:', { userId: response.userId, email: response.email });

          apiClient.setTokens(response.accessToken, response.refreshToken);
          apiClient.setTenantId(response.tenantId);
          console.log('[Auth] Tokens and tenantId set');

          // Extract roles and permissions from JWT token
          const { roles: roleStrings, permissions: permissionStrings } = decodeJwt(response.accessToken);
          const roles = convertRolesToObjects(roleStrings, permissionStrings);

          const user: User = {
            id: response.userId,
            employeeId: response.employeeId,
            tenantId: response.tenantId,
            email: response.email,
            firstName: response.fullName.split(' ')[0] || '',
            lastName: response.fullName.split(' ').slice(1).join(' ') || '',
            fullName: response.fullName,
            status: 'ACTIVE',
            roles: roles,
          };

          // Store user data in localStorage for backward compatibility with pages that access it directly
          if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(user));
          }

          console.log('[Auth] Setting user and isAuthenticated:', { userId: user.id, email: user.email });
          set({ user, isAuthenticated: true, isLoading: false });
          console.log('[Auth] Login completed successfully');
        } catch (error) {
          console.error('[Auth] Login failed:', error);
          set({ isLoading: false });
          throw error;
        }
      },

      googleLogin: async (credentials: GoogleLoginRequest) => {
        set({ isLoading: true });
        try {
          const response = await authApi.googleLogin(credentials);

          apiClient.setTokens(response.accessToken, response.refreshToken);
          apiClient.setTenantId(response.tenantId);

          // Extract roles and permissions from JWT token
          const { roles: roleStrings, permissions: permissionStrings } = decodeJwt(response.accessToken);
          const roles = convertRolesToObjects(roleStrings, permissionStrings);

          const user: User = {
            id: response.userId,
            employeeId: response.employeeId,
            tenantId: response.tenantId,
            email: response.email,
            firstName: response.fullName.split(' ')[0] || '',
            lastName: response.fullName.split(' ').slice(1).join(' ') || '',
            fullName: response.fullName,
            status: 'ACTIVE',
            roles: roles,
          };

          // Store user data in localStorage for backward compatibility with pages that access it directly
          if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(user));
          }

          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          apiClient.clearTokens();
          // Clear Google SSO tokens (Drive, Mail)
          clearGoogleToken();
          if (typeof window !== 'undefined') {
            localStorage.removeItem('user');
            localStorage.removeItem('auth-storage'); // Clear Zustand persisted auth state
          }
          set({ user: null, isAuthenticated: false });
        }
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        // Exclude hasHydrated from persistence - it should always start as false
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
