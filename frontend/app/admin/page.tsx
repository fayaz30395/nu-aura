'use client';

import React, {useEffect, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {motion} from 'framer-motion';
import {notifications} from '@mantine/notifications';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  Plug,
  RefreshCw,
  Search,
  ShieldAlert,
  Shield,
  ShieldCheck,
  Users,
} from 'lucide-react';

import {useAdminStats, useAdminUsers, useSystemHealth, useUpdateUserRole} from '@/lib/hooks/queries/useAdmin';
import {Roles, usePermissions} from '@/lib/hooks/usePermissions';
import {AdminUserSummary, HealthComponent, HealthResponse} from '@/lib/types/core/admin';
import {AdminPageContent} from '@/components/layout';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {Card, CardContent} from '@/components/ui/Card';
import {Skeleton} from '@/components/ui/Skeleton';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {PageTransition, Reveal} from '@/components/motion';
import {MOTION_EASE} from '@/lib/animation';

// Consolidated onto the shared motion foundation: every transition on this page
// uses the foundation easing token (MOTION_EASE.outExpo) so motion has a single
// source of truth across all surfaces — no per-page cubic-bezier drift.
const EASE = [...MOTION_EASE.outExpo] as [number, number, number, number];

const PAGE_SIZE = 10;

const ALL_ROLE_OPTIONS: { label: string; value: string }[] = [
  {label: 'Super Admin', value: Roles.SUPER_ADMIN},
  {label: 'Tenant Admin', value: Roles.TENANT_ADMIN},
  {label: 'HR Admin', value: Roles.HR_ADMIN},
  {label: 'Employee', value: Roles.EMPLOYEE},
];

const roleAssignmentSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Must be a valid email'),
  role: z.string().min(1, 'Role is required'),
});

type RoleAssignmentForm = z.infer<typeof roleAssignmentSchema>;

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const router = useRouter();
  const {isAdmin, hasRole} = usePermissions();

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
    formState: {errors: roleErrors},
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
      router.replace('/me/dashboard');
    }
  }, [authChecked, isAdmin, router]);

  const {data: stats, isLoading: statsLoading} = useAdminStats();
  const {data: usersPage, isLoading: usersLoading} = useAdminUsers(page, PAGE_SIZE, search);
  const {data: health, isLoading: healthLoading, refetch: refetchHealth} = useSystemHealth();
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
      notifications.show({title: 'Error', message: 'User not found in the current list.', color: 'red'});
      return;
    }
    setConfirmDialog({isOpen: true, email: data.email, role: data.role});
  };

  const handleConfirmRoleAssignment = async () => {
    const target = users.find((u) => u.email.toLowerCase() === confirmDialog.email.trim().toLowerCase());
    if (!target) return;
    try {
      await updateRoleMutation.mutateAsync({userId: target.id, role: confirmDialog.role});
      resetRoleForm();
      setConfirmDialog({isOpen: false, email: '', role: ''});
    } catch (_error) {
      // Error is handled by React Query
    }
  };

  const canPrevious = page > 0;
  const canNext = usersPage ? page < usersPage.totalPages - 1 : false;

  // Show nothing while auth store hydrates; redirect is in-flight for non-admin users
  if (!authChecked) return null;
  if (!isAdmin) {
    return (
      <div className="page-shell-centered motion-rise">
        <Card className="card-aura motion-rise">
          <CardContent className="py-10">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300">
                <ShieldAlert className="h-5 w-5"/>
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Admin route</p>
                <p className="text-caption">Redirecting to dashboard...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const healthStatus = health?.status?.toUpperCase();
  const degraded = healthStatus === 'DEGRADED';

  return (
    <PageTransition>
      <AdminPageContent className="page-shell">
        <div className="w-full space-y-6">
          <PageHeader />

        {statsLoading ? (
          <StatsSkeleton />
        ) : (
          <StatsRow
            totalTenants={stats?.totalTenants ?? 0}
            totalEmployees={stats?.totalEmployees ?? 0}
            pendingApprovals={stats?.pendingApprovals ?? 0}
            systemStatus={healthStatus ?? 'UNKNOWN'}
          />
        )}

        <BentoNavigation pendingApprovals={stats?.pendingApprovals ?? 0} />

        <SystemHealthSection
          isLoading={healthLoading}
          health={health}
          onRefresh={refetchHealth}
        />

        <EmployeesSection
          users={filteredByEmail}
          isLoading={usersLoading}
          pendingSearch={pendingSearch}
          onSearchChange={setPendingSearch}
          onSearchApply={handleSearchApply}
          page={page}
          totalPages={totalPages}
          canPrevious={canPrevious}
          canNext={canNext}
          onPrevious={() => canPrevious && setPage((p) => p - 1)}
          onNext={() => canNext && setPage((p) => p + 1)}
        />

        <RoleManagementSection
          register={registerRole}
          onSubmit={handleRoleSubmit(handleAssignRole)}
          errors={roleErrors}
          options={ROLE_OPTIONS}
          isPending={updateRoleMutation.isPending}
        />

        {degraded && <DegradedStrip />}

        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog({isOpen: false, email: '', role: ''})}
          onConfirm={handleConfirmRoleAssignment}
          title="Confirm Role Assignment"
          message={`You are about to assign ${ROLE_OPTIONS.find((opt) => opt.value === confirmDialog.role)?.label || confirmDialog.role} role to ${confirmDialog.email}. This grants elevated permissions.`}
          confirmText="Assign Role"
          cancelText="Cancel"
          type="warning"
          loading={updateRoleMutation.isPending}
        />
      </div>
    </AdminPageContent>
    </PageTransition>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────
function PageHeader() {
  return (
    <motion.header
      initial={{opacity: 0, y: 4}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.28, ease: EASE}}
      className="grid gap-4 border-b border-[var(--border-subtle)] pb-4 sm:grid-cols-[1fr_auto] sm:items-end"
    >
      <div className="max-w-3xl space-y-1.5">
        <p className="text-2xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Administration
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-heading)] sm:text-3xl">
          Platform administration
        </h1>
        <p className="max-w-[62ch] text-sm text-[var(--text-secondary)]">
          Manage access, audit configuration, and monitor service health from one compact workspace.
        </p>
      </div>
    </motion.header>
  );
}

