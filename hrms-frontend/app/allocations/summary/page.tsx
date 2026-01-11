'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, XCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  ResponsiveTable,
  TablePagination,
} from '@/components/ui';
import { EmployeeSearchAutocomplete } from '@/components/ui/EmployeeSearchAutocomplete';
import { hrmsProjectAllocationService } from '@/lib/services/hrms-project-allocation.service';
import { AllocationSummaryItem } from '@/lib/types/hrms-allocation';
import { useAuth } from '@/lib/hooks/useAuth';

type AllocationScope = 'SELF' | 'TEAM' | 'DEPARTMENT' | 'ORG';

interface ApiErrorPayload {
  message?: string;
  details?: string[];
}

interface SelectedEmployee {
  id: string;
  name: string;
}

const scopeOrder: AllocationScope[] = ['ORG', 'DEPARTMENT', 'TEAM', 'SELF'];

const getCurrentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
};

const formatPercent = (value?: number | null) => {
  if (value === null || value === undefined) return '—';
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return '—';
  return `${numeric.toFixed(1)}%`;
};

const parseApiError = (error: unknown): ApiErrorPayload => {
  const response = (error as { response?: { status?: number; data?: ApiErrorPayload } })?.response;
  if (response?.status === 403) {
    return { message: 'You do not have access to this scope.' };
  }
  if (response?.status === 409) {
    return { message: 'Conflict detected. Please refresh and try again.' };
  }
  if (response?.data) {
    return { message: response.data.message, details: response.data.details };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: 'Something went wrong. Please try again.' };
};

const buildEmployeeLabel = (employee: AllocationSummaryItem) => {
  const name = employee.employeeName?.trim();
  if (name) return name;
  const email = employee.employeeEmail?.trim();
  if (email) return email;
  return employee.employeeCode || 'Employee';
};

