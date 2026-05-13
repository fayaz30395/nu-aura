'use client';

import React from 'react';
import {AlertCircle, AlertTriangle, CheckCircle, Info} from 'lucide-react';
import {cn} from '@/lib/utils';

/** Semantic tone driving surface, border, icon, and text color. */
export type CalloutTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

/** Props for {@link Callout}. */
export interface CalloutProps {
  tone?: CalloutTone;
  /** Heading rendered above the body. */
  title?: React.ReactNode;
  /** Override the default tone icon. Pass `null` to suppress the icon entirely. */
  icon?: React.ReactNode | null;
  /** Optional trailing action — usually a button or link. */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const toneToSurface: Record<CalloutTone, string> = {
  info: 'bg-accent-50 border-accent-200 dark:bg-accent-950/20 dark:border-accent-800',
  success: 'bg-success-50 border-success-200 dark:bg-success-950/20 dark:border-success-800',
  warning: 'bg-warning-50 border-warning-200 dark:bg-warning-950/20 dark:border-warning-800',
  danger: 'bg-danger-50 border-danger-200 dark:bg-danger-950/20 dark:border-danger-800',
  neutral: 'bg-[var(--surface-2)] border-[var(--border-main)]',
};

const toneToIconColor: Record<CalloutTone, string> = {
  info: 'text-accent-600 dark:text-accent-400',
  success: 'text-success-600 dark:text-success-400',
  warning: 'text-warning-600 dark:text-warning-400',
  danger: 'text-danger-600 dark:text-danger-400',
  neutral: 'text-[var(--text-muted)]',
};

const toneToTextColor: Record<CalloutTone, string> = {
  info: 'text-accent-800 dark:text-accent-200',
  success: 'text-success-800 dark:text-success-200',
  warning: 'text-warning-800 dark:text-warning-200',
  danger: 'text-danger-800 dark:text-danger-200',
  neutral: 'text-[var(--text-primary)]',
};

const toneToDefaultIcon: Record<CalloutTone, React.ReactNode> = {
  info: <Info className="h-4 w-4" aria-hidden />,
  success: <CheckCircle className="h-4 w-4" aria-hidden />,
  warning: <AlertTriangle className="h-4 w-4" aria-hidden />,
  danger: <AlertCircle className="h-4 w-4" aria-hidden />,
  neutral: <Info className="h-4 w-4" aria-hidden />,
};

/**
 * Inline notification surface. Replaces the banned side-stripe `border-l-4 border-<tone>`
 * pattern with a full subtle border + tinted background.
 *
 * Use for: form errors that need explanation, page-level success/warning notices,
 * quoted replies, contextual help, deprecation notices.
 *
 * Do NOT use for: transient toasts (use `<Toast />`), blocking confirmations
 * (use `<ConfirmDialog />`), or empty-state messaging (use `<EmptyState />`).
 */
export function Callout({
  tone = 'info',
  title,
  icon,
  action,
  children,
  className,
}: CalloutProps) {
  const resolvedIcon = icon === null ? null : icon ?? toneToDefaultIcon[tone];
  const role = tone === 'danger' || tone === 'warning' ? 'alert' : 'status';

  return (
    <div
      role={role}
      className={cn(
        'flex items-start gap-2 rounded-lg border p-4 text-sm',
        toneToSurface[tone],
        toneToTextColor[tone],
        className
      )}
    >
      {resolvedIcon ? (
        <span className={cn('flex-shrink-0 mt-0.5', toneToIconColor[tone])}>{resolvedIcon}</span>
      ) : null}
      <div className="flex-1 min-w-0">
        {title ? <div className="font-semibold mb-0.5">{title}</div> : null}
        <div className="text-sm">{children}</div>
      </div>
      {action ? <div className="flex-shrink-0 ml-2">{action}</div> : null}
    </div>
  );
}

Callout.displayName = 'Callout';
