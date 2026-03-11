'use client';

import React, { useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar, SidebarItem } from '@/components/ui/Sidebar';
import { Header } from '@/components/layout/Header';
import { DarkModeProvider } from '@/components/layout/DarkModeProvider';
import { usePermissions, Roles, Permissions } from '@/lib/hooks/usePermissions';
import {
  LayoutDashboard,
  Users,
  Clock,
  Briefcase,
  FileText,
  Shield,
  GitBranch,
  Umbrella,
  Server,
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { permissions, roles, hasPermission, isReady } = usePermissions();
  const isSuperAdmin = useMemo(
    () => roles.includes(Roles.SUPER_ADMIN),
    [roles]
  );

  // Define sidebar navigation items (with permission metadata)
  const sidebarItems: SidebarItem[] = [
    // SuperAdmin only section
    ...(isSuperAdmin
      ? [
          {
            id: 'system',
            label: 'System Dashboard',
            icon: <Server className="h-5 w-5" />,
            href: '/admin/system',
            requiredPermission: Permissions.SYSTEM_ADMIN,
          },
        ]
      : []),
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
      href: '/admin',
      requiredPermission: Permissions.DASHBOARD_VIEW,
    },
    {
      id: 'employees',
      label: 'Employees',
      icon: <Users className="h-5 w-5" />,
      href: '/admin/employees',
      requiredPermission: Permissions.EMPLOYEE_VIEW_ALL,
    },
    {
      id: 'org-hierarchy',
      label: 'Organization',
      icon: <GitBranch className="h-5 w-5" />,
      href: '/admin/org-hierarchy',
      requiredPermission: Permissions.ORG_STRUCTURE_VIEW,
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: <Clock className="h-5 w-5" />,
      children: [
        {
          id: 'attendance-records',
          label: 'Records',
          href: '/admin/attendance/records',
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
      icon: <Umbrella className="h-5 w-5" />,
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
      icon: <Briefcase className="h-5 w-5" />,
      href: '/admin/payroll',
      requiredPermission: Permissions.PAYROLL_VIEW_ALL,
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: <FileText className="h-5 w-5" />,
      href: '/admin/reports',
      requiredPermission: Permissions.REPORT_VIEW,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Shield className="h-5 w-5" />,
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
  ];

  const filterSidebarItems = (items: SidebarItem[]): SidebarItem[] => {
    if (!isReady) {
      // During hydration, show the raw menu to avoid flicker
      return items;
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

    return items
      .map((item) => filterItem(item))
      .filter((item): item is SidebarItem => item !== null);
  };

  const filteredSidebarItems = useMemo(
    () => filterSidebarItems(sidebarItems),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(permissions), JSON.stringify(roles), isReady]
  );

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
    // Clear any auth tokens
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
    }
    router.push('/login');
  };

  return (
    <DarkModeProvider>
      <div className="min-h-screen bg-surface-50 dark:bg-slate-900">
        {/* Header */}
        <Header
          onMenuClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          showMenuButton={true}
          userName="Admin User"
          notificationCount={3}
          onLogout={handleLogout}
          onProfile={() => router.push('/admin/profile')}
          onSettings={() => router.push('/admin/settings')}
        />

        <div className="flex h-[calc(100vh-4rem)]">
          {/* Sidebar - Desktop */}
          <div className="hidden md:block">
            <Sidebar
              items={filteredSidebarItems}
              activeId={getActiveId()}
              onItemClick={handleItemClick}
              collapsible={true}
              className="h-full"
            />
          </div>

          {/* Sidebar - Mobile */}
          {isMobileSidebarOpen && (
            <div className="fixed inset-0 z-50 md:hidden">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => setIsMobileSidebarOpen(false)}
              />
              <div className="absolute left-0 top-0 bottom-0">
                <Sidebar
                  items={filteredSidebarItems}
                  activeId={getActiveId()}
                  onItemClick={handleItemClick}
                  collapsible={false}
                  className="h-full"
                />
              </div>
            </div>
          )}

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </DarkModeProvider>
  );
}
