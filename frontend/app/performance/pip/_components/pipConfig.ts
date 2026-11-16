import {z} from 'zod';
import {Ban, CalendarClock, CheckCircle, Clock} from 'lucide-react';
import type {StatusMeta} from '@/lib/status/vocabulary';
import type {PIPStatus} from '@/lib/types/grow/performance';
import {formatDate as canonicalFormatDate} from '@/lib/utils/format/date';

export const createPIPSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  managerId: z.string().min(1, 'Manager is required'),
  reason: z.string().min(1, 'Reason is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  goals: z.string().min(1, 'Goals & Objectives are required'),
  checkInFrequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY']),
}).refine(data => new Date(data.endDate) > new Date(data.startDate), {
  message: 'End date must be after start date',
  path: ['endDate'],
});

export type CreatePIPFormData = z.infer<typeof createPIPSchema>;

export const checkInSchema = z.object({
  progressNotes: z.string().min(1, 'Progress notes are required'),
  managerComments: z.string().min(1, 'Manager comments are required'),
});

export type CheckInFormData = z.infer<typeof checkInSchema>;

export const closePIPSchema = z.object({
  status: z.enum(['COMPLETED', 'EXTENDED', 'TERMINATED']),
  notes: z.string().optional(),
});

export type ClosePIPFormData = z.infer<typeof closePIPSchema>;

export interface PIPFilter {
  departmentId?: string;
  status?: PIPStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export type PIPTab = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export const PIP_TABS: {value: PIPTab; label: string}[] = [
  {value: 'ACTIVE', label: 'Active'},
  {value: 'COMPLETED', label: 'Completed'},
  {value: 'CANCELLED', label: 'Cancelled'},
];

export const TAB_STATUS: Record<PIPTab, PIPStatus | undefined> = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'TERMINATED',
};

export const PIP_STATUS: Record<PIPStatus, StatusMeta> = {
  ACTIVE: {label: 'Active', tone: 'info', icon: Clock},
  COMPLETED: {label: 'Completed', tone: 'success', icon: CheckCircle},
  EXTENDED: {label: 'Extended', tone: 'warning', icon: CalendarClock},
  TERMINATED: {label: 'Terminated', tone: 'danger', icon: Ban},
};

export const PIP_REASON_OPTIONS = [
  {value: '', label: 'Select a reason'},
  ...['Performance', 'Behavior', 'Attendance', 'Quality', 'Communication', 'Teamwork', 'Other']
    .map(reason => ({value: reason, label: reason})),
];

export const CHECK_IN_FREQUENCY_OPTIONS = [
  {value: 'WEEKLY', label: 'Weekly'},
  {value: 'BIWEEKLY', label: 'Bi-weekly'},
  {value: 'MONTHLY', label: 'Monthly'},
];

export const CLOSE_STATUS_OPTIONS = [
  {value: 'COMPLETED', label: 'Mark Complete'},
  {value: 'EXTENDED', label: 'Extend PIP'},
  {value: 'TERMINATED', label: 'Terminate'},
];

export const DURATION_PRESETS = [
  {label: '30 Days', days: 30},
  {label: '60 Days', days: 60},
  {label: '90 Days', days: 90},
];

const DAY_MS = 1000 * 60 * 60 * 24;

export function calculateDaysRemaining(endDate: string): number {
  const diff = Math.ceil((new Date(endDate).getTime() - new Date().getTime()) / DAY_MS);
  return Math.max(0, diff);
}

export function calculateProgress(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const total = end.getTime() - start.getTime();
  const elapsed = new Date().getTime() - start.getTime();
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

export function averageDurationDays(pips: {startDate: string; endDate: string}[]): number {
  if (pips.length === 0) return 0;
  const totalDays = pips.reduce(
    (sum, p) => sum + (new Date(p.endDate).getTime() - new Date(p.startDate).getTime()) / DAY_MS,
    0,
  );
  return Math.round(totalDays / pips.length);
}

export function formatPipDate(dateStr: string): string {
  try {
    return canonicalFormatDate(dateStr);
  } catch {
    return dateStr;
  }
}
