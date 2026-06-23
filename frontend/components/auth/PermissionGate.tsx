'use client';

import {ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {ShieldAlert, ArrowLeft} from 'lucide-react';
import {usePermissions} from '@/lib/hooks/usePermissions';
import {AppLayout} from '@/components/layout/AppLayout';

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
                                     message = "You don't have permission to view this page.",
                                   }: { message?: string }): ReactNode {
  const router = useRouter();
  // F-005: render the access-denied state INSIDE the app shell (sidebar/header) with a
  // "Go to Home" escape, mirroring AuthGuard's "Access Restricted" page. Previously this
  // was a bare card with no chrome, leaving denied users stuck with no way to navigate away.
  // Safe to render AppLayout here: every PermissionGate that uses this fallback is the outer
  // wrapper with AppLayout inside the gated child, so on deny no second AppLayout mounts.
  return (
    <AppLayout>
      <div className="page-shell-centered fade-slide-up">
        <div className="page-shell-card p-8 text-center fade-slide-up max-w-lg">
          <div
            className="mx-auto mb-4 h-14 w-14 rounded-full bg-danger-100/80 dark:bg-danger-900/30 border border-danger-300/40 dark:border-danger-500/25 flex items-center justify-center"
          >
            <ShieldAlert className="w-7 h-7 text-danger-700 dark:text-danger-300"/>
          </div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">Access Restricted</h1>
          <p role="status" aria-live="polite" className="text-[var(--text-secondary)] mb-2">
            {message}
          </p>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            If you believe this is an error, please contact your system administrator.
          </p>
          <button
            onClick={() => router.replace('/me/dashboard')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          >
            <ArrowLeft className="w-4 h-4"/>
            Go to Home
          </button>
        </div>
      </div>
    </AppLayout>
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
        className="loading-state rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-6 py-5"
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
