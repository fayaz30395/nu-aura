'use client';

import {ActionIcon, Button, Collapse, Indicator, NativeSelect, TextInput} from '@mantine/core';
import {Filter, Grid3X3, List, Search} from 'lucide-react';
import {
  type DirectoryDepartment,
  type DirectorySearchFilters,
  JOB_ROLE_OPTIONS,
  LEVEL_OPTIONS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
} from './directory-options';

interface DirectoryFiltersProps {
  filters: DirectorySearchFilters;
  departments: DirectoryDepartment[];
  showFilters: boolean;
  hasActiveFilters: boolean;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onToggleFilters: () => void;
  onFilterChange: <K extends keyof DirectorySearchFilters>(key: K, value: DirectorySearchFilters[K]) => void;
  onSearch: () => void;
  onClearFilters: () => void;
}

const single = (value: string) => (value ? [value] : []);

export function DirectoryFilters({
  filters,
  departments,
  showFilters,
  hasActiveFilters,
  viewMode,
  onViewModeChange,
  onToggleFilters,
  onFilterChange,
  onSearch,
  onClearFilters,
}: DirectoryFiltersProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <TextInput
          className="flex-1"
          leftSection={<Search className="h-4 w-4"/>}
          aria-label="Search by name, email, phone, or employee code..."
          placeholder="Search by name, email, phone, or employee code..."
          value={filters.searchTerm}
          onChange={(e) => onFilterChange('searchTerm', e.currentTarget.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
        />
        <div className="flex items-center gap-2">
          <Button onClick={onSearch}>Search</Button>
          <Indicator disabled={!hasActiveFilters} size={8} offset={4} color="var(--accent-primary)">
            <Button
              variant={showFilters ? 'light' : 'default'}
              leftSection={<Filter className="h-4 w-4"/>}
              onClick={onToggleFilters}
              aria-expanded={showFilters}
              aria-controls="directory-filters"
            >
              Filters
            </Button>
          </Indicator>
          <div className="ml-auto flex items-center gap-1 sm:ml-2" role="group" aria-label="View mode">
            <ActionIcon
              size="lg"
              variant={viewMode === 'grid' ? 'light' : 'subtle'}
              color={viewMode === 'grid' ? undefined : 'gray'}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
              onClick={() => onViewModeChange('grid')}
            >
              <Grid3X3 className="h-4 w-4"/>
            </ActionIcon>
            <ActionIcon
              size="lg"
              variant={viewMode === 'list' ? 'light' : 'subtle'}
              color={viewMode === 'list' ? undefined : 'gray'}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
              onClick={() => onViewModeChange('list')}
            >
              <List className="h-4 w-4"/>
            </ActionIcon>
          </div>
        </div>
      </div>

      <Collapse expanded={showFilters} transitionDuration={200}>
        <div id="directory-filters" className="flex flex-col gap-4 border-t border-border pt-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <NativeSelect
              id="filter-department"
              label="Department"
              value={filters.departmentIds[0] || ''}
              onChange={(e) => onFilterChange('departmentIds', single(e.currentTarget.value))}
              data={[{value: '', label: 'All Departments'}, ...departments.map((d) => ({value: d.id, label: d.name}))]}
            />
            <NativeSelect
              id="filter-job-role"
              label="Job Role"
              value={filters.jobRoles[0] || ''}
              onChange={(e) => onFilterChange('jobRoles', single(e.currentTarget.value))}
              data={[{value: '', label: 'All Roles'}, ...JOB_ROLE_OPTIONS]}
            />
            <NativeSelect
              id="filter-level"
              label="Level"
              value={filters.levels[0] || ''}
              onChange={(e) => onFilterChange('levels', single(e.currentTarget.value))}
              data={[{value: '', label: 'All Levels'}, ...LEVEL_OPTIONS]}
            />
            <NativeSelect
              id="filter-status"
              label="Status"
              value={filters.statuses[0] || ''}
              onChange={(e) => onFilterChange('statuses', single(e.currentTarget.value))}
              data={[{value: '', label: 'All Statuses'}, ...STATUS_OPTIONS]}
            />
          </div>
          <div className="flex justify-end">
            <Button variant="subtle" color="gray" size="xs" onClick={onClearFilters}>
              Clear all filters
            </Button>
          </div>
        </div>
      </Collapse>

      <div className="flex items-center justify-end gap-2">
        <NativeSelect
          size="xs"
          label="Sort by"
          classNames={{root: 'flex items-center gap-2', label: 'text-xs text-text-2'}}
          value={filters.sortBy}
          onChange={(e) => onFilterChange('sortBy', e.currentTarget.value)}
          data={SORT_OPTIONS}
        />
      </div>
    </div>
  );
}
