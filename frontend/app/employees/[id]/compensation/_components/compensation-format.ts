import {format} from 'date-fns';
import {Award, Briefcase, DollarSign} from 'lucide-react';
import {RevisionType} from '@/lib/types/hrms/compensation';

export function formatCurrency(amount: number | undefined | null, currency = 'USD'): string {
  if (amount == null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | undefined | null): string {
  if (!date) return '-';
  return format(new Date(date), 'MMMM d, yyyy');
}

export function formatPercentage(value: number | undefined | null): string {
  if (value == null) return '-';
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

const REVISION_TYPE_LABELS: Record<RevisionType, string> = {
  [RevisionType.ANNUAL_INCREMENT]: 'Annual Increment',
  [RevisionType.PROMOTION]: 'Promotion',
  [RevisionType.ROLE_CHANGE]: 'Role Change',
  [RevisionType.MARKET_ADJUSTMENT]: 'Market Adjustment',
  [RevisionType.PERFORMANCE_BONUS]: 'Performance Bonus',
  [RevisionType.SPECIAL_INCREMENT]: 'Special Increment',
  [RevisionType.PROBATION_CONFIRMATION]: 'Probation Confirmation',
  [RevisionType.RETENTION]: 'Retention',
  [RevisionType.CORRECTION]: 'Correction',
};

export function formatRevisionType(type: RevisionType): string {
  return REVISION_TYPE_LABELS[type] ?? type;
}

export function getRevisionIcon(type: RevisionType) {
  switch (type) {
    case RevisionType.PROMOTION:
      return Award;
    case RevisionType.ROLE_CHANGE:
      return Briefcase;
    default:
      return DollarSign;
  }
}
