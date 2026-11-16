import type {CycleStatus, CycleType} from '@/lib/types/grow/performance';

export const CYCLE_TYPE_OPTIONS: {value: CycleType; label: string}[] = [
  {value: 'ANNUAL', label: 'Annual'},
  {value: 'SEMI_ANNUAL', label: 'Semi-Annual'},
  {value: 'QUARTERLY', label: 'Quarterly'},
  {value: 'MONTHLY', label: 'Monthly'},
  {value: 'PROBATION', label: 'Probation'},
  {value: 'PROJECT_END', label: 'Project End'},
];

export const CYCLE_STATUS_OPTIONS: {value: CycleStatus; label: string}[] = [
  {value: 'PLANNING', label: 'Planning'},
  {value: 'ACTIVE', label: 'Active'},
  {value: 'IN_PROGRESS', label: 'In Progress'},
  {value: 'COMPLETED', label: 'Completed'},
  {value: 'CANCELLED', label: 'Cancelled'},
];

export const CYCLE_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  CYCLE_TYPE_OPTIONS.map(({value, label}) => [value, label]),
);
