'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  WorkloadDashboardData,
  WorkloadFilterOptions,
  EmployeeWorkload,
  DepartmentWorkload,
  AllocationStatus,
  AllocationApprovalRequest,
} from '@/lib/types/resource-management';
import { resourceManagementService } from '@/lib/services/resource-management.service';
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
  { key: 'OVER_ALLOCATED', label: 'Over Allocated', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  { key: 'OPTIMAL', label: 'Optimal', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  { key: 'UNDER_UTILIZED', label: 'Under Utilized', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { key: 'UNASSIGNED', label: 'Unassigned', color: 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400' },
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [selectedDateRange, setSelectedDateRange] = useState<DateRangeKey>('thisMonth');
  const [selectedStatus, setSelectedStatus] = useState<AllocationStatus[]>([]);
  const [selectedRanges, setSelectedRanges] = useState<AllocationRange[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Employee detail modal state
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWorkload | null>(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [allocationHistory, setAllocationHistory] = useState<AllocationApprovalRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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
    } catch (err: unknown) {
      console.error('Error fetching workload data:', err);
      setError('Failed to load workload data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange, selectedStatus]);

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
          return activeAllocation >= range.min && activeAllocation < range.max;
        });
        if (!matchesRange) return false;
      }

      return true;
    });
  }, [dashboardData, searchQuery, selectedStatus, selectedRanges]);

  const handleExport = async () => {
    try {
      setError(null);
      const blob = await resourceManagementService.exportWorkloadReport('csv', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        allocationStatus: selectedStatus.length > 0 ? selectedStatus : undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workload-report-${dateRange.startDate}-${dateRange.endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error('Export failed:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to export workload report. Please try again.';
      setError(errorMessage);
    }
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
  const handleEmployeeClick = async (employee: EmployeeWorkload) => {
    setSelectedEmployee(employee);
    setShowEmployeeModal(true);
    setLoadingHistory(true);
    setAllocationHistory([]);
    try {
      const history = await resourceManagementService.getEmployeeAllocationHistory(employee.employeeId);
      setAllocationHistory(history.content);
    } catch (err) {
      console.error('Error fetching allocation history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Close employee detail modal
  const handleCloseEmployeeModal = () => {
    setShowEmployeeModal(false);
    setSelectedEmployee(null);
    setAllocationHistory([]);
  };

  // Handle edit allocation
  const handleEditAllocation = async (employeeId: string, data: AllocationEditData) => {
    if (!dashboardData || !selectedEmployee) {
      return;
    }

    try {
      const updatedEmployee = await resourceManagementService.updateAllocation({
        employeeId,
        projectId: data.projectId,
        allocationPercentage: data.allocationPercentage,
        startDate: data.startDate,
        endDate: data.endDate || undefined,
      });

      setSelectedEmployee(updatedEmployee);

      const updatedEmployeeWorkloads = dashboardData.employeeWorkloads?.map((emp) =>
        emp.employeeId === employeeId ? updatedEmployee : emp
      );

      setDashboardData({
        ...dashboardData,
        employeeWorkloads: updatedEmployeeWorkloads,
      });
    } catch (err: unknown) {
      console.error('Failed to update allocation:', err);
      setError('Failed to update allocation. Please try again.');
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-surface-900 dark:text-surface-50">
              Resource Utilization
            </h1>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              {dateRangeOptions.find(o => o.key === selectedDateRange)?.label}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="rounded-md p-2 text-surface-500 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800 dark:hover:text-surface-300"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-md border border-surface-200 bg-white px-3 py-1.5 text-sm font-medium text-surface-700 hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
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
            className="rounded-md border border-surface-200 bg-white px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-surface-700 dark:bg-surface-800"
          >
            {dateRangeOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>

          <div className="h-6 w-px bg-surface-200 dark:bg-surface-700" />

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
                    : 'text-surface-500 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-surface-200 dark:bg-surface-700" />

          {/* Allocation range pills */}
          <div className="flex items-center gap-1">
            {allocationRangeOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => toggleRangeFilter(opt.key)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-all',
                  selectedRanges.includes(opt.key)
                    ? 'bg-surface-900 text-white dark:bg-surface-100 dark:text-surface-900'
                    : 'text-surface-500 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800'
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
              className="text-xs text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
            >
              Clear all
            </button>
          )}

          {/* Search */}
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-56 rounded-md border border-surface-200 bg-white py-1.5 pl-9 pr-3 text-sm placeholder:text-surface-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-surface-700 dark:bg-surface-800"
            />
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={fetchData} className="font-medium hover:underline">
              Retry
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && !dashboardData && (
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
            <div className="border-b border-surface-200 dark:border-surface-700">
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
                        ? 'border-surface-900 text-surface-900 dark:border-surface-100 dark:text-surface-100'
                        : 'border-transparent text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-300'
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
                      <h3 className="text-sm font-medium text-red-600 dark:text-red-400">
                        Over-Allocated ({filteredEmployees.filter((e) => calculateDynamicStatus(calculateActiveAllocation(e)) === 'OVER_ALLOCATED').length})
                      </h3>
                    </div>
                    <div className="divide-y divide-surface-100 rounded-lg border border-surface-200 bg-white dark:divide-surface-800 dark:border-surface-700 dark:bg-surface-900">
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
                          <p className="py-8 text-center text-sm text-surface-500">No over-allocated employees</p>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Under-utilized */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-medium text-amber-600 dark:text-amber-400">
                        Under-Utilized ({filteredEmployees.filter((e) => calculateDynamicStatus(calculateActiveAllocation(e)) === 'UNDER_UTILIZED').length})
                      </h3>
                    </div>
                    <div className="divide-y divide-surface-100 rounded-lg border border-surface-200 bg-white dark:divide-surface-800 dark:border-surface-700 dark:bg-surface-900">
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
                          <p className="py-8 text-center text-sm text-surface-500">No under-utilized employees</p>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Unassigned */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-medium text-surface-500 dark:text-surface-400">
                        Unassigned ({filteredEmployees.filter((e) => calculateDynamicStatus(calculateActiveAllocation(e)) === 'UNASSIGNED').length})
                      </h3>
                    </div>
                    <div className="divide-y divide-surface-100 rounded-lg border border-surface-200 bg-white dark:divide-surface-800 dark:border-surface-700 dark:bg-surface-900">
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
                          <p className="py-8 text-center text-sm text-surface-500">No unassigned employees</p>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Optimal */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-medium text-green-600 dark:text-green-400">
                        Optimal ({filteredEmployees.filter((e) => calculateDynamicStatus(calculateActiveAllocation(e)) === 'OPTIMAL').length})
                      </h3>
                    </div>
                    <div className="divide-y divide-surface-100 rounded-lg border border-surface-200 bg-white dark:divide-surface-800 dark:border-surface-700 dark:bg-surface-900">
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
                          <p className="py-8 text-center text-sm text-surface-500">No optimally allocated employees</p>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Departments */}
                  <div className="lg:col-span-2">
                    <h3 className="mb-3 text-sm font-medium text-surface-900 dark:text-surface-100">
                      By Department
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {(dashboardData.departmentWorkloads || []).map((dept) => (
                        <DepartmentCard key={dept.departmentId} department={dept} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'employees' && (
                <div className="divide-y divide-surface-100 rounded-lg border border-surface-200 bg-white dark:divide-surface-800 dark:border-surface-700 dark:bg-surface-900">
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
                <div className="rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-900">
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
        allocationHistory={allocationHistory}
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
  const allocationColor = avgAllocation > 100 ? 'text-red-600' : avgAllocation >= 70 ? 'text-green-600' : 'text-amber-600';

  return (
    <div className="rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-900">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium text-surface-900 dark:text-surface-100">
            {department.departmentName}
          </h3>
          <p className="mt-0.5 text-xs text-surface-500">
            {department.employeeCount} members · {department.activeProjects} projects
          </p>
        </div>
        <span className={cn('text-xl font-semibold tabular-nums', allocationColor)}>
          {avgAllocation}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-100 dark:bg-surface-800">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            avgAllocation > 100 ? 'bg-red-500' : avgAllocation >= 70 ? 'bg-green-500' : 'bg-amber-400'
          )}
          style={{ width: `${Math.min(avgAllocation, 100)}%` }}
        />
      </div>

      {expanded && (
        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="text-red-600">{department.overAllocatedCount} over</span>
            <span className="text-green-600">{department.optimalCount} optimal</span>
            <span className="text-amber-600">{department.underUtilizedCount} under</span>
            <span className="text-surface-400">{department.unassignedCount} free</span>
          </div>
        </div>
      )}
    </div>
  );
}
