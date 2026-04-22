'use client';

import {AlertCircle, CalendarDays, CheckCircle, ChevronRight, Clock, HelpCircle, XCircle} from 'lucide-react';
import {EmptyState} from '@/components/ui/EmptyState';
import type {LeaveRequest, LeaveType} from '@/lib/types/hrms/leave';

function getStatusIcon(status: string) {
  switch (status) {
    case 'APPROVED':
      return CheckCircle;
    case 'PENDING':
      return Clock;
    case 'REJECTED':
      return XCircle;
    case 'CANCELLED':
      return AlertCircle;
    default:
      return HelpCircle;
  }
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'APPROVED':
      return 'status-success';
    case 'PENDING':
      return 'status-warning';
    case 'REJECTED':
      return 'status-danger';
    case 'CANCELLED':
      return 'status-neutral';
    default:
      return 'status-info';
  }
}

export interface LeaveRequestsTableProps {
  requests: LeaveRequest[];
  leaveTypes: LeaveType[];
  onViewAll: () => void;
}

export function LeaveRequestsTable({requests, leaveTypes, onViewAll}: LeaveRequestsTableProps) {
  return (
    <div className="skeuo-card rounded-xl border border-[var(--border-main)] overflow-hidden">
      <div className="row-between p-6 border-b border-[var(--border-main)]">
        <h2 className="text-xl font-semibold text-[var(--text-primary)] skeuo-emboss">
          Recent Leave Requests
        </h2>
        <button
          onClick={onViewAll}
          className='flex items-center gap-1 text-accent hover:text-accent text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
        >
          View All
          <ChevronRight
            className="h-4 w-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
        </button>
      </div>
      {requests.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-12 w-12"/>}
          title="No Leave Requests"
          description="No leave requests to display"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="table-aura w-full">
            <thead className="skeuo-table-header">
            <tr>
              <th
                className="px-6 py-2 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Request #
              </th>
              <th
                className="px-6 py-2 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Leave Type
              </th>
              <th
                className="px-6 py-2 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Duration
              </th>
              <th
                className="px-6 py-2 text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Days
              </th>
              <th
                className="px-6 py-2 text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Status
              </th>
              <th
                className="px-6 py-2 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Applied On
              </th>
            </tr>
            </thead>
            <tbody className='divide-y divide-surface-100'>
            {requests.map((request) => {
              const leaveType = leaveTypes.find((t) => t.id === request.leaveTypeId);
              const StatusIcon = getStatusIcon(request.status);

              return (
                <tr
                  key={request.id}
                  className="h-11 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {request.requestNumber}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-body-secondary">
                      {leaveType?.leaveName || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-body-secondary">
                      {new Date(request.startDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                      })}{' '}
                      -{' '}
                      {new Date(request.endDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-body-secondary">
                      {request.totalDays}
                      {request.isHalfDay && (
                        <span className="ml-1 text-caption">(Half Day)</span>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`badge-status ${getStatusBadgeClass(request.status)} inline-flex items-center gap-1.5 justify-center`}
                    >
                      <StatusIcon className="h-3.5 w-3.5"/>
                      {request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-body-secondary">
                      {new Date(request.appliedOn).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
