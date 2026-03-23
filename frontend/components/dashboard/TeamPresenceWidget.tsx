'use client';

import { CheckCircle2, MapPin } from 'lucide-react';
import { useEmployeesOnLeaveToday, useRemoteWorkersToday } from '@/lib/hooks/queries/useHome';
import { OnLeaveEmployeeResponse, RemoteWorkerResponse } from '@/lib/services/home.service';

interface EmployeePresence {
  employeeId: string;
  employeeName: string;
  initials: string;
  avatarColor: string;
}

interface TeamPresenceWidgetProps {
  onLeaveEmployees?: EmployeePresence[];
  remoteWorkingEmployees?: EmployeePresence[];
  isLoading?: boolean;
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

function Avatar({ name }: { name: string }) {
  const initials = getInitials(name);
  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-surface)] text-xs font-semibold text-[var(--text-secondary)]"
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
          <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--bg-surface)]" />
          <div className="h-3 w-12 animate-pulse rounded bg-[var(--bg-surface)]" />
        </div>
      ))}
    </div>
  );
}

export function TeamPresenceWidget({
  onLeaveEmployees: propOnLeave,
  remoteWorkingEmployees: propRemote,
}: TeamPresenceWidgetProps) {
  // Fetch on-leave data via React Query (skip if passed as prop)
  const { data: apiOnLeave, isLoading: onLeaveLoading } = useEmployeesOnLeaveToday(!propOnLeave);
  // Fetch remote workers data via React Query (skip if passed as prop)
  const { data: apiRemote, isLoading: remoteLoading } = useRemoteWorkersToday(!propRemote);

  const onLeaveEmployees: EmployeePresence[] = propOnLeave
    ?? (apiOnLeave ? apiOnLeave.map(mapLeaveToPresence) : []);

  const remoteWorkers: EmployeePresence[] = propRemote
    ?? (apiRemote ? apiRemote.map(mapRemoteToPresence) : []);

  return (
    <div className="skeuo-card rounded-xl border border-[var(--border-main)] p-4">
      {/* On Leave Today */}
      <div className="mb-4">
        <h3 className="skeuo-emboss text-sm font-semibold text-[var(--text-primary)] mb-2.5">
          On Leave Today
        </h3>
        {onLeaveLoading && !propOnLeave ? (
          <SkeletonChips />
        ) : onLeaveEmployees.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg bg-[var(--bg-surface)] px-3 py-2.5">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <p className="text-xs text-[var(--text-muted)]">Everyone is working today</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {onLeaveEmployees.map((e) => (
              <div key={e.employeeId} className="flex items-center gap-1.5 rounded-lg bg-[var(--bg-surface)] px-2 py-1.5">
                <Avatar name={e.employeeName} />
                <span className="text-xs text-[var(--text-secondary)] max-w-[80px] truncate">{e.employeeName.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Working Remotely */}
      <div className="border-t border-[var(--border-subtle)] pt-4">
        <div className="flex items-center gap-1.5 mb-2.5">
          <MapPin className="h-3.5 w-3.5 text-[var(--text-muted)]" />
          <h3 className="skeuo-emboss text-sm font-semibold text-[var(--text-primary)]">
            Working Remotely
          </h3>
          {!remoteLoading && (
            <span className="ml-auto text-xs text-[var(--text-muted)]">{remoteWorkers.length}</span>
          )}
        </div>
        {remoteLoading && !propRemote ? (
          <SkeletonChips />
        ) : remoteWorkers.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg bg-[var(--bg-surface)] px-3 py-2.5">
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
            <p className="text-xs text-[var(--text-muted)]">No one is working remotely today</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {remoteWorkers.map((e) => (
              <div key={e.employeeId} className="flex items-center gap-1.5 rounded-lg bg-[var(--bg-surface)] px-2 py-1.5">
                <div className="relative">
                  <Avatar name={e.employeeName} />
                  <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500 dark:border-[var(--bg-main)]" />
                </div>
                <span className="text-xs text-[var(--text-secondary)] max-w-[80px] truncate">{e.employeeName.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
