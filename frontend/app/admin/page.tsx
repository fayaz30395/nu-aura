'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { notifications } from '@mantine/notifications';
import { useAdminStats, useAdminUsers, useUpdateUserRole, useSystemHealth } from '@/lib/hooks/queries/useAdmin';
import { Roles, usePermissions } from '@/lib/hooks/usePermissions';
import { AdminUserSummary, HealthResponse, HealthComponent } from '@/lib/types/admin';
import { AdminPageContent } from '@/components/layout';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SkeletonStatCard } from '@/components/ui/Skeleton';

const PAGE_SIZE = 10;

const ALL_ROLE_OPTIONS: { label: string; value: string }[] = [
  { label: 'Super Admin', value: Roles.SUPER_ADMIN },
  { label: 'Tenant Admin', value: Roles.TENANT_ADMIN },
  { label: 'HR Admin', value: Roles.HR_ADMIN },
  { label: 'Employee', value: Roles.EMPLOYEE },
];

const roleAssignmentSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Must be a valid email'),
  role: z.string().min(1, 'Role is required'),
});

type RoleAssignmentForm = z.infer<typeof roleAssignmentSchema>;

export default function AdminDashboardPage() {
  const router = useRouter();
  const { isAdmin, hasRole } = usePermissions();

  // DEF-49: Only SuperAdmin users can see/assign the SUPER_ADMIN role option
  const ROLE_OPTIONS = useMemo(() => {
    if (hasRole(Roles.SUPER_ADMIN)) return ALL_ROLE_OPTIONS;
    return ALL_ROLE_OPTIONS.filter((opt) => opt.value !== Roles.SUPER_ADMIN);
  }, [hasRole]);
  const [authChecked, setAuthChecked] = useState(false);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [pendingSearch, setPendingSearch] = useState('');
  const {
    register: registerRole,
    handleSubmit: handleRoleSubmit,
    reset: resetRoleForm,
    watch: watchRole,
    formState: { errors: roleErrors },
  } = useForm<RoleAssignmentForm>({
    resolver: zodResolver(roleAssignmentSchema),
    defaultValues: {
      email: '',
      role: ROLE_OPTIONS[0]?.value ?? Roles.EMPLOYEE,
    },
  });
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; email: string; role: string }>({
    isOpen: false,
    email: '',
    role: '',
  });

  // Auth guard — wait one tick for auth store to hydrate before redirecting
  useEffect(() => {
    const timer = setTimeout(() => setAuthChecked(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (authChecked && !isAdmin) {
      router.push('/');
    }
  }, [authChecked, isAdmin, router]);

  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: usersPage, isLoading: usersLoading } = useAdminUsers(page, PAGE_SIZE, search);
  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useSystemHealth();
  const updateRoleMutation = useUpdateUserRole();

  // Stable reference: wrap in useMemo so downstream useMemo hooks don't re-run on every render.
  const users = useMemo<AdminUserSummary[]>(() => usersPage?.content ?? [], [usersPage]);

  const totalPages = usersPage ? usersPage.totalPages : 0;

  const watchedEmail = watchRole('email');

  const filteredByEmail = useMemo(() => {
    if (!watchedEmail.trim()) return users;
    const lowered = watchedEmail.trim().toLowerCase();
    return users.filter((u) => u.email.toLowerCase().includes(lowered));
  }, [watchedEmail, users]);

  const handleSearchApply = () => {
    setSearch(pendingSearch.trim());
    setPage(0);
  };

  const handleAssignRole = async (data: RoleAssignmentForm) => {
    const matchedUser = users.find(
      (u) => u.email.toLowerCase() === data.email.trim().toLowerCase(),
    );
    if (!matchedUser) {
      notifications.show({ title: 'Error', message: 'User not found in the current list.', color: 'red' });
      return;
    }
    setConfirmDialog({ isOpen: true, email: data.email, role: data.role });
  };

  const handleConfirmRoleAssignment = async () => {
    const target = users.find((u) => u.email.toLowerCase() === confirmDialog.email.trim().toLowerCase());
    if (!target) return;
    try {
      await updateRoleMutation.mutateAsync({ userId: target.id, role: confirmDialog.role });
      resetRoleForm();
      setConfirmDialog({ isOpen: false, email: '', role: '' });
    } catch (_error) {
      // Error is handled by React Query
    }
  };

  const canPrevious = page > 0;
  const canNext = usersPage ? page < usersPage.totalPages - 1 : false;

  // Show nothing while auth store hydrates or if non-admin (redirect in-flight)
  if (!authChecked || !isAdmin) return null;

  return (
    <AdminPageContent>
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="p-4 sm:p-6 space-y-6"
      suppressHydrationWarning
    >
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Super Admin Dashboard
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          High-level visibility across tenants, employees, and pending approvals.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statsLoading ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : (
          <>
            <StatCard
              title="Total Tenants"
              value={stats?.totalTenants ?? 0}
              description="Licensed organizations on the platform"
            />
            <StatCard
              title="Total Employees"
              value={stats?.totalEmployees ?? 0}
              description="Employees across all tenants"
            />
            <StatCard
              title="Pending Approvals"
              value={stats?.pendingApprovals ?? 0}
              description="Workflows awaiting action"
            />
          </>
        )}
      </div>

      {/* System Health Card */}
      <SystemHealthCard isLoading={healthLoading} health={health} onRefresh={refetchHealth} />

      {/* All employees table */}
      <div className="skeuo-card rounded-xl border border-[var(--border-main)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 py-4 border-b border-[var(--border-main)]">
          <div>
            <h2 className="text-base sm:text-xl font-semibold text-[var(--text-primary)]">
              All Employees
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)]">
              Cross-tenant view of users with role visibility.
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={pendingSearch}
              onChange={(e) => setPendingSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchApply()}
              className="input-aura flex-1 sm:flex-none min-w-0 px-4 py-2 text-sm rounded-xl"
            />
            <button
              type="button"
              onClick={handleSearchApply}
              className="btn-secondary px-4 py-2 text-sm font-medium rounded-xl"
            >
              Search
            </button>
          </div>
        </div>

        <div className="overflow-x-auto" suppressHydrationWarning>
          <table className="table-aura min-w-full" suppressHydrationWarning>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Tenant / Company</Th>
                <Th>Department</Th>
                <Th>Status</Th>
                <Th>Roles</Th>
              </tr>
            </thead>
            <tbody className="bg-[var(--bg-card)] divide-y divide-surface-100 dark:divide-surface-800">
              {usersLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-[var(--text-muted)] text-sm"
                  >
                    Loading users...
                  </td>
                </tr>
              ) : filteredByEmail.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-[var(--text-muted)] text-sm"
                  >
                    No users found for the current filters.
                  </td>
                </tr>
              ) : (
                filteredByEmail.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                      {user.firstName && (user.firstName + (user.lastName ? ' ' + user.lastName : '')) || user.email?.split('@')[0] || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                      {user.tenantName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                      {user.departmentName?.trim() ? user.departmentName : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`badge-status inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                        user.userStatus === 'ACTIVE'
                          ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300'
                          : user.userStatus === 'INACTIVE'
                          ? 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                          : user.userStatus === 'SUSPENDED'
                          ? 'bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300'
                          : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] dark:text-[var(--text-muted)]'
                      }`}>
                        {user.userStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]" suppressHydrationWarning>
                      {Array.isArray(user.roles) && user.roles.length > 0
                        ? user.roles.filter((role) => role && role.name).map((role) => role.name).join(', ')
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Simple pagination */}
        <div className="flex items-center justify-between px-4 py-4 border-t border-[var(--border-main)] text-xs sm:text-sm">
          <div className="text-[var(--text-muted)]">
            Page {totalPages === 0 ? 0 : page + 1} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!canPrevious}
              onClick={() => canPrevious && setPage((p) => p - 1)}
              className="px-4 py-1.5 rounded-lg border border-[var(--border-main)] text-[var(--text-secondary)] dark:text-[var(--text-muted)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={!canNext}
              onClick={() => canNext && setPage((p) => p + 1)}
              className="px-4 py-1.5 rounded-lg border border-[var(--border-main)] text-[var(--text-secondary)] dark:text-[var(--text-muted)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Role Management Panel */}
      <form
        onSubmit={handleRoleSubmit(handleAssignRole)}
        className="skeuo-card rounded-xl border border-[var(--border-main)] p-4 sm:p-6 space-y-4"
      >
        <div>
          <h2 className="text-base sm:text-xl font-semibold text-[var(--text-primary)]">
            Role Management
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Search by user email and assign or revoke a high-level role.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1">
              User Email
            </label>
            <input
              type="email"
              placeholder="user@example.com"
              {...registerRole('email')}
              className="input-aura w-full px-4 py-2 text-sm rounded-xl"
            />
            {roleErrors.email && (
              <p className="text-xs text-danger-500 mt-1">{roleErrors.email.message}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1">
              Role
            </label>
            <select
              {...registerRole('role')}
              className="input-aura w-full px-4 py-2 text-sm rounded-xl"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {roleErrors.role && (
              <p className="text-xs text-danger-500 mt-1">{roleErrors.role.message}</p>
            )}
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={updateRoleMutation.isPending}
            className="skeuo-button px-4 py-2 text-sm font-medium rounded-xl bg-accent-700 text-white hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {updateRoleMutation.isPending ? 'Updating...' : 'Assign / Update Role'}
          </button>
        </div>
      </form>

      {/* Role Assignment Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, email: '', role: '' })}
        onConfirm={handleConfirmRoleAssignment}
        title="Confirm Role Assignment"
        message={`You are about to assign ${ROLE_OPTIONS.find((opt) => opt.value === confirmDialog.role)?.label || confirmDialog.role} role to ${confirmDialog.email}. This grants elevated permissions.`}
        confirmText="Assign Role"
        cancelText="Cancel"
        type="warning"
        loading={updateRoleMutation.isPending}
      />
    </motion.div>
    </AdminPageContent>
  );
}

function StatCard(props: { title: string; value: number | string; description?: string }) {
  const { title, value, description } = props;
  return (
    <div className="skeuo-card rounded-xl border border-[var(--border-main)] px-4 py-4 sm:px-6 sm:py-5">
      <div className="skeuo-deboss text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide relative z-10">
        {title}
      </div>
      <div className="skeuo-emboss mt-2 text-2xl font-semibold text-[var(--text-primary)] relative z-10">
        {value}
      </div>
      {description && (
        <div className="mt-1 text-xs text-[var(--text-muted)] relative z-10">{description}</div>
      )}
    </div>
  );
}

function SystemHealthCard(props: { isLoading: boolean; health: HealthResponse | undefined; onRefresh: () => void }) {
  const { isLoading, health, onRefresh } = props;

  const getStatusColors = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'UP':
        return {
          color: 'bg-success-100 dark:bg-success-900/30',
          badge: 'bg-success-500',
          text: 'System UP',
          textColor: 'text-success-700 dark:text-success-300',
        };
      case 'DEGRADED':
        return {
          color: 'bg-warning-100 dark:bg-warning-900/30',
          badge: 'bg-warning-500',
          text: 'System Degraded',
          textColor: 'text-warning-700 dark:text-warning-300',
        };
      default:
        return {
          color: 'bg-danger-100 dark:bg-danger-900/30',
          badge: 'bg-danger-500',
          text: 'System Down',
          textColor: 'text-danger-700 dark:text-danger-300',
        };
    }
  };

  const statusColors = getStatusColors(health?.status);
  const statusColor = statusColors.color;
  const statusBadgeColor = statusColors.badge;
  const statusText = statusColors.text;
  const statusTextColor = statusColors.textColor;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="skeuo-card rounded-xl border border-[var(--border-main)] p-4 sm:p-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div>
          <h2 className="skeuo-emboss text-base sm:text-xl font-semibold text-[var(--text-primary)]">
            System Health
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Real-time system component status
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Refresh Button */}
          <button
            onClick={() => onRefresh()}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh health status"
          >
            <svg className={`w-4 h-4 text-[var(--text-secondary)] ${isLoading ? 'animate-spin' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
          </button>

          {/* Overall Status Badge */}
          {isLoading ? (
            <div className={`${statusColor} px-4 py-2 rounded-full inline-block w-fit`}>
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                Checking...
              </span>
            </div>
          ) : (
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`${statusColor} px-4 py-2 rounded-full inline-block w-fit`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${statusBadgeColor}`} />
                <span className={`text-sm font-medium ${statusTextColor}`}>{statusText}</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Component Status Grid */}
      {!isLoading && health?.components && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          {Object.entries(health.components).map(([componentName, component]: [string, HealthComponent], index) => {
            const status = component.status?.toUpperCase();
            const isUp = status === 'UP';
            const isUnavailable = status === 'UNAVAILABLE';
            const isDegraded = status === 'DEGRADED';

            let componentColor = 'bg-danger-50 dark:bg-danger-900/20';
            let dotColor = 'bg-danger-500';
            let textColor = 'text-danger-700 dark:text-danger-300';
            let statusLabel = 'Down';

            if (isUp) {
              componentColor = 'bg-success-50 dark:bg-success-900/20';
              dotColor = 'bg-success-500';
              textColor = 'text-success-700 dark:text-success-300';
              statusLabel = 'Operational';
            } else if (isDegraded) {
              componentColor = 'bg-warning-50 dark:bg-warning-900/20';
              dotColor = 'bg-warning-500';
              textColor = 'text-warning-700 dark:text-warning-300';
              statusLabel = 'Degraded';
            } else if (isUnavailable) {
              componentColor = 'bg-danger-50 dark:bg-danger-900/20';
              dotColor = 'bg-danger-500';
              textColor = 'text-danger-700 dark:text-danger-300';
              statusLabel = 'Unavailable';
            }

            return (
              <motion.div
                key={componentName}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: 0.05 + index * 0.05 }}
                className={`card-aura ${componentColor} rounded-lg p-4 border border-[var(--border-main)]`}
              >
                <div className="flex items-start gap-2">
                  <div className={`${dotColor} w-2 h-2 rounded-full mt-1 flex-shrink-0`} />
                  <div className="min-w-0">
                    <div className={`text-xs font-medium ${textColor} truncate`}>
                      {componentName
                        .replace(/([A-Z])/g, ' $1')
                        .trim()
                        .split(' ')
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join(' ')}
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">
                      {statusLabel}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Helper message for unavailable services */}
      {!isLoading && health?.status === 'DEGRADED' && (
        <div className="mt-6 p-4 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg">
          <p className="text-sm text-warning-800 dark:text-warning-300">
            <span className="font-medium">⚠️ System Degraded:</span> Some services may be temporarily unavailable. Try refreshing the status or contact your system administrator if the issue persists.
          </p>
        </div>
      )}
    </motion.div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="skeuo-table-header px-6 py-2 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
      {children}
    </th>
  );
}

