import {AlertTriangle, CheckCircle, Clock, Coffee, Home, Sun, XCircle} from 'lucide-react';
import type {AttendanceStatus} from '@/lib/types/hrms/attendance';

export const formatTime = (time: string | undefined) => {
  if (!time) return '--:--';
  return new Date(time).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const formatDuration = (minutes: number | undefined) => {
  if (!minutes) return '0h 0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
};

export const getStatusClasses = (status: AttendanceStatus) => {
  switch (status) {
    case 'PRESENT':
      return 'text-status-ok-fg bg-status-ok-bg border border-status-ok-bd';
    case 'ABSENT':
      return 'text-status-err-fg bg-status-err-bg border border-status-err-bd';
    case 'HALF_DAY':
    case 'PENDING_REGULARIZATION':
      return 'text-status-warn-fg bg-status-warn-bg border border-status-warn-bd';
    case 'ON_LEAVE':
    case 'HOLIDAY':
      return 'text-status-info-fg bg-status-info-bg border border-status-info-bd';
    default:
      return 'text-status-neutral-fg bg-status-neutral-bg border border-status-neutral-bd';
  }
};

export const StatusIcon = ({status}: { status: AttendanceStatus }) => {
  const className = 'h-3 w-3';
  switch (status) {
    case 'PRESENT':
      return <CheckCircle className={className} aria-hidden="true"/>;
    case 'ABSENT':
      return <XCircle className={className} aria-hidden="true"/>;
    case 'ON_LEAVE':
      return <Coffee className={className} aria-hidden="true"/>;
    case 'WEEKLY_OFF':
      return <Home className={className} aria-hidden="true"/>;
    case 'HOLIDAY':
      return <Sun className={className} aria-hidden="true"/>;
    case 'PENDING_REGULARIZATION':
      return <AlertTriangle className={className} aria-hidden="true"/>;
    default:
      return <Clock className={className} aria-hidden="true"/>;
  }
};
