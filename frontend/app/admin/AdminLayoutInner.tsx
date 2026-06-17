'use client';

import React, {useEffect, useMemo, useState} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import {Sidebar, SIDEBAR_WIDTH_COLLAPSED, SIDEBAR_WIDTH_EXPANDED, SidebarItem} from '@/components/ui/Sidebar';
import {SkeletonDashboard} from '@/components/ui/Skeleton';
import {Header} from '@/components/layout/Header';
import {DarkModeProvider} from '@/components/layout/DarkModeProvider';
import {Permissions, Roles, usePermissions} from '@/lib/hooks/usePermissions';
import {useAuth} from '@/lib/hooks/useAuth';
import {
  ArrowLeft,
  Briefcase,
  Clock,
  RefreshCw,
  FileText,
  Flag,
  GitBranch,
  LayoutDashboard,
  ShieldAlert,
  Server,
  Shield,
  Umbrella,
  Upload,
  Users,
  UserCog,
} from 'lucide-react';
import {useUnreadNotificationCount} from '@/lib/hooks/queries/useNotifications';
import {useUiStore} from '@/lib/stores/useUiStore';

// This component is dynamically imported with { ssr: false } from layout.tsx.
// It is NEVER server-rendered, so there is no hydration to worry about.
// All Zustand hooks (usePermissions, useAuth, etc.) are safe to use freely.
export default function AdminLayoutInner({
                                           children,
                                         }: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const {roles, hasPermission, isReady} = usePermissions();
  const {user} = useAuth();
  const isSuperAdmin = useMemo(
    () => roles.includes(Roles.SUPER_ADMIN),
    [roles]
  );

  // H-4: Only SUPER_ADMIN, TENANT_ADMIN, and HR_MANAGER have admin area access.
  // HR_MANAGER replaces the non-existent HR_ADMIN backend role (M-3).
  // Note: plain HR_MANAGER users may receive 403 on some admin API calls — acceptable UX.
  const hasAdminAccess = useMemo(
    () =>
      isSuperAdmin ||
      roles.includes(Roles.TENANT_ADMIN) ||
      roles.includes(Roles.HR_MANAGER),
    [isSuperAdmin, roles]
  );
  const {data: unreadCount} = useUnreadNotificationCount(isReady && hasAdminAccess);

  // Redirect unauthorized users after hydration
  useEffect(() => {
    if (isReady && !hasAdminAccess) {
      router.replace('/me/dashboard');
    }
  }, [isReady, hasAdminAccess, router]);

  // Get primary user role for display
  const userRoleDisplay = useMemo(() => {
    if (!user?.roles || user.roles.length === 0) {
      return 'Employee';
    }
    // Use the first role (typically the primary role)
    const primaryRole = user.roles[0];
    return primaryRole.name || primaryRole.code || 'Employee';
  }, [user?.roles]);

  // Define sidebar navigation items (with permission metadata).
  // Memoized on isSuperAdmin so that the array reference is stable between
  // renders and memo(Sidebar) receives a new reference only when the
  // System Dashboard item actually needs to be added or removed.
  const sidebarItems = useMemo((): SidebarItem[] => [
    // SuperAdmin-only section (NAV-003: feature-flags and implicit-roles added)
    ...(isSuperAdmin
      ? [
        {
          id: 'system',
          label: 'System Dashboard',
          icon: <Server className="h-5 w-5"/>,
          href: '/admin/system',
          requiredPermission: Permissions.SYSTEM_ADMIN,
        },
        {
          id: 'feature-flags',
          label: 'Feature Flags',
          icon: <Flag className="h-5 w-5"/>,
          href: '/admin/feature-flags',
          requiredPermission: Permissions.SYSTEM_ADMIN,
        },
        {
          id: 'implicit-roles',
          label: 'Implicit Roles',
          icon: <UserCog className="h-5 w-5"/>,
          href: '/admin/implicit-roles',
          requiredPermission: Permissions.SYSTEM_ADMIN,
        },
      ]
      : []),
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="h-5 w-5"/>,
      href: '/admin',
      requiredPermission: Permissions.DASHBOARD_VIEW,
    },
    {
      id: 'employees',
      label: 'Employees',
      icon: <Users className="h-5 w-5"/>,
      href: '/admin/employees',
      requiredPermission: Permissions.EMPLOYEE_VIEW_ALL,
    },
    {
      id: 'org-hierarchy',
      label: 'Organization',
      icon: <GitBranch className="h-5 w-5"/>,
      href: '/admin/org-hierarchy',
      requiredPermission: Permissions.ORG_STRUCTURE_VIEW,
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: <Clock className="h-5 w-5"/>,
      children: [
        {
          id: 'attendance-records',
          label: 'Records',
          href: '/attendance/team',
          requiredPermission: Permissions.ATTENDANCE_VIEW_ALL,
        },
        {
          id: 'shifts',
          label: 'Shifts',
          href: '/admin/shifts',
          requiredPermission: Permissions.SHIFT_VIEW,
        },
      ],
    },
    {
      id: 'leave',
      label: 'Leave Management',
      icon: <Umbrella className="h-5 w-5"/>,
      children: [
        {
          id: 'leave-requests',
          label: 'Leave Requests',
          href: '/admin/leave-requests',
          requiredPermission: Permissions.LEAVE_VIEW_ALL,
        },
        {
          id: 'leave-types',
          label: 'Leave Types',
          href: '/admin/leave-types',
          requiredPermission: Permissions.LEAVE_TYPE_VIEW,
        },
        {
          id: 'holidays',
          label: 'Holidays',
          href: '/admin/holidays',
          // Fallback to generic settings view if a dedicated holiday permission does not exist
          requiredPermission: (Permissions as Record<string, string>).HOLIDAY_MANAGE ?? Permissions.SETTINGS_VIEW,
        },
      ],
    },
    {
      id: 'payroll',
      label: 'Payroll',
      icon: <Briefcase className="h-5 w-5"/>,
      href: '/admin/payroll',
      requiredPermission: Permissions.PAYROLL_VIEW_ALL,
    },
    {
      id: 'keka-import',
      label: 'Data Import',
      icon: <Upload className="h-5 w-5"/>,
      children: [
        {
          id: 'import-keka',
          label: 'Import from KEKA',
          href: '/admin/import-keka',
          requiredPermission: Permissions.EMPLOYEE_CREATE,
        },
      ],
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: <FileText className="h-5 w-5"/>,
      href: '/admin/reports',
      requiredPermission: Permissions.REPORT_VIEW,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Shield className="h-5 w-5"/>,
      children: [
        {
          id: 'roles',
          label: 'Roles & Permissions',
          href: '/admin/roles',
          requiredPermission: Permissions.ROLE_MANAGE,
        },
        {
          id: 'permissions',
          label: 'Permissions',
          href: '/admin/permissions',
          requiredPermission: Permissions.PERMISSION_MANAGE,
        },
        {
          id: 'office-locations',
          label: 'Office Locations',
          href: '/admin/office-locations',
          requiredPermission: Permissions.OFFICE_LOCATION_VIEW,
        },
        {
          id: 'custom-fields',
          label: 'Custom Fields',
          href: '/admin/custom-fields',
          requiredPermission: Permissions.CUSTOM_FIELD_VIEW,
        },
        {
          id: 'system-settings',
          label: 'System Settings',
          href: '/admin/settings',
          requiredPermission: Permissions.SETTINGS_VIEW,
        },
      ],
    },
    // Only `isSuperAdmin` gates the item set (the SuperAdmin-only System
    // Dashboard entry). `Permissions`/`Roles` are module constants and the
    // icon elements are static JSX, so none are reactive deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [isSuperAdmin]);

  // Filter the sidebar by the current user's permissions. All reactive inputs
  // are referentially stable: `sidebarItems` and `isSuperAdmin` are memoized,
  // and `hasPermission` is a `useCallback` keyed on the permission set in
  // usePermissions — so its identity changes exactly when permissions change.
  // That lets exhaustive-deps stay satisfied without the prior
  // `JSON.stringify(permissions)` dep hack (which serialized the whole permission
  // array on every render just to diff it).
  const filteredSidebarItems = useMemo(() => {
    if (!isReady) {
      // During hydration, show the raw menu to avoid flicker
      return sidebarItems;
    }

    const filterItem = (item: SidebarItem): SidebarItem | null => {
      if (!isSuperAdmin) {
        if (item.requiredPermission && !hasPermission(item.requiredPermission)) {
          return null;
        }
      }

      if (item.children && item.children.length > 0) {
        const visibleChildren = item.children
          .map((child) => filterItem(child))
          .filter((child): child is SidebarItem => child !== null);

        if (visibleChildren.length === 0 && !item.href) {
          return null;
        }

        return {
          ...item,
          children: visibleChildren,
        };
      }

      return item;
    };

    return sidebarItems
      .map((item) => filterItem(item))
      .filter((item): item is SidebarItem => item !== null);
  }, [sidebarItems, isReady, isSuperAdmin, hasPermission]);

  // Get active item ID from current pathname
  const getActiveId = () => {
    for (const item of sidebarItems) {
      if (item.href === pathname) return item.id;
      if (item.children) {
        for (const child of item.children) {
          if (child.href === pathname) return child.id;
        }
      }
    }
    return '';
  };

  const handleItemClick = (item: SidebarItem) => {
    if (item.href) {
      router.push(item.href);
      setIsMobileSidebarOpen(false);
    }
  };

  const handleLogout = () => {
    // Auth tokens are in httpOnly cookies — Zustand auth store handles logout
    router.replace('/auth/login');
  };

  // Admin shell collapse state lives in useUiStore as a sibling of the
  // user-app `sidebarCollapsed` field. The persist middleware bridges it
  // onto the legacy `admin-sidebar-collapsed` localStorage key, so user
  // state survives this migration.
  const isCollapsed = useUiStore((s) => s.adminSidebarCollapsed);
  const setAdminSidebarCollapsed = useUiStore((s) => s.setAdminSidebarCollapsed);

  const handleCollapsedChange = (collapsed: boolean) => {
    setAdminSidebarCollapsed(collapsed);
  };

  return (
    <DarkModeProvider>
      <div className="flex min-h-[100dvh] overflow-hidden bg-[var(--bg-page)]">
        {/* Sidebar — fixed width, stable layout */}
        <aside
          className="hidden md:flex flex-shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{
            width: isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
            minWidth: isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
          }}
        >
          <Sidebar
            items={filteredSidebarItems}
            activeId={getActiveId()}
            onItemClick={handleItemClick}
            collapsed={isCollapsed}
            onCollapsedChange={handleCollapsedChange}
            collapsible={true}
            storageKeyPrefix="admin"
            className="h-full"
          />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-[var(--bg-overlay)]"
              onClick={() => setIsMobileSidebarOpen(false)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); setIsMobileSidebarOpen(false); } }}
              role="button"
              tabIndex={0}
              aria-label="Close mobile navigation menu"
            />
            <div className="absolute left-0 top-0 bottom-0 w-72">
              <Sidebar
                items={filteredSidebarItems}
                activeId={getActiveId()}
                onItemClick={handleItemClick}
                collapsible={false}
                storageKeyPrefix="admin"
                className="h-full"
              />
            </div>
          </div>
        )}

        {/* Main Content — fills remaining space */}
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          {/* Header — fixed height */}
          <Header
            onMenuClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            showMenuButton={true}
            userName={user?.fullName ?? 'User'}
            userRole={userRoleDisplay}
            notificationCount={unreadCount ?? 0}
            onLogout={handleLogout}
            onProfile={() => router.push('/admin/profile')}
            onSettings={() => router.push('/admin/settings')}
          />

          {/* Scrollable content area */}
          <main className="flex-1 overflow-auto bg-[var(--bg-page)]">
            {!isReady ? (
              <div className="page-shell-centered fade-slide-up">
                <div
                  className="page-shell-card w-full max-w-3xl border-[var(--border-main)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] p-6"
                >
                  <div
                    className="mb-5 flex items-center justify-between rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--text-secondary)]">Preparing admin workspace</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">Loading secure admin controls...</p>
                    </div>
                    <RefreshCw className="w-4 h-4 text-accent-600 dark:text-accent-400"/>
                  </div>
                  <SkeletonDashboard/>
                </div>
              </div>
            ) : !hasAdminAccess ? (
              <div className="page-shell-centered fade-slide-up">
                <div className="page-shell-card p-8 text-center fade-slide-up max-w-lg">
                  <div
                    className="mx-auto mb-4 h-14 w-14 rounded-full bg-danger-100/80 dark:bg-danger-900/30 border border-danger-300/40 dark:border-danger-500/25 flex items-center justify-center"
                  >
                    <ShieldAlert className="w-7 h-7 text-danger-700 dark:text-danger-300"/>
                  </div>
                  <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">Access denied</h1>
                  <p className="text-[var(--text-secondary)] mb-2">
                    You do not have permission to access the admin dashboard.
                  </p>
                  <p className="text-sm text-[var(--text-muted)] mb-6">
                    Contact your system administrator if you need elevated permissions.
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
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </DarkModeProvider>
  );
}
