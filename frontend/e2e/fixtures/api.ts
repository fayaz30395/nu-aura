import {expect, type Page} from '@playwright/test';

export interface ExpectApiOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Path under /api/v1, e.g. "/employees". */
  path: string;
  /** Expected HTTP status. Defaults to 200. */
  status?: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

/**
 * Calls the backend with the page's auth cookies, asserts the status and returns the JSON body.
 */
export async function expectApi<T = unknown>(page: Page, {method, path, status = 200}: ExpectApiOptions): Promise<T> {
  const response = await page.request.fetch(`${API_BASE}${path}`, {method, failOnStatusCode: false});
  expect(response.status(), `${method} ${path}`).toBe(status);
  return (await response.json().catch(() => null)) as T;
}
