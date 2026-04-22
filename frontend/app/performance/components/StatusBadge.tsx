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
          return "bg-accent-subtle text-accent border-[var(--accent-primary)]";
        case 'COMPLETED':
          return "bg-status-success-bg text-status-success-text border-status-success-border";
        case 'DRAFT':
          return "bg-surface text-primary border-subtle";
        case 'CANCELLED':
          return "bg-status-danger-bg text-status-danger-text border-status-danger-border";
        case 'ON_HOLD':
          return "bg-status-warning-bg text-status-warning-text border-status-warning-border";
        default:
          return "bg-surface text-primary border-subtle";
      }
    }

    // Review statuses
    if (type === 'review') {
      switch (status) {
        case 'DRAFT':
          return "bg-surface text-primary border-subtle";
        case 'SUBMITTED':
          return "bg-accent-subtle text-accent border-[var(--accent-primary)]";
        case 'IN_REVIEW':
          return "bg-status-warning-bg text-status-warning-text border-status-warning-border";
        case 'COMPLETED':
          return "bg-status-success-bg text-status-success-text border-status-success-border";
        case 'ACKNOWLEDGED':
          return "bg-accent-subtle text-accent border-[var(--accent-primary)]";
        default:
          return "bg-surface text-primary border-subtle";
      }
    }

    // Cycle statuses
    if (type === 'cycle') {
      switch (status) {
        case 'PLANNING':
          return "bg-surface text-primary border-subtle";
        case 'ACTIVE':
          return "bg-status-success-bg text-status-success-text border-status-success-border";
        case 'COMPLETED':
          return "bg-accent-subtle text-accent border-[var(--accent-primary)]";
        case 'CANCELLED':
          return "bg-status-danger-bg text-status-danger-text border-status-danger-border";
        default:
          return "bg-surface text-primary border-subtle";
      }
    }

    // Feedback statuses
    if (type === 'feedback') {
      switch (status) {
        case 'PRAISE':
          return "bg-status-success-bg text-status-success-text border-status-success-border";
        case 'CONSTRUCTIVE':
          return "bg-status-warning-bg text-status-warning-text border-status-warning-border";
        case 'GENERAL':
          return "bg-accent-subtle text-accent border-[var(--accent-primary)]";
        case 'REQUEST':
          return "bg-accent-subtle text-accent border-[var(--accent-primary)]";
        default:
          return "bg-surface text-primary border-subtle";
      }
    }

    return "bg-surface text-primary border-subtle";
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
