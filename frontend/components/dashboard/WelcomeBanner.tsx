'use client';

import {format} from 'date-fns';
import {AlertCircle, Bell, CheckCircle2, ChevronRight, Clock} from 'lucide-react';

interface WelcomeBannerProps {
  employeeName: string;
  designation?: string;
  department?: string;
}

interface QuickAccessWidgetProps {
  pendingApprovals: number;
  pendingTimesheets: number;
  pendingProfileUpdates: number;
  inboxCount?: number;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function WelcomeBanner({
                                employeeName,
                                designation,
                                department,
                              }: WelcomeBannerProps) {
  const firstName = employeeName.split(' ')[0];
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');
  const greeting = getGreeting();

  return (
    <div className="relative flex w-full flex-col justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-4 shadow-[var(--shadow-card)] sm:px-6">
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          {today}
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--text-heading)] sm:text-2xl">
          {greeting}, {firstName}
        </h1>
        {(designation || department) && (
          <p className="mt-1 text-sm font-medium text-[var(--text-secondary)]">
            {designation}{designation && department ? ' \u00B7 ' : ''}{department}
          </p>
        )}
      </div>
    </div>
  );
}

export function QuickAccessWidget({
                                    pendingApprovals,
                                    pendingTimesheets,
                                    pendingProfileUpdates,
                                    inboxCount = 0,
                                  }: QuickAccessWidgetProps) {
  const totalPending = pendingApprovals + pendingTimesheets + pendingProfileUpdates;
  const hasNoPending = totalPending === 0;

  return (
    <div className="card-aura rounded-xl border border-[var(--border-main)] p-4 sm:p-5">
      <div className="row-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">
          Quick Access
        </h2>
        {totalPending > 0 && (
          <span
            className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-warning-200 bg-warning-50 px-1.5 text-xs font-semibold text-warning-700 dark:border-warning-800/50 dark:bg-warning-900/30 dark:text-warning-300">
            {totalPending}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {hasNoPending ? (
          <div
            className="flex items-center gap-2 rounded-xl bg-[var(--status-success-bg)] border border-[var(--status-success-border)] p-4">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[var(--status-success-text)]"/>
            <p className="text-sm font-medium text-[var(--status-success-text)]">
              All caught up. No pending actions.
            </p>
          </div>
        ) : (
          <>
            {pendingApprovals > 0 && (
              <a
                href="/approvals"
                className="row-between rounded-xl bg-[var(--bg-surface)] px-4 py-4 transition-all duration-200 hover:bg-[var(--bg-card-hover)] hover:translate-x-0.5 group"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="flex items-center justify-center w-7 h-7 rounded-lg bg-warning-100 dark:bg-warning-900/30">
                    <AlertCircle className="h-3.5 w-3.5 text-warning-600 dark:text-warning-400"/>
                  </div>
                  <span className="text-sm font-medium text-[var(--text-secondary)]">
                    Pending Approvals
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--text-primary)] tabular-nums">
                    {pendingApprovals}
                  </span>
                  <ChevronRight
                    className="h-3.5 w-3.5 text-[var(--text-muted)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"/>
                </div>
              </a>
            )}

            {pendingTimesheets > 0 && (
              <a
                href="/timesheets"
                className="row-between rounded-xl bg-[var(--bg-surface)] px-4 py-4 transition-all duration-200 hover:bg-[var(--bg-card-hover)] hover:translate-x-0.5 group"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent-100 dark:bg-accent-900/30">
                    <Clock className="h-3.5 w-3.5 text-accent-600 dark:text-accent-400"/>
                  </div>
                  <span className="text-sm font-medium text-[var(--text-secondary)]">
                    Pending Timesheets
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--text-primary)] tabular-nums">
                    {pendingTimesheets}
                  </span>
                  <ChevronRight
                    className="h-3.5 w-3.5 text-[var(--text-muted)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"/>
                </div>
              </a>
            )}

            {pendingProfileUpdates > 0 && (
              <a
                href="/profile"
                className="row-between rounded-xl bg-[var(--bg-surface)] px-4 py-4 transition-all duration-200 hover:bg-[var(--bg-card-hover)] hover:translate-x-0.5 group"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent-100 dark:bg-accent-900/30">
                    <AlertCircle className="h-3.5 w-3.5 text-accent-600 dark:text-accent-400"/>
                  </div>
                  <span className="text-sm font-medium text-[var(--text-secondary)]">
                    Profile Updates
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--text-primary)] tabular-nums">
                    {pendingProfileUpdates}
                  </span>
                  <ChevronRight
                    className="h-3.5 w-3.5 text-[var(--text-muted)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"/>
                </div>
              </a>
            )}
          </>
        )}

        {/* Inbox row */}
        <a
          href="/inbox"
          className="row-between rounded-xl px-4 py-2.5 text-sm transition-all duration-200 hover:bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] mt-2 pt-4 group"
        >
          <div className="flex items-center gap-2">
            <Bell
              className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors"/>
            <span
              className="text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">Inbox</span>
          </div>
          {inboxCount > 0 && (
            <span
              className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-danger-500 text-xs font-semibold text-white">
              {inboxCount}
            </span>
          )}
        </a>
      </div>
    </div>
  );
}
