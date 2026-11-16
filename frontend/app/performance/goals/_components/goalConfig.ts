import type {DefaultValues} from 'react-hook-form';
import {z} from 'zod';
import {CheckCircle2, FileEdit, PauseCircle, Play, TrendingUp, XCircle} from 'lucide-react';
import type {StatusMeta} from '@/lib/status/vocabulary';
import type {Goal, GoalStatus, GoalType} from '@/lib/types/grow/performance';

export const goalFormSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional().or(z.literal('')),
  goalType: z.enum(['OKR', 'KPI', 'PERSONAL', 'TEAM', 'DEPARTMENT', 'ORGANIZATION'] as const) as z.ZodType<GoalType>,
  targetValue: z.coerce.number().min(0, 'Target value must be >= 0'),
  currentValue: z.coerce.number().min(0, 'Current value must be >= 0'),
  unit: z.string().min(1, 'Unit is required'),
  status: z.enum(['DRAFT', 'ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD'] as const) as z.ZodType<GoalStatus>,
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
}).refine(data => new Date(data.endDate) > new Date(data.startDate), {
  message: 'End date must be after start date',
  path: ['endDate'],
});

export type GoalFormData = z.infer<typeof goalFormSchema>;

export function emptyGoalForm(employeeId: string): GoalFormData {
  return {
    employeeId,
    title: '',
    description: '',
    goalType: 'PERSONAL',
    targetValue: 0,
    currentValue: 0,
    unit: '',
    status: 'DRAFT',
    startDate: '',
    endDate: '',
  };
}

export function goalToForm(goal: Goal): DefaultValues<GoalFormData> {
  return {
    employeeId: goal.employeeId,
    title: goal.title,
    description: goal.description || '',
    goalType: goal.goalType,
    targetValue: goal.targetValue,
    currentValue: goal.currentValue,
    unit: goal.unit,
    status: goal.status,
    startDate: goal.startDate,
    endDate: goal.endDate,
  };
}

export const GOAL_TYPE_OPTIONS: {value: GoalType; label: string}[] = [
  {value: 'OKR', label: 'OKR'},
  {value: 'KPI', label: 'KPI'},
  {value: 'PERSONAL', label: 'Personal'},
  {value: 'TEAM', label: 'Team'},
  {value: 'DEPARTMENT', label: 'Department'},
  {value: 'ORGANIZATION', label: 'Organization'},
];

export const GOAL_STATUS_OPTIONS: {value: GoalStatus; label: string}[] = [
  {value: 'DRAFT', label: 'Draft'},
  {value: 'ACTIVE', label: 'Active'},
  {value: 'IN_PROGRESS', label: 'In Progress'},
  {value: 'COMPLETED', label: 'Completed'},
  {value: 'CANCELLED', label: 'Cancelled'},
  {value: 'ON_HOLD', label: 'On Hold'},
];

export const TYPE_FILTER_OPTIONS = [{value: 'ALL', label: 'All Types'}, ...GOAL_TYPE_OPTIONS];
export const STATUS_FILTER_OPTIONS = [{value: 'ALL', label: 'All Status'}, ...GOAL_STATUS_OPTIONS];

export const GOAL_STATUS_META: Record<GoalStatus, StatusMeta> = {
  DRAFT: {label: 'Draft', tone: 'neutral', icon: FileEdit},
  ACTIVE: {label: 'Active', tone: 'info', icon: Play},
  IN_PROGRESS: {label: 'In Progress', tone: 'warning', icon: TrendingUp},
  COMPLETED: {label: 'Completed', tone: 'success', icon: CheckCircle2},
  CANCELLED: {label: 'Cancelled', tone: 'danger', icon: XCircle},
  ON_HOLD: {label: 'On Hold', tone: 'warning', icon: PauseCircle},
};

export function calculateGoalProgress(current?: number, target?: number): number {
  if (!target || target === 0) return 0;
  return Math.min(Math.round(((current || 0) / target) * 100), 100);
}
