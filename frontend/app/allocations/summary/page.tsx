'use client';

import React, {useEffect, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Download, XCircle} from 'lucide-react';
import {AppLayout} from '@/components/layout/AppLayout';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {Badge, Button, Card, CardContent, Input, ResponsiveTable, TablePagination,} from '@/components/ui';
import {EmployeeSearchAutocomplete} from '@/components/ui/EmployeeSearchAutocomplete';
import {AllocationSummaryItem} from '@/lib/types/hrms/hrms-allocation';
import {useAuth} from '@/lib/hooks/useAuth';
import {useAllocationSummary, useExportAllocationSummary,} from '@/lib/hooks/queries/useProjects';

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
    return {message: 'You do not have access to this scope.'};
  }
  if (response?.status === 409) {
    return {message: 'Conflict detected. Please refresh and try again.'};
  }
  if (response?.data) {
    return {message: response.data.message, details: response.data.details};
  }
  if (error instanceof Error) {
    return {message: error.message};
  }
  return {message: 'Something went wrong. Please try again.'};
};

const buildEmployeeLabel = (employee: AllocationSummaryItem) => {
  const name = employee.employeeName?.trim();
  if (name) return name;
  const email = employee.employeeEmail?.trim();
  if (email) return email;
  return employee.employeeCode || 'Employee';
};

export default function AllocationSummaryPage() {
  const router = useRouter();
  const {hasAnyPermission, isReady: permissionsReady} = usePermissions();
  const hasAccess = hasAnyPermission(Permissions.ALLOCATION_VIEW, Permissions.PROJECT_VIEW, Permissions.ALLOCATION_MANAGE);

  useEffect(() => {
    if (permissionsReady && !hasAccess) {
      router.replace('/me/dashboard');
    }
  }, [permissionsReady, hasAccess, router]);

  const {user} = useAuth();
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);

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

  React.useEffect(() => {
    if (!allowedScopes.includes(selectedScope)) {
      setSelectedScope(defaultScope);
    }
  }, [allowedScopes, defaultScope, selectedScope]);

  const isEmployeeSearchEnabled = selectedScope === 'ORG' || selectedScope === 'DEPARTMENT';

  React.useEffect(() => {
    if (!isEmployeeSearchEnabled && selectedEmployee) {
      setSelectedEmployee(null);
    }
  }, [isEmployeeSearchEnabled, selectedEmployee]);

  const activeEmployeeId = isEmployeeSearchEnabled ? selectedEmployee?.id : undefined;

  // Queries
  const {data, isLoading, error: queryError} = useAllocationSummary(
    selectedScope,
    startDate,
    endDate,
    currentPage,
    pageSize,
    undefined,
    activeEmployeeId
  );

  const allocations = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;
  const loading = isLoading;

  const exportMutation = useExportAllocationSummary();

  const handleExport = async () => {
    try {
      const result = await exportMutation.mutateAsync({
        scope: selectedScope,
        startDate,
        endDate,
        employeeId: activeEmployeeId,
      });
      if (result instanceof Blob) {
        const url = URL.createObjectURL(result);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'allocation_summary.csv';
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      const apiError = parseApiError(err);
      setError(apiError.message || 'Failed to export allocation summary.');
      setErrorDetails(apiError.details || []);
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
          <div className="font-medium text-[var(--text-primary)]">
            {buildEmployeeLabel(row)}
          </div>
          <div className="text-caption">
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
          <span className="text-body-secondary">
            {formatPercent(row.allocationPercent)}
          </span>
          {row.overAllocated && (
            <Badge variant="danger" size="sm" title="Peak > 100%">
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
        <span className="text-body-secondary">
          {row.activeProjectCount ?? '—'}
        </span>
      ),
      mobilePriority: 'secondary' as const,
    },
  ], []);

  if (!permissionsReady || !hasAccess) return null;

  return (
    <AppLayout breadcrumbs={[{label: 'Allocations', href: '/allocations/summary'}, {label: 'Summary'}]}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
              Allocation Summary
            </h1>
            <p className="text-body-muted">
              Average allocation across the selected date range.
            </p>
          </div>
          <Button
            variant="outline"
            leftIcon={<Download className="h-4 w-4"/>}
            isLoading={exportMutation.isPending}
            onClick={handleExport}
          >
            {exportMutation.isPending ? 'Exporting...' : 'Export'}
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

            <div className="flex flex-wrap items-end gap-4">
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
            <p className="text-caption">
              Average is computed over the selected period; over-cap is flagged if any day in the range exceeds 100%.
            </p>
          </CardContent>
        </Card>

        {(error || queryError) && (
          <Card className="border-danger-200 bg-danger-50 dark:border-danger-800 dark:bg-danger-950/20">
            <CardContent className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-danger-500"/>
              <div>
                <p className="text-sm text-danger-700 dark:text-danger-300">
                  {error || (queryError instanceof Error ? queryError.message : 'Failed to load data')}
                </p>
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
