import type {ExpenseCategory} from '@/lib/types/hrms/expense';

export type ClaimsTab = 'my-claims' | 'pending' | 'all' | 'analytics';

export interface ClaimFilters {
  category: ExpenseCategory | 'ALL';
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
  search: string;
}

export const FILTER_CATEGORY_OPTIONS: {value: ExpenseCategory | 'ALL'; label: string}[] = [
  {value: 'ALL', label: 'All categories'},
  {value: 'TRAVEL', label: 'Travel'},
  {value: 'ACCOMMODATION', label: 'Accommodation'},
  {value: 'MEALS', label: 'Meals'},
  {value: 'TRANSPORT', label: 'Transportation'},
  {value: 'OFFICE_SUPPLIES', label: 'Office Supplies'},
  {value: 'EQUIPMENT', label: 'Equipment'},
  {value: 'TRAINING', label: 'Training'},
  {value: 'OTHER', label: 'Other'},
];

export const CLAIM_CATEGORY_OPTIONS: {value: ExpenseCategory; label: string}[] = [
  {value: 'TRAVEL', label: 'Travel'},
  {value: 'ACCOMMODATION', label: 'Accommodation'},
  {value: 'MEALS', label: 'Meals'},
  {value: 'TRANSPORT', label: 'Transportation'},
  {value: 'OFFICE_SUPPLIES', label: 'Office Supplies'},
  {value: 'EQUIPMENT', label: 'Equipment'},
  {value: 'TRAINING', label: 'Training'},
  {value: 'COMMUNICATION', label: 'Communication'},
  {value: 'ENTERTAINMENT', label: 'Entertainment'},
  {value: 'MEDICAL', label: 'Medical'},
  {value: 'OTHER', label: 'Other'},
];

export const CLAIM_CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'INR'] as const;

/** Per-claim amount above which a claim is flagged as over policy on the summary. */
export const OVER_POLICY_THRESHOLD = 50000;
