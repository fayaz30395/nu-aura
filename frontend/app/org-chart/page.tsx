'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import { useOrgChartTree, useOrgChartDepartments } from '@/lib/hooks/useOrgChart';
import { OrgTree } from '@/components/org-chart/OrgTree';
import { OrgListNode } from '@/components/org-chart/OrgNode';
import { OrgChartFilters, ViewMode } from '@/components/org-chart/OrgChartFilters';
import { Employee } from '@/lib/types/hrms/employee';
import { SkeletonTable } from '@/components/ui/Loading';
import {
  Users,
  Building2,
  GitBranch,
  Layers,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Stats Bar ───────────────────────────────────────────────────────────────

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}

function StatItem({ icon, label, value }: StatItemProps) {
  return (
    <div className="flex items-center gap-4 px-4 py-4">
      <div className="h-9 w-9 rounded-lg bg-accent-100 dark:bg-accent-900/40 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-lg font-bold text-[var(--text-primary)] leading-tight">{value}</p>
        <p className="text-xs text-[var(--text-secondary)]">{label}</p>
      </div>
    </div>
  );
}

// ── Department Card (for department view) ───────────────────────────────────

interface DepartmentGroupCardProps {
  departmentName: string;
  employees: Employee[];
  highlightedId: string | null;
}

