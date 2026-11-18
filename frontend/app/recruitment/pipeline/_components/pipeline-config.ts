import {ApplicationSource, ApplicationStatus} from '@/lib/types/hire/applicant';
import type {PipelineData} from '@/lib/types/hire/applicant';
import type {StatusTone} from '@/lib/status/vocabulary';

export const PIPELINE_STAGES: ApplicationStatus[] = [
  ApplicationStatus.APPLIED,
  ApplicationStatus.SCREENING,
  ApplicationStatus.PHONE_SCREEN,
  ApplicationStatus.INTERVIEW,
  ApplicationStatus.TECHNICAL_ROUND,
  ApplicationStatus.HR_ROUND,
  ApplicationStatus.OFFER_PENDING,
  ApplicationStatus.OFFERED,
  ApplicationStatus.ACCEPTED,
  ApplicationStatus.REJECTED,
];

export const STAGE_LABELS: Record<ApplicationStatus, string> = {
  [ApplicationStatus.APPLIED]: 'Applied',
  [ApplicationStatus.SCREENING]: 'Screening',
  [ApplicationStatus.PHONE_SCREEN]: 'Phone Screen',
  [ApplicationStatus.INTERVIEW]: 'Interview',
  [ApplicationStatus.TECHNICAL_ROUND]: 'Technical',
  [ApplicationStatus.HR_ROUND]: 'HR Round',
  [ApplicationStatus.OFFER_PENDING]: 'Offer Pending',
  [ApplicationStatus.OFFERED]: 'Offered',
  [ApplicationStatus.ACCEPTED]: 'Accepted',
  [ApplicationStatus.REJECTED]: 'Rejected',
  [ApplicationStatus.WITHDRAWN]: 'Withdrawn',
};

export const STAGE_TONE: Record<ApplicationStatus, StatusTone> = {
  [ApplicationStatus.APPLIED]: 'info',
  [ApplicationStatus.SCREENING]: 'info',
  [ApplicationStatus.PHONE_SCREEN]: 'info',
  [ApplicationStatus.INTERVIEW]: 'info',
  [ApplicationStatus.TECHNICAL_ROUND]: 'info',
  [ApplicationStatus.HR_ROUND]: 'info',
  [ApplicationStatus.OFFER_PENDING]: 'warning',
  [ApplicationStatus.OFFERED]: 'success',
  [ApplicationStatus.ACCEPTED]: 'success',
  [ApplicationStatus.REJECTED]: 'danger',
  [ApplicationStatus.WITHDRAWN]: 'neutral',
};

/** Top-border accent per tone for kanban columns. */
export const TONE_BORDER: Record<StatusTone, string> = {
  info: 'border-t-accent-500',
  warning: 'border-t-warning-500',
  success: 'border-t-success-500',
  danger: 'border-t-danger-500',
  neutral: 'border-t-border',
};

/** Funnel bar fill per tone. */
export const TONE_FILL: Record<StatusTone, string> = {
  info: 'bg-accent-200 dark:bg-accent-800',
  warning: 'bg-warning-200 dark:bg-warning-800',
  success: 'bg-success-200 dark:bg-success-800',
  danger: 'bg-danger-200 dark:bg-danger-800',
  neutral: 'bg-surface-aura-sunken',
};

export const SOURCE_TONE: Record<ApplicationSource, StatusTone> = {
  [ApplicationSource.WEBSITE]: 'info',
  [ApplicationSource.REFERRAL]: 'success',
  [ApplicationSource.JOB_BOARD]: 'info',
  [ApplicationSource.LINKEDIN]: 'info',
  [ApplicationSource.CAMPUS]: 'info',
  [ApplicationSource.AGENCY]: 'warning',
  [ApplicationSource.OTHER]: 'neutral',
};

/** All valid transition targets from each stage. */
export const STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  [ApplicationStatus.APPLIED]: [ApplicationStatus.SCREENING, ApplicationStatus.INTERVIEW, ApplicationStatus.REJECTED],
  [ApplicationStatus.SCREENING]: [ApplicationStatus.PHONE_SCREEN, ApplicationStatus.INTERVIEW, ApplicationStatus.TECHNICAL_ROUND, ApplicationStatus.REJECTED],
  [ApplicationStatus.PHONE_SCREEN]: [ApplicationStatus.INTERVIEW, ApplicationStatus.TECHNICAL_ROUND, ApplicationStatus.HR_ROUND, ApplicationStatus.REJECTED],
  [ApplicationStatus.INTERVIEW]: [ApplicationStatus.TECHNICAL_ROUND, ApplicationStatus.HR_ROUND, ApplicationStatus.OFFER_PENDING, ApplicationStatus.OFFERED, ApplicationStatus.REJECTED],
  [ApplicationStatus.TECHNICAL_ROUND]: [ApplicationStatus.HR_ROUND, ApplicationStatus.OFFER_PENDING, ApplicationStatus.OFFERED, ApplicationStatus.REJECTED],
  [ApplicationStatus.HR_ROUND]: [ApplicationStatus.OFFER_PENDING, ApplicationStatus.OFFERED, ApplicationStatus.REJECTED],
  [ApplicationStatus.OFFER_PENDING]: [ApplicationStatus.OFFERED, ApplicationStatus.REJECTED],
  [ApplicationStatus.OFFERED]: [ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED],
  [ApplicationStatus.ACCEPTED]: [],
  [ApplicationStatus.REJECTED]: [],
  [ApplicationStatus.WITHDRAWN]: [],
};

export const nextForwardStage = (status: ApplicationStatus) =>
  (STATUS_TRANSITIONS[status] || []).find((s) => s !== ApplicationStatus.REJECTED);

export const EMPTY_PIPELINE: PipelineData = Object.values(ApplicationStatus).reduce<PipelineData>(
  (acc, s) => ({...acc, [s]: []} as PipelineData),
  {} as PipelineData,
);

export const formatLabel = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

export const getDaysSince = (dateStr?: string | null): number | null => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  // Clamp: server clock/date-only values can be slightly ahead of the browser.
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)));
};

export const getTimeInStage = (dateStr?: string | null): string => {
  const days = getDaysSince(dateStr);
  if (days === null) return '—';
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? '1 week' : `${weeks} weeks`;
};

export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const r = (error as {response?: {data?: {message?: string}}}).response;
    return r?.data?.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
};