export default function AllocationSummaryPage() {
  const { user } = useAuth();
  const [allocations, setAllocations] = useState<AllocationSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const initialRange = useMemo(() => getCurrentMonthRange(), []);
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);

  const [selectedEmployee, setSelectedEmployee] = useState<SelectedEmployee | null>(null);

  const allowedScopes = useMemo(() => {
    const roleCodes = new Set(user?.roles?.map((role) => role.code) || []);
    const scopes = new Set<AllocationScope>();
    if (roleCodes.has('SUPER_ADMIN') || roleCodes.has('HR_ADMIN')) {
      scopes.add('ORG');
    }
    if (roleCodes.has('HR_EXECUTIVE')) {
      scopes.add('DEPARTMENT');
    }
    if (roleCodes.has('MANAGER')) {
      scopes.add('TEAM');
    }
    if (roleCodes.has('EMPLOYEE') || scopes.size === 0) {
      scopes.add('SELF');
    }
    return scopeOrder.filter((scope) => scopes.has(scope));
  }, [user?.roles]);

  const defaultScope = useMemo<AllocationScope>(() => {
    return allowedScopes[0] || 'SELF';
  }, [allowedScopes]);

  const [selectedScope, setSelectedScope] = useState<AllocationScope>(defaultScope);

  useEffect(() => {
    if (!allowedScopes.includes(selectedScope)) {
      setSelectedScope(defaultScope);
    }
  }, [allowedScopes, defaultScope, selectedScope]);

  const isEmployeeSearchEnabled = selectedScope === 'ORG' || selectedScope === 'DEPARTMENT';

  useEffect(() => {
    if (!isEmployeeSearchEnabled && selectedEmployee) {
      setSelectedEmployee(null);
    }
  }, [isEmployeeSearchEnabled, selectedEmployee]);

  const activeEmployeeId = isEmployeeSearchEnabled ? selectedEmployee?.id : undefined;

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    setErrorDetails([]);
    try {
      const response = await hrmsProjectAllocationService.listAllocationSummary(
        selectedScope,
        startDate,
        endDate,
        currentPage,
        pageSize,
        undefined,
        activeEmployeeId
      );
      setAllocations(response.content ?? []);
      setTotalPages(response.totalPages ?? 0);
      setTotalElements(response.totalElements ?? 0);
    } catch (err) {
      const apiError = parseApiError(err);
      setError(apiError.message || 'Failed to load allocation summary.');
      setErrorDetails(apiError.details || []);
      setAllocations([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [activeEmployeeId, currentPage, endDate, pageSize, selectedScope, startDate]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    setErrorDetails([]);
    try {
      const blob = await hrmsProjectAllocationService.exportAllocationSummary(
        selectedScope,
        startDate,
        endDate,
        undefined,
        activeEmployeeId
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'allocation_summary.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const apiError = parseApiError(err);
      setError(apiError.message || 'Failed to export allocation summary.');
      setErrorDetails(apiError.details || []);
    } finally {
      setExporting(false);
    }
  };

  const emptyMessage = selectedEmployee
    ? 'No allocations found for the selected employee in this range.'
    : 'No allocations found for this range.';

  const columns = useMemo(() => [
    {
      key: 'employee',
      header: 'Employee',
      accessor: (row: AllocationSummaryItem) => (
        <div className="space-y-1">
          <div className="font-medium text-surface-900 dark:text-surface-100">
            {buildEmployeeLabel(row)}
          </div>
          <div className="text-xs text-surface-500 dark:text-surface-400">
            {row.employeeCode || row.employeeEmail || '—'}
          </div>
        </div>
      ),
      mobilePriority: 'primary' as const,
    },
    {
      key: 'allocation',
      header: 'Avg Allocation % (range)',
      accessor: (row: AllocationSummaryItem) => (
        <div className="flex items-center gap-2">
          <span className="text-sm text-surface-700 dark:text-surface-300">
            {formatPercent(row.allocationPercent)}
          </span>
          {row.overAllocated && (
            <Badge variant="destructive" size="sm" title="Peak > 100%">
              Over-cap at peak
            </Badge>
          )}
        </div>
      ),
      mobilePriority: 'secondary' as const,
    },
    {
      key: 'projects',
      header: 'Active Projects',
      accessor: (row: AllocationSummaryItem) => (
        <span className="text-sm text-surface-700 dark:text-surface-300">
          {row.activeProjectCount ?? '—'}
        </span>
      ),
      mobilePriority: 'secondary' as const,
    },
  ], []);

  return (
    <AppLayout breadcrumbs={[{ label: 'Allocations', href: '/allocations/summary' }, { label: 'Summary' }]}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
              Allocation Summary
            </h1>
            <p className="text-sm text-surface-500">
              Average allocation across the selected date range.
            </p>
          </div>
          <Button
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />}
            isLoading={exporting}
            onClick={handleExport}
          >
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>

        <Card>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {scopeOrder.map((scope) => {
                const enabled = allowedScopes.includes(scope);
                return (
                  <Button
                    key={scope}
                    variant={selectedScope === scope ? 'primary' : 'outline'}
                    size="sm"
                    disabled={!enabled}
                    onClick={() => {
                      setSelectedScope(scope);
                      setCurrentPage(0);
                    }}
                  >
                    {scope}
                  </Button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <Input
                type="date"
                label="Start date"
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  setCurrentPage(0);
                }}
              />
              <Input
                type="date"
                label="End date"
                value={endDate}
                onChange={(event) => {
                  setEndDate(event.target.value);
                  setCurrentPage(0);
                }}
              />
              <div className="min-w-[240px]">
                <EmployeeSearchAutocomplete
                  label="Employee"
                  placeholder="Search employees..."
                  value={selectedEmployee}
                  onChange={(employee) => {
                    setSelectedEmployee(employee);
                    setCurrentPage(0);
                  }}
                  disabled={!isEmployeeSearchEnabled}
                />
              </div>
            </div>
            <p className="text-xs text-surface-500">
              Average is computed over the selected period; over-cap is flagged if any day in the range exceeds 100%.
            </p>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-danger-200 bg-danger-50 dark:border-danger-800 dark:bg-danger-950/20">
            <CardContent className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-danger-500" />
              <div>
                <p className="text-sm text-danger-700 dark:text-danger-300">{error}</p>
                {errorDetails.length ? (
                  <p className="text-xs text-danger-600 dark:text-danger-300">
                    {errorDetails.join(' ')}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="space-y-4">
            <ResponsiveTable
              columns={columns}
              data={allocations}
              keyExtractor={(row) => row.employeeId}
              isLoading={loading}
              emptyMessage={emptyMessage}
            />
            {totalElements > 0 && (
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalElements}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(0);
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
