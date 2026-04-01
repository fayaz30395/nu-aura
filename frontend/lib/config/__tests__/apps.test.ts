import { describe, it, expect } from 'vitest';
import {
  PLATFORM_APPS,
  APP_LIST,
  getAppForRoute,
  APP_SIDEBAR_SECTIONS,
} from '../apps';
import type { AppCode } from '../apps';

describe('Platform App Configuration', () => {
  // ─── PLATFORM_APPS structure ────────────────────────────────────────────────
  describe('PLATFORM_APPS', () => {
    it('defines exactly 4 apps', () => {
      expect(Object.keys(PLATFORM_APPS)).toHaveLength(4);
    });

    it('has all expected app codes', () => {
      expect(Object.keys(PLATFORM_APPS)).toEqual(
        expect.arrayContaining(['HRMS', 'HIRE', 'GROW', 'FLUENCE'])
      );
    });

    it.each(Object.values(PLATFORM_APPS))('app $code has required fields', (app) => {
      expect(app.code).toBeTruthy();
      expect(app.name).toBeTruthy();
      expect(app.shortName).toBeTruthy();
      expect(app.description).toBeTruthy();
      expect(app.entryRoute).toBeTruthy();
      expect(app.iconName).toBeTruthy();
      expect(app.permissionPrefixes.length).toBeGreaterThan(0);
      expect(app.routePrefixes.length).toBeGreaterThan(0);
      expect(typeof app.available).toBe('boolean');
      expect(typeof app.order).toBe('number');
    });

    it('HRMS is available', () => {
      expect(PLATFORM_APPS.HRMS.available).toBe(true);
    });

    it('HIRE is available', () => {
      expect(PLATFORM_APPS.HIRE.available).toBe(true);
    });

    it('GROW is available', () => {
      expect(PLATFORM_APPS.GROW.available).toBe(true);
    });
  });

  // ─── APP_LIST ordering ─────────────────────────────────────────────────────
  describe('APP_LIST', () => {
    it('is sorted by order field', () => {
      for (let i = 1; i < APP_LIST.length; i++) {
        expect(APP_LIST[i].order).toBeGreaterThanOrEqual(APP_LIST[i - 1].order);
      }
    });

    it('has same number of entries as PLATFORM_APPS', () => {
      expect(APP_LIST).toHaveLength(Object.keys(PLATFORM_APPS).length);
    });

    it('HRMS is first in order', () => {
      expect(APP_LIST[0].code).toBe('HRMS');
    });
  });

  // ─── getAppForRoute ────────────────────────────────────────────────────────
  describe('getAppForRoute', () => {
    // HRMS routes (default fallback)
    it.each([
      '/employees',
      '/employees/123',
      '/dashboard',
      '/leave',
      '/leave/requests',
      '/attendance',
      '/payroll',
      '/settings',
      '/admin',
      '/me/dashboard',
      '/departments',
      '/benefits',
      '/expenses',
      '/assets',
      '/loans',
      '/travel',
    ])('maps HRMS route %s correctly', (route) => {
      expect(getAppForRoute(route)).toBe('HRMS');
    });

    // HIRE routes
    it.each([
      '/recruitment',
      '/recruitment/jobs',
      '/onboarding',
      '/onboarding/tasks',
      '/preboarding',
      '/offboarding',
      '/offer-portal',
      '/careers',
      '/referrals',
    ])('maps HIRE route %s correctly', (route) => {
      expect(getAppForRoute(route)).toBe('HIRE');
    });

    // GROW routes
    it.each([
      '/performance',
      '/performance/reviews',
      '/okr',
      '/okr/objectives',
      '/feedback360',
      '/training',
      '/learning',
      '/recognition',
      '/surveys',
      '/wellness',
      '/one-on-one',
    ])('maps GROW route %s correctly', (route) => {
      expect(getAppForRoute(route)).toBe('GROW');
    });

    // FLUENCE routes
    it.each([
      '/fluence/wiki',
      '/fluence/wiki/page-1',
      '/fluence/blogs',
      '/fluence/templates',
      '/fluence/drive',
      '/fluence/search',
      '/fluence/my-content',
      '/fluence/wall',
      '/fluence/dashboard',
    ])('maps FLUENCE route %s correctly', (route) => {
      expect(getAppForRoute(route)).toBe('FLUENCE');
    });

    // Edge cases
    it('defaults to HRMS for unknown routes', () => {
      expect(getAppForRoute('/some-unknown-page')).toBe('HRMS');
    });

    it('defaults to HRMS for root path', () => {
      expect(getAppForRoute('/')).toBe('HRMS');
    });

    it('defaults to HRMS for /home', () => {
      expect(getAppForRoute('/home')).toBe('HRMS');
    });
  });

  // ─── APP_SIDEBAR_SECTIONS ──────────────────────────────────────────────────
  describe('APP_SIDEBAR_SECTIONS', () => {
    it('has sections for all 4 apps', () => {
      const codes: AppCode[] = ['HRMS', 'HIRE', 'GROW', 'FLUENCE'];
      codes.forEach((code) => {
        expect(APP_SIDEBAR_SECTIONS[code]).toBeDefined();
        expect(Array.isArray(APP_SIDEBAR_SECTIONS[code])).toBe(true);
      });
    });

    it('HRMS has the most sidebar sections', () => {
      expect(APP_SIDEBAR_SECTIONS.HRMS.length).toBeGreaterThan(
        APP_SIDEBAR_SECTIONS.HIRE.length
      );
    });

    it('HRMS sections include home and admin', () => {
      expect(APP_SIDEBAR_SECTIONS.HRMS).toContain('home');
      expect(APP_SIDEBAR_SECTIONS.HRMS).toContain('admin');
    });
  });
});
