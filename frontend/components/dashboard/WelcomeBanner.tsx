'use client';

import { format } from 'date-fns';
import { Bell, CheckCircle2, AlertCircle, Clock, ChevronRight } from 'lucide-react';

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

export function WelcomeBanner({
  employeeName,
  designation,
  department,
}: WelcomeBannerProps) {
  const firstName = employeeName.split(' ')[0];
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

  return (
    <div className="relative w-full h-full overflow-hidden rounded-xl bg-gradient-to-r from-primary-600 via-primary-500 to-primary-700 px-6 py-5 dark:from-primary-700 dark:via-primary-600 dark:to-primary-800 flex flex-col justify-center">
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(255,255,255,0.06),transparent_60%)]" />

      <div className="relative z-10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {today}
            {designation && <span className="text-slate-500"> · {designation}</span>}
            {department && <span className="text-slate-500"> · {department}</span>}
          </p>
        </div>
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
    <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Quick Access
        </h2>
        {totalPending > 0 && (
          <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-amber-100 text-xs font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
            {totalPending}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {hasNoPending ? (
          <div className="flex items-center gap-2.5 rounded-lg bg-[var(--bg-surface)] p-4">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-500" />
            <p className="text-sm text-[var(--text-muted)]">
              No pending actions
            </p>
          </div>
        ) : (
          <>
            {pendingApprovals > 0 && (
              <a
                href="/approvals"
                className="flex items-center justify-between rounded-lg bg-[var(--bg-surface)] px-3 py-2.5 transition-colors hover:bg-[var(--bg-surface)] dark:hover:bg-gray-800 group"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-[var(--text-secondary)]">
                    Pending Approvals
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    {pendingApprovals}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </a>
            )}

            {pendingTimesheets > 0 && (
              <a
                href="/timesheets"
                className="flex items-center justify-between rounded-lg bg-[var(--bg-surface)] px-3 py-2.5 transition-colors hover:bg-[var(--bg-surface)] dark:hover:bg-gray-800 group"
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-[var(--text-secondary)]">
                    Pending Timesheets
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    {pendingTimesheets}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </a>
            )}

            {pendingProfileUpdates > 0 && (
              <a
                href="/profile"
                className="flex items-center justify-between rounded-lg bg-[var(--bg-surface)] px-3 py-2.5 transition-colors hover:bg-[var(--bg-surface)] dark:hover:bg-gray-800 group"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-purple-500" />
                  <span className="text-sm text-[var(--text-secondary)]">
                    Profile Updates
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    {pendingProfileUpdates}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </a>
            )}
          </>
        )}

        {/* Inbox row */}
        <a
          href="/inbox"
          className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-surface)] dark:hover:bg-gray-900 border-t border-[var(--border-subtle)] mt-1.5 pt-2.5"
        >
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[var(--text-muted)]" />
            <span className="text-[var(--text-muted)]">Inbox</span>
          </div>
          {inboxCount > 0 && (
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-xs font-semibold text-white">
              {inboxCount}
            </span>
          )}
        </a>
      </div>
    </div>
  );
}
