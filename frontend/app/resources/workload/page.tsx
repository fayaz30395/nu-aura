'use client';

import React, { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout';
import { Users, Download, RefreshCw, AlertCircle, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  WorkloadHeatmap,
  EmployeeWorkloadCard,
  WorkloadSummaryStats,
  EmployeeAllocationDetailModal,
} from '@/components/resource-management';
import { AllocationEditData } from '@/components/resource-management/EmployeeAllocationDetailModal';
import {
  EmployeeWorkload,
  DepartmentWorkload,
  AllocationStatus,
} from '@/lib/types/resource-management';
import {
  useWorkloadDashboard,
  useEmployeeAllocationHistory,
  useUpdateAllocation,
  useExportWorkloadReport,
} from '@/lib/hooks/queries/useResources';
import { cn } from '@/lib/utils';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

type ViewTab = 'overview' | 'employees' | 'departments' | 'heatmap';
type DateRangeKey = 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'last3Months';

const dateRangeOptions: { key: DateRangeKey; label: string }[] = [
  { key: 'thisMonth', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'thisQuarter', label: 'This Quarter' },
  { key: 'last3Months', label: 'Last 3 Months' },
];

const statusFilterOptions: { key: AllocationStatus; label: string; color: string }[] = [
  { key: 'OVER_ALLOCATED', label: 'Over Allocated', color: 'bg-danger-50 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400' },
  { key: 'OPTIMAL', label: 'Optimal', color: 'bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-400' },
  { key: 'UNDER_UTILIZED', label: 'Under Utilized', color: 'bg-warning-50 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400' },
  { key: 'UNASSIGNED', label: 'Unassigned', color: 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] dark:bg-[var(--bg-secondary)] dark:text-[var(--text-muted)]' },
];

type AllocationRange = '0-25' | '25-50' | '50-75' | '75-100' | '100+';

const allocationRangeOptions: { key: AllocationRange; label: string; min: number; max: number }[] = [
  { key: '0-25', label: '0-25%', min: 0, max: 25 },
  { key: '25-50', label: '25-50%', min: 25, max: 50 },
  { key: '50-75', label: '50-75%', min: 50, max: 75 },
  { key: '75-100', label: '75-100%', min: 75, max: 100 },
  { key: '100+', label: '100%+', min: 100, max: Infinity },
];

// Helper function to calculate active allocation from employee data
const calculateActiveAllocation = (employee: EmployeeWorkload): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return employee.allocations.reduce((total, allocation) => {
    const startDate = new Date(allocation.startDate);
    const endDate = allocation.endDate ? new Date(allocation.endDate) : null;
    const isActive = startDate <= today && (!endDate || endDate >= today);
    return isActive ? total + allocation.allocationPercentage : total;
  }, 0);
};

// Helper function to calculate dynamic status based on active allocation
const calculateDynamicStatus = (activeAllocation: number): AllocationStatus => {
  if (activeAllocation > 100) return 'OVER_ALLOCATED';
  if (activeAllocation >= 70) return 'OPTIMAL';
  if (activeAllocation > 0) return 'UNDER_UTILIZED';
  return 'UNASSIGNED';
};

