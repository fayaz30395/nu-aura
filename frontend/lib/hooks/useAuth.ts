'use client';

import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {apiClient, getSharedRefreshPromise, setSharedRefreshPromise, setOnSessionRefreshed} from '../api/client';
import {authApi} from '../api/auth';
import {LoginRequest, GoogleLoginRequest, User, Role} from '../types/core/auth';
import {clearGoogleToken} from '../utils/googleToken';
import {getQueryClient} from '../queryClient';

// HIGH-3: User PII (employeeId, tenantId, name, email, roles) is no longer
// persisted to sessionStorage. Identity is rehydrated via restoreSession()
// from the httpOnly refresh cookie on mount.
const LEGACY_USER_STORAGE_KEY = 'nu-aura-user';

function clearLegacyUserFromStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(LEGACY_USER_STORAGE_KEY);
  } catch { /* ignore */
  }
}

// Convert string roles to Role objects
function convertRolesToObjects(roleStrings: string[], permissionStrings: string[]): Role[] {
  return roleStrings.filter(Boolean).map((roleCode) => ({
    id: roleCode,
    code: roleCode,
    name: roleCode?.replace(/_/g, ' ') ?? roleCode,
    permissions: permissionStrings.filter(Boolean).map((permCode) => ({
      id: permCode,
      code: permCode,
      name: permCode,
      resource: permCode?.split(':')[1] || '',
      action: permCode?.split(':')[2] || '',
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
        set({hasHydrated: hasHydrated});
      },

      login: async (credentials: LoginRequest) => {
        set({isLoading: true});
        try {
          const response = await authApi.login(credentials);

          // Tokens are now set via httpOnly cookies by the backend
          // We only store non-sensitive data client-side
          apiClient.setTenantId(response.tenantId);
          apiClient.resetRedirectFlag(); // Reset 401 redirect flag after fresh login

          // CRIT-001: Require roles/permissions in auth response — no JWT fallback decode
          if (!response.roles?.length) {
            throw new Error('Authentication response missing roles. Please contact support.');
          }
          const roleStrings = response.roles;
          const permissionStrings = response.permissions || [];
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

          set({user, isAuthenticated: true, isLoading: false});
        } catch (error) {
          set({isLoading: false});
          throw error;
        }
      },

      googleLogin: async (credentials: GoogleLoginRequest) => {
        set({isLoading: true});
        try {
          const response = await authApi.googleLogin(credentials);

          // Tokens are now set via httpOnly cookies by the backend
          apiClient.setTenantId(response.tenantId);
          apiClient.resetRedirectFlag(); // Reset 401 redirect flag after fresh login

          // CRIT-001: Require roles/permissions in auth response — no JWT fallback decode
          if (!response.roles?.length) {
            throw new Error('Authentication response missing roles. Please contact support.');
          }
          const roleStrings = response.roles;
          const permissionStrings = response.permissions || [];
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

          set({user, isAuthenticated: true, isLoading: false});
        } catch (error) {
          set({isLoading: false});
          throw error;
        }
      },

      logout: async () => {
        clearLegacyUserFromStorage();
        // Bug #5 FIX: deauthenticate FIRST so no new queries fire after this point,
        // then cancel in-flight queries before clearing cache. Previously, auth state
        // was cleared last — background intervals (notifications, workflow) fired 401s
        // between authApi.logout() and set({ user: null }).
        set({user: null, isAuthenticated: false});
        await getQueryClient().cancelQueries();
        getQueryClient().clear();
        apiClient.clearTokens();
        clearGoogleToken();
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('auth-storage');
        }
        // Notify server best-effort — don't block redirect on network failure
        authApi.logout().catch(() => {
        });
      },

      setUser: (user: User | null) => {
        set({user, isAuthenticated: !!user});
      },

      restoreSession: async () => {
        try {
          set({isLoading: true});

          // P0-SESSION-FIX v2: Always issue our own refresh call that returns the
          // full AuthResponse (with user data). Previously we shared the 401
          // interceptor's refresh promise, but that only returns a boolean, requiring
          // a separate /auth/me call that was fragile and caused race conditions.
          //
          // To prevent concurrent refresh calls (which revoke each other's tokens),
          // we wait for any in-flight 401 interceptor refresh to finish FIRST, then
          // issue our own. The interceptor's refresh sets new cookies, so ours will
          // use the fresh refresh_token.
          const existingRefresh = getSharedRefreshPromise();
          if (existingRefresh) {
            await existingRefresh;
            // Interceptor finished — cookies are now fresh. Fall through to
            // issue our own refresh below, which will use the new cookie and
            // return the full user identity.
          }

          // Issue our own refresh, registering it in the shared mutex so the
          // 401 interceptor won't issue a concurrent one.
          const refreshPromise = authApi.refresh()
            .then((response) => {
              apiClient.setTenantId(response.tenantId);
              apiClient.resetRedirectFlag();

              // CRIT-001: Require roles in auth response — no JWT fallback decode
              if (!response.roles?.length) {
                throw new Error('Session restore failed: missing roles in response.');
              }
              const roleStrings = response.roles;
              const permissionStrings = response.permissions || [];
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

              set({user, isAuthenticated: true, isLoading: false});
              return true;
            })
            .catch(() => {
              set({isLoading: false});
              return false;
            })
            .finally(() => {
              setSharedRefreshPromise(null);
            });

          setSharedRefreshPromise(refreshPromise);
          return await refreshPromise;
        } catch {
          set({isLoading: false});
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      // HIGH-3: Only persist the `isAuthenticated` flag. User identity
      // (employeeId, tenantId, name, email, roles) is rehydrated via
      // restoreSession() against the httpOnly refresh cookie — no PII in
      // sessionStorage.
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Purge any legacy user object left over from the old persist scheme.
        clearLegacyUserFromStorage();
        state?.setHasHydrated(true);
      },
    }
  )
);

/**
 * P0-SESSION-FIX: Register the callback that the Axios 401 interceptor calls
 * after a silent token refresh. This keeps the Zustand auth store in sync with
 * the new httpOnly cookie, preventing the UI from showing stale identity
 * ("User / Employee") after a background token refresh.
 */
setOnSessionRefreshed(async () => {
  const state = useAuth.getState();
  // Only restore if we're supposed to be authenticated but lost the user object
  if (state.isAuthenticated && !state.user) {
    await state.restoreSession();
  }
});
