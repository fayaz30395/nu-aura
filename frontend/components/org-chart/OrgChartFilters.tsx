'use client';

import React from 'react';
import {Building2, GitBranch, List, Search} from 'lucide-react';
import {Department} from '@/lib/types/hrms/employee';
import {cn} from '@/lib/utils';

export type ViewMode = 'tree' | 'list' | 'department';

interface OrgChartFiltersProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  departments: Department[];
  selectedDepartment: string;
  onDepartmentChange: (departmentId: string) => void;
  maxDepth: number;
  onMaxDepthChange: (depth: number) => void;
}

const VIEW_OPTIONS: { value: ViewMode; label: string; icon: React.ReactNode }[] = [
  {value: 'tree', label: 'Tree', icon: <GitBranch className="h-3.5 w-3.5"/>},
  {value: 'list', label: 'List', icon: <List className="h-3.5 w-3.5"/>},
  {value: 'department', label: 'Department', icon: <Building2 className="h-3.5 w-3.5"/>},
];

const DEPTH_OPTIONS = [
  {value: 0, label: 'All levels'},
  {value: 1, label: '1 level'},
  {value: 2, label: '2 levels'},
  {value: 3, label: '3 levels'},
  {value: 4, label: '4 levels'},
  {value: 5, label: '5 levels'},
];

export function OrgChartFilters({
                                  viewMode,
                                  onViewModeChange,
                                  searchQuery,
                                  onSearchChange,
                                  departments,
                                  selectedDepartment,
                                  onDepartmentChange,
                                  maxDepth,
                                  onMaxDepthChange,
                                }: OrgChartFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]"/>
        <input
          type="text"
          placeholder="Search by name, designation, or code..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-1 dark:focus:ring-offset-surface-900 transition-shadow"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center text-[var(--text-secondary)] hover:bg-surface-300 dark:hover:bg-surface-600 transition-colors"
            aria-label="Clear search"
          >
            <span className="text-xs leading-none">&times;</span>
          </button>
        )}
      </div>

      {/* View mode toggle */}
      <div className="flex items-center bg-[var(--bg-secondary)] rounded-lg p-0.5 border border-[var(--border-subtle)]">
        {VIEW_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => onViewModeChange(opt.value)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-md transition-all',
              viewMode === opt.value
                ? 'bg-accent-700 text-white shadow-[var(--shadow-card)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]',
            )}
            aria-pressed={viewMode === opt.value}
          >
            {opt.icon}
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Department filter */}
      <select
        value={selectedDepartment}
        onChange={e => onDepartmentChange(e.target.value)}
        className="text-sm rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-1 dark:focus:ring-offset-surface-900 transition-shadow"
      >
        <option value="">All Departments</option>
        {departments.map(dept => (
          <option key={dept.id} value={dept.id}>
            {dept.name}
          </option>
        ))}
      </select>

      {/* Depth filter (only for tree/list views) */}
      {viewMode !== 'department' && (
        <select
          value={maxDepth}
          onChange={e => onMaxDepthChange(Number(e.target.value))}
          className="text-sm rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-1 dark:focus:ring-offset-surface-900 transition-shadow"
        >
          {DEPTH_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
