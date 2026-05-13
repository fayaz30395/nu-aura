/**
 * Single source of truth for status vocabulary across NU-AURA.
 *
 * Every status badge in the product should map through this table:
 * enum value -> {label, tone, icon}. This prevents vocabulary drift
 * (e.g. "Active" vs "Enabled" vs "Live" for the same concept) and
 * ensures every status carries icon + label (not color-only signaling).
 *
 * See `frontend/components/ui/StatusBadge.tsx` for the rendering primitive.
 *
 * Adding a new status:
 *   1. Add the canonical enum value to the appropriate map below
 *   2. Pick a tone (success/warning/danger/info/neutral) per DESIGN.md
 *   3. Pick an icon from lucide-react that conveys the state
 *   4. Keep labels in Title Case for badges, ALL_CAPS only when the
 *      backend enum is itself ALL_CAPS and surfacing it preserves
 *      data-fidelity (rare; avoid)
 */

import type {LucideIcon} from 'lucide-react';
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  BookOpen,
  Calendar,
  CheckCircle,
  ClipboardList,
  Clock,
  HelpCircle,
  Pause,
  Play,
  Send,
  Slash,
  Star,
  Users,
  XCircle,
} from 'lucide-react';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface StatusMeta {
  /** Display label. Title Case unless data fidelity demands otherwise. */
  label: string;
  /** Maps to `.status-*` classes in globals.css. */
  tone: StatusTone;
  /** Lucide icon. Color is inherited from the badge tone. */
  icon: LucideIcon;
}

/* ── Generic / shared semantics ─────────────────────────────────────── */

const PENDING_META: StatusMeta = {label: 'Pending', tone: 'warning', icon: Clock};
const APPROVED_META: StatusMeta = {label: 'Approved', tone: 'success', icon: CheckCircle};
const REJECTED_META: StatusMeta = {label: 'Rejected', tone: 'danger', icon: XCircle};
const CANCELLED_META: StatusMeta = {label: 'Cancelled', tone: 'neutral', icon: Ban};
const DRAFT_META: StatusMeta = {label: 'Draft', tone: 'neutral', icon: AlertCircle};
const SUBMITTED_META: StatusMeta = {label: 'Submitted', tone: 'info', icon: Send};
const COMPLETED_META: StatusMeta = {label: 'Completed', tone: 'success', icon: CheckCircle};
const IN_PROGRESS_META: StatusMeta = {label: 'In Progress', tone: 'info', icon: Clock};
const ACTIVE_META: StatusMeta = {label: 'Active', tone: 'success', icon: CheckCircle};
const INACTIVE_META: StatusMeta = {label: 'Inactive', tone: 'neutral', icon: Pause};
const EXPIRED_META: StatusMeta = {label: 'Expired', tone: 'danger', icon: AlertTriangle};
const ON_HOLD_META: StatusMeta = {label: 'On Hold', tone: 'warning', icon: Pause};
const UNKNOWN_META: StatusMeta = {label: 'Unknown', tone: 'neutral', icon: HelpCircle};

/* ── Domain maps ────────────────────────────────────────────────────── */

export const LEAVE_STATUS: Record<string, StatusMeta> = {
  PENDING: PENDING_META,
  APPROVED: APPROVED_META,
  REJECTED: REJECTED_META,
  CANCELLED: CANCELLED_META,
};

export const EXPENSE_STATUS: Record<string, StatusMeta> = {
  DRAFT: DRAFT_META,
  SUBMITTED: SUBMITTED_META,
  APPROVED: APPROVED_META,
  REJECTED: REJECTED_META,
  PAID: {label: 'Paid', tone: 'success', icon: CheckCircle},
};

export const TIMESHEET_STATUS: Record<string, StatusMeta> = {
  DRAFT: DRAFT_META,
  SUBMITTED: SUBMITTED_META,
  UNDER_REVIEW: {label: 'Under Review', tone: 'info', icon: Clock},
  APPROVED: APPROVED_META,
  REJECTED: REJECTED_META,
};

export const LETTER_STATUS: Record<string, StatusMeta> = {
  DRAFT: DRAFT_META,
  PENDING_APPROVAL: {label: 'Pending Approval', tone: 'warning', icon: Clock},
  APPROVED: APPROVED_META,
  ISSUED: {label: 'Issued', tone: 'success', icon: CheckCircle},
  REVOKED: {label: 'Revoked', tone: 'danger', icon: Ban},
  EXPIRED: EXPIRED_META,
};

