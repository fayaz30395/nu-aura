'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAdminStats, useAdminUsers, useUpdateUserRole, useSystemHealth } from '@/lib/hooks/queries/useAdmin';
import { Roles } from '@/lib/hooks/usePermissions';
import { AdminUserSummary } from '@/lib/types/admin';
import { AppLayout } from '@/components/layout';

const PAGE_SIZE = 10;

const ROLE_OPTIONS: { label: string; value: string }[] = [
  { label: 'Super Admin', value: Roles.SUPER_ADMIN },
  { label: 'Tenant Admin', value: Roles.TENANT_ADMIN },
  { label: 'HR Admin', value: Roles.HR_ADMIN },
  { label: 'Employee', value: Roles.EMPLOYEE },
];

export default function AdminDashboardPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [pendingSearch, setPendingSearch] = useState('');
  const [roleEmail, setRoleEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState(ROLE_OPTIONS[0]?.value ?? Roles.SUPER_ADMIN);

  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: usersPage, isLoading: usersLoading } = useAdminUsers(page, PAGE_SIZE, search);
  const { data: health, isLoading: healthLoading } = useSystemHealth();
  const updateRoleMutation = useUpdateUserRole();

  const users: AdminUserSummary[] = usersPage?.content ?? [];

  const totalPages = usersPage ? usersPage.totalPages : 0;

  const filteredByEmail = useMemo(() => {
    if (!roleEmail.trim()) return users;
    const lowered = roleEmail.trim().toLowerCase();
    return users.filter((u) => u.email.toLowerCase().includes(lowered));
  }, [roleEmail, users]);

  const handleSearchApply = () => {
    setSearch(pendingSearch.trim());
    setPage(0);
  };

  const handleAssignRole = async () => {
    if (!roleEmail.trim() || !selectedRole) return;
    const target = users.find((u) => u.email.toLowerCase() === roleEmail.trim().toLowerCase());
    if (!target) {
      // In a fuller implementation we might show a toast; for now we silently ignore.
      return;
    }
    await updateRoleMutation.mutateAsync({ userId: target.id, role: selectedRole });
  };

  const canPrevious = page > 0;
  const canNext = usersPage ? page < usersPage.totalPages - 1 : false;

  return (
    <AppLayout activeMenuItem="admin">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="p-4 sm:p-6 space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
          Super Admin Dashboard
        </h1>
        <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">
          High-level visibility across tenants, employees, and pending approvals.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Tenants"
          value={statsLoading ? '—' : stats?.totalTenants ?? 0}
          description="Licensed organizations on the platform"
        />
        <StatCard
          title="Total Employees"
          value={statsLoading ? '—' : stats?.totalEmployees ?? 0}
          description="Employees across all tenants"
        />
        <StatCard
          title="Pending Approvals"
          value={statsLoading ? '—' : stats?.pendingApprovals ?? 0}
          description="Workflows awaiting action"
        />
      </div>

      {/* System Health Card */}
      <SystemHealthCard isLoading={healthLoading} health={health} />

      {/* All employees table */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-soft border border-surface-200 dark:border-surface-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-surface-100 dark:border-surface-800">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-surface-900 dark:text-surface-50">
              All Employees
            </h2>
            <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400">
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
              className="flex-1 sm:flex-none min-w-0 px-3 py-2 text-sm border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
            <button
              type="button"
              onClick={handleSearchApply}
              className="px-3 py-2 text-sm font-medium rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
            >
              Search
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-surface-200 dark:divide-surface-800">
            <thead className="bg-surface-50 dark:bg-surface-800/50">
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Tenant / Company</Th>
                <Th>Department</Th>
                <Th>Status</Th>
                <Th>Roles</Th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-surface-900 divide-y divide-surface-100 dark:divide-surface-800">
              {usersLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-surface-500 dark:text-surface-400 text-sm"
                  >
                    Loading users...
                  </td>
                </tr>
              ) : filteredByEmail.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-surface-500 dark:text-surface-400 text-sm"
                  >
                    No users found for the current filters.
                  </td>
                </tr>
              ) : (
                filteredByEmail.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-900 dark:text-surface-50">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-700 dark:text-surface-200">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-700 dark:text-surface-200">
                      {user.tenantName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-700 dark:text-surface-200">
                      {user.departmentName ?? '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200">
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-700 dark:text-surface-200">
                      {user.roles.join(', ')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Simple pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100 dark:border-surface-800 text-xs sm:text-sm">
          <div className="text-surface-500 dark:text-surface-400">
            Page {totalPages === 0 ? 0 : page + 1} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!canPrevious}
              onClick={() => canPrevious && setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={!canNext}
              onClick={() => canNext && setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Role Management Panel */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-soft border border-surface-200 dark:border-surface-800 p-4 sm:p-6 space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-surface-900 dark:text-surface-50">
            Role Management
          </h2>
          <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 mt-1">
            Search by user email and assign or revoke a high-level role.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-surface-600 dark:text-surface-300 mb-1">
              User Email
            </label>
            <input
              type="email"
              placeholder="user@example.com"
              value={roleEmail}
              onChange={(e) => setRoleEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 dark:text-surface-300 mb-1">
              Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAssignRole}
            disabled={updateRoleMutation.isPending}
            className="px-4 py-2 text-sm font-medium rounded-xl bg-primary-600 text-white hover:bg-primary-700 shadow-md shadow-primary-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {updateRoleMutation.isPending ? 'Updating...' : 'Assign / Update Role'}
          </button>
        </div>
      </div>
    </motion.div>
    </AppLayout>
  );
}

function StatCard(props: { title: string; value: number | string; description?: string }) {
  const { title, value, description } = props;
  return (
    <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 px-4 py-4 sm:px-5 sm:py-5 shadow-soft">
      <div className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wide">
        {title}
      </div>
      <div className="mt-2 text-2xl font-semibold text-surface-900 dark:text-surface-50">
        {value}
      </div>
      {description && (
        <div className="mt-1 text-xs text-surface-500 dark:text-surface-400">{description}</div>
      )}
    </div>
  );
}

function SystemHealthCard(props: { isLoading: boolean; health: any }) {
  const { isLoading, health } = props;

  const getStatusColors = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'UP':
        return {
          color: 'bg-green-100 dark:bg-green-900/30',
          badge: 'bg-green-500',
          text: 'System UP',
          textColor: 'text-green-700 dark:text-green-300',
        };
      case 'DEGRADED':
        return {
          color: 'bg-amber-100 dark:bg-amber-900/30',
          badge: 'bg-amber-500',
          text: 'System Degraded',
          textColor: 'text-amber-700 dark:text-amber-300',
        };
      default:
        return {
          color: 'bg-red-100 dark:bg-red-900/30',
          badge: 'bg-red-500',
          text: 'System Down',
          textColor: 'text-red-700 dark:text-red-300',
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-4 sm:p-6 shadow-soft"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-surface-900 dark:text-surface-50">
            System Health
          </h2>
          <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 mt-1">
            Real-time system component status
          </p>
        </div>

        {/* Overall Status Badge */}
        {isLoading ? (
          <div className={`${statusColor} px-4 py-2 rounded-full inline-block w-fit`}>
            <span className="text-sm font-medium text-surface-600 dark:text-surface-400">
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

      {/* Component Status Grid */}
      {!isLoading && health?.components && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
        >
          {Object.entries(health.components).map(([componentName, component]: [string, any], index) => {
            const status = component.status?.toUpperCase();
            const isUp = status === 'UP';
            const isUnavailable = status === 'UNAVAILABLE';
            const isDegraded = status === 'DEGRADED';

            let componentColor = 'bg-red-50 dark:bg-red-900/20';
            let dotColor = 'bg-red-500';
            let textColor = 'text-red-700 dark:text-red-300';
            let statusLabel = 'Down';

            if (isUp) {
              componentColor = 'bg-green-50 dark:bg-green-900/20';
              dotColor = 'bg-green-500';
              textColor = 'text-green-700 dark:text-green-300';
              statusLabel = 'Operational';
            } else if (isUnavailable) {
              componentColor = 'bg-amber-50 dark:bg-amber-900/20';
              dotColor = 'bg-amber-500';
              textColor = 'text-amber-700 dark:text-amber-300';
              statusLabel = 'Unavailable';
            } else if (isDegraded) {
              componentColor = 'bg-orange-50 dark:bg-orange-900/20';
              dotColor = 'bg-orange-500';
              textColor = 'text-orange-700 dark:text-orange-300';
              statusLabel = 'Degraded';
            }

            return (
              <motion.div
                key={componentName}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: 0.05 + index * 0.05 }}
                className={`${componentColor} rounded-lg p-3 border border-surface-200 dark:border-surface-700`}
              >
                <div className="flex items-start gap-2">
                  <div className={`${dotColor} w-2 h-2 rounded-full mt-1 flex-shrink-0`} />
                  <div className="min-w-0">
                    <div className={`text-xs font-medium ${textColor} truncate capitalize`}>
                      {componentName.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                      {statusLabel}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-6 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
      {children}
    </th>
  );
}

