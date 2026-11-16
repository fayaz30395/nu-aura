import {AlertTriangle, CheckCircle, Clock, FileEdit, Play, XCircle} from 'lucide-react';
import type {BadgeProps} from '@/components/ui/Badge';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

export const getStatusVariant = (status: string): BadgeVariant => {
  switch (status) {
    case 'ACTIVE':
    case 'IN_PROGRESS':
      return 'info';
    case 'NOMINATION':
      return 'warning';
    case 'COMPLETED':
      return 'success';
    default:
      return 'default';
  }
};

export const getStatusIcon = (status: string) => {
  switch (status) {
    case 'ACTIVE':
    case 'IN_PROGRESS':
      return <Play className="h-3.5 w-3.5" aria-hidden/>;
    case 'NOMINATION':
      return <Clock className="h-3.5 w-3.5" aria-hidden/>;
    case 'COMPLETED':
      return <CheckCircle className="h-3.5 w-3.5" aria-hidden/>;
    case 'CLOSED':
      return <XCircle className="h-3.5 w-3.5" aria-hidden/>;
    default:
      return <FileEdit className="h-3.5 w-3.5" aria-hidden/>;
  }
};

export const getRequestStatusIcon = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle className="h-4 w-4 text-success-500" aria-hidden/>;
    case 'IN_PROGRESS':
      return <Clock className="h-4 w-4 text-accent-500" aria-hidden/>;
    case 'DECLINED':
      return <AlertTriangle className="h-4 w-4 text-danger-500" aria-hidden/>;
    default:
      return <Clock className="h-4 w-4 text-text-3" aria-hidden/>;
  }
};
