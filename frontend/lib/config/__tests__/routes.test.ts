import {describe, expect, it} from 'vitest';
import {findRouteConfig} from '../routes';
import {Permissions} from '../../hooks/usePermissions';

describe('findRouteConfig admin-only settings pages', () => {
  it('gates the API keys settings page on SYSTEM_ADMIN', () => {
    expect(findRouteConfig('/settings/security/api-keys')?.anyPermission).toEqual([Permissions.SYSTEM_ADMIN]);
  });

  it('keeps the settings root auth-only', () => {
    expect(findRouteConfig('/settings')?.requiresAuth).toBe(true);
  });
});
