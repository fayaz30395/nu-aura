'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar, SidebarItem } from '@/components/ui/Sidebar';
import { Header } from '@/components/layout/Header';
import { DarkModeProvider } from '@/components/layout/DarkModeProvider';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Clock,
  Briefcase,
  FileText,
  Shield,
  GitBranch,
  Umbrella,
  CalendarDays,
  LogOut,
  MapPin,
  Sliders,
  UserCog,
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Define sidebar navigation items
  const sidebarItems: SidebarItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
      href: '/admin/dashboard',
    },
    {
      id: 'employees',
      label: 'Employees',
      icon: <Users className="h-5 w-5" />,
      href: '/admin/employees',
    },
    {
      id: 'org-hierarchy',
      label: 'Organization',
      icon: <GitBranch className="h-5 w-5" />,
      href: '/admin/org-hierarchy',
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
        },
        {
          id: 'shifts',
          label: 'Shifts',
          href: '/admin/shifts',
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
        },
        {
          id: 'leave-types',
          label: 'Leave Types',
          href: '/admin/leave-types',
        },
        {
          id: 'holidays',
          label: 'Holidays',
          href: '/admin/holidays',
        },
      ],
    },
    {
      id: 'payroll',
      label: 'Payroll',
      icon: <Briefcase className="h-5 w-5" />,
      href: '/admin/payroll',
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: <FileText className="h-5 w-5" />,
      href: '/admin/reports',
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
        },
        {
          id: 'permissions',
          label: 'Permissions',
          href: '/admin/permissions',
        },
        {
          id: 'office-locations',
          label: 'Office Locations',
          href: '/admin/office-locations',
        },
        {
          id: 'custom-fields',
          label: 'Custom Fields',
          href: '/admin/custom-fields',
        },
        {
          id: 'system-settings',
          label: 'System Settings',
          href: '/admin/settings',
        },
      ],
    },
  ];

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
              items={sidebarItems}
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
                  items={sidebarItems}
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
