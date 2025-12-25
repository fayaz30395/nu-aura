'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/layout';
import {
  Users,
  Filter,
  Download,
  RefreshCw,
  AlertCircle,
  Search,
  Calendar,
  Building2,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  WorkloadHeatmap,
  EmployeeWorkloadCard,
  WorkloadSummaryStats,
} from '@/components/resource-management';
import {
  WorkloadDashboardData,
  WorkloadFilterOptions,
  EmployeeWorkload,
  DepartmentWorkload,
  AllocationStatus,
} from '@/lib/types/resource-management';
import { resourceManagementService } from '@/lib/services/resource-management.service';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

type ViewTab = 'overview' | 'employees' | 'departments' | 'heatmap';
type DateRangeKey = 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'last3Months';

const dateRangeOptions: { key: DateRangeKey; label: string }[] = [
  { key: 'thisMonth', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'thisQuarter', label: 'This Quarter' },
  { key: 'last3Months', label: 'Last 3 Months' },
];

const statusFilterOptions: { key: AllocationStatus; label: string }[] = [
  { key: 'OVER_ALLOCATED', label: 'Over Allocated' },
  { key: 'OPTIMAL', label: 'Optimal' },
  { key: 'UNDER_UTILIZED', label: 'Under Utilized' },
  { key: 'UNASSIGNED', label: 'Unassigned' },
];