// ── Stats row (no card boxes, borders divide instead) ────────────────────────
function StatsRow({totalTenants, totalEmployees, pendingApprovals, systemStatus}: {
  totalTenants: number;
  totalEmployees: number;
  pendingApprovals: number;
  systemStatus: string;
}) {
  const statusTone: 'neutral' | 'warning' | 'danger' =
    systemStatus === 'UP' ? 'neutral' : systemStatus === 'DEGRADED' ? 'warning' : 'danger';
  const statusLabel =
    systemStatus === 'UP' ? 'Operational' : systemStatus === 'DEGRADED' ? 'Degraded' : 'Down';

  const items = [
    {label: 'Tenants', value: totalTenants, icon: Building2, tone: 'neutral' as const},
    {label: 'Employees', value: totalEmployees, icon: Users, tone: 'neutral' as const},
    {
      label: 'Pending approvals',
      value: pendingApprovals,
      icon: ClipboardList,
      tone: pendingApprovals > 0 ? ('warning' as const) : ('neutral' as const),
    },
    {label: 'System', value: statusLabel, icon: Activity, tone: statusTone},
  ];

  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={{visible: {transition: {staggerChildren: 0.06, delayChildren: 0.08}}}}
      aria-label="Platform at a glance"
      className="grid grid-cols-2 sm:grid-cols-4 border-y border-[var(--border-subtle)] divide-x divide-[var(--border-subtle)]"
    >
      {items.map((item) => (
        <motion.div
          key={item.label}
          variants={{hidden: {opacity: 0, y: 4}, visible: {opacity: 1, y: 0, transition: {duration: 0.28, ease: EASE}}}}
          className="px-4 py-4 sm:px-5 sm:py-5 first:pl-0 last:pr-0"
        >
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-2xs font-medium uppercase tracking-wider">{item.label}</span>
          </div>
          <p
            className={`mt-2 font-mono text-2xl sm:text-3xl tabular-nums tracking-tight ${
              item.tone === 'danger' ? 'text-danger-700 dark:text-danger-300'
                : item.tone === 'warning' ? 'text-warning-700 dark:text-warning-300'
                : 'text-[var(--text-heading)]'
            }`}
          >
            {item.value}
          </p>
        </motion.div>
      ))}
    </motion.section>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 border-y border-[var(--border-subtle)] divide-x divide-[var(--border-subtle)]">
      {Array.from({length: 4}).map((_, i) => (
        <div key={i} className="px-4 py-4 sm:px-5 sm:py-5 first:pl-0 last:pr-0">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="mt-2 h-8 w-20 rounded" />
        </div>
      ))}
    </div>
  );
}

