import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { apiConfig, isProduction } from '@/lib/config';
import { logger } from '@/lib/utils/logger';

/**
 * Get the API base URL with proper handling
 * Throws an error in production if API URL is not properly configured
 */
function getApiBaseUrl(): string {
  const apiUrl = apiConfig.baseUrl;

  if (!apiUrl || apiUrl === 'undefined') {
    if (isProduction) {
      logger.error('[PublicApiClient] API URL is not configured');
      throw new Error('API URL is not configured');
    }
    // Development fallback
    return 'http://localhost:8080/api/v1';
  }

  return apiUrl;
}

/**
 * Public API Client for unauthenticated endpoints
 * Used for public portals like preboarding, offer acceptance, etc.
 */
class PublicApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: getApiBaseUrl(),
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        // Log error details using logger (development-gated)
        logger.error('[PublicApiClient] Error:', {
          url: error.config?.url,
          method: error.config?.method?.toUpperCase(),
          status: error.response?.status,
          message: error.message,
        });

        // Transform error for consistent handling
        if (error.response) {
          // Server responded with error status
          const errorMessage = error.response.data?.message ||
                               error.response.data?.error ||
                               'An error occurred';
          const enhancedError = new Error(errorMessage);
          (enhancedError as Error & { status: number }).status = error.response.status;
          return Promise.reject(enhancedError);
        } else if (error.request) {
          // Request made but no response
          return Promise.reject(new Error('Unable to reach server. Please check your connection.'));
        }

        return Promise.reject(error);
      }
    );
  }

  private normalizeUrl(url: string): string {
    const baseUrl = this.client.defaults.baseURL || '';
    const apiPrefix = '/api/v1';
    if (baseUrl.endsWith(apiPrefix) && url.startsWith(apiPrefix)) {
      return url.slice(apiPrefix.length) || '/';
    }
    return url;
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

export const publicApiClient = new PublicApiClient();