export default function WorkloadDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [selectedDateRange, setSelectedDateRange] = useState<DateRangeKey>('thisMonth');
  const [selectedStatus, setSelectedStatus] = useState<AllocationStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [dashboardData, setDashboardData] = useState<WorkloadDashboardData | null>(null);

  // Calculate date range
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (selectedDateRange) {
      case 'thisMonth':
        return {
          startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
        };
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        return {
          startDate: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
        };
      case 'thisQuarter':
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
        return {
          startDate: format(quarterStart, 'yyyy-MM-dd'),
          endDate: format(quarterEnd, 'yyyy-MM-dd'),
        };
      case 'last3Months':
        return {
          startDate: format(startOfMonth(subMonths(now, 2)), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
        };
      default:
        return {
          startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
        };
    }
  }, [selectedDateRange]);

  // Fetch dashboard data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: WorkloadFilterOptions = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        allocationStatus: selectedStatus.length > 0 ? selectedStatus : undefined,
      };
      const data = await resourceManagementService.getWorkloadDashboard(filters);
      setDashboardData(data);
    } catch (err: any) {
      console.error('Error fetching workload data:', err);
      setError('Failed to load workload data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange, selectedStatus]);

  // Filter employees by search
  const filteredEmployees = useMemo(() => {
    if (!dashboardData) return [];
    if (!searchQuery) return dashboardData.employeeWorkloads;

    const query = searchQuery.toLowerCase();
    return dashboardData.employeeWorkloads.filter(
      (emp) =>
        emp.employeeName.toLowerCase().includes(query) ||
        emp.employeeCode.toLowerCase().includes(query) ||
        emp.departmentName?.toLowerCase().includes(query)
    );
  }, [dashboardData, searchQuery]);

  const handleExport = async () => {
    try {
      const blob = await resourceManagementService.exportWorkloadReport('excel', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        allocationStatus: selectedStatus.length > 0 ? selectedStatus : undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workload-report-${dateRange.startDate}-${dateRange.endDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const toggleStatusFilter = (status: AllocationStatus) => {
    setSelectedStatus((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
              Workload Dashboard
            </h1>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
              Monitor employee allocation and resource utilization
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date range selector */}
          <div className="relative">
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value as DateRangeKey)}
              className="appearance-none rounded-lg border border-surface-200 bg-white py-2 pl-3 pr-10 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-surface-700 dark:bg-surface-800"
            >
              {dateRangeOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          </div>

          {/* Status filters */}
          <div className="flex items-center gap-2">
            {statusFilterOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => toggleStatusFilter(opt.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedStatus.includes(opt.key)
                    ? 'bg-primary-600 text-white'
                    : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-700 dark:text-surface-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 rounded-lg border border-surface-200 bg-white py-2 pl-10 pr-4 text-sm placeholder:text-surface-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-surface-700 dark:bg-surface-800"
            />
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={fetchData} className="ml-auto">
              Retry
            </Button>
          </div>
        )}

        {/* Loading state */}
        {loading && !dashboardData && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-96 rounded-xl" />
          </div>
        )}

        {/* Dashboard content */}
        {dashboardData && (
          <>
            {/* Summary stats */}
            <WorkloadSummaryStats summary={dashboardData.summary} />

            {/* Tabs */}
            <div className="border-b border-surface-200 dark:border-surface-700">
              <nav className="-mb-px flex gap-6">
                {[
                  { key: 'overview', label: 'Overview' },
                  { key: 'employees', label: 'By Employee' },
                  { key: 'departments', label: 'By Department' },
                  { key: 'heatmap', label: 'Heatmap' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as ViewTab)}
                    className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                        : 'border-transparent text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab content */}
            <div className="mt-6">
              {activeTab === 'overview' && (
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Over-allocated employees */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <AlertCircle className="h-5 w-5" />
                        Over-Allocated Employees
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {dashboardData.employeeWorkloads
                        .filter((e) => e.allocationStatus === 'OVER_ALLOCATED')
                        .slice(0, 5).length > 0 ? (
                        <div className="space-y-3">
                          {dashboardData.employeeWorkloads
                            .filter((e) => e.allocationStatus === 'OVER_ALLOCATED')
                            .slice(0, 5)
                            .map((emp) => (
                              <EmployeeWorkloadCard
                                key={emp.employeeId}
                                workload={emp}
                                showProjects={false}
                              />
                            ))}
                        </div>
                      ) : (
                        <EmptyState
                          title="No over-allocated employees"
                          icon={<Users className="h-12 w-12" />}
                        />
                      )}
                    </CardContent>
                  </Card>

                  {/* Under-utilized employees */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <Users className="h-5 w-5" />
                        Under-Utilized Employees
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {dashboardData.employeeWorkloads
                        .filter((e) => e.allocationStatus === 'UNDER_UTILIZED')
                        .slice(0, 5).length > 0 ? (
                        <div className="space-y-3">
                          {dashboardData.employeeWorkloads
                            .filter((e) => e.allocationStatus === 'UNDER_UTILIZED')
                            .slice(0, 5)
                            .map((emp) => (
                              <EmployeeWorkloadCard
                                key={emp.employeeId}
                                workload={emp}
                                showProjects={false}
                              />
                            ))}
                        </div>
                      ) : (
                        <EmptyState
                          title="No under-utilized employees"
                          icon={<Users className="h-12 w-12" />}
                        />
                      )}
                    </CardContent>
                  </Card>

                  {/* Department breakdown */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Department Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {dashboardData.departmentWorkloads.map((dept) => (
                          <DepartmentCard key={dept.departmentId} department={dept} />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'employees' && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredEmployees.length > 0 ? (
                    filteredEmployees.map((emp) => (
                      <EmployeeWorkloadCard key={emp.employeeId} workload={emp} />
                    ))
                  ) : (
                    <div className="col-span-full">
                      <EmptyState
                        title="No employees found"
                        description="Try adjusting your search or filters"
                        icon={<Users className="h-12 w-12" />}
                      />
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'departments' && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {dashboardData.departmentWorkloads.map((dept) => (
                    <DepartmentCard key={dept.departmentId} department={dept} expanded />
                  ))}
                </div>
              )}

              {activeTab === 'heatmap' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Workload Heatmap</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <WorkloadHeatmap
                      data={dashboardData.heatmapData}
                      onEmployeeClick={(id) => console.log('Employee clicked:', id)}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

/**
 * Department summary card
 */
function DepartmentCard({
  department,
  expanded = false,
}: {
  department: DepartmentWorkload;
  expanded?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30">
            <Building2 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-surface-900 dark:text-surface-50">
              {department.departmentName}
            </h3>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              {department.employeeCount} employees
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-lg bg-surface-50 p-2 dark:bg-surface-700/50">
            <p className="text-lg font-semibold text-surface-900 dark:text-surface-50">
              {Math.round(department.averageAllocation)}%
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400">Avg Allocation</p>
          </div>
          <div className="rounded-lg bg-surface-50 p-2 dark:bg-surface-700/50">
            <p className="text-lg font-semibold text-surface-900 dark:text-surface-50">
              {department.activeProjects}
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400">Active Projects</p>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
            <div>
              <p className="font-semibold text-red-600 dark:text-red-400">
                {department.overAllocatedCount}
              </p>
              <p className="text-surface-500">Over</p>
            </div>
            <div>
              <p className="font-semibold text-green-600 dark:text-green-400">
                {department.optimalCount}
              </p>
              <p className="text-surface-500">Optimal</p>
            </div>
            <div>
              <p className="font-semibold text-amber-600 dark:text-amber-400">
                {department.underUtilizedCount}
              </p>
              <p className="text-surface-500">Under</p>
            </div>
            <div>
              <p className="font-semibold text-surface-500">
                {department.unassignedCount}
              </p>
              <p className="text-surface-500">Free</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