function DepartmentGroupCard({ departmentName, employees, highlightedId }: DepartmentGroupCardProps) {
  const [expanded, setExpanded] = useState(true);

  // Find manager of this department (the one with no manager in the same dept)
  const manager = employees.find(e =>
    !e.managerId ||
    !employees.some(other => other.id === e.managerId),
  );

  return (
    <div className="skeuo-card overflow-hidden">
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between px-4 py-4 bg-[var(--bg-secondary)]/50 hover:bg-[var(--bg-secondary)] border-b border-[var(--border-main)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-accent-600 dark:text-accent-400" />
          <h3 className="font-semibold text-sm text-[var(--text-primary)]">{departmentName}</h3>
        </div>
        <span className="text-xs text-[var(--text-secondary)] bg-[var(--bg-card)] px-2 py-0.5 rounded-full">
          {employees.length} employee{employees.length !== 1 ? 's' : ''}
        </span>
      </button>

      {expanded && (
        <div className="p-4 space-y-1 max-h-80 overflow-y-auto">
          {employees
            .sort((a, b) => {
              const levelOrder: Record<string, number> = {
                CXO: 0, SVP: 1, VP: 2, DIRECTOR: 3, SENIOR_MANAGER: 4,
                MANAGER: 5, LEAD: 6, SENIOR: 7, MID: 8, ENTRY: 9,
              };
              const aL = levelOrder[a.level ?? 'ENTRY'] ?? 9;
              const bL = levelOrder[b.level ?? 'ENTRY'] ?? 9;
              if (aL !== bL) return aL - bL;
              return a.fullName.localeCompare(b.fullName);
            })
            .map(emp => (
              <div
                key={emp.id}
                className={cn(
                  'flex items-center gap-4 p-2 rounded-lg transition-colors',
                  emp.id === highlightedId
                    ? 'bg-accent-100 dark:bg-accent-900/40 ring-1 ring-accent-400'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                )}
              >
                {/* Avatar */}
                {emp.profilePhotoUrl ? (
                  <Image
                    src={emp.profilePhotoUrl}
                    alt={emp.fullName}
                    width={32}
                    height={32}
                    unoptimized
                    className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-slate-600 flex-shrink-0"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-accent-100 dark:bg-accent-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-accent-700 dark:text-accent-300">
                      {emp.firstName.charAt(0)}{emp.lastName?.charAt(0) ?? ''}
                    </span>
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {emp.fullName}
                    </p>
                    {manager?.id === emp.id && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-300">
                        Head
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] truncate">
                    {emp.designation ?? 'No designation'}
                  </p>
                </div>

                {emp.level && (
                  <span className="text-[10px] font-medium text-[var(--text-tertiary)] flex-shrink-0">
                    {emp.level.replace('_', ' ')}
                  </span>
                )}

                <Link
                  href={`/employees/${emp.id}`}
                  className="text-accent-600 dark:text-accent-400 hover:text-accent-800 dark:hover:text-accent-300 flex-shrink-0"
                  aria-label={`View ${emp.fullName}'s profile`}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function OrgChartPage() {
  const router = useRouter();
  const { hasPermission, isReady: permReady } = usePermissions();

  // Local UI state
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [maxDepth, setMaxDepth] = useState(0); // 0 = unlimited

  // Data from composite hook
  const {
    tree,
    stats,
    flatNodes,
    highlightedNodeId,
    isLoading,
    error,
  } = useOrgChartTree({
    departmentFilter: selectedDepartment || undefined,
    searchQuery,
    maxDepth: maxDepth > 0 ? maxDepth : undefined,
  });

  const { data: departments = [] } = useOrgChartDepartments();

  // For department view: group all employees by department
  const departmentGroups = useMemo(() => {
    const groups: Record<string, Employee[]> = {};
    for (const node of flatNodes) {
      const key = node.employee.departmentName ?? 'Unassigned';
      if (!groups[key]) groups[key] = [];
      groups[key].push(node.employee);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [flatNodes]);

  // Search result count
  const searchMatchCount = useMemo(() => {
    if (!searchQuery || searchQuery.trim().length < 2) return 0;
    const q = searchQuery.toLowerCase().trim();
    return flatNodes.filter(
      n =>
        n.employee.fullName.toLowerCase().includes(q) ||
        (n.employee.designation ?? '').toLowerCase().includes(q) ||
        (n.employee.employeeCode ?? '').toLowerCase().includes(q),
    ).length;
  }, [flatNodes, searchQuery]);

  // Redirect if no permission
  useEffect(() => {
    if (!permReady) return;
    if (!hasPermission(Permissions.ORG_STRUCTURE_VIEW)) {
      router.replace('/dashboard');
    }
  }, [permReady, hasPermission, router]);

  // Loading skeleton
  if (!permReady || isLoading) {
    return (
      <AppLayout activeMenuItem="org-chart">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <div className="h-10 bg-[var(--skeleton-base)] rounded-lg w-1/3 mb-4 animate-pulse" />
              <div className="h-5 bg-[var(--skeleton-base)] rounded-lg w-2/3 animate-pulse" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-[var(--skeleton-base)] rounded-xl animate-pulse" />
              ))}
            </div>
            <SkeletonTable rows={5} columns={4} />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="org-chart">
      <div className="max-w-[1400px] mx-auto">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Organization Chart
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Visualize your company structure and reporting relationships
          </p>
        </div>

        {/* ── Stats Bar ──────────────────────────────────────────── */}
        <div className="skeuo-card mb-5 grid grid-cols-2 lg:grid-cols-4 divide-x divide-[var(--border-subtle)]">
          <StatItem
            icon={<Users className="h-4.5 w-4.5 text-accent-600 dark:text-accent-400" />}
            label="Total Employees"
            value={stats.totalEmployees}
          />
          <StatItem
            icon={<Building2 className="h-4.5 w-4.5 text-accent-600 dark:text-accent-400" />}
            label="Departments"
            value={stats.totalDepartments}
          />
          <StatItem
            icon={<GitBranch className="h-4.5 w-4.5 text-accent-600 dark:text-accent-400" />}
            label="Avg Span of Control"
            value={stats.averageSpanOfControl}
          />
          <StatItem
            icon={<Layers className="h-4.5 w-4.5 text-accent-600 dark:text-accent-400" />}
            label="Hierarchy Depth"
            value={stats.maxDepth}
          />
        </div>

        {/* ── Filters ────────────────────────────────────────────── */}
        <div className="skeuo-card p-4 mb-5">
          <OrgChartFilters
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            departments={departments}
            selectedDepartment={selectedDepartment}
            onDepartmentChange={setSelectedDepartment}
            maxDepth={maxDepth}
            onMaxDepthChange={setMaxDepth}
          />

          {/* Search result indicator */}
          {searchQuery && searchQuery.trim().length >= 2 && (
            <div className="mt-2 text-xs text-[var(--text-secondary)]">
              {searchMatchCount > 0 ? (
                <span>
                  Found <span className="font-semibold text-accent-700 dark:text-accent-400">{searchMatchCount}</span> match{searchMatchCount !== 1 ? 'es' : ''} for &quot;{searchQuery}&quot;
                </span>
              ) : (
                <span>No matches found for &quot;{searchQuery}&quot;</span>
              )}
            </div>
          )}
        </div>

        {/* ── Content Area ───────────────────────────────────────── */}
        {error ? (
          <div className="skeuo-card p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center text-danger-600 dark:text-danger-400">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-2 font-medium">{error.message}</p>
                <p className="text-sm mt-1 text-[var(--text-secondary)]">Please try refreshing the page</p>
              </div>
            </div>
          </div>
        ) : flatNodes.length === 0 ? (
          <div className="skeuo-card p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center text-[var(--text-secondary)]">
                <Users className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
                <p className="mt-3 text-lg font-medium">No employees found</p>
                <p className="text-sm mt-1">
                  {selectedDepartment ? 'Try clearing the department filter' : 'Add employees to see the org chart'}
                </p>
              </div>
            </div>
          </div>
        ) : viewMode === 'tree' ? (
          <div className="skeuo-card p-4">
            <OrgTree tree={tree} highlightedId={highlightedNodeId} />
          </div>
        ) : viewMode === 'list' ? (
          <div className="skeuo-card p-4">
            <div className="max-h-[600px] overflow-y-auto">
              {tree.map(root => (
                <OrgListNode
                  key={root.employee.id}
                  node={root}
                  isHighlighted={root.employee.id === highlightedNodeId}
                  highlightedId={highlightedNodeId}
                />
              ))}
            </div>
          </div>
        ) : (
          /* Department view */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {departmentGroups.map(([deptName, emps]) => (
              <DepartmentGroupCard
                key={deptName}
                departmentName={deptName}
                employees={emps}
                highlightedId={highlightedNodeId}
              />
            ))}
          </div>
        )}

        {/* ── Legend ──────────────────────────────────────────────── */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
          <span className="font-medium mr-1">Legend:</span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-accent-100 border border-accent-400" />
            Executive
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-accent-100 border border-accent-400" />
            Director/VP
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-success-100 border border-success-400" />
            Manager
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-warning-100 border border-warning-400" />
            Lead
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-slate-100 border border-slate-300" />
            Individual Contributor
          </span>
        </div>
      </div>
    </AppLayout>
  );
}