export default function WorkloadDashboardPage() {
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [selectedDateRange, setSelectedDateRange] = useState<DateRangeKey>('thisMonth');
  const [selectedStatus, setSelectedStatus] = useState<AllocationStatus[]>([]);
  const [selectedRanges, setSelectedRanges] = useState<AllocationRange[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [_showFilters, _setShowFilters] = useState(false);

  // Employee detail modal state
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWorkload | null>(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);

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

  // React Query hooks
  const {
    data: dashboardData,
    isLoading,
    error: queryError,
    refetch: refetchData,
  } = useWorkloadDashboard({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    allocationStatus: selectedStatus.length > 0 ? selectedStatus : undefined,
  });

  const { data: allocationHistory, isLoading: loadingHistory } = useEmployeeAllocationHistory(
    selectedEmployee?.employeeId ?? '',
    0,
    20
  );

  const updateAllocationMutation = useUpdateAllocation();
  const exportMutation = useExportWorkloadReport();

  const error = queryError;

  // Filter employees by search, status, and allocation range
  const filteredEmployees = useMemo(() => {
    if (!dashboardData?.employeeWorkloads) return [];

    return dashboardData.employeeWorkloads.filter((emp) => {
      // Calculate active allocation for filtering
      const activeAllocation = calculateActiveAllocation(emp);
      const dynamicStatus = calculateDynamicStatus(activeAllocation);

      // Search filter (name, code, ID, department)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          emp.employeeName.toLowerCase().includes(query) ||
          emp.employeeCode.toLowerCase().includes(query) ||
          emp.employeeId.toLowerCase().includes(query) ||
          emp.departmentName?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter (using dynamic status)
      if (selectedStatus.length > 0 && !selectedStatus.includes(dynamicStatus)) {
        return false;
      }

      // Allocation range filter
      if (selectedRanges.length > 0) {
        const matchesRange = selectedRanges.some((rangeKey) => {
          const range = allocationRangeOptions.find((r) => r.key === rangeKey);
          if (!range) return false;
          return range.max === Infinity
            ? activeAllocation >= range.min
            : activeAllocation >= range.min && activeAllocation < range.max;
        });
        if (!matchesRange) return false;
      }

      return true;
    });
  }, [dashboardData, searchQuery, selectedStatus, selectedRanges]);

  const handleExport = () => {
    exportMutation.mutate(
      {
        format: 'csv',
        filters: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          allocationStatus: selectedStatus.length > 0 ? selectedStatus : undefined,
        },
      },
      {
        onSuccess: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `workload-report-${dateRange.startDate}-${dateRange.endDate}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        },
      }
    );
  };

  const toggleStatusFilter = (status: AllocationStatus) => {
    setSelectedStatus((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const toggleRangeFilter = (range: AllocationRange) => {
    setSelectedRanges((prev) =>
      prev.includes(range)
        ? prev.filter((r) => r !== range)
        : [...prev, range]
    );
  };

  // Handle employee click to show details modal
  const handleEmployeeClick = (employee: EmployeeWorkload) => {
    setSelectedEmployee(employee);
    setShowEmployeeModal(true);
  };

  // Close employee detail modal
  const handleCloseEmployeeModal = () => {
    setShowEmployeeModal(false);
    setSelectedEmployee(null);
  };

  // Handle edit allocation
  const handleEditAllocation = (employeeId: string, data: AllocationEditData) => {
    updateAllocationMutation.mutate(
      {
        employeeId,
        projectId: data.projectId,
        allocationPercentage: data.allocationPercentage,
        startDate: data.startDate,
        endDate: data.endDate || undefined,
      },
      {
        onSuccess: (updatedEmployee) => {
          setSelectedEmployee(updatedEmployee);
        },
      }
    );
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[var(--text-primary)] skeuo-emboss">
              Resource Utilization
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              {dateRangeOptions.find(o => o.key === selectedDateRange)?.label}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetchData()}
              disabled={isLoading}
              className="rounded-md p-2 text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-secondary)] dark:hover:bg-[var(--bg-secondary)] dark:hover:text-[var(--text-muted)]"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-main)] bg-[var(--bg-card)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] dark:border-[var(--border-main)] dark:bg-[var(--bg-secondary)] dark:text-[var(--text-muted)] dark:hover:bg-[var(--bg-secondary)]"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* Filters - clean horizontal bar */}
        <div className="flex items-center gap-4">
          {/* Date range */}
          <select
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value as DateRangeKey)}
            className="input-aura rounded-md border border-[var(--border-main)] bg-[var(--bg-card)] px-3 py-1.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-[var(--border-main)] dark:bg-[var(--bg-secondary)]"
          >
            {dateRangeOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>

          <div className="h-6 w-px bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)]" />

          {/* Status pills */}
          <div className="flex items-center gap-1">
            {statusFilterOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => toggleStatusFilter(opt.key)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-all',
                  selectedStatus.includes(opt.key)
                    ? opt.color
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] dark:text-[var(--text-muted)] dark:hover:bg-[var(--bg-secondary)]'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)]" />

          {/* Allocation range pills */}
          <div className="flex items-center gap-1">
            {allocationRangeOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => toggleRangeFilter(opt.key)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-all',
                  selectedRanges.includes(opt.key)
                    ? 'bg-[var(--bg-secondary)] text-white dark:bg-[var(--bg-secondary)] dark:text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] dark:text-[var(--text-muted)] dark:hover:bg-[var(--bg-secondary)]'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Clear */}
          {(selectedStatus.length > 0 || selectedRanges.length > 0 || searchQuery) && (
            <button
              onClick={() => {
                setSelectedStatus([]);
                setSelectedRanges([]);
                setSearchQuery('');
              }}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)]"
            >
              Clear all
            </button>
          )}

          {/* Search */}
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-56 rounded-md border border-[var(--border-main)] bg-[var(--bg-card)] py-1.5 pl-9 pr-3 text-sm placeholder:text-[var(--text-muted)] focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-[var(--border-main)] dark:bg-[var(--bg-secondary)]"
            />
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-4 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 dark:border-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1">{error instanceof Error ? error.message : 'Error loading data'}</span>
            <button onClick={() => refetchData()} className="font-medium hover:underline">
              Retry
            </button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && !dashboardData && (
          <div className="space-y-6">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
          </div>
        )}

        {/* Dashboard content */}
        {dashboardData && (
          <>
            {/* Summary stats */}
            <WorkloadSummaryStats summary={dashboardData.summary} />

            {/* Tabs */}
            <div className="border-b border-[var(--border-main)]">
              <nav className="-mb-px flex gap-6">
                {[
                  { key: 'overview', label: 'Overview' },
                  { key: 'employees', label: 'Team' },
                  { key: 'departments', label: 'Departments' },
                  { key: 'heatmap', label: 'Heatmap' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as ViewTab)}
                    className={cn(
                      'border-b-2 pb-3 text-sm font-medium transition-colors',
                      activeTab === tab.key
                        ? 'border-[var(--border-main)] text-[var(--text-primary)] dark:border-[var(--border-main)] dark:text-[var(--text-primary)]'
                        : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:text-[var(--text-muted)] dark:hover:text-[var(--text-muted)]'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab content */}
            <div>
              {activeTab === 'overview' && (
                <div className="grid gap-8 lg:grid-cols-2">
                  {/* Over-allocated */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-medium text-danger-600 dark:text-danger-400">
                        Over-Allocated ({filteredEmployees.filter((e) => calculateDynamicStatus(calculateActiveAllocation(e)) === 'OVER_ALLOCATED').length})
                      </h3>
                    </div>
                    <div className="divide-y divide-surface-100 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] dark:divide-surface-800 dark:border-[var(--border-main)] dark:bg-[var(--bg-secondary)]">
                      {(() => {
                        const overAllocated = filteredEmployees
                          .filter((e) => calculateDynamicStatus(calculateActiveAllocation(e)) === 'OVER_ALLOCATED')
                          .slice(0, 5);
                        return overAllocated.length > 0 ? (
                          overAllocated.map((emp) => (
                            <EmployeeWorkloadCard
                              key={emp.employeeId}
                              workload={emp}
                              showProjects={false}
                              onViewDetails={() => handleEmployeeClick(emp)}
                            />
                          ))
                        ) : (
                          <p className="py-8 text-center text-sm text-[var(--text-muted)]">No over-allocated employees</p>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Under-utilized */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-medium text-warning-600 dark:text-warning-400">
                        Under-Utilized ({filteredEmployees.filter((e) => calculateDynamicStatus(calculateActiveAllocation(e)) === 'UNDER_UTILIZED').length})
                      </h3>
                    </div>
                    <div className="divide-y divide-surface-100 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] dark:divide-surface-800 dark:border-[var(--border-main)] dark:bg-[var(--bg-secondary)]">
                      {(() => {
                        const underUtilized = filteredEmployees
                          .filter((e) => calculateDynamicStatus(calculateActiveAllocation(e)) === 'UNDER_UTILIZED')
                          .slice(0, 5);
                        return underUtilized.length > 0 ? (
                          underUtilized.map((emp) => (
                            <EmployeeWorkloadCard
                              key={emp.employeeId}
                              workload={emp}
                              showProjects={false}
                              onViewDetails={() => handleEmployeeClick(emp)}
                            />
                          ))
                        ) : (
                          <p className="py-8 text-center text-sm text-[var(--text-muted)]">No under-utilized employees</p>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Unassigned */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-medium text-[var(--text-muted)]">
                        Unassigned ({filteredEmployees.filter((e) => calculateDynamicStatus(calculateActiveAllocation(e)) === 'UNASSIGNED').length})
                      </h3>
                    </div>
                    <div className="divide-y divide-surface-100 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] dark:divide-surface-800 dark:border-[var(--border-main)] dark:bg-[var(--bg-secondary)]">
                      {(() => {
                        const unassigned = filteredEmployees
                          .filter((e) => calculateDynamicStatus(calculateActiveAllocation(e)) === 'UNASSIGNED')
                          .slice(0, 5);
                        return unassigned.length > 0 ? (
                          unassigned.map((emp) => (
                            <EmployeeWorkloadCard
                              key={emp.employeeId}
                              workload={emp}
                              showProjects={false}
                              onViewDetails={() => handleEmployeeClick(emp)}
                            />
                          ))
                        ) : (
                          <p className="py-8 text-center text-sm text-[var(--text-muted)]">No unassigned employees</p>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Optimal */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-medium text-success-600 dark:text-success-400">
                        Optimal ({filteredEmployees.filter((e) => calculateDynamicStatus(calculateActiveAllocation(e)) === 'OPTIMAL').length})
                      </h3>
                    </div>
                    <div className="divide-y divide-surface-100 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] dark:divide-surface-800 dark:border-[var(--border-main)] dark:bg-[var(--bg-secondary)]">
                      {(() => {
                        const optimal = filteredEmployees
                          .filter((e) => calculateDynamicStatus(calculateActiveAllocation(e)) === 'OPTIMAL')
                          .slice(0, 5);
                        return optimal.length > 0 ? (
                          optimal.map((emp) => (
                            <EmployeeWorkloadCard
                              key={emp.employeeId}
                              workload={emp}
                              showProjects={false}
                              onViewDetails={() => handleEmployeeClick(emp)}
                            />
                          ))
                        ) : (
                          <p className="py-8 text-center text-sm text-[var(--text-muted)]">No optimally allocated employees</p>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Departments */}
                  <div className="lg:col-span-2">
                    <h3 className="mb-3 text-sm font-medium text-[var(--text-primary)]">
                      By Department
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {(dashboardData.departmentWorkloads || []).map((dept) => (
                        <DepartmentCard key={dept.departmentId} department={dept} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'employees' && (
                <div className="divide-y divide-surface-100 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] dark:divide-surface-800 dark:border-[var(--border-main)] dark:bg-[var(--bg-secondary)]">
                  {filteredEmployees.length > 0 ? (
                    filteredEmployees.map((emp) => (
                      <EmployeeWorkloadCard
                        key={emp.employeeId}
                        workload={emp}
                        onViewDetails={() => handleEmployeeClick(emp)}
                      />
                    ))
                  ) : (
                    <div className="py-12">
                      <EmptyState
                        title="No employees found"
                        description="Try adjusting your search or filters"
                        icon={<Users className="h-10 w-10" />}
                      />
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'departments' && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {(dashboardData.departmentWorkloads || []).map((dept) => (
                    <DepartmentCard key={dept.departmentId} department={dept} expanded />
                  ))}
                </div>
              )}

              {activeTab === 'heatmap' && (
                <div className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-4 dark:border-[var(--border-main)] dark:bg-[var(--bg-secondary)]">
                  <WorkloadHeatmap
                    data={dashboardData.heatmapData || []}
                    onEmployeeClick={(id) => {
                      const employee = dashboardData.employeeWorkloads?.find(e => e.employeeId === id);
                      if (employee) handleEmployeeClick(employee);
                    }}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Employee Allocation Detail Modal */}
      <EmployeeAllocationDetailModal
        isOpen={showEmployeeModal}
        onClose={handleCloseEmployeeModal}
        employee={selectedEmployee}
        allocationHistory={allocationHistory?.content ?? []}
        loadingHistory={loadingHistory}
        onEditAllocation={handleEditAllocation}
      />
    </AppLayout>
  );
}

/**
 * Department card - clean minimal design
 */
function DepartmentCard({
  department,
  expanded = false,
}: {
  department: DepartmentWorkload;
  expanded?: boolean;
}) {
  const avgAllocation = Math.round(department.averageAllocation);
  const allocationColor = avgAllocation > 100 ? 'text-danger-600' : avgAllocation >= 70 ? 'text-success-600' : 'text-warning-600';

  return (
    <div className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-4 dark:border-[var(--border-main)] dark:bg-[var(--bg-secondary)]">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium text-[var(--text-primary)]">
            {department.departmentName}
          </h3>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {department.employeeCount} members · {department.activeProjects} projects
          </p>
        </div>
        <span className={cn('text-xl font-semibold tabular-nums', allocationColor)}>
          {avgAllocation}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-[var(--bg-secondary)]">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            avgAllocation > 100 ? 'bg-danger-500' : avgAllocation >= 70 ? 'bg-success-500' : 'bg-warning-400'
          )}
          style={{ width: `${Math.min(avgAllocation, 100)}%` }}
        />
      </div>

      {expanded && (
        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <span className="text-danger-600">{department.overAllocatedCount} over</span>
            <span className="text-success-600">{department.optimalCount} optimal</span>
            <span className="text-warning-600">{department.underUtilizedCount} under</span>
            <span className="text-[var(--text-muted)]">{department.unassignedCount} free</span>
          </div>
        </div>
      )}
    </div>
  );
}