export const JOB_STATUS: Record<string, StatusMeta> = {
  OPEN: {label: 'Open', tone: 'success', icon: CheckCircle},
  DRAFT: DRAFT_META,
  ON_HOLD: ON_HOLD_META,
  CLOSED: {label: 'Closed', tone: 'neutral', icon: Ban},
  CANCELLED: CANCELLED_META,
};

export const TRAVEL_STATUS: Record<string, StatusMeta> = {
  DRAFT: DRAFT_META,
  SUBMITTED: SUBMITTED_META,
  PENDING_APPROVAL: {label: 'Pending Approval', tone: 'warning', icon: Clock},
  APPROVED: APPROVED_META,
  REJECTED: REJECTED_META,
  BOOKED: {label: 'Booked', tone: 'success', icon: CheckCircle},
  IN_PROGRESS: IN_PROGRESS_META,
  COMPLETED: COMPLETED_META,
  CANCELLED: CANCELLED_META,
};

export const CYCLE_STATUS: Record<string, StatusMeta> = {
  PLANNING: {label: 'Planning', tone: 'neutral', icon: Clock},
  DRAFT: DRAFT_META,
  ACTIVE: ACTIVE_META,
  IN_PROGRESS: IN_PROGRESS_META,
  SELF_ASSESSMENT: {label: 'Self Assessment', tone: 'info', icon: Clock},
  MANAGER_REVIEW: {label: 'Manager Review', tone: 'info', icon: Clock},
  CALIBRATION: {label: 'Calibration', tone: 'info', icon: Clock},
  RATINGS_PUBLISHED: {label: 'Ratings Published', tone: 'success', icon: CheckCircle},
  PUBLISHED: {label: 'Published', tone: 'success', icon: CheckCircle},
  COMPLETED: COMPLETED_META,
  CLOSED: {label: 'Closed', tone: 'neutral', icon: Ban},
  CANCELLED: CANCELLED_META,
};

export const REVIEW_STATUS: Record<string, StatusMeta> = {
  NOT_STARTED: {label: 'Not Started', tone: 'neutral', icon: Pause},
  IN_PROGRESS: IN_PROGRESS_META,
  SUBMITTED: SUBMITTED_META,
  IN_REVIEW: {label: 'In Review', tone: 'info', icon: Clock},
  COMPLETED: COMPLETED_META,
  CANCELLED: CANCELLED_META,
};

export const GOAL_STATUS: Record<string, StatusMeta> = {
  DRAFT: DRAFT_META,
  ACTIVE: ACTIVE_META,
  ON_TRACK: {label: 'On Track', tone: 'success', icon: CheckCircle},
  AT_RISK: {label: 'At Risk', tone: 'warning', icon: AlertTriangle},
  BEHIND: {label: 'Behind', tone: 'danger', icon: AlertCircle},
  COMPLETED: COMPLETED_META,
  CANCELLED: CANCELLED_META,
};

export const ATTENDANCE_STATUS: Record<string, StatusMeta> = {
  PRESENT: {label: 'Present', tone: 'success', icon: CheckCircle},
  ABSENT: {label: 'Absent', tone: 'danger', icon: XCircle},
  LATE: {label: 'Late', tone: 'warning', icon: AlertTriangle},
  HALF_DAY: {label: 'Half Day', tone: 'warning', icon: Clock},
  WEEKLY_OFF: {label: 'W-OFF', tone: 'neutral', icon: Pause},
  HOLIDAY: {label: 'Holiday', tone: 'info', icon: Clock},
  ON_LEAVE: {label: 'Leave', tone: 'info', icon: Clock},
  LEAVE: {label: 'Leave', tone: 'info', icon: Clock},
};

export const PUBLICATION_STATUS: Record<string, StatusMeta> = {
  DRAFT: DRAFT_META,
  PUBLISHED: {label: 'Published', tone: 'success', icon: CheckCircle},
  ARCHIVED: {label: 'Archived', tone: 'neutral', icon: Pause},
};

export const LIFECYCLE_STATUS: Record<string, StatusMeta> = {
  ACTIVE: ACTIVE_META,
  INACTIVE: INACTIVE_META,
  EXPIRED: EXPIRED_META,
  ON_HOLD: ON_HOLD_META,
};

export const LEARNING_STATUS: Record<string, StatusMeta> = {
  NOT_STARTED: {label: 'Not Started', tone: 'neutral', icon: Pause},
  ENROLLED: {label: 'Enrolled', tone: 'info', icon: BookOpen},
  IN_PROGRESS: IN_PROGRESS_META,
  COMPLETED: COMPLETED_META,
  DROPPED: {label: 'Dropped', tone: 'neutral', icon: Ban},
};

