import {expect, test, type Page} from '@playwright/test';
import {loginAs, navigateTo} from './fixtures/helpers';
import {demoUsers} from './fixtures/testData';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';
const NULOGIC_TENANT_ID = '660e8400-e29b-41d4-a716-446655440001';

function backendOrigin(): string {
  const url = new URL(API_BASE);
  return `${url.protocol}//${url.host}`;
}

async function openNotificationDropdown(page: Page) {
  const bell = page.getByTestId('notification-bell');
  const dropdown = page.getByTestId('notification-dropdown');

  await bell.click();
  if (await dropdown.isVisible({timeout: 15000}).catch(() => false)) {
    return dropdown;
  }

  await bell.click({force: true});
  await expect(dropdown).toBeVisible({timeout: 30000});
  return dropdown;
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

    await loginAs(page, demoUsers.superAdmin.email, {verifyDashboard: false});
    await navigateTo(page, '/me/profile');
    await expect(page.getByTestId('notification-bell')).toBeVisible({timeout: 60000});

    await page.evaluate((value) => {
      const w = window as typeof window & { __nuAuraRealtimeNoReloadMarker?: string };
      w.__nuAuraRealtimeNoReloadMarker = value;
    }, marker);

    await expect
      .poll(() => realtimeRequests.length, {timeout: 15000})
      .toBeGreaterThan(0);

    const response = await page.evaluate(async ({url, tenantId, data}) => {
      const csrfToken = document.cookie
        .split('; ')
        .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
        ?.split('=')[1];

      const result = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
          ...(csrfToken ? {'X-XSRF-TOKEN': csrfToken} : {}),
        },
        body: JSON.stringify(data),
      });

      return {
        status: result.status,
        body: await result.text().catch(() => ''),
      };
    }, {
      url: `${backendOrigin()}/api/ws-notifications/broadcast`,
      tenantId: NULOGIC_TENANT_ID,
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

    expect(response.status, response.body).toBe(200);

    const dropdown = await openNotificationDropdown(page);
    await page.getByTestId('notification-tab-system').click();

    const realtimeItem = dropdown.getByTestId('realtime-notification-item').filter({hasText: title});
    await expect(realtimeItem).toBeVisible({timeout: 20000});
    await expect(realtimeItem).toContainText(message);

    const markerSurvived = await page.evaluate((value) => {
      const w = window as typeof window & { __nuAuraRealtimeNoReloadMarker?: string };
      return w.__nuAuraRealtimeNoReloadMarker === value;
    }, marker);
    expect(markerSurvived, 'Page reloaded before the realtime notification reached UI state').toBe(true);
  });
});
