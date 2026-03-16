'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { apiClient } from '../api/client';
import { authApi } from '../api/auth';
import { LoginRequest, GoogleLoginRequest, User, Role } from '../types/auth';
import { clearGoogleToken } from '../utils/googleToken';

/**
 * Decode JWT token to extract roles and permissions.
 *
 * Note: With httpOnly cookies, we can't access the token directly.
 * The backend now returns roles/permissions in the AuthResponse body
 * for the frontend to use. This function is kept for backward compatibility
 * with tokens still in the response body during migration.
 */
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
  /**
   * Attempt to restore a session using the httpOnly refresh cookie.
   * Returns true if the session was restored, false otherwise.
   * This prevents redirect loops when Zustand state is cleared but cookies are still valid.
   */
  restoreSession: () => Promise<boolean>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null as User | null,
      isAuthenticated: false,
      isLoading: false,
      hasHydrated: false,

      setHasHydrated: (hasHydrated: boolean) => {
        set({ hasHydrated: hasHydrated });
      },

      login: async (credentials: LoginRequest) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login(credentials);

          // Tokens are now set via httpOnly cookies by the backend
          // We only store non-sensitive data client-side
          apiClient.setTenantId(response.tenantId);
          apiClient.resetRedirectFlag(); // Reset 401 redirect flag after fresh login

          // Extract roles and permissions from JWT token in response body
          // (still available for frontend permission checks during migration)
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
            profilePictureUrl: response.profilePictureUrl,
          };

          // Store user data in localStorage for backward compatibility with pages that access it directly
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('user', JSON.stringify(user));
          }

          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      googleLogin: async (credentials: GoogleLoginRequest) => {
        set({ isLoading: true });
        try {
          const response = await authApi.googleLogin(credentials);

          // Tokens are now set via httpOnly cookies by the backend
          apiClient.setTenantId(response.tenantId);
          apiClient.resetRedirectFlag(); // Reset 401 redirect flag after fresh login

          // Extract roles and permissions from JWT token in response body
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
            profilePictureUrl: response.profilePictureUrl,
          };

          // Store user data in localStorage for backward compatibility with pages that access it directly
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('user', JSON.stringify(user));
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
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('auth-storage'); // Clear Zustand persisted auth state
          }
          set({ user: null, isAuthenticated: false });
        }
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
      },

      restoreSession: async () => {
        try {
          set({ isLoading: true });
          const response = await authApi.refresh();

          apiClient.setTenantId(response.tenantId);
          apiClient.resetRedirectFlag();

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
            profilePictureUrl: response.profilePictureUrl,
          };

          if (typeof window !== 'undefined') {
            sessionStorage.setItem('user', JSON.stringify(user));
          }

          set({ user, isAuthenticated: true, isLoading: false });
          return true;
        } catch {
          set({ isLoading: false });
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
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