export const PROJECT_STATUS: Record<string, StatusMeta> = {
  DRAFT: DRAFT_META,
  PLANNING: {label: 'Planning', tone: 'neutral', icon: Clock},
  PLANNED: {label: 'Planned', tone: 'neutral', icon: Clock},
  ACTIVE: ACTIVE_META,
  IN_PROGRESS: IN_PROGRESS_META,
  ON_HOLD: ON_HOLD_META,
  COMPLETED: COMPLETED_META,
  CANCELLED: CANCELLED_META,
};

export const FEEDBACK_360_STATUS: Record<string, StatusMeta> = {
  DRAFT: DRAFT_META,
  IN_PROGRESS: IN_PROGRESS_META,
  SUBMITTED: SUBMITTED_META,
  COMPLETED: COMPLETED_META,
  CANCELLED: CANCELLED_META,
  PRAISE: {label: 'Praise', tone: 'success', icon: CheckCircle},
  CONSTRUCTIVE: {label: 'Constructive', tone: 'warning', icon: AlertCircle},
  GENERAL: {label: 'General', tone: 'info', icon: Send},
  REQUEST: {label: 'Request', tone: 'info', icon: Send},
};

export const AGENCY_STATUS: Record<string, StatusMeta> = {
  ACTIVE: ACTIVE_META,
  INACTIVE: INACTIVE_META,
  SUSPENDED: {label: 'Suspended', tone: 'warning', icon: Pause},
  BLACKLISTED: {label: 'Blacklisted', tone: 'danger', icon: Slash},
  PENDING_APPROVAL: {label: 'Pending Approval', tone: 'warning', icon: Clock},
};

export const TRAINING_STATUS: Record<string, StatusMeta> = {
  DRAFT: DRAFT_META,
  SCHEDULED: {label: 'Scheduled', tone: 'info', icon: Calendar},
  IN_PROGRESS: IN_PROGRESS_META,
  COMPLETED: COMPLETED_META,
  CANCELLED: CANCELLED_META,
};

export const SURVEY_STATUS: Record<string, StatusMeta> = {
  DRAFT: DRAFT_META,
  SCHEDULED: {label: 'Scheduled', tone: 'info', icon: Calendar},
  ACTIVE: {label: 'Active', tone: 'success', icon: Play},
  PAUSED: {label: 'Paused', tone: 'warning', icon: Pause},
  COMPLETED: COMPLETED_META,
  CLOSED: {label: 'Closed', tone: 'neutral', icon: Ban},
  ARCHIVED: {label: 'Archived', tone: 'neutral', icon: Pause},
};

export const SURVEY_TYPE: Record<string, StatusMeta> = {
  ENGAGEMENT: {label: 'Engagement', tone: 'info', icon: ClipboardList},
  SATISFACTION: {label: 'Satisfaction', tone: 'info', icon: ClipboardList},
  PULSE: {label: 'Pulse', tone: 'info', icon: ClipboardList},
  EXIT: {label: 'Exit', tone: 'neutral', icon: ClipboardList},
  FEEDBACK: {label: 'Feedback', tone: 'info', icon: ClipboardList},
  CUSTOM: {label: 'Custom', tone: 'neutral', icon: ClipboardList},
};

export const WELLNESS_FLAG: Record<string, StatusMeta> = {
  FEATURED: {label: 'Featured', tone: 'warning', icon: Star},
  JOINED: {label: 'Joined', tone: 'success', icon: CheckCircle},
  OPEN: {label: 'Open', tone: 'info', icon: Send},
  ACTIVE: ACTIVE_META,
  INACTIVE: INACTIVE_META,
  TEAM: {label: 'Team', tone: 'info', icon: Users},
};

/* ── Resolver ───────────────────────────────────────────────────────── */

/**
 * Resolve a status value to its canonical meta. Falls back to a neutral
 * "Unknown" badge if the value isn't in the supplied domain map — this
 * keeps badges from silently rendering without color (the bug we fixed
 * in attendance/my-attendance).
 */
export function resolveStatus(
  value: string | null | undefined,
  domain: Record<string, StatusMeta>
): StatusMeta {
  if (!value) return UNKNOWN_META;
  return domain[value] ?? {...UNKNOWN_META, label: titleCase(value)};
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
