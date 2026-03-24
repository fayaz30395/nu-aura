'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout';
import Link from 'next/link';
import {
  Users,
  Calendar,
  BarChart3,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Settings,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ResourceManagementApiError } from '@/lib/services/resource-management.service';
import { useWorkloadDashboard, useMyPendingApprovals } from '@/lib/hooks/queries/useResources';
import { CreateAllocationModal } from '@/components/resources/CreateAllocationModal';

export default function ResourcesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError, refetch: refetchDashboard } = useWorkloadDashboard({});
  const { data: pendingData, isLoading: pendingLoading, error: pendingError } = useMyPendingApprovals(0, 5);

  const isApiNotAvailable = (dashboardError instanceof Error &&
    (dashboardError as unknown as ResourceManagementApiError).isApiNotAvailable) ?? false;
  const isLoading = dashboardLoading || pendingLoading;
  const error = dashboardError || pendingError;

  const summary = dashboardData?.summary ?? null;
  const pendingApprovals = pendingData?.content ?? [];

  const navigationCards: Array<{
    title: string;
    description: string;
    icon: React.ElementType;
    href: string;
    color: string;
    badge?: number;
  }> = [
    {
      title: 'Workload Dashboard',
      description: 'View employee allocation heatmaps and utilization metrics',
      icon: BarChart3,
      href: '/resources/workload',
      color: 'bg-info-100 text-info-600 dark:bg-info-900/30 dark:text-info-400',
    },
    {
      title: 'Resource Pool',
      description: 'All employees with allocation bars — filter by department or status',
      icon: Users,
      href: '/resources/pool',
      color: 'bg-info-100 text-info-600 dark:bg-info-900/30 dark:text-info-400',
    },
    {
      title: 'Capacity Timeline',
      description: 'Horizontal allocation bars per employee, sorted by utilization',
      icon: TrendingUp,
      href: '/resources/capacity',
      color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    },
    {
      title: 'Availability Calendar',
      description: 'See team availability with leaves and holidays',
      icon: Calendar,
      href: '/resources/availability',
      color: 'bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400',
    },
    {
      title: 'Pending Approvals',
      description: 'Review and approve over-allocation requests',
      icon: Clock,
      href: '/resources/approvals',
      color: 'bg-warning-100 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400',
      badge: pendingApprovals.length > 0 ? pendingApprovals.length : undefined,
    },
  ];

  // API Not Available State
  if (isApiNotAvailable) {
    return (
      <AppLayout>
        <div className="space-y-6 p-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
              Resource Management
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)] skeuo-deboss">
              Manage team capacity, allocations, and availability
            </p>
          </div>

          {/* API Not Available Card */}
          <Card className="border-warning-200 dark:border-warning-800">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-warning-50 p-4 dark:bg-warning-900/30">
                <Settings className="h-8 w-8 text-warning-600 dark:text-warning-400" />
              </div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                Resource Management API Not Available
              </h2>
              <p className="mt-2 max-w-md text-[var(--text-secondary)]">
                The Resource Management backend API is not yet implemented. This feature requires
                backend development to provide workload data, capacity allocation, and availability
                calendar functionality.
              </p>
              <div className="mt-6 flex gap-4">
                <Button variant="outline" onClick={() => refetchDashboard()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry Connection
                </Button>
                <Link href="/dashboard">
                  <Button variant="primary">
                    Back to Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Feature Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Planned Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {navigationCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.href}
                      className="flex items-start gap-4 rounded-lg border border-[var(--border-main)] p-4 dark:border-[var(--border-main)]"
                    >
                      <div className={`rounded-lg p-2 ${card.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium text-[var(--text-primary)]">
                          {card.title}
                        </h3>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                          {card.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
              Resource Management
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)] skeuo-deboss">
              Manage team capacity, allocations, and availability
            </p>
          </div>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Allocation
          </Button>
        </div>

        {/* Create Allocation Modal */}
        <CreateAllocationModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            refetchDashboard();
          }}
        />

        {/* Error State */}
        {error && !isApiNotAvailable && (
          <Card className="border-danger-200 dark:border-danger-800">
            <CardContent className="flex items-center gap-4 p-4">
              <AlertTriangle className="h-5 w-5 text-danger-600 dark:text-danger-400" />
              <div className="flex-1">
                <p className="font-medium text-danger-600 dark:text-danger-400">Error Loading Data</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {error instanceof Error ? error.message : 'Failed to load data'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetchDashboard()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <QuickStatCard
              label="Total Employees"
              value={summary.totalEmployees}
              icon={Users}
              color="text-sky-700 dark:text-sky-400"
            />
            <QuickStatCard
              label="Avg Allocation"
              value={`${Math.round(summary.averageAllocation)}%`}
              icon={TrendingUp}
              color="text-info-600 dark:text-info-400"
            />
            <QuickStatCard
              label="Over-Allocated"
              value={summary.overAllocatedCount}
              icon={AlertTriangle}
              color="text-danger-600 dark:text-danger-400"
              highlight={summary.overAllocatedCount > 0}
            />
            <QuickStatCard
              label="Pending Approvals"
              value={summary.pendingApprovals}
              icon={Clock}
              color="text-warning-600 dark:text-warning-400"
              highlight={summary.pendingApprovals > 0}
            />
          </div>
        ) : null}

        {/* Navigation Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {navigationCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.href} href={card.href}>
                <Card hover className="h-full">
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-start justify-between">
                      <div className={`rounded-lg p-2.5 ${card.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      {card.badge && (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-danger-500 text-xs font-bold text-white">
                          {card.badge}
                        </span>
                      )}
                    </div>
                    <div className="mt-4 flex-1">
                      <h3 className="font-semibold text-[var(--text-primary)]">
                        {card.title}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {card.description}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center text-sm font-medium text-sky-700 dark:text-sky-400">
                      View
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Pending Approvals Preview */}
        {pendingApprovals.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning-600 dark:text-warning-400" />
                Pending Allocation Approvals
              </CardTitle>
              <Link href="/resources/approvals">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingApprovals.slice(0, 3).map((approval) => (
                  <div
                    key={approval.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--border-main)] p-4 dark:border-[var(--border-main)]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning-50 dark:bg-warning-900/30">
                        <Users className="h-5 w-5 text-warning-600 dark:text-warning-400" />
                      </div>
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">
                          {approval.employeeName}
                        </p>
                        <p className="text-sm text-[var(--text-muted)]">
                          {approval.projectName} • {approval.requestedAllocation}% allocation
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-danger-600 dark:text-danger-400">
                        {approval.resultingAllocation}% total
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        Requested by {approval.requestedByName}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alerts - Over-allocated employees */}
        {summary && summary.overAllocatedCount > 0 && (
          <Card className="border-danger-200 dark:border-danger-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-danger-600 dark:text-danger-400">
                <AlertTriangle className="h-5 w-5" />
                Attention Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[var(--text-secondary)]">
                <strong>{summary.overAllocatedCount}</strong> employee(s) are currently
                allocated above 100%. Review their workload to prevent burnout and ensure
                quality delivery.
              </p>
              <Link href="/resources/workload?status=OVER_ALLOCATED">
                <Button variant="outline" className="mt-4" size="sm">
                  View Over-Allocated Employees
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

function QuickStatCard({
  label,
  value,
  icon: Icon,
  color,
  highlight = false,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? 'border-danger-200 dark:border-danger-800' : ''}>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`rounded-lg bg-[var(--bg-secondary)] p-2 dark:bg-[var(--bg-secondary)] ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
          <p className="text-xs text-[var(--text-muted)]">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
