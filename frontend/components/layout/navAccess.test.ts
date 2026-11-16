import {describe, expect, it} from 'vitest';
import {Permissions, Roles} from '@/lib/hooks/usePermissions';
import {buildMenuSections, canAccessNavItem, filterNavItems, hasAdminConsoleAccess, type NavAccess} from './menuSections';
import {buildMobileNavItems, MOBILE_NAV_ENTRIES, mobileNavGate} from './shell/mobileNav';
import {findRouteConfig} from '@/lib/config/routes';

function access(roles: string[], permissions: string[] = []): NavAccess {
  return {
    roles,
    hasPermission: (p) => permissions.includes(p),
    hasAnyRole: (...rs) => rs.some((r) => roles.includes(r)),
  };
}

describe('canAccessNavItem', () => {
  it('passes ungated items for everyone', () => {
    expect(canAccessNavItem({}, access([]))).toBe(true);
  });

  it('requires requiredPermission, ANDed with anyPermission and anyRole', () => {
    const gate = {requiredPermission: 'A:VIEW', anyPermission: ['B:VIEW', 'C:VIEW'], anyRole: ['MANAGER']};
    expect(canAccessNavItem(gate, access(['MANAGER'], ['A:VIEW', 'C:VIEW']))).toBe(true);
    expect(canAccessNavItem(gate, access(['MANAGER'], ['C:VIEW']))).toBe(false);
    expect(canAccessNavItem(gate, access(['MANAGER'], ['A:VIEW']))).toBe(false);
    expect(canAccessNavItem(gate, access(['EMPLOYEE'], ['A:VIEW', 'B:VIEW']))).toBe(false);
  });

  it('lets SUPER_ADMIN see everything', () => {
    expect(canAccessNavItem({requiredPermission: 'X:Y', anyRole: ['NOPE']}, access([Roles.SUPER_ADMIN]))).toBe(true);
  });
});

describe('filterNavItems', () => {
  it('drops gated items and parents left with no visible children', () => {
    const items = [
      {id: 'open'},
      {id: 'gated', requiredPermission: 'A:VIEW'},
      {id: 'parent', children: [{id: 'child', requiredPermission: 'A:VIEW'}]},
      {id: 'mixed', children: [{id: 'c1'}, {id: 'c2', requiredPermission: 'A:VIEW'}]},
    ];
    expect(filterNavItems(items, access([]))).toEqual([
      {id: 'open'},
      {id: 'mixed', children: [{id: 'c1'}]},
    ]);
  });
});

describe('hasAdminConsoleAccess', () => {
  it('admits the org/HR admin tier, including HR_ADMIN via its permissions', () => {
    expect(hasAdminConsoleAccess(access([Roles.SUPER_ADMIN]))).toBe(true);
    expect(hasAdminConsoleAccess(access([Roles.TENANT_ADMIN]))).toBe(true);
    expect(hasAdminConsoleAccess(access([Roles.HR_MANAGER]))).toBe(true);
    expect(hasAdminConsoleAccess(access([Roles.HR_ADMIN], [Permissions.ROLE_MANAGE]))).toBe(true);
  });

  it('rejects operational roles holding only broad view permissions', () => {
    expect(hasAdminConsoleAccess(access([Roles.EMPLOYEE]))).toBe(false);
    expect(hasAdminConsoleAccess(access(['PAYROLL_ADMIN'], [Permissions.PAYROLL_VIEW_ALL]))).toBe(false);
  });
});

describe('mobile bottom nav parity with route gating', () => {
  it('uses the AuthGuard route config as the gate when one exists', () => {
    for (const entries of Object.values(MOBILE_NAV_ENTRIES)) {
      for (const entry of entries) {
        const route = findRouteConfig(entry.href);
        if (!route) continue;
        expect(mobileNavGate(entry)).toEqual({
          requiredPermission: route.permission,
          anyPermission: route.anyPermission,
          anyRole: route.anyRole,
        });
      }
    }
  });

  it('always shows self-service entries and hides ones the user cannot open', () => {
    const labels = buildMobileNavItems('HRMS', access([Roles.EMPLOYEE]), 0).map((i) => i.label);
    expect(labels).toContain('Home');
    expect(labels).toContain('Me');
    expect(labels).not.toContain('Team');
    expect(labels).not.toContain('Approvals');
  });

  it('shows gated entries to holders and badges Approvals', () => {
    const items = buildMobileNavItems(
      'HRMS',
      access([Roles.EMPLOYEE], [Permissions.EMPLOYEE_READ, Permissions.LEAVE_VIEW_SELF, Permissions.WORKFLOW_VIEW]),
      3
    );
    expect(items.map((i) => i.label)).toEqual(['Home', 'Team', 'Leave', 'Approvals', 'Me']);
    expect(items.find((i) => i.label === 'Approvals')?.badge).toBe(3);
  });
});

describe('My Space quick links', () => {
  it('shows Holidays and Helpdesk to an EMPLOYEE with only self permissions', () => {
    const mySpace = buildMenuSections(0).find((s) => s.label === 'My Space');
    const labels = filterNavItems(mySpace?.items ?? [], access([Roles.EMPLOYEE], [Permissions.EMPLOYEE_VIEW_SELF])).map((i) => i.label);
    expect(labels).toContain('Holidays');
    expect(labels).toContain('Helpdesk');
    expect(labels).not.toContain('My Expenses');
  });
});
