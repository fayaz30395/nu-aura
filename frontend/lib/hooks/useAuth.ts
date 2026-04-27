'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { apiClient, getSharedRefreshPromise, setSharedRefreshPromise, setOnSessionRefreshed } from '../api/client';
import { authApi } from '../api/auth';
import { LoginRequest, GoogleLoginRequest, User, Role } from '../types/core/auth';
import { clearGoogleToken } from '../utils/googleToken';
import { getQueryClient } from '../queryClient';

/**
 * P0-SESSION: Persist user to a SEPARATE sessionStorage key ('nu-aura-user').
 * We can't rely on the Zustand persist middleware's partialize config because:
 * 1. HMR doesn't re-create the store singleton — old partialize stays in memory
 * 2. Even if fixed, every Zustand set() call overwrites sessionStorage with
 *    partialize output, erasing any user data we inject directly
 *
 * On page load, the onRehydrateStorage callback reads this key and merges the
 * user back into the Zustand state, making it immediately available.
 */
const USER_STORAGE_KEY = 'nu-aura-user';

function persistUserToStorage(user: User): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch { /* ignore */ }
}

function readUserFromStorage(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearUserFromStorage(): void {
  if (typeof window === 'undefined') return;
  try { sessionStorage.removeItem(USER_STORAGE_KEY); } catch { /* ignore */ }
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

          set({ user, isAuthenticated: true, isLoading: false });
          persistUserToStorage(user);
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

          set({ user, isAuthenticated: true, isLoading: false });
          persistUserToStorage(user);
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        clearUserFromStorage();
        // Bug #5 FIX: deauthenticate FIRST so no new queries fire after this point,
        // then cancel in-flight queries before clearing cache. Previously, auth state
        // was cleared last — background intervals (notifications, workflow) fired 401s
        // between authApi.logout() and set({ user: null }).
        set({ user: null, isAuthenticated: false });
        await getQueryClient().cancelQueries();
        getQueryClient().clear();
        apiClient.clearTokens();
        clearGoogleToken();
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('auth-storage');
        }
        // Notify server best-effort — don't block redirect on network failure
        authApi.logout().catch(() => {});
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
      },

      restoreSession: async () => {
        try {
          set({ isLoading: true });

          // P0-SESSION-FIX v3: Try /auth/me FIRST (uses access_token cookie, does
          // NOT rotate refresh_token). This avoids the cascade where N parallel
          // page mounts each call /auth/refresh and invalidate each other's tokens
          // (observed under Playwright with 4 workers, also a real prod risk on
          // multi-tab navigation). Only fall back to /auth/refresh on 401, meaning
          // the access_token has actually expired.
          try {
            const meResponse = await authApi.me();
            apiClient.setTenantId(meResponse.tenantId);
            apiClient.resetRedirectFlag();
            if (!meResponse.roles?.length) {
              throw new Error('Session restore failed: missing roles in /auth/me response.');
            }
            const roleStrings = meResponse.roles;
            const permissionStrings = meResponse.permissions || [];
            const roles = convertRolesToObjects(roleStrings, permissionStrings);
            const user: User = {
              id: meResponse.userId,
              employeeId: meResponse.employeeId,
              tenantId: meResponse.tenantId,
              email: meResponse.email,
              firstName: meResponse.fullName.split(' ')[0] || '',
              lastName: meResponse.fullName.split(' ').slice(1).join(' ') || '',
              fullName: meResponse.fullName,
              status: 'ACTIVE',
              roles: roles,
              profilePictureUrl: meResponse.profilePictureUrl,
            };
            set({ user, isAuthenticated: true, isLoading: false });
            persistUserToStorage(user);
            return true;
          } catch (err) {
            // Only fall through on 401 (real "session expired" signal). On 5xx,
            // network errors, CORS, etc. the session may still be valid — the
            // API just hiccupped. Triggering a refresh-token rotation in that
            // case is the exact cascade v3 was designed to prevent.
            const status = (err as {response?: {status?: number}})?.response?.status;
            if (status !== 401) {
              set({ isLoading: false });
              return false;
            }
            // 401 — fall through to refresh path below.
          }

          // P0-SESSION-FIX v2: refresh path (used when access_token has expired).
          // To prevent concurrent refresh calls (which revoke each other's tokens),
          // we wait for any in-flight 401 interceptor refresh to finish FIRST, then
          // issue our own. The interceptor's refresh sets new cookies, so ours will
          // use the fresh refresh_token.
          const existingRefresh = getSharedRefreshPromise();
          if (existingRefresh) {
            await existingRefresh;
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

              set({ user, isAuthenticated: true, isLoading: false });
              persistUserToStorage(user);
              return true;
            })
            .catch(() => {
              set({ isLoading: false });
              return false;
            })
            .finally(() => {
              setSharedRefreshPromise(null);
            });

          setSharedRefreshPromise(refreshPromise);
          return await refreshPromise;
        } catch {
          set({ isLoading: false });
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      // Persist both auth flag AND user object in sessionStorage. This eliminates
      // the fragile restoreSession() dance on page loads — the user object is
      // immediately available after Zustand hydrates, preventing the deadlock where
      // isReady=false blocks restoreSession from ever being called, and the race
      // condition where 401 interceptor and restoreSession compete for token refresh.
      // The user object (name, email, roles) is non-sensitive — the same data is
      // already in the JWT cookie and sent over the wire on every API call.
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        // P0-SESSION: Restore user from the separate storage key if the
        // Zustand persist didn't include it (old partialize still in runtime).
        if (state && state.isAuthenticated && !state.user) {
          const savedUser = readUserFromStorage();
          if (savedUser) {
            state.setUser(savedUser);
          }
        }
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
