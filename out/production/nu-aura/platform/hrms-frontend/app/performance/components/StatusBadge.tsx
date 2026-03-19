interface StatusBadgeProps {
  status: string;
  type?: 'goal' | 'review' | 'cycle' | 'feedback';
}

export default function StatusBadge({ status, type = 'goal' }: StatusBadgeProps) {
  const getStatusColor = () => {
    // Goal statuses
    if (type === 'goal') {
      switch (status) {
        case 'ACTIVE':
          return 'bg-primary-50 dark:bg-primary-950/30 text-primary-800 dark:text-primary-400 border-primary-200 dark:border-primary-500';
        case 'COMPLETED':
          return 'bg-green-100 text-green-800 border-green-200';
        case 'DRAFT':
          return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200 border-surface-200 dark:border-surface-700';
        case 'CANCELLED':
          return 'bg-red-100 text-red-800 border-red-200';
        case 'ON_HOLD':
          return 'bg-yellow-100 text-yellow-800 border-yellow-200';
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
          return 'bg-primary-50 dark:bg-primary-950/30 text-primary-800 dark:text-primary-400 border-primary-200 dark:border-primary-500';
        case 'IN_REVIEW':
          return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'COMPLETED':
          return 'bg-green-100 text-green-800 border-green-200';
        case 'ACKNOWLEDGED':
          return 'bg-purple-100 text-purple-800 border-purple-200';
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
          return 'bg-green-100 text-green-800 border-green-200';
        case 'COMPLETED':
          return 'bg-primary-50 dark:bg-primary-950/30 text-primary-800 dark:text-primary-400 border-primary-200 dark:border-primary-500';
        case 'CANCELLED':
          return 'bg-red-100 text-red-800 border-red-200';
        default:
          return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200 border-surface-200 dark:border-surface-700';
      }
    }

    // Feedback statuses
    if (type === 'feedback') {
      switch (status) {
        case 'PRAISE':
          return 'bg-green-100 text-green-800 border-green-200';
        case 'CONSTRUCTIVE':
          return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'GENERAL':
          return 'bg-primary-50 dark:bg-primary-950/30 text-primary-800 dark:text-primary-400 border-primary-200 dark:border-primary-500';
        case 'REQUEST':
          return 'bg-purple-100 text-purple-800 border-purple-200';
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
