'use client';

import {ActionIcon, Button, Group, Indicator, TextInput} from '@mantine/core';
import {ArrowDown, ArrowUp, Filter, Search, X} from 'lucide-react';
import {ColumnVisibilityToggle} from '@/components/ui/ColumnVisibilityToggle';
import type {EmployeeListState} from '../_hooks/useEmployeeList';
import {EMPLOYEE_TABLE_COLUMNS, EMPLOYEE_TABLE_ID, SORT_LABELS} from './employee-list-config';

interface EmployeesToolbarProps {
  list: EmployeeListState;
  showFilterPanel: boolean;
  onToggleFilterPanel: () => void;
}

export function EmployeesToolbar({list, showFilterPanel, onToggleFilterPanel}: EmployeesToolbarProps) {
  const SortIcon = list.sortDirection === 'DESC' ? ArrowDown : ArrowUp;

  return (
    <div className="flex flex-col gap-4 border-b border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <TextInput
          id="employee-search"
          className="w-full sm:w-72"
          placeholder="Search name, role, email…"
          aria-label="Search employees by name, role or email"
          leftSection={<Search className="h-4 w-4" aria-hidden/>}
          value={list.searchQuery}
          onChange={(e) => list.setSearchQuery(e.currentTarget.value)}
          onKeyDown={(e) => e.key === 'Enter' && list.submitSearch()}
        />
        <Group gap="xs" className="sm:ml-auto">
          <Button
            variant="default"
            leftSection={<SortIcon className="h-4 w-4" aria-hidden/>}
            onClick={list.cycleSort}
            aria-label={`Sort by ${SORT_LABELS[list.sortBy]}, ${list.sortDirection === 'DESC' ? 'descending' : 'ascending'}. Click to change.`}
          >
            {SORT_LABELS[list.sortBy]}
          </Button>
          <Indicator
            label={list.filterConditions.length}
            size={16}
            disabled={list.filterConditions.length === 0}
          >
            <Button
              variant={showFilterPanel ? 'light' : 'default'}
              leftSection={<Filter className="h-4 w-4" aria-hidden/>}
              onClick={onToggleFilterPanel}
              aria-expanded={showFilterPanel}
            >
              Filters
            </Button>
          </Indicator>
          <div className="hidden md:block">
            <ColumnVisibilityToggle
              columns={EMPLOYEE_TABLE_COLUMNS}
              visible={list.visibleColumns}
              onChange={list.setVisibleColumns}
              storageKey={EMPLOYEE_TABLE_ID}
            />
          </div>
        </Group>
      </div>
      {list.deptOptions.length > 1 && (
        <Group gap="xs" role="group" aria-label="Filter by department">
          {list.deptOptions.map((dept) => {
            const active = list.deptFilter === dept;
            return (
              <Button
                key={dept}
                size="xs"
                radius="xl"
                variant={active ? 'light' : 'default'}
                aria-pressed={active}
                onClick={() => list.setDeptFilter(dept)}
                rightSection={
                  dept !== 'All' ? (
                    <span className="tabular-nums text-text-3">{list.deptCounts[dept] ?? 0}</span>
                  ) : undefined
                }
              >
                {dept}
              </Button>
            );
          })}
        </Group>
      )}
    </div>
  );
}

interface EmployeesBulkBarProps {
  count: number;
  canDeactivate: boolean;
  deactivating: boolean;
  onDeactivate: () => void;
  onClear: () => void;
}

export function EmployeesBulkBar({count, canDeactivate, deactivating, onDeactivate, onClear}: EmployeesBulkBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-border bg-surface-aura-sunken p-4">
      <span className="text-sm font-medium text-text-1">
        <span className="tabular-nums">{count}</span> selected
      </span>
      {canDeactivate && (
        <Button color="red" variant="light" onClick={onDeactivate} loading={deactivating}>
          Deactivate
        </Button>
      )}
      <ActionIcon
        variant="subtle"
        color="gray"
        size={32}
        className="ml-auto"
        aria-label="Clear selection"
        onClick={onClear}
      >
        <X className="h-4 w-4" aria-hidden/>
      </ActionIcon>
    </div>
  );
}
