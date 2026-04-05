interface StatusBadgeProps {
  status: string;
  type?: 'goal' | 'review' | 'cycle' | 'feedback';
}

export default function StatusBadge({status, type = 'goal'}: StatusBadgeProps) {
  const getStatusColor = () => {
    // Goal statuses
    if (type === 'goal') {
      switch (status) {
        case 'ACTIVE':
          return 'bg-accent-50 dark:bg-accent-950/30 text-accent-800 dark:text-accent-400 border-accent-200 dark:border-accent-500';
        case 'COMPLETED':
          return 'bg-success-100 text-success-800 border-success-200';
        case 'DRAFT':
          return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200 border-surface-200 dark:border-surface-700';
        case 'CANCELLED':
          return 'bg-danger-100 text-danger-800 border-danger-200';
        case 'ON_HOLD':
          return 'bg-warning-100 text-warning-800 border-warning-200';
        default:
          return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200 border-surface-200 dark:border-surface-700';
      }
    }

    // Review statuses
    if (type === 'review') {
      switch (status) {
        case 'DRAFT':
          return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200 border-surface-200 dark:border-surface-700';
        case 'SUBMITTED':
          return 'bg-accent-50 dark:bg-accent-950/30 text-accent-800 dark:text-accent-400 border-accent-200 dark:border-accent-500';
        case 'IN_REVIEW':
          return 'bg-warning-100 text-warning-800 border-warning-200';
        case 'COMPLETED':
          return 'bg-success-100 text-success-800 border-success-200';
        case 'ACKNOWLEDGED':
          return 'bg-accent-100 text-accent-800 border-accent-200';
        default:
          return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200 border-surface-200 dark:border-surface-700';
      }
    }

    // Cycle statuses
    if (type === 'cycle') {
      switch (status) {
        case 'PLANNING':
          return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200 border-surface-200 dark:border-surface-700';
        case 'ACTIVE':
          return 'bg-success-100 text-success-800 border-success-200';
        case 'COMPLETED':
          return 'bg-accent-50 dark:bg-accent-950/30 text-accent-800 dark:text-accent-400 border-accent-200 dark:border-accent-500';
        case 'CANCELLED':
          return 'bg-danger-100 text-danger-800 border-danger-200';
        default:
          return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200 border-surface-200 dark:border-surface-700';
      }
    }

    // Feedback statuses
    if (type === 'feedback') {
      switch (status) {
        case 'PRAISE':
          return 'bg-success-100 text-success-800 border-success-200';
        case 'CONSTRUCTIVE':
          return 'bg-warning-100 text-warning-800 border-warning-200';
        case 'GENERAL':
          return 'bg-accent-50 dark:bg-accent-950/30 text-accent-800 dark:text-accent-400 border-accent-200 dark:border-accent-500';
        case 'REQUEST':
          return 'bg-accent-100 text-accent-800 border-accent-200';
        default:
          return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200 border-surface-200 dark:border-surface-700';
      }
    }

    return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200 border-surface-200 dark:border-surface-700';
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ');
  };

  return (
    <span
      className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor()}`}
    >
      {formatStatus(status)}
    </span>
  );
}
