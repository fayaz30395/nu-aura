'use client';

import React, {useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {AppLayout} from '@/components/layout';
import {Button} from '@/components/ui/Button';
import {Badge} from '@/components/ui/Badge';
import {Card} from '@/components/ui/Card';
import {Skeleton} from '@/components/ui/Skeleton';
import {ConfirmDialog} from '@/components/ui';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {useAuth} from '@/lib/hooks/useAuth';
import {useToast} from '@/components/notifications/ToastProvider';
import {
  useAddComment,
  useAssignTicket,
  useDeleteComment,
  useDeleteTicket,
  useTicketComments,
  useTicketDetail,
  useUpdateTicketStatus,
} from '@/lib/hooks/queries/useHelpdesk';
import {useTicketEscalations, useTicketMetrics} from '@/lib/hooks/queries/useHelpdeskSla';
import type {TicketCommentResponse, TicketPriority, TicketStatus} from '@/lib/services/hrms/helpdesk.service';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Lock,
  MessageSquare,
  Pause,
  Send,
  Tag,
  Trash2,
  User,
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; variant: 'danger' | 'warning' | 'info' | 'default' }> = {
  URGENT: {label: 'Urgent', variant: 'danger'},
  HIGH: {label: 'High', variant: 'warning'},
  MEDIUM: {label: 'Medium', variant: 'info'},
  LOW: {label: 'Low', variant: 'default'},
};

const STATUS_CONFIG: Record<TicketStatus, {
  label: string;
  variant: 'danger' | 'warning' | 'info' | 'success' | 'default';
  icon: React.FC<{ className?: string }>
}> = {
  OPEN: {label: 'Open', variant: 'info', icon: Circle},
  IN_PROGRESS: {label: 'In Progress', variant: 'warning', icon: Clock},
  WAITING_FOR_RESPONSE: {label: 'Waiting', variant: 'default', icon: Pause},
  RESOLVED: {label: 'Resolved', variant: 'success', icon: CheckCircle2},
  CLOSED: {label: 'Closed', variant: 'default', icon: CheckCircle2},
};

const ALL_STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_RESPONSE', 'RESOLVED', 'CLOSED'];

// ─── Comment Schema ──────────────────────────────────────────────────────────

const commentSchema = z.object({
  comment: z.string().min(1, 'Comment is required').max(5000, 'Comment is too long'),
  isInternal: z.boolean().optional(),
});

type CommentFormData = z.infer<typeof commentSchema>;

