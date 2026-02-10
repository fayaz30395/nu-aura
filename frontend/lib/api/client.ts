import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { apiConfig } from '@/lib/config';
import { logger } from '@/lib/utils/logger';

const API_URL = apiConfig.baseUrl;

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
        logger.error('[ApiClient] Error:', error.config?.method?.toUpperCase(), error.config?.url, error.response?.status, error.message);
        const originalRequest = error.config;

        // Handle 401 Unauthorized - try to refresh token
        // Refresh token is also in httpOnly cookie, sent automatically
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Refresh request - cookies are sent automatically
            const response = await this.client.post('/auth/refresh', null);

            // If refresh succeeded, retry original request
            // New tokens are set via cookies by the backend
            if (response.status === 200) {
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            this.clearTokens();
            window.location.href = '/auth/login?reason=expired';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Get CSRF token from cookie for double-submit pattern.
   */
  private getCsrfToken(): string | null {
    if (typeof document === 'undefined') return null;

    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'XSRF-TOKEN') {
        return decodeURIComponent(value);
      }
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
      localStorage.removeItem('user');
      localStorage.removeItem('auth-storage');
    }
  }

  /**
   * @deprecated Tokens are now stored in httpOnly cookies.
   * This method is kept for backward compatibility during migration.
   */
  setTokens(_accessToken: string, _refreshToken: string): void {
    // No-op: tokens are now set via httpOnly cookies by the backend
    logger.warn('[ApiClient] setTokens() is deprecated. Tokens are now managed via httpOnly cookies.');
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
