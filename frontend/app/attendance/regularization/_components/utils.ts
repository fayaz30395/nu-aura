export function calculateResolutionTime(requestedOn: string, approvedOn: string | undefined): string {
  if (!approvedOn) return '--';
  const diff = new Date(approvedOn).getTime() - new Date(requestedOn).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  return `${hours}h`;
}

export function formatRelativeTime(date: string): string {
  const now = new Date();
  const requestDate = new Date(date);
  const diffMs = now.getTime() - requestDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return requestDate.toLocaleDateString();
}

export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'APPROVED':
      return 'badge-status status-success';
    case 'PENDING':
      return 'badge-status status-warning';
    case 'REJECTED':
      return 'badge-status status-danger';
    default:
      return 'badge-status status-neutral';
  }
}