function BentoNavigation({pendingApprovals}: {pendingApprovals: number}) {
  const tiles = [
    {
      title: 'Users & roles',
      description: 'Directory, role assignment, and elevated-access review.',
      icon: Users,
      href: '#users',
    },
    {
      title: 'Tenant configuration',
      description: 'Organizations, regions, working calendars, and feature toggles.',
      icon: Building2,
      href: '/admin/tenants',
    },
    {
      title: 'Integrations',
      description: 'Single sign-on, payroll connectors, and outbound webhooks.',
      icon: Plug,
      href: '/admin/integrations',
    },
    {
      title: 'Compliance & audit',
      description: 'GDPR DSRs, retention policies, and the immutable audit log.',
      icon: ShieldCheck,
      href: '/admin/compliance',
    },
    {
      title: 'Approvals queue',
      description: 'Sensitive workflows awaiting your sign-off across all tenants.',
      icon: ClipboardList,
      href: '/admin/approvals',
      badge: pendingApprovals > 0 ? pendingApprovals : undefined,
    },
  ];

  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={{visible: {transition: {staggerChildren: 0.04, delayChildren: 0.08}}}}
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
      aria-label="Administration areas"
    >
      {tiles.map((tile) => (
        <BentoTile key={tile.href} {...tile} />
      ))}
    </motion.section>
  );
}

