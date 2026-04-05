'use client';

import React from 'react';
import {motion} from 'framer-motion';
import {CheckCircle, Clock, Send, XCircle} from 'lucide-react';
import {RegularizationRequest} from './types';
import {calculateResolutionTime, formatTime} from './utils';

interface RequestTimelineProps {
  request: RegularizationRequest;
}

type TimelineStatus = 'completed' | 'active' | 'pending' | 'failed';

function getStatusColor(status: TimelineStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] ring-2 ring-[var(--status-success-border)]';
    case 'active':
      return 'bg-[var(--status-info-bg)] text-[var(--status-info-text)] ring-4 ring-[var(--status-info-border)]';
    case 'failed':
      return 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] ring-2 ring-[var(--status-danger-border)]';
    case 'pending':
      return 'bg-[var(--bg-secondary)] text-[var(--text-muted)]';
  }
}

function resolveRequestStatus(status: RegularizationRequest['status']): TimelineStatus {
  if (status === 'PENDING') return 'pending';
  if (status === 'APPROVED') return 'completed';
  return 'failed';
}

function getTimelineIcon(index: number, requestStatus: RegularizationRequest['status']): React.ReactNode {
  if (index === 0) return <Send className="h-5 w-5"/>;
  if (index === 1) return <Clock className="h-5 w-5"/>;
  if (requestStatus === 'APPROVED') return <CheckCircle className="h-5 w-5"/>;
  if (requestStatus === 'REJECTED') return <XCircle className="h-5 w-5"/>;
  return <Clock className="h-5 w-5"/>;
}

export function RequestTimeline({request}: RequestTimelineProps) {
  const timelineSteps: Array<{
    label: string;
    date: string;
    status: TimelineStatus;
  }> = [
    {
      label: 'Submitted',
      date: request.requestedOn,
      status: 'completed',
    },
    {
      label: 'Under Review',
      date: request.requestedOn,
      status: request.status === 'PENDING' ? 'active' : 'completed',
    },
    {
      label:
        request.status === 'APPROVED'
          ? 'Approved'
          : request.status === 'REJECTED'
            ? 'Rejected'
            : 'Pending',
      date: request.approvedOn || request.requestedOn,
      status: resolveRequestStatus(request.status),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div
          className="absolute left-6 top-12 bottom-0 w-0.5 bg-gradient-to-b from-[var(--status-success-text)] to-[var(--border-main)]"/>

        {/* Timeline steps */}
        <div className="space-y-6">
          {timelineSteps.map((step, index) => {
            const isActive = step.status === 'active';

            return (
              <motion.div
                key={index}
                initial={{opacity: 0, x: -12}}
                animate={{opacity: 1, x: 0}}
                transition={{duration: 0.25, delay: index * 0.1}}
                className="relative flex items-start gap-4 pl-16"
              >
                {/* Timeline dot */}
                <motion.div
                  className={`absolute left-0 w-12 h-12 rounded-full flex items-center justify-center ${getStatusColor(step.status)}`}
                  animate={isActive ? {scale: [1, 1.1, 1]} : {}}
                  transition={{duration: 2, repeat: isActive ? Infinity : 0}}
                >
                  {getTimelineIcon(index, request.status)}
                </motion.div>

                {/* Content */}
                <div className="flex-1">
                  <div className="row-between gap-4">
                    <h4 className="text-card-title">{step.label}</h4>
                    <span className="text-caption whitespace-nowrap font-medium">
                      {new Date(step.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Additional info */}
                  {index === 2 && request.status !== 'PENDING' && (
                    <div className="mt-2 space-y-1">
                      {request.approvedBy && (
                        <p className="text-body-secondary">
                          Reviewed by: <span className="font-medium">{request.approvedBy}</span>
                        </p>
                      )}
                      {request.remarks && (
                        <p className="text-body-secondary">
                          Remarks: <span className="font-medium">{request.remarks}</span>
                        </p>
                      )}
                      {request.approvedOn && request.requestedOn && (
                        <p className="text-body-secondary">
                          Resolution time:{' '}
                          <span className="font-medium">
                            {calculateResolutionTime(request.requestedOn, request.approvedOn)}
                          </span>
                        </p>
                      )}
                    </div>
                  )}

                  {index === 0 && (
                    <p className="text-body-secondary mt-1">
                      For{' '}
                      {new Date(request.attendanceDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Request Details Section */}
      <div className="grid grid-cols-2 gap-4 pt-2">
        <div className="card-aura p-4 bg-[var(--bg-secondary)]/30">
          <p className="text-caption uppercase font-semibold tracking-wide mb-2">Reason</p>
          <p className="text-body-secondary line-clamp-3">{request.reason}</p>
        </div>
        <div className="card-aura p-4 bg-[var(--bg-secondary)]/30">
          <p className="text-caption uppercase font-semibold tracking-wide mb-2">Original Times</p>
          <p className="text-body-secondary">
            <span className="font-medium">In:</span>{' '}
            {request.originalCheckIn ? formatTime(request.originalCheckIn) : 'Not marked'}
          </p>
          <p className="text-body-secondary">
            <span className="font-medium">Out:</span>{' '}
            {request.originalCheckOut ? formatTime(request.originalCheckOut) : 'Not marked'}
          </p>
        </div>
      </div>
    </div>
  );
}
