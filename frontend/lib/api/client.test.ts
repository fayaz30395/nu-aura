import {AxiosError} from 'axios';
import type {AxiosInstance, AxiosResponse, InternalAxiosRequestConfig} from 'axios';
import {describe, expect, it, vi} from 'vitest';
import {apiClient} from './client';

const client = (apiClient as unknown as {client: AxiosInstance}).client;

function respond(config: InternalAxiosRequestConfig, status: number, data: unknown): Promise<AxiosResponse> {
  const response: AxiosResponse = {data, status, statusText: String(status), headers: {}, config};
  const valid = config.validateStatus ? config.validateStatus(status) : status >= 200 && status < 300;
  if (valid) return Promise.resolve(response);
  return Promise.reject(new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', config, null, response));
}

describe('apiClient.getPermissive', () => {
  it('treats 401 as an error so the refresh interceptor runs and retries', async () => {
    let analyticsCalls = 0;
    const adapter = vi.fn((config: InternalAxiosRequestConfig) => {
      if (config.url?.includes('/auth/refresh')) return respond(config, 200, {});
      analyticsCalls += 1;
      return analyticsCalls === 1
        ? respond(config, 401, {message: 'Unauthorized'})
        : respond(config, 200, {total: 42});
    });
    const originalAdapter = client.defaults.adapter;
    client.defaults.adapter = adapter;

    try {
      const res = await apiClient.getPermissive<{total: number}>('/analytics/summary');

      expect(res.status).toBe(200);
      expect(res.data).toEqual({total: 42});
      expect(adapter.mock.calls.some(([c]) => c.url?.includes('/auth/refresh'))).toBe(true);
      expect(analyticsCalls).toBe(2);
    } finally {
      client.defaults.adapter = originalAdapter;
    }
  });

  it('still returns 403 responses instead of throwing', async () => {
    const originalAdapter = client.defaults.adapter;
    client.defaults.adapter = (config: InternalAxiosRequestConfig) => respond(config, 403, {message: 'Forbidden'});

    try {
      const res = await apiClient.getPermissive('/analytics/summary');
      expect(res.status).toBe(403);
    } finally {
      client.defaults.adapter = originalAdapter;
    }
  });
});
