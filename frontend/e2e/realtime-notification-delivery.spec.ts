import {expect, test} from '@playwright/test';
import {loginAs, navigateTo} from './fixtures/helpers';
import {demoUsers} from './fixtures/testData';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';
const NULOGIC_TENANT_ID = '660e8400-e29b-41d4-a716-446655440001';

function backendOrigin(): string {
  const url = new URL(API_BASE);
  return `${url.protocol}//${url.host}`;
}

test.describe('Realtime notifications — browser delivery', () => {
  test('backend broadcast reaches notification UI state without page refresh', async ({page}) => {
    const marker = `e2e-realtime-${Date.now()}`;
    const title = `Realtime browser delivery ${marker}`;
    const message = `Backend notification reached the open browser state for ${marker}`;
    const realtimeRequests: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/ws') || url.includes('sockjs') || url.includes('/stomp')) {
        realtimeRequests.push(url);
      }
    });

    await loginAs(page, demoUsers.superAdmin.email);
    await navigateTo(page, '/me/dashboard');
    await expect(page.getByTestId('notification-bell')).toBeVisible({timeout: 60000});

    await page.evaluate((value) => {
      const w = window as typeof window & { __nuAuraRealtimeNoReloadMarker?: string };
      w.__nuAuraRealtimeNoReloadMarker = value;
    }, marker);

    await expect
      .poll(() => realtimeRequests.length, {timeout: 15000})
      .toBeGreaterThan(0);

    await page.getByTestId('notification-bell').click();
    await page.getByRole('button', {name: 'System', exact: true}).click();
    await expect(page.getByText(title)).toHaveCount(0);

    const response = await page.request.post(`${backendOrigin()}/api/ws-notifications/broadcast`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': NULOGIC_TENANT_ID,
      },
      data: {
        type: 'SYSTEM_ALERT',
        title,
        message,
        payload: {
          source: 'playwright-realtime-notification-delivery',
          marker,
        },
      },
    });

    const responseBody = await response.text().catch(() => '');
    expect(response.status(), responseBody).toBe(200);

    const realtimeItem = page.getByTestId('realtime-notification-item').filter({hasText: title});
    await expect(realtimeItem).toBeVisible({timeout: 20000});
    await expect(realtimeItem).toContainText(message);

    const markerSurvived = await page.evaluate((value) => {
      const w = window as typeof window & { __nuAuraRealtimeNoReloadMarker?: string };
      return w.__nuAuraRealtimeNoReloadMarker === value;
    }, marker);
    expect(markerSurvived, 'Page reloaded before the realtime notification reached UI state').toBe(true);
  });
});
