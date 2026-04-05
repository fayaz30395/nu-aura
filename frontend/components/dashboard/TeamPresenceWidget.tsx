'use client';

import {CheckCircle2, Laptop} from 'lucide-react';
import {useEmployeesOnLeaveToday, useRemoteWorkersToday} from '@/lib/hooks/queries/useHome';
import {OnLeaveEmployeeResponse, RemoteWorkerResponse} from '@/lib/services/core/home.service';

interface EmployeePresence {
  employeeId: string;
  employeeName: string;
  initials: string;
  avatarColor: string;
}

function getInitials(name: string): string {
  return name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);
}

function mapLeaveToPresence(emp: OnLeaveEmployeeResponse): EmployeePresence {
  const initials = getInitials(emp.employeeName);
  return {
    employeeId: emp.employeeId,
    employeeName: emp.employeeName,
    initials,
    avatarColor: 'bg-[var(--text-muted)]',
  };
}

function mapRemoteToPresence(emp: RemoteWorkerResponse): EmployeePresence {
  const initials = getInitials(emp.employeeName);
  return {
    employeeId: emp.employeeId,
    employeeName: emp.employeeName,
    initials,
    avatarColor: 'bg-[var(--text-muted)]',
  };
}

function Avatar({name, size = 'md'}: { name: string; size?: 'sm' | 'md' }) {
  const initials = getInitials(name);
  const sizeClasses = size === 'sm' ? 'h-7 w-7 text-2xs' : 'h-9 w-9 text-xs';
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-accent-100 dark:bg-accent-900/30 font-semibold text-accent-700 dark:text-accent-400 ${sizeClasses}`}
      title={name}
    >
      {initials}
    </div>
  );
}

function SkeletonChips() {
  return (
    <div className="flex flex-wrap gap-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-1.5 rounded-lg bg-[var(--bg-surface)] px-2 py-1.5">
          <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--bg-surface)]"/>
          <div className="h-3 w-12 animate-pulse rounded bg-[var(--bg-surface)]"/>
        </div>
      ))}
    </div>
  );
}

/* ─── On Leave Today Card ────────────────────────────────────────────────── */

export function OnLeaveTodayCard() {
  const {data: apiOnLeave, isLoading} = useEmployeesOnLeaveToday(true);
  const onLeaveEmployees: EmployeePresence[] = Array.isArray(apiOnLeave) ? apiOnLeave.map(mapLeaveToPresence) : [];

  return (
    <div className="skeuo-card rounded-lg border border-[var(--border-main)] p-4">
      <h3 className="skeuo-emboss text-sm font-semibold text-[var(--text-primary)] mb-4">
        On Leave Today
      </h3>

      {isLoading ? (
        <SkeletonChips/>
      ) : onLeaveEmployees.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg bg-[var(--bg-surface)] px-4 py-2.5">
          <CheckCircle2 className="h-4 w-4 text-success-500"/>
          <p className="text-caption">Everyone is working today!</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {onLeaveEmployees.slice(0, 6).map((e) => (
            <div key={e.employeeId} className="flex flex-col items-center gap-1 min-w-[48px]">
              <Avatar name={e.employeeName}/>
              <span className="text-2xs text-[var(--text-muted)] max-w-[56px] truncate text-center">
                {e.employeeName.split(' ')[0]}
              </span>
            </div>
          ))}
          {onLeaveEmployees.length > 6 && (
            <div className="flex flex-col items-center gap-1 min-w-[48px]">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-surface)] text-xs font-semibold text-[var(--text-muted)]">
                +{onLeaveEmployees.length - 6}
              </div>
              <span className="text-2xs text-[var(--text-muted)]">more</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Working Remotely Card ──────────────────────────────────────────────── */

export function WorkingRemotelyCard() {
  const {data: apiRemote, isLoading} = useRemoteWorkersToday(true);
  const remoteWorkers: EmployeePresence[] = Array.isArray(apiRemote) ? apiRemote.map(mapRemoteToPresence) : [];

  return (
    <div className="skeuo-card rounded-lg border border-[var(--border-main)] p-4">
      <h3 className="skeuo-emboss text-sm font-semibold text-[var(--text-primary)] mb-4">
        Working Remotely
      </h3>

      {isLoading ? (
        <SkeletonChips/>
      ) : remoteWorkers.length === 0 ? (
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-xs font-medium text-[var(--text-secondary)]">Everyone is at office!</p>
            <p className="text-2xs text-[var(--text-muted)] mt-0.5">No one is working remotely today.</p>
          </div>
          {/* Decorative remote work illustration */}
          <div className="flex items-center gap-1.5 opacity-40">
            <Laptop className="h-8 w-8 text-[var(--text-muted)]"/>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {remoteWorkers.slice(0, 6).map((e) => (
            <div key={e.employeeId} className="flex flex-col items-center gap-1 min-w-[48px]">
              <div className="relative">
                <Avatar name={e.employeeName}/>
                <div
                  className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--bg-card)] bg-success-500"/>
              </div>
              <span className="text-2xs text-[var(--text-muted)] max-w-[56px] truncate text-center">
                {e.employeeName.split(' ')[0]}
              </span>
            </div>
          ))}
          {remoteWorkers.length > 6 && (
            <div className="flex flex-col items-center gap-1 min-w-[48px]">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-surface)] text-xs font-semibold text-[var(--text-muted)]">
                +{remoteWorkers.length - 6}
              </div>
              <span className="text-2xs text-[var(--text-muted)]">more</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Combined Legacy Widget (backward compatible) ───────────────────────── */

interface TeamPresenceWidgetProps {
  onLeaveEmployees?: EmployeePresence[];
  remoteWorkingEmployees?: EmployeePresence[];
  isLoading?: boolean;
}

export function TeamPresenceWidget(
  _props: TeamPresenceWidgetProps,
) {
  return (
    <div className="space-y-4">
      <OnLeaveTodayCard/>
      <WorkingRemotelyCard/>
    </div>
  );
}
