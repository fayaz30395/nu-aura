'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Shield,
  Users,
  Calendar,
  Clock,
  MapPin,
  Building2,
  ChevronRight,
  Palmtree,
  UserCog,
  Layers,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions, Roles } from '@/lib/hooks/usePermissions';

const ADMIN_ACCESS_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN, Roles.HR_MANAGER];

interface SettingsCard {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
  bgColor: string;
}

const settingsCards: SettingsCard[] = [
  {
    id: 'roles',
    title: 'Roles & Permissions',
    description: 'Manage user roles and access permissions',
    icon: Shield,
    href: '/admin/roles',
    color: 'text-primary-600 dark:text-primary-400',
    bgColor: 'bg-primary-100 dark:bg-primary-900/30',
  },
  {
    id: 'permissions',
    title: 'Permission Management',
    description: 'Configure granular permissions for each module',
    icon: UserCog,
    href: '/admin/permissions',
    color: 'text-accent-600 dark:text-accent-400',
    bgColor: 'bg-accent-100 dark:bg-accent-900/30',
  },
  {
    id: 'leave-types',
    title: 'Leave Types',
    description: 'Configure leave types and policies',
    icon: Calendar,
    href: '/admin/leave-types',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
  {
    id: 'holidays',
    title: 'Holidays',
    description: 'Manage company holidays and calendar',
    icon: Palmtree,
    href: '/admin/holidays',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  {
    id: 'shifts',
    title: 'Shift Management',
    description: 'Configure work shifts and schedules',
    icon: Clock,
    href: '/admin/shifts',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  {
    id: 'office-locations',
    title: 'Office Locations',
    description: 'Manage office locations and geofencing',
    icon: MapPin,
    href: '/admin/office-locations',
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-100 dark:bg-rose-900/30',
  },
  {
    id: 'org-hierarchy',
    title: 'Organization Hierarchy',
    description: 'Configure org structure and reporting lines',
    icon: Building2,
    href: '/admin/org-hierarchy',
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-100 dark:bg-violet-900/30',
  },
  {
    id: 'custom-fields',
    title: 'Custom Fields',
    description: 'Add custom fields to employee profiles',
    icon: Layers,
    href: '/admin/custom-fields',
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
  },
];

export default function AdminSettingsPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();
  const { hasAnyRole, isReady } = usePermissions();

  useEffect(() => {
    if (!hasHydrated || !isReady) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (!hasAnyRole(...ADMIN_ACCESS_ROLES)) {
      router.push('/home');
    }
  }, [hasHydrated, isReady, isAuthenticated, router, hasAnyRole]);

  const handleCardClick = (href: string) => {
    router.push(href);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/25">
          <Settings className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            Admin Settings
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Configure system settings and manage organization preferences
          </p>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {settingsCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.id}
              className="group cursor-pointer hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-200"
              onClick={() => handleCardClick(card.href)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-xl ${card.bgColor}`}>
                    <Icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                  <ChevronRight className="h-5 w-5 text-[var(--text-muted)] group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="mt-4 font-semibold text-[var(--text-primary)] group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {card.title}
                </h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/admin/leave-requests')}
              className="flex items-center gap-3 p-4 rounded-xl border border-[var(--border-main)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors text-left"
            >
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-[var(--text-primary)]">Leave Requests</p>
                <p className="text-sm text-[var(--text-muted)]">View pending approvals</p>
              </div>
            </button>

            <button
              onClick={() => router.push('/employees')}
              className="flex items-center gap-3 p-4 rounded-xl border border-[var(--border-main)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors text-left"
            >
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-[var(--text-primary)]">Employees</p>
                <p className="text-sm text-[var(--text-muted)]">Manage employee records</p>
              </div>
            </button>

            <button
              onClick={() => router.push('/departments')}
              className="flex items-center gap-3 p-4 rounded-xl border border-[var(--border-main)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors text-left"
            >
              <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <Building2 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="font-medium text-[var(--text-primary)]">Departments</p>
                <p className="text-sm text-[var(--text-muted)]">Manage departments</p>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