function BentoTile({title, description, icon: Icon, href, badge}: {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  badge?: number;
}) {
  return (
    <motion.div
      variants={{hidden: {opacity: 0, y: 5}, visible: {opacity: 1, y: 0, transition: {duration: 0.28, ease: EASE}}}}
    >
      <Link
        href={href}
        className="group flex h-full min-h-[7.25rem] items-start gap-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 transition-all hover:border-[var(--border-main)] hover:bg-[var(--bg-card-hover)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[var(--text-heading)]">{title}</h3>
            {badge !== undefined && (
              <span className="inline-flex items-center justify-center min-w-6 px-2 h-5 text-2xs font-semibold rounded-full bg-warning-100 text-warning-700 dark:bg-warning-900/40 dark:text-warning-300">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{description}</p>
        </div>
        <ArrowRight className="h-4 w-4 self-center text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
    </motion.div>
  );
}

// ── System health (divide-y list, flat) ──────────────────────────────────────
function SystemHealthSection({isLoading, health, onRefresh}: {
  isLoading: boolean;
  health: HealthResponse | undefined;
  onRefresh: () => void;
}) {
  const status = health?.status?.toUpperCase();
  const statusLabel = status === 'UP' ? 'All systems operational'
    : status === 'DEGRADED' ? 'Partial degradation'
    : isLoading ? 'Checking…' : 'System unreachable';
  const statusTone =
    status === 'UP' ? 'text-success-700 dark:text-success-300'
      : status === 'DEGRADED' ? 'text-warning-700 dark:text-warning-300'
      : 'text-danger-700 dark:text-danger-300';

  const entries = health?.components ? Object.entries(health.components) : [];

  return (
    <motion.section
      initial={{opacity: 0, y: 6}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.32, ease: EASE, delay: 0.12}}
      className="space-y-4"
      aria-labelledby="admin-health-heading"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="admin-health-heading" className="text-lg font-semibold tracking-tight text-[var(--text-heading)]">
            System health
          </h2>
          <p className={`mt-1 text-sm ${statusTone}`}>{statusLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => onRefresh()}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-700 dark:text-accent-300 hover:underline disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 rounded"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <ul className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
          {Array.from({length: 4}).map((_, i) => (
            <li key={i} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-3 sm:gap-5">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-4 w-48 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
            </li>
          ))}
        </ul>
      ) : entries.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] py-6">No component status reported.</p>
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
          {entries.map(([name, component]: [string, HealthComponent]) => {
            const s = component.status?.toUpperCase();
            const isUp = s === 'UP';
            const isDegraded = s === 'DEGRADED';
            const label = isUp ? 'Operational' : isDegraded ? 'Degraded' : s === 'UNAVAILABLE' ? 'Unavailable' : 'Down';
            const tone = isUp
              ? 'bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-300'
              : isDegraded
                ? 'bg-warning-50 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300'
                : 'bg-danger-50 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300';
            const Icon = isUp ? CheckCircle2 : isDegraded ? AlertTriangle : AlertTriangle;
            const friendly = name
              .replace(/([A-Z])/g, ' $1')
              .trim()
              .split(' ')
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
              .join(' ');
            return (
              <li key={name} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-3 sm:gap-5">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${tone}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <p className="text-sm font-medium text-[var(--text-heading)] truncate">{friendly}</p>
                <p className={`font-mono text-xs font-semibold uppercase tracking-wider tabular-nums ${tone.split(' ').filter((c) => c.startsWith('text-')).join(' ')}`}>
                  {label}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </motion.section>
  );
}

// ── Employees table (flat, no nested cards) ──────────────────────────────────
function EmployeesSection({
                            users, isLoading, pendingSearch, onSearchChange, onSearchApply,
                            page, totalPages, canPrevious, canNext, onPrevious, onNext,
                          }: {
  users: AdminUserSummary[];
  isLoading: boolean;
  pendingSearch: string;
  onSearchChange: (v: string) => void;
  onSearchApply: () => void;
  page: number;
  totalPages: number;
  canPrevious: boolean;
  canNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <motion.section
      id="users"
      initial={{opacity: 0, y: 6}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.32, ease: EASE, delay: 0.16}}
      className="space-y-4"
      aria-labelledby="admin-users-heading"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="admin-users-heading" className="text-lg font-semibold tracking-tight text-[var(--text-heading)]">
            All employees
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Cross-tenant directory with role visibility.
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <label className="relative flex-1 sm:flex-none" htmlFor="admin-search">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]"
              aria-hidden="true"
            />
            <input
              id="admin-search"
              type="text"
              placeholder="Search by name or email"
              value={pendingSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearchApply()}
              className="input-aura w-full sm:w-72 pl-9 pr-4 py-2 text-sm rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              aria-label="Search employees by name or email"
            />
          </label>
          <button
            type="button"
            onClick={onSearchApply}
            className="btn-secondary px-4 py-2 text-sm font-medium rounded-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
            title="Search (Enter key also works)"
          >
            Search
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border-y border-[var(--border-subtle)]" suppressHydrationWarning role="region" aria-label="Employees table">
        <table className="table-aura min-w-full" suppressHydrationWarning role="table">
          <thead>
            <tr role="row">
              <Th scope="col">Name</Th>
              <Th scope="col">Email</Th>
              <Th scope="col">Tenant</Th>
              <Th scope="col">Department</Th>
              <Th scope="col">Status</Th>
              <Th scope="col">Roles</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-[var(--text-muted)] text-sm">
                  Loading users…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <Users className="h-10 w-10 text-[var(--text-muted)] mx-auto mb-2" aria-hidden="true" />
                  <p className="text-sm text-[var(--text-muted)]">No users found for the current filters.</p>
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const displayName =
                  (user.firstName && user.firstName + (user.lastName ? ' ' + user.lastName : '')) ||
                  user.email?.split('@')[0] ||
                  '—';
                const statusTone =
                  user.userStatus === 'ACTIVE'
                    ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300'
                    : user.userStatus === 'SUSPENDED'
                      ? 'bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300'
                      : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]';
                return (
                  <tr key={user.id} className="transition-colors hover:bg-[var(--bg-card-hover)]">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                      {displayName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-body-secondary dark:text-[var(--text-muted)]">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-body-secondary dark:text-[var(--text-muted)]">
                      {user.tenantName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-body-secondary dark:text-[var(--text-muted)]">
                      {user.departmentName?.trim() ? user.departmentName : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusTone}`}>
                        {user.userStatus}
                      </span>
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap text-body-secondary dark:text-[var(--text-muted)]"
                      suppressHydrationWarning
                    >
                      {Array.isArray(user.roles) && user.roles.length > 0
                        ? user.roles.filter((role) => role && role.name).map((role) => role.name).join(', ')
                        : '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs sm:text-sm">
        <div className="text-[var(--text-muted)]">
          Page {totalPages === 0 ? 0 : page + 1} of {totalPages}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!canPrevious}
            onClick={onPrevious}
            className="px-4 py-1.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-secondary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
            aria-label={`Previous page${!canPrevious ? ' (disabled)' : ''}`}
          >
            Previous
          </button>
          <button
            type="button"
            disabled={!canNext}
            onClick={onNext}
            className="px-4 py-1.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-secondary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
            aria-label={`Next page${!canNext ? ' (disabled)' : ''}`}
          >
            Next
          </button>
        </div>
      </div>
    </motion.section>
  );
}

// ── Role management (flat form, no nested card) ──────────────────────────────
type RoleRegister = ReturnType<typeof useForm<RoleAssignmentForm>>['register'];
type RoleErrors = ReturnType<typeof useForm<RoleAssignmentForm>>['formState']['errors'];

function RoleManagementSection({register, onSubmit, errors, options, isPending}: {
  register: RoleRegister;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  errors: RoleErrors;
  options: { label: string; value: string }[];
  isPending: boolean;
}) {
  return (
    <motion.section
      initial={{opacity: 0, y: 6}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.32, ease: EASE, delay: 0.2}}
      className="space-y-4"
      aria-labelledby="admin-roles-heading"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="admin-roles-heading" className="text-lg font-semibold tracking-tight text-[var(--text-heading)]">
            Role assignment
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Search by user email and assign a high-level role.
          </p>
        </div>
        <Shield className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
      </div>

      <form
        onSubmit={onSubmit}
        className="grid gap-4 border-y border-[var(--border-subtle)] py-4 sm:grid-cols-[1fr_220px_auto] sm:items-end"
        role="form"
      >
        <div>
          <label htmlFor="admin-email" className="block text-2xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
            User email
          </label>
          <input
            id="admin-email"
            type="email"
            placeholder="user@example.com"
            {...register('email')}
            className="input-aura w-full px-4 py-2 text-sm rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
            aria-describedby={errors.email ? 'admin-email-error' : undefined}
          />
          {errors.email && (
            <p id="admin-email-error" className="text-xs text-danger-600 dark:text-danger-400 mt-1" role="alert">{errors.email.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="admin-role" className="block text-2xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
            Role
          </label>
          <select
            id="admin-role"
            {...register('role')}
            className="input-aura w-full px-4 py-2 text-sm rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
            aria-describedby={errors.role ? 'admin-role-error' : undefined}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.role && (
            <p id="admin-role-error" className="text-xs text-danger-600 dark:text-danger-400 mt-1" role="alert">{errors.role.message}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary px-4 py-2 text-sm font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
          aria-busy={isPending}
        >
          {isPending ? 'Updating…' : 'Assign role'}
        </button>
      </form>
    </motion.section>
  );
}

// ── Degraded strip (one-line alert) ──────────────────────────────────────────
function DegradedStrip() {
  return (
    <motion.aside
      initial={{opacity: 0, y: 6}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.45, ease: EASE, delay: 0.42}}
      role="status"
      aria-live="polite"
      className="flex items-center justify-between gap-4 rounded-xl border border-warning-200 bg-warning-50/40 dark:border-warning-700/40 dark:bg-warning-950/30 px-5 py-4"
    >
      <div className="flex items-center gap-4 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0 text-warning-600 dark:text-warning-400" aria-hidden="true" />
        <p className="text-[var(--text-primary)]">
          <span className="font-semibold">System degraded.</span>{' '}
          Some services are temporarily impaired. Review component status above.
        </p>
      </div>
    </motion.aside>
  );
}

// ── Table header cell ────────────────────────────────────────────────────────
function Th({children, scope = 'col'}: {children: React.ReactNode; scope?: 'col' | 'row'}) {
  return (
    <th scope={scope} className="px-6 py-4 text-left text-2xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
      {children}
    </th>
  );
}
