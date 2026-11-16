import {Permissions, Roles} from '@/lib/hooks/usePermissions';

/**
 * Navigation visibility predicates shared by the sidebar, the mobile drawer,
 * the mobile bottom nav and the admin console shell.
 *
 * Navigation is UX only: hiding an entry never grants or denies access. Route
 * access is enforced by AuthGuard (lib/config/routes.ts) and the backend
 * @RequiresPermission checks.
 */
export interface NavAccess {
  roles: readonly string[];
  hasPermission: (permission: string) => boolean;
  hasAnyRole: (...roles: string[]) => boolean;
}

/** Gate on a nav entry. All present conditions must pass (AND). */
export interface NavGate {
  requiredPermission?: string;
  /** Any one of these permissions passes (OR). */
  anyPermission?: readonly string[];
  /** Any one of these roles passes (OR). */
  anyRole?: readonly string[];
}

function isSuperAdmin(access: NavAccess): boolean {
  return access.roles.includes(Roles.SUPER_ADMIN);
}

export function canAccessNavItem(gate: NavGate, access: NavAccess): boolean {
  if (isSuperAdmin(access)) return true;
  if (gate.requiredPermission && !access.hasPermission(gate.requiredPermission)) return false;
  if (gate.anyPermission?.length && !gate.anyPermission.some((p) => access.hasPermission(p))) return false;
  if (gate.anyRole?.length && !access.hasAnyRole(...gate.anyRole)) return false;
  return true;
}

/**
 * Admin console entry. Used by the main nav's Admin section and by
 * app/admin/AdminLayoutInner so both always agree. On the current catalog this
 * admits SUPER_ADMIN, TENANT_ADMIN, HR_MANAGER and HR_ADMIN. Broad operational
 * permissions (REPORT:VIEW, PAYROLL:VIEW_ALL) are deliberately excluded.
 */
export function hasAdminConsoleAccess(access: NavAccess): boolean {
  return (
    isSuperAdmin(access) ||
    access.roles.includes(Roles.TENANT_ADMIN) ||
    access.roles.includes(Roles.HR_MANAGER) ||
    access.hasPermission(Permissions.ROLE_MANAGE) ||
    access.hasPermission(Permissions.PERMISSION_MANAGE) ||
    access.hasPermission(Permissions.USER_MANAGE) ||
    access.hasPermission(Permissions.AUDIT_VIEW) ||
    access.hasPermission(Permissions.SETTINGS_UPDATE)
  );
}

/**
 * Drops entries the user cannot access. A parent whose children are all hidden
 * is dropped too, even when the parent itself is ungated.
 */
export function filterNavItems<T extends NavGate & {children?: T[]}>(items: readonly T[], access: NavAccess): T[] {
  const result: T[] = [];
  for (const item of items) {
    if (!canAccessNavItem(item, access)) continue;
    if (item.children && item.children.length > 0) {
      const children = filterNavItems(item.children, access);
      if (children.length === 0) continue;
      result.push({...item, children});
    } else {
      result.push(item);
    }
  }
  return result;
}
