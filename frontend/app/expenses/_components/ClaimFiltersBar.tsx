'use client';

import {Button, NativeSelect, TextInput} from '@mantine/core';
import {ChevronDown, Search} from 'lucide-react';
import type {ExpenseCategory} from '@/lib/types/hrms/expense';
import {FILTER_CATEGORY_OPTIONS, type ClaimFilters} from './types';

export interface ClaimFiltersBarProps {
  filters: ClaimFilters;
  showMore: boolean;
  hasCustomFilters: boolean;
  onToggleMore: () => void;
  onChange: (filters: ClaimFilters) => void;
  onClear: () => void;
}

export function ClaimFiltersBar({
  filters,
  showMore,
  hasCustomFilters,
  onToggleMore,
  onChange,
  onClear,
}: ClaimFiltersBarProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <TextInput
          className="min-w-0 flex-1 basis-60"
          type="search"
          aria-label="Search claims"
          placeholder="Search claims, employees, claim numbers"
          leftSection={<Search className="h-4 w-4" aria-hidden/>}
          value={filters.search}
          onChange={(e) => onChange({...filters, search: e.currentTarget.value})}
        />
        <NativeSelect
          className="w-full sm:w-44"
          aria-label="Category"
          data={FILTER_CATEGORY_OPTIONS}
          value={filters.category}
          onChange={(e) => onChange({...filters, category: e.currentTarget.value as ExpenseCategory | 'ALL'})}
        />
        <TextInput
          className="min-w-36 flex-1 sm:w-40 sm:flex-none"
          type="date"
          aria-label="Date from"
          value={filters.dateFrom}
          onChange={(e) => onChange({...filters, dateFrom: e.currentTarget.value})}
        />
        <TextInput
          className="min-w-36 flex-1 sm:w-40 sm:flex-none"
          type="date"
          aria-label="Date to"
          value={filters.dateTo}
          onChange={(e) => onChange({...filters, dateTo: e.currentTarget.value})}
        />
        <Button
          variant="default"
          onClick={onToggleMore}
          aria-expanded={showMore}
          rightSection={
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-[var(--motion-fast)] ${showMore ? 'rotate-180' : ''}`}
              aria-hidden
            />
          }
        >
          More filters
        </Button>
        {hasCustomFilters && (
          <Button variant="subtle" color="gray" onClick={onClear}>
            Clear filters
          </Button>
        )}
      </div>
      {showMore && (
        <div className="grid grid-cols-2 gap-4 sm:max-w-sm">
          <TextInput
            label="Min amount"
            type="number"
            placeholder="0"
            classNames={{input: 'tabular-nums'}}
            value={filters.amountMin}
            onChange={(e) => onChange({...filters, amountMin: e.currentTarget.value})}
          />
          <TextInput
            label="Max amount"
            type="number"
            placeholder="0"
            classNames={{input: 'tabular-nums'}}
            value={filters.amountMax}
            onChange={(e) => onChange({...filters, amountMax: e.currentTarget.value})}
          />
        </div>
      )}
    </div>
  );
}