// ─── Component ───────────────────────────────────────────────────────────────

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const {user} = useAuth();
  const toast = useToast();
  const ticketId = params.id as string;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  // Queries
  const {data: ticket, isLoading: ticketLoading} = useTicketDetail(ticketId);
  const {data: comments = [], isLoading: commentsLoading} = useTicketComments(ticketId);
  const {data: metrics} = useTicketMetrics(ticketId, !!ticketId);
  const {data: escalations = []} = useTicketEscalations(ticketId, !!ticketId);

  // Mutations
  const statusMutation = useUpdateTicketStatus();
  const assignMutation = useAssignTicket();
  const addCommentMutation = useAddComment();
  const deleteCommentMutation = useDeleteComment();
  const deleteTicketMutation = useDeleteTicket();

  // Comment form
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: {errors},
  } = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
    defaultValues: {comment: '', isInternal: false},
  });

  const isInternal = watch('isInternal');

  const handleStatusChange = async (status: TicketStatus) => {
    try {
      await statusMutation.mutateAsync({id: ticketId, status});
      toast.success(`Status updated to ${STATUS_CONFIG[status].label}`);
    } catch (err: unknown) {
      const message = (err as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || 'Failed to update status';
      toast.error(message);
    }
  };

  const handleAssignToMe = async () => {
    if (!user?.employeeId) return;
    try {
      await assignMutation.mutateAsync({id: ticketId, assigneeId: user.employeeId});
      toast.success('Ticket assigned to you');
    } catch (err: unknown) {
      const message = (err as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || 'Failed to assign ticket';
      toast.error(message);
    }
  };

  const onCommentSubmit = async (data: CommentFormData) => {
    if (!user?.employeeId) return;
    try {
      await addCommentMutation.mutateAsync({
        ticketId,
        commenterId: user.employeeId,
        comment: data.comment,
        isInternal: data.isInternal,
      });
      reset();
    } catch (err: unknown) {
      const message = (err as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || 'Failed to add comment';
      toast.error(message);
    }
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete) return;
    try {
      await deleteCommentMutation.mutateAsync({commentId: commentToDelete, ticketId});
      setCommentToDelete(null);
      toast.success('Comment deleted');
    } catch (err: unknown) {
      const message = (err as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || 'Failed to delete comment';
      toast.error(message);
    }
  };

  const handleDeleteTicket = async () => {
    try {
      await deleteTicketMutation.mutateAsync(ticketId);
      toast.success('Ticket deleted');
      router.push('/helpdesk/tickets');
    } catch (err: unknown) {
      const message = (err as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || 'Failed to delete ticket';
      toast.error(message);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatMinutes = (minutes: number | null | undefined) => {
    if (!minutes) return '-';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (ticketLoading) {
    return (
      <AppLayout activeMenuItem="helpdesk">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48"/>
          <Skeleton className="h-64 w-full"/>
          <Skeleton className="h-48 w-full"/>
        </div>
      </AppLayout>
    );
  }

  if (!ticket) {
    return (
      <AppLayout activeMenuItem="helpdesk">
        <div className="flex flex-col items-center justify-center py-20">
          <AlertTriangle className="h-12 w-12 text-[var(--text-muted)] mb-4"/>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Ticket not found</h2>
          <p className="text-body-muted mt-1 mb-4">The ticket you are looking for does not exist</p>
          <Button variant="outline" onClick={() => router.push('/helpdesk/tickets')}
                  leftIcon={<ArrowLeft className="h-4 w-4"/>}>
            Back to Tickets
          </Button>
        </div>
      </AppLayout>
    );
  }

  const priorityCfg = PRIORITY_CONFIG[ticket.priority] ?? PRIORITY_CONFIG.MEDIUM;
  const statusCfg = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.OPEN;
  const StatusIcon = statusCfg.icon;

  return (
    <AppLayout activeMenuItem="helpdesk">
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteTicket}
        title="Delete Ticket"
        message={`Are you sure you want to delete ticket ${ticket.ticketNumber}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
      <ConfirmDialog
        isOpen={!!commentToDelete}
        onClose={() => setCommentToDelete(null)}
        onConfirm={handleDeleteComment}
        title="Delete Comment"
        message="Are you sure you want to delete this comment?"
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
      <div className="space-y-6">
        {/* Back Navigation */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/helpdesk/tickets')}
                  leftIcon={<ArrowLeft className="h-4 w-4"/>}>
            Back to Tickets
          </Button>
        </div>

        {/* Ticket Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-4 mb-2">
              <span className='text-sm font-mono text-accent'>
                {ticket.ticketNumber || ticket.id.slice(0, 8)}
              </span>
              <Badge variant={statusCfg.variant} size="sm">
                <StatusIcon className="h-3 w-3"/>
                {statusCfg.label}
              </Badge>
              <Badge variant={priorityCfg.variant} size="sm">{priorityCfg.label}</Badge>
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">{ticket.subject}</h1>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <PermissionGate permission={Permissions.HELPDESK_TICKET_ASSIGN}>
              <Button variant="outline" size="sm" onClick={handleAssignToMe}>
                Assign to Me
              </Button>
            </PermissionGate>
            <PermissionGate permission={Permissions.HELPDESK_TICKET_RESOLVE}>
              <select
                className="text-sm bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-700"
                value={ticket.status}
                onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                ))}
              </select>
            </PermissionGate>
            <PermissionGate permission={Permissions.SYSTEM_ADMIN}>
              <Button variant="soft-danger" size="sm" onClick={() => setShowDeleteConfirm(true)}
                      leftIcon={<Trash2 className="h-4 w-4"/>}>
                Delete
              </Button>
            </PermissionGate>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Description & Comments */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card className="p-6">
              <h3
                className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Description</h3>
              <div className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                {ticket.description}
              </div>
              {ticket.tags && (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--border-main)]">
                  <Tag className="h-3.5 w-3.5 text-[var(--text-muted)]"/>
                  <div className="flex gap-1.5 flex-wrap">
                    {ticket.tags.split(',').map((tag: string) => (
                      <Badge key={tag.trim()} variant="outline" size="sm">{tag.trim()}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Escalations */}
            {escalations.length > 0 && (
              <Card className='p-6 border-status-warning-border bg-warning-50/50'>
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className='h-4 w-4 text-status-warning-text'/>
                  <h3 className='text-sm font-semibold text-status-warning-text'>
                    Escalations ({escalations.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {escalations.filter(Boolean).map((esc) => (
                    <div key={esc.id} className="row-between bg-[var(--bg-surface)] rounded-lg px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="warning" size="sm">{esc.escalationLevel}</Badge>
                        <span className="text-xs text-[var(--text-secondary)]">
                          {esc.escalationReason ? esc.escalationReason.replace(/_/g, ' ') : '-'}
                        </span>
                      </div>
                      <span className="text-caption">
                        {formatDate(esc.escalatedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Comments Section */}
            <Card className="p-6">
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4"/>
                  Comments ({comments.length})
                </div>
              </h3>

              {commentsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="h-8 w-8 rounded-full"/>
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32"/>
                        <Skeleton className="h-12 w-full"/>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.length === 0 && (
                    <p className="text-body-muted text-center py-4">
                      No comments yet. Be the first to comment.
                    </p>
                  )}
                  {comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      currentUserId={user?.employeeId}
                      onDelete={(id) => setCommentToDelete(id)}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              )}

              {/* Add Comment Form */}
              <div className="mt-6 pt-4 border-t border-[var(--border-main)]">
                <form onSubmit={handleSubmit(onCommentSubmit)}>
                  <div className="space-y-4">
                    <textarea
                      placeholder="Add a comment..."
                      rows={3}
                      className="w-full px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent-700"
                      {...register('comment')}
                    />
                    {errors.comment && <p className='text-sm text-status-danger-text'>{errors.comment.message}</p>}
                    <div className="row-between">
                      <PermissionGate permission={Permissions.HELPDESK_TICKET_ASSIGN}>
                        <label className="flex items-center gap-2 text-body-secondary">
                          <input type="checkbox" {...register('isInternal')} className="rounded"/>
                          <Lock className="h-3.5 w-3.5"/>
                          Internal note (not visible to requester)
                        </label>
                      </PermissionGate>
                      <Button
                        type="submit"
                        variant={isInternal ? 'warning' : 'primary'}
                        size="sm"
                        disabled={addCommentMutation.isPending}
                        leftIcon={<Send className="h-3.5 w-3.5"/>}
                      >
                        {addCommentMutation.isPending ? 'Sending...' : isInternal ? 'Add Internal Note' : 'Send Reply'}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </Card>
          </div>

          {/* Right Column - Metadata */}
          <div className="space-y-6">
            {/* Ticket Details */}
            <Card className="p-6">
              <h3
                className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Details</h3>
              <div className="space-y-4">
                <DetailRow label="Requester" icon={User}>
                  <span className="text-sm font-medium text-[var(--text-primary)]">{ticket.employeeName || '-'}</span>
                </DetailRow>
                <DetailRow label="Assignee" icon={User}>
                  <span className="text-sm text-[var(--text-primary)]">{ticket.assignedToName || 'Unassigned'}</span>
                </DetailRow>
                <DetailRow label="Category" icon={Tag}>
                  <span className="text-sm text-[var(--text-primary)]">{ticket.categoryName || 'None'}</span>
                </DetailRow>
                <DetailRow label="Created" icon={Calendar}>
                  <span className="text-sm text-[var(--text-primary)]">{formatDate(ticket.createdAt)}</span>
                </DetailRow>
                <DetailRow label="Updated" icon={Clock}>
                  <span className="text-sm text-[var(--text-primary)]">{formatDate(ticket.updatedAt)}</span>
                </DetailRow>
                {ticket.dueDate && (
                  <DetailRow label="Due Date" icon={Calendar}>
                    <span className="text-sm text-[var(--text-primary)]">{formatDate(ticket.dueDate)}</span>
                  </DetailRow>
                )}
                {ticket.resolvedAt && (
                  <DetailRow label="Resolved" icon={CheckCircle2}>
                    <span className="text-sm text-[var(--text-primary)]">{formatDate(ticket.resolvedAt)}</span>
                  </DetailRow>
                )}
                {ticket.closedAt && (
                  <DetailRow label="Closed" icon={CheckCircle2}>
                    <span className="text-sm text-[var(--text-primary)]">{formatDate(ticket.closedAt)}</span>
                  </DetailRow>
                )}
              </div>
            </Card>

            {/* SLA Metrics */}
            {metrics && (
              <Card className="p-6">
                <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4"/>
                    SLA Metrics
                  </div>
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-caption">First Response</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {formatMinutes(metrics.firstResponseMinutes)}
                      </span>
                      {metrics.firstResponseSlaBreached && (
                        <Badge variant="danger" size="sm">Breached</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-caption">Resolution Time</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {formatMinutes(metrics.resolutionMinutes)}
                      </span>
                      {metrics.resolutionSlaBreached && (
                        <Badge variant="danger" size="sm">Breached</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-caption">Handle Time</span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {formatMinutes(metrics.totalHandleTimeMinutes)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-caption">Reopened</span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">{metrics.reopenCount}x</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-caption">SLA Status</span>
                    <Badge variant={metrics.slaMet ? 'success' : 'danger'} size="sm">
                      {metrics.slaMet ? 'Met' : 'Breached'}
                    </Badge>
                  </div>
                  {metrics.csatRating && (
                    <div className="flex justify-between items-center">
                      <span className="text-caption">CSAT Rating</span>
                      <span className="text-sm font-medium text-[var(--text-primary)]">{metrics.csatRating}/5</span>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Resolution Notes */}
            {ticket.resolutionNotes && (
              <Card className="p-6">
                <h3
                  className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Resolution
                  Notes</h3>
                <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{ticket.resolutionNotes}</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface DetailRowProps {
  label: string;
  icon: React.FC<{ className?: string }>;
  children: React.ReactNode;
}

function DetailRow({label, icon: Icon, children}: DetailRowProps) {
  return (
    <div className="flex items-start gap-4">
      <Icon className="h-4 w-4 text-[var(--text-muted)] mt-0.5 flex-shrink-0"/>
      <div className="flex-1 min-w-0">
        <p className="text-caption mb-0.5">{label}</p>
        {children}
      </div>
    </div>
  );
}

interface CommentItemProps {
  comment: TicketCommentResponse;
  currentUserId: string | undefined;
  onDelete: (id: string) => void;
  formatDate: (date: string | null | undefined) => string;
}

function CommentItem({comment, currentUserId, onDelete, formatDate}: CommentItemProps) {
  const isOwn = currentUserId === comment.commenterId;

  return (
    <div
      className={`flex gap-4 ${comment.isInternal ? "bg-warning-50/50 -mx-2 px-2 py-2 rounded-lg border border-warning-200/50" : ''}`}>
      <div
        className='h-8 w-8 rounded-full bg-accent-subtle flex items-center justify-center flex-shrink-0'>
        <User className='h-4 w-4 text-accent'/>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-[var(--text-primary)]">{comment.commenterName}</span>
          <span className="text-caption">{formatDate(comment.createdAt)}</span>
          {comment.isInternal && (
            <Badge variant="warning" size="sm">
              <Lock className="h-3 w-3"/>
              Internal
            </Badge>
          )}
        </div>
        <p className="text-body-secondary whitespace-pre-wrap">{comment.comment}</p>
        {isOwn && (
          <button
            onClick={() => onDelete(comment.id)}
            className='text-caption hover:text-status-danger-text mt-1 flex items-center gap-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
            aria-label="Delete comment"
          >
            <Trash2 className="h-3 w-3"/>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
