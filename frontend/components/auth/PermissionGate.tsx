'use client';

import {ReactNode} from 'react';
import {usePermissions} from '@/lib/hooks/usePermissions';

interface PermissionGateProps {
  /** Children to render if permission check passes */
  children: ReactNode;
  /** Single permission required */
  permission?: string;
  /** Multiple permissions - user needs ANY of these (OR logic) */
  anyOf?: string[];
  /** Multiple permissions - user needs ALL of these (AND logic) */
  allOf?: string[];
  /** Single role required */
  role?: string;
  /** Multiple roles - user needs ANY of these (OR logic) */
  anyRole?: string[];
  /** Multiple roles - user needs ALL of these (AND logic) */
  allRoles?: string[];
  /** Fallback content when permission check fails */
  fallback?: ReactNode;
  /** If true, shows children while auth is loading */
  showWhileLoading?: boolean;
}

/**
 * Component for conditionally rendering content based on user permissions/roles
 *
 * @example
 * // Single permission
 * <PermissionGate permission={Permissions.EMPLOYEE_CREATE}>
 *   <CreateEmployeeButton />
 * </PermissionGate>
 *
 * @example
 * // Any of multiple permissions
 * <PermissionGate anyOf={[Permissions.LEAVE_APPROVE, Permissions.LEAVE_MANAGE]}>
 *   <ApproveLeaveSection />
 * </PermissionGate>
 *
 * @example
 * // With fallback
 * <PermissionGate permission={Permissions.PAYROLL_VIEW} fallback={<AccessDenied />}>
 *   <PayrollDashboard />
 * </PermissionGate>
 *
 * @example
 * // Role-based
 * <PermissionGate anyRole={[Roles.HR_ADMIN, Roles.HR_MANAGER]}>
 *   <HRSection />
 * </PermissionGate>
 */
/**
 * Visible "access denied" fallback for **page-level** gates. Use when wrapping
 * an entire route shell (so smoke tests and assistive tech see the page mounted).
 *
 * For **inline** button/menu gates, do NOT pass this — let the default `null`
 * fallback hide the gated element silently.
 *
 * @example
 *   <PermissionGate permission={X} fallback={<PageDeniedFallback/>}>
 *     <PageContent />
 *   </PermissionGate>
 */
export function PageDeniedFallback({
                                     message = 'You do not have access to this page.',
                                   }: { message?: string }): ReactNode {
  return (
    <div
      role="status"
      aria-live="polite"
      className="p-6 text-sm text-[var(--text-muted)]"
    >
      {message}
    </div>
  );
}

export function PermissionGate({
                                 children,
                                 permission,
                                 anyOf,
                                 allOf,
                                 role,
                                 anyRole,
                                 allRoles,
                                 fallback = null,
                                 showWhileLoading = false,
                               }: PermissionGateProps): ReactNode {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    isAdmin,
    isReady,
  } = usePermissions();

  // Show loading state while auth is hydrating. We render a visible
  // placeholder (not null) so that smoke tests and assistive tech can
  // observe that the page is mounted and waiting on auth.
  if (!isReady) {
    if (showWhileLoading) return children;
    return (
      <div
        role="status"
        aria-live="polite"
        className="p-6 text-sm text-[var(--text-muted)]"
      >
        Loading...
      </div>
    );
  }

  // SuperAdmin / TenantAdmin bypasses ALL permission and role gates
  if (isAdmin) {
    return children;
  }

  let hasAccess = true;

  // Permission checks
  if (permission) {
    hasAccess = hasAccess && hasPermission(permission);
  }

  if (anyOf && anyOf.length > 0) {
    hasAccess = hasAccess && hasAnyPermission(...anyOf);
  }

  if (allOf && allOf.length > 0) {
    hasAccess = hasAccess && hasAllPermissions(...allOf);
  }

  // Role checks
  if (role) {
    hasAccess = hasAccess && hasRole(role);
  }

  if (anyRole && anyRole.length > 0) {
    hasAccess = hasAccess && hasAnyRole(...anyRole);
  }

  if (allRoles && allRoles.length > 0) {
    hasAccess = hasAccess && hasAllRoles(...allRoles);
  }

  return hasAccess ? children : fallback;
}

/**
 * Component that only renders for admin users
 */
export function AdminGate({
                            children,
                            fallback = null,
                          }: {
  children: ReactNode;
  fallback?: ReactNode;
}): ReactNode {
  const {isAdmin, isReady} = usePermissions();

  if (!isReady) return null;
  return isAdmin ? children : fallback;
}

/**
 * Component that only renders for HR users
 */
export function HRGate({
                         children,
                         fallback = null,
                       }: {
  children: ReactNode;
  fallback?: ReactNode;
}): ReactNode {
  const {isHR, isReady} = usePermissions();

  if (!isReady) return null;
  return isHR ? children : fallback;
}

/**
 * Component that only renders for managers
 */
export function ManagerGate({
                              children,
                              fallback = null,
                            }: {
  children: ReactNode;
  fallback?: ReactNode;
}): ReactNode {
  const {isManager, isReady} = usePermissions();

  if (!isReady) return null;
  return isManager ? children : fallback;
}

export default PermissionGate;
