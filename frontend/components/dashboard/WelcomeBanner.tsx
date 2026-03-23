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
    <div
      className="relative w-full overflow-hidden rounded-2xl px-7 py-6 flex flex-col justify-center"
      style={{
        background: 'linear-gradient(135deg, #0057FF 0%, #003ECB 40%, #001F6D 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 8px 32px rgba(0, 87, 255, 0.25), 0 2px 8px rgba(0, 0, 0, 0.15)',
      }}
    >
      {/* Mesh gradient orbs for visual depth */}
      <div className="absolute top-[-40%] right-[-10%] w-[300px] h-[300px] rounded-full bg-[rgba(77,138,255,0.25)] blur-[60px] pointer-events-none" />
      <div className="absolute bottom-[-30%] left-[-5%] w-[200px] h-[200px] rounded-full bg-[rgba(0,62,203,0.30)] blur-[50px] pointer-events-none" />
      {/* Subtle noise texture */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'var(--skeuo-noise)' }}
      />

      <div className="relative z-10">
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-blue-200/70 mb-1">
          {today}
        </p>
        <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">
          {greeting}, {firstName}
        </h1>
        {(designation || department) && (
          <p className="mt-1.5 text-sm text-blue-100/60 font-medium">
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
    <div className="skeuo-card rounded-2xl border border-[var(--border-main)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">
          Quick Access
        </h2>
        {totalPending > 0 && (
          <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
            {totalPending}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {hasNoPending ? (
          <div className="flex items-center gap-2.5 rounded-xl bg-[var(--status-success-bg)] border border-[var(--status-success-border)] p-4">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[var(--status-success-text)]" />
            <p className="text-sm font-medium text-[var(--status-success-text)]">
              All caught up — no pending actions
            </p>
          </div>
        ) : (
          <>
            {pendingApprovals > 0 && (
              <a
                href="/approvals"
                className="flex items-center justify-between rounded-xl bg-[var(--bg-surface)] px-4 py-3 transition-all duration-200 hover:bg-[var(--bg-card-hover)] hover:translate-x-0.5 group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-sm font-medium text-[var(--text-secondary)]">
                    Pending Approvals
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--text-primary)] tabular-nums">
                    {pendingApprovals}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                </div>
              </a>
            )}

            {pendingTimesheets > 0 && (
              <a
                href="/timesheets"
                className="flex items-center justify-between rounded-xl bg-[var(--bg-surface)] px-4 py-3 transition-all duration-200 hover:bg-[var(--bg-card-hover)] hover:translate-x-0.5 group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm font-medium text-[var(--text-secondary)]">
                    Pending Timesheets
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--text-primary)] tabular-nums">
                    {pendingTimesheets}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                </div>
              </a>
            )}

            {pendingProfileUpdates > 0 && (
              <a
                href="/profile"
                className="flex items-center justify-between rounded-xl bg-[var(--bg-surface)] px-4 py-3 transition-all duration-200 hover:bg-[var(--bg-card-hover)] hover:translate-x-0.5 group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                    <AlertCircle className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <span className="text-sm font-medium text-[var(--text-secondary)]">
                    Profile Updates
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--text-primary)] tabular-nums">
                    {pendingProfileUpdates}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                </div>
              </a>
            )}
          </>
        )}

        {/* Inbox row */}
        <a
          href="/inbox"
          className="flex items-center justify-between rounded-xl px-4 py-2.5 text-sm transition-all duration-200 hover:bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] mt-2 pt-3 group"
        >
          <div className="flex items-center gap-2.5">
            <Bell className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors" />
            <span className="text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">Inbox</span>
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
