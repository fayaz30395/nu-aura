'use client';

import {format} from 'date-fns';
import {AlertCircle, Bell, CheckCircle2, ChevronRight, Clock} from 'lucide-react';
import {Reveal} from '@/components/motion';

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
    <Reveal>
      <div className="relative flex w-full flex-col justify-center rounded-aura-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-4 shadow-sh-sm sm:px-6">
        <div>
          <p className="mb-1 text-aura-micro text-[var(--text-3)]">
            {today}
          </p>
          <h1 className="text-aura-title text-[var(--text-1)] sm:text-[clamp(1.5rem,1rem+3vw,2rem)]">
            {greeting}, {firstName}
          </h1>
          {(designation || department) && (
            <p className="mt-1 text-sm font-medium text-[var(--text-2)]">
              {designation}{designation && department ? ' \u00B7 ' : ''}{department}
            </p>
          )}
        </div>
      </div>
    </Reveal>
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
    <Reveal delay={0.1}>
      <div className="rounded-aura-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sh-sm sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--text-1)] tracking-tight">
            Quick Access
          </h2>
          {totalPending > 0 && (
            <span
              className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-[var(--warn-bd)] bg-[var(--warn-bg)] px-1.5 text-xs font-semibold text-[var(--warn-fg)]">
              <span className="num">{totalPending}</span>
            </span>
          )}
        </div>

        <div className="space-y-2">
          {hasNoPending ? (
            <div
              className="flex items-center gap-2 rounded-aura-md bg-[var(--ok-bg)] border border-[var(--ok-bd)] p-4">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[var(--ok-fg)]"/>
              <p className="text-sm font-medium text-[var(--ok-fg)]">
                All caught up. No pending actions.
              </p>
            </div>
          ) : (
            <>
              {pendingApprovals > 0 && (
                <a
                  href="/approvals"
                  className="flex items-center justify-between rounded-aura-md bg-[var(--surface-aura-2)] px-4 py-4 transition-all duration-200 hover:bg-[var(--surface-hover)] hover:shadow-sh-md hover:-translate-y-0.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  aria-label={`${pendingApprovals} pending approvals`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="flex items-center justify-center w-7 h-7 rounded-aura-sm bg-[var(--warn-bg)]">
                      <AlertCircle className="h-3.5 w-3.5 text-[var(--warn-fg)]"/>
                    </div>
                    <span className="text-sm font-medium text-[var(--text-2)]">
                      Pending Approvals
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="num text-xs font-bold text-[var(--text-1)]">
                      {pendingApprovals}
                    </span>
                    <ChevronRight
                      className="h-3.5 w-3.5 text-[var(--text-3)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"/>
                  </div>
                </a>
              )}

              {pendingTimesheets > 0 && (
                <a
                  href="/timesheets"
                  className="flex items-center justify-between rounded-aura-md bg-[var(--surface-aura-2)] px-4 py-4 transition-all duration-200 hover:bg-[var(--surface-hover)] hover:shadow-sh-md hover:-translate-y-0.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  aria-label={`${pendingTimesheets} pending timesheets`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="flex items-center justify-center w-7 h-7 rounded-aura-sm bg-[var(--info-bg)]">
                      <Clock className="h-3.5 w-3.5 text-[var(--info-fg)]"/>
                    </div>
                    <span className="text-sm font-medium text-[var(--text-2)]">
                      Pending Timesheets
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="num text-xs font-bold text-[var(--text-1)]">
                      {pendingTimesheets}
                    </span>
                    <ChevronRight
                      className="h-3.5 w-3.5 text-[var(--text-3)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"/>
                  </div>
                </a>
              )}

              {pendingProfileUpdates > 0 && (
                <a
                  href="/me/profile"
                  className="flex items-center justify-between rounded-aura-md bg-[var(--surface-aura-2)] px-4 py-4 transition-all duration-200 hover:bg-[var(--surface-hover)] hover:shadow-sh-md hover:-translate-y-0.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  aria-label={`${pendingProfileUpdates} profile updates`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="flex items-center justify-center w-7 h-7 rounded-aura-sm bg-[var(--info-bg)]">
                      <AlertCircle className="h-3.5 w-3.5 text-[var(--info-fg)]"/>
                    </div>
                    <span className="text-sm font-medium text-[var(--text-2)]">
                      Profile Updates
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="num text-xs font-bold text-[var(--text-1)]">
                      {pendingProfileUpdates}
                    </span>
                    <ChevronRight
                      className="h-3.5 w-3.5 text-[var(--text-3)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"/>
                  </div>
                </a>
              )}
            </>
          )}

          {/* Inbox row */}
          <a
            href="/inbox"
            className="flex items-center justify-between rounded-aura-md px-4 py-2.5 text-sm transition-all duration-200 hover:bg-[var(--surface-aura-2)] border-t border-[var(--border-soft)] mt-2 pt-4 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            aria-label={inboxCount > 0 ? `${inboxCount} inbox items` : 'Inbox'}
          >
            <div className="flex items-center gap-2">
              <Bell
                className="h-4 w-4 text-[var(--text-3)] group-hover:text-[var(--text-2)] transition-colors"/>
              <span
                className="text-[var(--text-3)] group-hover:text-[var(--text-2)] transition-colors">Inbox</span>
            </div>
            {inboxCount > 0 && (
              <span
                className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[var(--err-bg)] text-xs font-semibold text-[var(--err-fg)] num">
                {inboxCount}
              </span>
            )}
          </a>
        </div>
      </div>
    </Reveal>
  );
}
