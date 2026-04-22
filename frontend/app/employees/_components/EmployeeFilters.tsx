'use client';

import {Button} from '@/components/ui/Button';

export interface EmployeeFiltersProps {
  searchQuery: string;
  statusFilter: string;
  onSearchQueryChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onSearch: () => void;
}

export function EmployeeFilters({
                                  searchQuery,
                                  statusFilter,
                                  onSearchQueryChange,
                                  onStatusFilterChange,
                                  onSearch,
                                }: EmployeeFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1 flex gap-2">
        <input
          type="text"
          placeholder="Search employees..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          className="flex-1 min-w-0 h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all skeuo-input"
        />
        <Button variant="secondary" size="sm" onClick={onSearch}>
          Search
        </Button>
      </div>
      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
        className="h-10 px-4 text-sm border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:border-[var(--border-focus)] transition-all skeuo-input"
      >
        <option value="">All Status</option>
        <option value="ACTIVE">Active</option>
        <option value="ON_LEAVE">On Leave</option>
        <option value="TERMINATED">Terminated</option>
      </select>
    </div>
  );
}
