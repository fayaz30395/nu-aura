'use client';

import {Segmented} from '@/components/ui/Segmented';

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

const OPTIONS: {value: StatusFilter; label: string}[] = [
  {value: 'ALL', label: 'All'},
  {value: 'PENDING', label: 'Pending'},
  {value: 'APPROVED', label: 'Approved'},
  {value: 'REJECTED', label: 'Rejected'},
];

interface StatusFilterTabsProps {
  statusFilter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
}

export function StatusFilterTabs({statusFilter, onFilterChange}: StatusFilterTabsProps) {
  return <Segmented options={OPTIONS} value={statusFilter} onChange={onFilterChange} aria-label="Filter by status"/>;
}
