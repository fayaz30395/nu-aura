import {z} from 'zod';
import type {BadgeProps} from '@/components/ui/Badge';
import {
  AlertTriangle,
  Building2,
  CheckCircle,
  Circle,
  Clock,
  FileEdit,
  Flag,
  Play,
  User,
  Users,
  XCircle,
} from 'lucide-react';
import {getLocalDateString} from '@/lib/utils/dateUtils';

export const OBJECTIVE_LEVELS = ['COMPANY', 'DEPARTMENT', 'TEAM', 'INDIVIDUAL'] as const;
export const OBJECTIVE_STATUSES = ['DRAFT', 'ACTIVE', 'ON_TRACK', 'AT_RISK', 'BEHIND', 'COMPLETED', 'CANCELLED'] as const;
export const MEASUREMENT_TYPES = ['PERCENTAGE', 'NUMBER', 'CURRENCY', 'BINARY', 'MILESTONE'] as const;

export const humanize = (value: string) => value.replace('_', ' ');

export const objectiveFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().or(z.literal('')),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  objectiveLevel: z.string().min(1),
  weight: z.number().min(0).max(10),
  isStretchGoal: z.boolean(),
});

export type ObjectiveFormData = z.infer<typeof objectiveFormSchema>;

export const keyResultFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().or(z.literal('')),
  measurementType: z.string().min(1),
  startValue: z.number(),
  targetValue: z.number().min(0.01, 'Target value must be greater than 0'),
  measurementUnit: z.string().optional().or(z.literal('')),
  weight: z.number().min(0).max(10),
  dueDate: z.string().optional().or(z.literal('')),
});

export type KeyResultFormData = z.infer<typeof keyResultFormSchema>;

export const emptyObjectiveForm = (): ObjectiveFormData => ({
  title: '',
  description: '',
  startDate: getLocalDateString(new Date()),
  endDate: getLocalDateString(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
  objectiveLevel: 'INDIVIDUAL',
  weight: 1,
  isStretchGoal: false,
});

export const EMPTY_KEY_RESULT_FORM: KeyResultFormData = {
  title: '',
  description: '',
  measurementType: 'PERCENTAGE',
  startValue: 0,
  targetValue: 100,
  measurementUnit: '%',
  weight: 1,
  dueDate: '',
};

export function LevelIcon({level}: { level: string }) {
  switch (level) {
    case 'COMPANY':
    case 'DEPARTMENT':
      return <Building2 className="h-5 w-5" aria-hidden/>;
    case 'TEAM':
      return <Users className="h-5 w-5" aria-hidden/>;
    case 'INDIVIDUAL':
      return <User className="h-5 w-5" aria-hidden/>;
    default:
      return <Flag className="h-5 w-5" aria-hidden/>;
  }
}

type BadgeVariant = NonNullable<BadgeProps['variant']>;

export const getStatusVariant = (status: string): BadgeVariant => {
  switch (status) {
    case 'ACTIVE':
      return 'info';
    case 'ON_TRACK':
    case 'COMPLETED':
      return 'success';
    case 'AT_RISK':
      return 'warning';
    case 'BEHIND':
      return 'danger';
    default:
      return 'default';
  }
};

export function StatusIcon({status}: { status: string }) {
  const cls = 'h-3.5 w-3.5';
  switch (status) {
    case 'DRAFT':
      return <FileEdit className={cls} aria-hidden/>;
    case 'ACTIVE':
      return <Play className={cls} aria-hidden/>;
    case 'ON_TRACK':
    case 'COMPLETED':
      return <CheckCircle className={cls} aria-hidden/>;
    case 'AT_RISK':
    case 'BEHIND':
      return <AlertTriangle className={cls} aria-hidden/>;
    case 'CANCELLED':
      return <XCircle className={cls} aria-hidden/>;
    default:
      return <Circle className={cls} aria-hidden/>;
  }
}

// Neutral-by-default fill; status colour only for at-risk / behind items.
export const getProgressColor = (status: string) => {
  if (status === 'BEHIND') return 'bg-danger-500';
  if (status === 'AT_RISK') return 'bg-warning-500';
  return 'bg-accent-500';
};

export function KeyResultStatusIcon({status}: { status: string }) {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle className="h-4 w-4 text-success-500" aria-hidden/>;
    case 'ON_TRACK':
      return <CheckCircle className="h-4 w-4 text-accent-500" aria-hidden/>;
    case 'AT_RISK':
      return <AlertTriangle className="h-4 w-4 text-warning-500" aria-hidden/>;
    case 'BEHIND':
      return <AlertTriangle className="h-4 w-4 text-danger-500" aria-hidden/>;
    default:
      return <Clock className="h-4 w-4 text-text-3" aria-hidden/>;
  }
}
