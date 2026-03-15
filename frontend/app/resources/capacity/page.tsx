'use client';

import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout';
import { RefreshCw, AlertTriangle, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import {
  ResourceManagementApiError,
} from '@/lib/services/resource-management.service';
import { EmployeeWorkload } from '@/lib/types/resource-management';
import { useWorkloadDashboard } from '@/lib/hooks/queries/useResources';
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, addDays, isSameMonth } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectBand {
  projectName: string;
  projectId: string;
  allocationPct: number;
  color: string;
}

// Deterministic pastel color from project id string
const PROJECT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#14b8a6', '#f97316', '#a855f7', '#06b6d4',
];
function projectColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % PROJECT_COLORS.length;
  return PROJECT_COLORS[hash];
}

// ─── Row component ────────────────────────────────────────────────────────────

function CapacityRow({ emp }: { emp: EmployeeWorkload }) {
  const total = emp.totalAllocation ?? 0;
  const bands: ProjectBand[] = (emp.allocations || []).map((p: { projectId: string; projectName: string; allocationPercentage?: number }) => ({
    projectName: p.projectName,
    projectId: p.projectId,
    allocationPct: p.allocationPercentage ?? 0,
    color: projectColor(p.projectId),
  }));

  const barColor = total >= 100 ? '#ef4444' : total >= 81 ? '#f97316' : '#10b981';

  return (
    <div className="flex items-center gap-4 py-2 border-b border-[var(--border-main)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors group">
      {/* Employee name */}
      <div className="w-44 flex-shrink-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{emp.employeeName}</p>
        {emp.designation && (
          <p className="text-xs text-[var(--text-muted)] truncate">{emp.designation}</p>
        )}
      </div>

      {/* Stacked bar */}
      <div className="flex-1 min-w-0">
        <div className="relative h-7 bg-[var(--bg-secondary)] rounded-lg overflow-hidden border border-[var(--border-main)]">
          {/* Project bands */}
          {bands.length > 0 ? (
            <div className="absolute inset-0 flex">
              {bands.map((band, idx) => (
                <div
                  key={band.projectId}
                  className="h-full flex items-center justify-center text-white text-xs font-semibold overflow-hidden"
                  style={{
                    width: `${Math.min(band.allocationPct, 100)}%`,
                    backgroundColor: band.color,
                    opacity: 0.85,
                  }}
                  title={`${band.projectName}: ${band.allocationPct}%`}
                >
                  {band.allocationPct >= 10 ? `${band.allocationPct}%` : ''}
                </div>
              ))}
              {/* Free capacity */}
              {total < 100 && (
                <div
                  className="h-full bg-[var(--bg-secondary)]"
                  style={{ width: `${100 - total}%` }}
                />
              )}
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center px-3">
              <span className="text-xs text-[var(--text-muted)]">Unassigned</span>
            </div>
          )}

          {/* Over-allocation overflow stripe */}
          {total > 100 && (
            <div
              className="absolute top-0 right-0 h-full flex items-center justify-center text-white text-xs font-bold"
              style={{
                width: `${Math.min(total - 100, 30)}%`,
                background: 'repeating-linear-gradient(45deg, #ef4444, #ef4444 4px, #fca5a5 4px, #fca5a5 8px)',
              }}
              title={`Over-allocated by ${total - 100}%`}
            />
          )}
        </div>
      </div>

      {/* % label */}
      <div className="w-16 flex-shrink-0 text-right">
        <span
          className="text-sm font-bold"
          style={{ color: barColor }}
        >
          {total}%
        </span>
      </div>

      {/* Project legend (visible on hover) */}
      <div className="w-48 flex-shrink-0 hidden lg:flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {bands.slice(0, 3).map(b => (
          <span
            key={b.projectId}
            className="text-xs px-1.5 py-0.5 rounded-full text-white font-medium truncate max-w-[80px]"
            style={{ backgroundColor: b.color }}
            title={b.projectName}
          >
            {b.projectName.length > 10 ? b.projectName.slice(0, 9) + '…' : b.projectName}
          </span>
        ))}
        {bands.length > 3 && (
          <span className="text-xs text-[var(--text-muted)]">+{bands.length - 3}</span>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CapacityTimelinePage() {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');

  const { data, isLoading, error, refetch } = useWorkloadDashboard({});

  const isApiUnavailable = (error instanceof Error &&
    (error as unknown as ResourceManagementApiError).isApiNotAvailable) ?? false;

  const employees: EmployeeWorkload[] = data?.employeeWorkloads || [];

  const departments = useMemo(() => {
    const s = new Set(employees.map(e => e.departmentName).filter(Boolean));
    return Array.from(s).sort();
  }, [employees]);

  const filtered = useMemo(() => employees.filter(e => {
    if (search && !e.employeeName.toLowerCase().includes(search.toLowerCase()) &&
        !(e.employeeCode || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (deptFilter !== 'ALL' && e.departmentName !== deptFilter) return false;
    return true;
  }), [employees, search, deptFilter]);

  // Sort: over-allocated first, then by allocation % desc
  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => (b.totalAllocation ?? 0) - (a.totalAllocation ?? 0)),
    [filtered]
  );

  if (isApiUnavailable) {
    return (
      <AppLayout activeMenuItem="resources" breadcrumbs={[{ label: 'Resources', href: '/resources' }, { label: 'Capacity' }]}>
        <div className="p-6 flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <Info size={24} className="text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-secondary)] mb-2">Resource Management API Not Available</h2>
          <p className="text-[var(--text-muted)] text-sm max-w-md">
            {error instanceof Error ? error.message : 'The backend Resource Management module is not yet deployed in this environment.'}
          </p>
          <button onClick={() => refetch()} className="mt-4 flex items-center gap-2 px-4 py-2 border border-[var(--border-main)] rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </AppLayout>
    );
  }

  // Summary for the legend
  const overAllocated = sorted.filter(e => (e.totalAllocation ?? 0) >= 100).length;
  const avgAlloc = sorted.length > 0
    ? Math.round(sorted.reduce((s, e) => s + (e.totalAllocation ?? 0), 0) / sorted.length)
    : 0;

  return (
    <AppLayout
      activeMenuItem="resources"
      breadcrumbs={[
        { label: 'Resources', href: '/resources' },
        { label: 'Capacity Timeline' },
      ]}
    >
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Capacity Timeline</h1>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              Current allocation per employee across active projects
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 border border-[var(--border-main)] rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex items-center gap-2">
            <AlertTriangle size={15} />
            {error instanceof Error ? error.message : String(error)}
          </div>
        )}

        {/* Stats */}
        {!isLoading && sorted.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white border border-[var(--border-main)] rounded-xl px-4 py-3">
              <p className="text-2xl font-bold text-[var(--text-primary)]">{sorted.length}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Employees shown</p>
            </div>
            <div className="bg-white border border-[var(--border-main)] rounded-xl px-4 py-3">
              <p className="text-2xl font-bold text-[var(--text-primary)]">{avgAlloc}%</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Avg allocation</p>
            </div>
            <div className={`border rounded-xl px-4 py-3 ${overAllocated > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <p className={`text-2xl font-bold ${overAllocated > 0 ? 'text-red-700' : 'text-green-700'}`}>
                {overAllocated}
              </p>
              <p className={`text-xs mt-0.5 ${overAllocated > 0 ? 'text-red-600' : 'text-green-600'}`}>
                Over-allocated
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search employee..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 border border-[var(--border-main)] rounded-lg text-sm text-[var(--text-primary)] bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 w-52"
          />
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="px-3 py-2 border border-[var(--border-main)] rounded-lg text-sm text-[var(--text-primary)] bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          >
            <option value="ALL">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* Bar chart */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-10 bg-[var(--bg-secondary)] animate-pulse rounded-xl" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-[var(--text-secondary)] font-medium">No employees found</p>
          </div>
        ) : (
          <div className="bg-white border border-[var(--border-main)] rounded-xl p-5">
            {/* Legend */}
            <div className="flex items-center gap-4 mb-4 pb-3 border-b border-[var(--border-main)] text-xs text-[var(--text-muted)]">
              <span className="font-medium text-[var(--text-secondary)]">Legend:</span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-sm bg-green-500" /> ≤80% optimal
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-sm bg-orange-400" /> 81–99% high
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-sm bg-red-500" /> ≥100% over-allocated
              </span>
              <span className="ml-auto text-[var(--text-muted)] italic">
                Hover a row to see project names
              </span>
            </div>

            <div className="space-y-0">
              {sorted.map(emp => (
                <CapacityRow key={emp.employeeId} emp={emp} />
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-[var(--border-main)] text-xs text-[var(--text-muted)]">
              Allocations reflect current active project assignments. Data from Resource Management API.
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
