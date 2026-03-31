import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { apiConfig } from '@/lib/config';
import { logger } from '@/lib/utils/logger';

const API_URL = apiConfig.baseUrl;

/**
 * Module-level state for 401 handling.
 *
 * refreshPromise: holds the in-flight refresh request so concurrent 401s
 * share a single refresh attempt instead of racing (SEC-F06).
 *
 * isRedirecting: prevents multiple concurrent hard-redirects to /auth/login.
 * Auto-resets after REDIRECT_DEBOUNCE_MS to prevent permanent lockout if
 * navigation fails or user returns via browser back button.
 */
let refreshPromise: Promise<boolean> | null = null;
let isRedirecting = false;
let redirectResetTimer: ReturnType<typeof setTimeout> | null = null;
const REDIRECT_DEBOUNCE_MS = 5000;

/**
 * API Client with secure cookie-based authentication.
 *
 * Security features:
 * - Tokens are stored in httpOnly cookies (set by backend)
 * - withCredentials: true ensures cookies are sent with requests
 * - CSRF token is read from cookie and sent in header
 * - No tokens stored in localStorage (XSS protection)
 */
class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      // CRITICAL: Enable credentials for cookie-based auth
      withCredentials: true,
      // Prevent infinite waits on slow/unresponsive backend (30 seconds)
      timeout: 30000,
    });

    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const tenantId = this.getTenantId();

        if (tenantId) {
          config.headers['X-Tenant-ID'] = tenantId;
        }

        // Add CSRF token from cookie to header (double-submit pattern)
        const csrfToken = this.getCsrfToken();
        if (csrfToken && config.method !== 'get') {
          config.headers['X-XSRF-TOKEN'] = csrfToken;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error) => {
        const method = error.config?.method?.toUpperCase?.() ?? 'UNKNOWN';
        logger.error('[ApiClient] Error:', method, error.config?.url, error.response?.status, error.message);
        const originalRequest = error.config;

        // Handle 401 Unauthorized — try to refresh token.
        // Uses a shared Promise so concurrent 401s share one refresh call (SEC-F06).
        const isLoginPage = typeof window !== 'undefined' && window.location.pathname.includes('/auth/login');
        const isRefreshRequest = originalRequest?.url?.includes('/auth/refresh');
        if (error.response?.status === 401 && !originalRequest._retry && !isLoginPage && !isRefreshRequest) {
          originalRequest._retry = true;

          try {
            // Atomic check-and-assign: the nullish coalescing operator ensures
            // refreshPromise is assigned in the same expression that checks it,
            // preventing a race where multiple 401 handlers in the same microtask
            // batch could each see null before any assignment occurs (BUG-001).
            const promise = refreshPromise ?? (refreshPromise = this.client.post('/auth/refresh', null)
              .then((res) => res.status === 200)
              .catch(() => false)
              .finally(() => { refreshPromise = null; }));

            const refreshed = await promise;

            if (refreshed) {
              return this.client(originalRequest);
            }

            // Refresh failed — redirect to login (debounced with auto-reset)
            this.redirectToLogin();

            return Promise.reject(error);
          } catch (refreshError) {
            this.redirectToLogin();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Redirect to login page with debounce protection.
   * Auto-resets after REDIRECT_DEBOUNCE_MS to prevent permanent lockout
   * if navigation fails or user returns via browser back button.
   */
  private redirectToLogin(): void {
    if (isRedirecting) return;

    isRedirecting = true;
    this.clearTokens();

    // Auto-reset redirect flag to prevent permanent lockout
    if (redirectResetTimer) clearTimeout(redirectResetTimer);
    redirectResetTimer = setTimeout(() => {
      isRedirecting = false;
      redirectResetTimer = null;
    }, REDIRECT_DEBOUNCE_MS);

    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login?reason=expired';
    }
  }

  /**
   * Get CSRF token from cookie for double-submit pattern.
   * Uses regex matching to correctly handle cookie values containing '=' characters.
   */
  private getCsrfToken(): string | null {
    if (typeof document === 'undefined') return null;

    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
    return null;
  }

  private normalizeUrl(url: string): string {
    const baseUrl = this.client.defaults.baseURL || '';
    const apiPrefix = '/api/v1';
    if (baseUrl.endsWith(apiPrefix) && url.startsWith(apiPrefix)) {
      const normalized = url.slice(apiPrefix.length);
      return normalized.length > 0 ? normalized : '/';
    }
    return url;
  }

  /**
   * Get tenant ID from localStorage.
   * Note: Tenant ID is not sensitive, so localStorage is acceptable.
   */
  private getTenantId(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tenantId');
    }
    return null;
  }

  /**
   * Store tenant ID in localStorage.
   * Called after successful login.
   */
  setTenantId(tenantId: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tenantId', tenantId);
    }
  }

  /**
   * Clear all client-side auth state.
   * Note: httpOnly cookies are cleared by backend on logout.
   */
  clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tenantId');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('auth-storage');
    }
  }

  /**
   * Reset the 401 redirect debounce flag.
   * Must be called after successful login to restore the interceptor's ability
   * to handle future 401s properly.
   */
  resetRedirectFlag(): void {
    isRedirecting = false;
  }

  get<T>(url: string, config?: AxiosRequestConfig) {
    return this.client.get<T>(this.normalizeUrl(url), config);
  }

  post<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig) {
    return this.client.post<T>(this.normalizeUrl(url), data, config);
  }

  put<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig) {
    return this.client.put<T>(this.normalizeUrl(url), data, config);
  }

  patch<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig) {
    return this.client.patch<T>(this.normalizeUrl(url), data, config);
  }

  delete<T>(url: string, config?: AxiosRequestConfig) {
    return this.client.delete<T>(this.normalizeUrl(url), config);
  }
}

export const apiClient = new ApiClient();
