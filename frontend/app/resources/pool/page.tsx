'use client';

import {useEffect, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {AppLayout} from '@/components/layout';
import {AlertTriangle, Download, Info, RefreshCw, Search, Users} from 'lucide-react';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {ResourceManagementApiError,} from '@/lib/services/hrms/resource-management.service';
import {AllocationStatus, EmployeeWorkload,} from '@/lib/types/hrms/resource-management';
import {useWorkloadDashboard} from '@/lib/hooks/queries/useResources';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function allocationColor(pct: number): { bar: string; badge: string; text: string } {
  if (pct >= 100) return {bar: "bg-status-danger-bg", badge: "bg-status-danger-bg text-status-danger-text", text: "text-status-danger-text"};
  if (pct >= 81) return {bar: "bg-status-warning-bg", badge: "bg-status-warning-bg text-status-warning-text", text: "text-status-warning-text"};
  if (pct >= 51) return {bar: "bg-status-success-bg", badge: "bg-status-success-bg text-status-success-text", text: "text-status-success-text"};
  if (pct > 0) return {bar: "bg-status-info-bg", badge: "bg-status-info-bg text-status-info-text", text: "text-status-info-text"};
  return {
    bar: 'bg-[var(--bg-secondary)]',
    badge: 'bg-[var(--bg-secondary)] text-[var(--text-muted)]',
    text: 'text-[var(--text-muted)]'
  };
}

function AllocationBar({value}: { value: number }) {
  const clampedPct = Math.min(100, value);
  const {bar} = allocationColor(value);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${bar}`}
          style={{width: `${clampedPct}%`}}
        />
      </div>
      <span className="text-xs font-semibold w-10 text-right text-[var(--text-secondary)]">
        {value}%
      </span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type StatusFilter = AllocationStatus | 'ALL';

export default function ResourcePoolPage() {
  const router = useRouter();
  const {hasAnyPermission, isReady: permissionsReady} = usePermissions();
  const hasAccess = hasAnyPermission(Permissions.RESOURCE_VIEW, Permissions.RESOURCE_MANAGE);

  useEffect(() => {
    if (permissionsReady && !hasAccess) {
      router.replace('/me/dashboard');
    }
  }, [permissionsReady, hasAccess, router]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');

  const {data, isLoading, error, refetch} = useWorkloadDashboard({});

  const isApiUnavailable = (error instanceof Error &&
    (error as unknown as ResourceManagementApiError).isApiNotAvailable) ?? false;

  // Extract employees list — stable reference to prevent departments/filtered useMemo thrashing.
  const employees = useMemo<EmployeeWorkload[]>(() => data?.employeeWorkloads ?? [], [data]);

  // Unique departments
  const departments = useMemo(() => {
    const depts = new Set(employees.map(e => e.departmentName).filter(Boolean));
    return Array.from(depts).sort();
  }, [employees]);

  // Filter + search
  const filtered = useMemo(() => {
    return employees.filter(e => {
      if (search && !e.employeeName.toLowerCase().includes(search.toLowerCase()) &&
        !(e.employeeCode || '').toLowerCase().includes(search.toLowerCase()) &&
        !(e.designation || '').toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'ALL' && e.allocationStatus !== statusFilter) return false;
      if (deptFilter !== 'ALL' && e.departmentName !== deptFilter) return false;
      return true;
    });
  }, [employees, search, statusFilter, deptFilter]);

  // Summary counts
  const summary = useMemo(() => ({
    total: employees.length,
    overAllocated: employees.filter(e => e.allocationStatus === 'OVER_ALLOCATED').length,
    optimal: employees.filter(e => e.allocationStatus === 'OPTIMAL').length,
    underUtilized: employees.filter(e => e.allocationStatus === 'UNDER_UTILIZED').length,
    unassigned: employees.filter(e => e.allocationStatus === 'UNASSIGNED').length,
  }), [employees]);

  const exportCsv = () => {
    const header = ['Name', 'Code', 'Department', 'Designation', 'Allocation %', 'Status', 'Projects'];
    const rows = filtered.map(e => [
      e.employeeName,
      e.employeeCode || '',
      e.departmentName || '',
      e.designation || '',
      e.totalAllocation ?? 0,
      e.allocationStatus,
      (e.allocations || []).map((p: { projectName: string }) => p.projectName).join(' | '),
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], {type: 'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'resource-pool.csv';
    a.click();
  };

  if (!permissionsReady || !hasAccess) return null;

  if (isApiUnavailable) {
    return (
      <AppLayout activeMenuItem="resources" breadcrumbs={[{label: 'Resources', href: '/resources'}, {label: 'Pool'}]}>
        <div className="p-6 flex flex-col items-center justify-center py-24 text-center">
          <div className='w-14 h-14 rounded-full bg-status-warning-bg flex items-center justify-center mb-4'>
            <Info size={24} className='text-status-warning-text'/>
          </div>
          <h2 className="text-xl font-semibold text-[var(--text-secondary)] mb-2">Resource Management API Not
            Available</h2>
          <p className="text-[var(--text-muted)] text-sm max-w-md">
            {error instanceof Error ? error.message : 'The backend Resource Management module is not yet deployed in this environment.'}
          </p>
          <button onClick={() => refetch()} aria-label="Retry loading resource pool data"
                  className="mt-4 flex items-center gap-2 px-4 py-2 border border-[var(--border-main)] rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
            <RefreshCw size={14}/> Retry
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      activeMenuItem="resources"
      breadcrumbs={[
        {label: 'Resources', href: '/resources'},
        {label: 'Resource Pool'},
      ]}
    >
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">Resource Pool</h1>
            <p className="text-body-muted mt-0.5">
              All employees with current project allocation status
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              aria-label="Refresh resource pool data"
              className="flex items-center gap-2 px-4 py-2 border border-[var(--border-main)] rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] disabled:opacity-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''}/>
              Refresh
            </button>
            <button
              onClick={exportCsv}
              disabled={filtered.length === 0}
              aria-label="Export resource pool to CSV"
              className="flex items-center gap-2 px-4 py-2 border border-[var(--border-main)] rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] disabled:opacity-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            >
              <Download size={14}/>
              Export
            </button>
          </div>
        </div>

        {error && (
          <div
            className='bg-status-danger-bg border border-status-danger-border text-status-danger-text text-sm rounded-lg px-4 py-4 flex items-center gap-2'>
            <AlertTriangle size={15}/>
            {error instanceof Error ? error.message : String(error)}
          </div>
        )}

        {/* Summary Stats */}
        {!isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: 'Total Employees',
                value: summary.total,
                color: 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]',
                filter: 'ALL' as StatusFilter
              },
              {
                label: 'Over-Allocated',
                value: summary.overAllocated,
                color: "bg-status-danger-bg text-status-danger-text",
                filter: 'OVER_ALLOCATED' as StatusFilter
              },
              {
                label: 'Optimal',
                value: summary.optimal,
                color: "bg-status-success-bg text-status-success-text",
                filter: 'OPTIMAL' as StatusFilter
              },
              {
                label: 'Unassigned',
                value: summary.unassigned,
                color: 'bg-[var(--bg-secondary)] text-[var(--text-muted)]',
                filter: 'UNASSIGNED' as StatusFilter
              },
            ].map(stat => (
              <button
                key={stat.filter}
                onClick={() => setStatusFilter(statusFilter === stat.filter ? 'ALL' : stat.filter)}
                className={`rounded-xl border p-4 text-left transition-all hover:shadow-[var(--shadow-card)] ${
                  statusFilter === stat.filter
                    ? "border-[var(--accent-primary)] ring-2 ring-accent-200 bg-accent-subtle"
                    : 'border-[var(--border-main)] bg-[var(--bg-card)]'
                }`}
              >
                <p className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">{stat.value}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`inline-block w-2 h-2 rounded-full ${stat.color.split(' ')[0]}`}/>
                  <p className="text-caption">{stat.label}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"/>
            <input
              type="text"
              placeholder="Search by name, code, role..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className='pl-8 pr-4 py-2 border border-[var(--border-main)] rounded-lg text-sm text-[var(--text-primary)] bg-[var(--bg-card)] focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-[var(--accent-primary)] w-64'
            />
          </div>

          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className='px-4 py-2 border border-[var(--border-main)] rounded-lg text-sm text-[var(--text-primary)] bg-[var(--bg-card)] focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-[var(--accent-primary)]'
          >
            <option value="ALL">All Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {(search || statusFilter !== 'ALL' || deptFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
                setDeptFilter('ALL');
              }}
              className="px-4 py-2 text-body-muted hover:text-[var(--text-secondary)] transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-14 bg-[var(--bg-secondary)] animate-pulse rounded-xl"/>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mb-4">
              <Users size={24} className="text-[var(--text-muted)]"/>
            </div>
            <p className="text-[var(--text-secondary)] font-medium">No employees found</p>
            <p className="text-[var(--text-muted)] text-sm mt-1">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-main)]">
                  <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)]">Employee</th>
                  <th
                    className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)] hidden sm:table-cell">Department
                  </th>
                  <th
                    className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)] hidden md:table-cell">Designation
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)] w-48">Allocation</th>
                  <th
                    className="px-4 py-2 text-left font-semibold text-[var(--text-secondary)] hidden lg:table-cell">Projects
                  </th>
                  <th className="px-4 py-2 text-center font-semibold text-[var(--text-secondary)]">Status</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                {filtered.map(emp => {
                  const alloc = emp.totalAllocation ?? 0;
                  const {badge} = allocationColor(alloc);
                  return (
                    <tr key={emp.employeeId} className="hover:bg-[var(--bg-secondary)] transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-4">
                          <div
                            className='w-8 h-8 rounded-full bg-accent-subtle flex items-center justify-center flex-shrink-0'>
                              <span className='text-xs font-bold text-accent'>
                                {(emp.employeeName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                              </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-[var(--text-primary)] truncate">{emp.employeeName}</p>
                            {emp.employeeCode && (
                              <p className="text-caption font-mono">{emp.employeeCode}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[var(--text-secondary)] hidden sm:table-cell">
                        {emp.departmentName || '—'}
                      </td>
                      <td className="px-4 py-4 text-[var(--text-secondary)] hidden md:table-cell">
                        {emp.designation || '—'}
                      </td>
                      <td className="px-4 py-4">
                        <AllocationBar value={alloc}/>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        {(emp.allocations || []).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {(emp.allocations || []).slice(0, 3).map((p: {
                              projectId: string;
                              projectName: string;
                              allocationPercentage?: number
                            }) => (
                              <span key={p.projectId}
                                    className="text-xs px-2 py-0.5 bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-full"
                                    title={p.projectName}>
                                  {p.projectName.length > 18 ? p.projectName.slice(0, 16) + '…' : p.projectName}
                                {p.allocationPercentage != null && (
                                  <span className="ml-1 text-[var(--text-muted)]">({p.allocationPercentage}%)</span>
                                )}
                                </span>
                            ))}
                            {(emp.allocations || []).length > 3 && (
                              <span className="text-caption">
                                  +{(emp.allocations || []).length - 3} more
                                </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[var(--text-muted)] text-xs">No active projects</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${badge}`}>
                            {emp.allocationStatus === 'OVER_ALLOCATED' ? 'Over' :
                              emp.allocationStatus === 'OPTIMAL' ? 'Optimal' :
                                emp.allocationStatus === 'UNDER_UTILIZED' ? 'Under' : 'Free'}
                          </span>
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-4 border-t border-[var(--border-main)] text-caption row-between">
              <span>Showing {filtered.length} of {employees.length} employees</span>
              <div className="flex items-center gap-4">
                {[
                  {label: '≤80%', color: "bg-status-success-bg"},
                  {label: '81–99%', color: "bg-status-warning-bg"},
                  {label: '≥100%', color: "bg-status-danger-bg"},
                  {label: 'Unassigned', color: 'bg-[var(--bg-secondary)]'},
                ].map(l => (
                  <span key={l.label} className="flex items-center gap-1">
                    <span className={`inline-block w-2.5 h-2.5 rounded-md ${l.color}`}/>
                    {l.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
