import {describe, expect, it} from 'vitest';
import {findRouteConfig, isPublicRoute} from '../routes';
import {Permissions} from '../../hooks/usePermissions';

describe('isPublicRoute', () => {
  it('treats the emailed password-reset link as public', () => {
    expect(isPublicRoute('/reset-password?token=abc123')).toBe(true);
    expect(isPublicRoute('/reset-password')).toBe(true);
  });

  it('treats the other password-recovery routes as public', () => {
    expect(isPublicRoute('/auth/forgot-password')).toBe(true);
    expect(isPublicRoute('/auth/reset-password?token=abc123')).toBe(true);
  });

  it('keeps protected routes non-public', () => {
    expect(isPublicRoute('/me/dashboard')).toBe(false);
    expect(isPublicRoute('/admin/users')).toBe(false);
    expect(isPublicRoute('/reset-password/extra')).toBe(false);
  });
});

describe('findRouteConfig admin-only settings pages', () => {
  it('gates the API keys settings page on SYSTEM_ADMIN', () => {
    expect(findRouteConfig('/settings/security/api-keys')?.anyPermission).toEqual([Permissions.SYSTEM_ADMIN]);
  });

  it('keeps the settings root auth-only', () => {
    expect(findRouteConfig('/settings')?.requiresAuth).toBe(true);
  });
});
