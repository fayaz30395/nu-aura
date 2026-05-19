import type {AxiosRequestConfig, AxiosResponse} from 'axios';
import {apiClient} from './client';

/**
 * Orval custom mutator wrapper for the existing `apiClient`.
 *
 * Orval generates per-endpoint functions that call this mutator. Routing each
 * call through `apiClient` preserves the hand-rolled Axios interceptors:
 * - httpOnly cookie auth + CSRF double-submit
 * - 401 refresh-token mutex (shared with useAuth.restoreSession)
 * - Debounced redirect-to-login on refresh failure
 * - Tenant header injection
 * - URL `/api/v1` prefix normalization
 *
 * Generated code stays thin and type-safe; the auth/refresh contract is
 * untouched.
 *
 * Configured in `orval.config.ts` under `output.override.mutator`.
 */
export const orvalMutator = <T>(config: AxiosRequestConfig): Promise<T> => {
  const method = (config.method ?? 'get').toLowerCase();
  const url = config.url ?? '';
  const {data, params, headers, responseType, signal, timeout} = config;
  const requestConfig: AxiosRequestConfig = {params, headers, responseType, signal, timeout};

  const unwrap = (p: Promise<AxiosResponse<T>>) => p.then((r) => r.data);

  switch (method) {
    case 'get':
      return unwrap(apiClient.get<T>(url, requestConfig));
    case 'post':
      return unwrap(apiClient.post<T>(url, data, requestConfig));
    case 'put':
      return unwrap(apiClient.put<T>(url, data, requestConfig));
    case 'patch':
      return unwrap(apiClient.patch<T>(url, data, requestConfig));
    case 'delete':
      return unwrap(apiClient.delete<T>(url, requestConfig));
    default:
      return Promise.reject(new Error(`[orvalMutator] Unsupported HTTP method: ${method}`));
  }
};

export default orvalMutator;
