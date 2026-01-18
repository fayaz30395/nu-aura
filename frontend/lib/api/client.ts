import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

console.log('[ApiClient] Initialized with API_URL:', API_URL);

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getAccessToken();
        const tenantId = this.getTenantId();

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        if (tenantId) {
          config.headers['X-Tenant-ID'] = tenantId;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log('[ApiClient] Response:', response.config.method?.toUpperCase(), response.config.url, response.status);
        return response;
      },
      async (error) => {
        console.error('[ApiClient] Error:', error.config?.method?.toUpperCase(), error.config?.url, error.response?.status, error.message);
        const originalRequest = error.config;

        // Handle 401 Unauthorized - try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = this.getRefreshToken();
            if (refreshToken) {
              const response = await this.client.post('/auth/refresh', null, {
                headers: {
                  'X-Refresh-Token': refreshToken,
                },
              });

              const { accessToken, refreshToken: newRefreshToken } = response.data;
              this.setTokens(accessToken, newRefreshToken);

              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
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

  private normalizeUrl(url: string): string {
    const baseUrl = this.client.defaults.baseURL || '';
    const apiPrefix = '/api/v1';
    if (baseUrl.endsWith(apiPrefix) && url.startsWith(apiPrefix)) {
      const normalized = url.slice(apiPrefix.length);
      return normalized.length > 0 ? normalized : '/';
    }
    return url;
  }

  private getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  }

  private getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refreshToken');
    }
    return null;
  }

  private getTenantId(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tenantId');
    }
    return null;
  }

  setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    }
  }

  setTenantId(tenantId: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tenantId', tenantId);
    }
  }

  clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('tenantId');
      localStorage.removeItem('user');
      localStorage.removeItem('auth-storage');
    }
  }

  get<T>(url: string, config?: any) {
    return this.client.get<T>(this.normalizeUrl(url), config);
  }

  post<T>(url: string, data?: any, config?: any) {
    return this.client.post<T>(this.normalizeUrl(url), data, config);
  }

  put<T>(url: string, data?: any, config?: any) {
    return this.client.put<T>(this.normalizeUrl(url), data, config);
  }

  patch<T>(url: string, data?: any, config?: any) {
    return this.client.patch<T>(this.normalizeUrl(url), data, config);
  }

  delete<T>(url: string, config?: any) {
    return this.client.delete<T>(this.normalizeUrl(url), config);
  }
}

export const apiClient = new ApiClient();
