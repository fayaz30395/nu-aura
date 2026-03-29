'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Calendar,
  Clock,
  Plus,
  Video,
  MapPin,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  ListChecks,
  MessageSquare,
  Star,
  Filter,
  X,
  Play,
  Ban,
  CalendarClock,
  Trash2,
  Check,
  CircleDot,
  ArrowLeft,
  Send,
  Repeat,
  Users,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SkeletonStatCard } from '@/components/ui/Skeleton';
import { PageErrorFallback } from '@/components/errors/PageErrorFallback';
import {
  useMyMeetings,
  useUpcomingMeetings,
  useMeetingDetail,
  usePendingActionItems,
  useOverdueActionItems,
  useMeetingDashboard,
  useCreateMeeting,
  useStartMeeting,
  useCompleteMeeting,
  useCancelMeeting,
  useAddAgendaItem,
  useMarkAgendaDiscussed,
  useDeleteAgendaItem,
  useCreateActionItem,
  useUpdateActionItemStatus,
  useUpdateMeetingNotes,
  useSubmitMeetingFeedback,
  useRescheduleMeeting,
} from '@/lib/hooks/queries/useOneOnOne';
import type {
  OneOnOneMeetingResponse,
  MeetingStatus,
  MeetingType,
  RecurrencePattern,
  MeetingAgendaItemResponse,
  MeetingActionItemResponse,
  MeetingAgendaPriority,
  MeetingAgendaCategory,
  MeetingActionStatus,
  MeetingActionPriority,
} from '@/lib/types/meeting';

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const scheduleMeetingSchema = z.object({
  employeeId: z.string().min(1, 'Participant is required'),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  meetingDate: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().optional(),
  durationMinutes: z.coerce.number().min(15).max(480).optional(),
  meetingType: z.string().optional(),
  location: z.string().optional(),
  meetingLink: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurrencePattern: z.string().optional(),
  recurrenceEndDate: z.string().optional(),
  reminderMinutesBefore: z.coerce.number().optional(),
});

type ScheduleMeetingFormData = z.infer<typeof scheduleMeetingSchema>;

const agendaItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.string().optional(),
  category: z.string().optional(),
});

type AgendaItemFormData = z.infer<typeof agendaItemSchema>;

const actionItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  assigneeId: z.string().min(1, 'Assignee is required'),
  assigneeRole: z.enum(['MANAGER', 'EMPLOYEE']),
  dueDate: z.string().optional(),
  priority: z.string().optional(),
});

type ActionItemFormData = z.infer<typeof actionItemSchema>;

const feedbackSchema = z.object({
  rating: z.coerce.number().min(1).max(5),
  feedback: z.string().optional(),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStatusBadge(status: MeetingStatus | undefined) {
  switch (status) {
    case 'SCHEDULED':
      return { label: 'Scheduled', classes: 'bg-accent-100 text-accent-800 dark:bg-accent-900/30 dark:text-accent-400' };
    case 'IN_PROGRESS':
      return { label: 'In Progress', classes: 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400' };
    case 'COMPLETED':
      return { label: 'Completed', classes: 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400' };
    case 'CANCELLED':
      return { label: 'Cancelled', classes: 'bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-400' };
    case 'RESCHEDULED':
      return { label: 'Rescheduled', classes: 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-400' };
    case 'NO_SHOW':
      return { label: 'No Show', classes: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' };
    default:
      return { label: 'Unknown', classes: 'bg-gray-100 text-gray-800' };
  }
}

function getMeetingTypeLabel(type: MeetingType | undefined): string {
  const map: Record<MeetingType, string> = {
    REGULAR: 'Regular',
    PERFORMANCE: 'Performance',
    GOAL_REVIEW: 'Goal Review',
    CAREER: 'Career',
    FEEDBACK: 'Feedback',
    ONBOARDING: 'Onboarding',
    PROBATION: 'Probation',
    EXIT: 'Exit',
  };
  return type ? map[type] || type : 'Regular';
}

function getPriorityColor(priority: MeetingAgendaPriority | MeetingActionPriority | undefined): string {
  switch (priority) {
    case 'URGENT': return 'text-danger-600 dark:text-danger-400';
    case 'HIGH': return 'text-warning-600 dark:text-warning-400';
    case 'MEDIUM': return 'text-warning-600 dark:text-warning-400';
    case 'LOW': return 'text-gray-500 dark:text-gray-400';
    default: return 'text-gray-500';
  }
}

function getActionStatusColor(status: MeetingActionStatus): string {
  switch (status) {
    case 'OPEN': return 'bg-accent-100 text-accent-800 dark:bg-accent-900/30 dark:text-accent-400';
    case 'IN_PROGRESS': return 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-400';
    case 'COMPLETED': return 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400';
    case 'CANCELLED': return 'bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-400';
    case 'CARRIED_OVER': return 'bg-accent-300 text-accent-900 dark:bg-accent-900/30 dark:text-accent-600';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] p-4 shadow-sm skeuo-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text-muted)] skeuo-deboss">{title}</p>
          <p className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-secondary)] mt-1 skeuo-emboss">
            {value}
          </p>
          {subtitle && <p className="text-xs text-[var(--text-muted)] mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function OneOnOnePage() {
  // ── State ──────────────────────────────────────────────────────────
  const [view, setView] = useState<'list' | 'detail' | 'schedule'>('list');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'all' | 'manager'>('upcoming');
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<MeetingStatus | 'ALL'>('ALL');
  const [showAgendaForm, setShowAgendaForm] = useState(false);
  const [showActionForm, setShowActionForm] = useState(false);
  const [deleteAgendaItem, setDeleteAgendaItem] = useState<{ meetingId: string; itemId: string } | null>(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [completeSummary, setCompleteSummary] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [sharedNotes, setSharedNotes] = useState('');
  const [detailTab, setDetailTab] = useState<'agenda' | 'actions' | 'notes' | 'feedback'>('agenda');

  // ── Queries ────────────────────────────────────────────────────────
  const upcomingQuery = useUpcomingMeetings();
  const allMeetingsQuery = useMyMeetings(page, 20);
  const dashboardQuery = useMeetingDashboard();
  const pendingActionsQuery = usePendingActionItems();
  const overdueActionsQuery = useOverdueActionItems();
  const detailQuery = useMeetingDetail(selectedMeetingId || '', !!selectedMeetingId && view === 'detail');

  // ── Mutations ──────────────────────────────────────────────────────
  const createMutation = useCreateMeeting();
  const startMutation = useStartMeeting();
  const completeMutation = useCompleteMeeting();
  const cancelMutation = useCancelMeeting();
  const rescheduleMutation = useRescheduleMeeting();
  const addAgendaMutation = useAddAgendaItem();
  const markDiscussedMutation = useMarkAgendaDiscussed();
  const deleteAgendaMutation = useDeleteAgendaItem();
  const createActionMutation = useCreateActionItem();
  const updateActionStatusMutation = useUpdateActionItemStatus();
  const updateNotesMutation = useUpdateMeetingNotes();
  const submitFeedbackMutation = useSubmitMeetingFeedback();

  // ── Schedule Form ──────────────────────────────────────────────────
  const scheduleForm = useForm<ScheduleMeetingFormData>({
    resolver: zodResolver(scheduleMeetingSchema),
    defaultValues: {
      employeeId: '',
      title: '',
      description: '',
      meetingDate: '',
      startTime: '',
      endTime: '',
      durationMinutes: 30,
      meetingType: 'REGULAR',
      location: '',
      meetingLink: '',
      isRecurring: false,
      recurrencePattern: '',
      recurrenceEndDate: '',
      reminderMinutesBefore: 15,
    },
  });

  const agendaForm = useForm<AgendaItemFormData>({
    resolver: zodResolver(agendaItemSchema),
    defaultValues: { title: '', description: '', priority: 'MEDIUM', category: '' },
  });

  const actionForm = useForm<ActionItemFormData>({
    resolver: zodResolver(actionItemSchema),
    defaultValues: { title: '', description: '', assigneeId: '', assigneeRole: 'EMPLOYEE', dueDate: '', priority: 'MEDIUM' },
  });

  const feedbackForm = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { rating: 5, feedback: '' },
  });

  const isRecurring = scheduleForm.watch('isRecurring');

  // ── Dashboard stats ────────────────────────────────────────────────
  const dashboard = dashboardQuery.data as Record<string, number | null> | undefined;
  const meeting = detailQuery.data;

  // ── Filtered meetings list ─────────────────────────────────────────
  const displayMeetings = useMemo(() => {
    let meetings: OneOnOneMeetingResponse[] = [];
    if (activeTab === 'upcoming') {
      meetings = upcomingQuery.data || [];
    } else {
      meetings = allMeetingsQuery.data?.content || [];
    }
    if (statusFilter !== 'ALL') {
      meetings = meetings.filter((m) => m.status === statusFilter);
    }
    return meetings;
  }, [activeTab, upcomingQuery.data, allMeetingsQuery.data, statusFilter]);

  const isLoading =
    (activeTab === 'upcoming' && upcomingQuery.isLoading) ||
    (activeTab === 'all' && allMeetingsQuery.isLoading) ||
    dashboardQuery.isLoading;

  const hasError =
    (activeTab === 'upcoming' && upcomingQuery.isError) ||
    (activeTab === 'all' && allMeetingsQuery.isError);

  // ── Handlers ───────────────────────────────────────────────────────
  const handleSchedule = async (data: ScheduleMeetingFormData) => {
    await createMutation.mutateAsync({
      employeeId: data.employeeId,
      title: data.title,
      description: data.description,
      meetingDate: data.meetingDate,
      startTime: data.startTime,
      endTime: data.endTime,
      durationMinutes: data.durationMinutes,
      meetingType: (data.meetingType as MeetingType) || undefined,
      location: data.location,
      meetingLink: data.meetingLink,
      isRecurring: data.isRecurring,
      recurrencePattern: data.isRecurring ? (data.recurrencePattern as RecurrencePattern) : undefined,
      recurrenceEndDate: data.isRecurring ? data.recurrenceEndDate : undefined,
      reminderMinutesBefore: data.reminderMinutesBefore,
    });
    scheduleForm.reset();
    setView('list');
  };

  const handleAddAgenda = async (data: AgendaItemFormData) => {
    if (!selectedMeetingId) return;
    await addAgendaMutation.mutateAsync({
      meetingId: selectedMeetingId,
      data: {
        title: data.title,
        description: data.description,
        priority: (data.priority as MeetingAgendaPriority) || undefined,
        category: (data.category as MeetingAgendaCategory) || undefined,
      },
    });
    agendaForm.reset();
    setShowAgendaForm(false);
  };

  const handleAddAction = async (data: ActionItemFormData) => {
    if (!selectedMeetingId) return;
    await createActionMutation.mutateAsync({
      meetingId: selectedMeetingId,
      data: {
        title: data.title,
        description: data.description,
        assigneeId: data.assigneeId,
        assigneeRole: data.assigneeRole,
        dueDate: data.dueDate || undefined,
        priority: (data.priority as MeetingActionPriority) || undefined,
      },
    });
    actionForm.reset();
    setShowActionForm(false);
  };

  const handleSubmitFeedback = async (data: FeedbackFormData) => {
    if (!selectedMeetingId) return;
    await submitFeedbackMutation.mutateAsync({
      meetingId: selectedMeetingId,
      data: { rating: data.rating, feedback: data.feedback },
    });
    feedbackForm.reset();
    setShowFeedbackForm(false);
  };

  const handleStartMeeting = async () => {
    if (!selectedMeetingId) return;
    await startMutation.mutateAsync(selectedMeetingId);
  };

  const handleCompleteMeeting = async () => {
    if (!selectedMeetingId) return;
    await completeMutation.mutateAsync({ meetingId: selectedMeetingId, summary: completeSummary || undefined });
    setShowCompleteModal(false);
    setCompleteSummary('');
  };

  const handleCancelMeeting = async () => {
    if (!selectedMeetingId || !cancelReason) return;
    await cancelMutation.mutateAsync({ meetingId: selectedMeetingId, reason: cancelReason });
    setShowCancelModal(false);
    setCancelReason('');
    setView('list');
  };

  const handleRescheduleMeeting = async () => {
    if (!selectedMeetingId || !rescheduleDate || !rescheduleTime) return;
    await rescheduleMutation.mutateAsync({
      meetingId: selectedMeetingId,
      data: { date: rescheduleDate, time: rescheduleTime },
    });
    setShowRescheduleModal(false);
    setRescheduleDate('');
    setRescheduleTime('');
    setView('list');
  };

  const handleSaveNotes = async () => {
    if (!selectedMeetingId) return;
    await updateNotesMutation.mutateAsync({
      meetingId: selectedMeetingId,
      data: {
        sharedNotes: sharedNotes || undefined,
        privateNotes: privateNotes || undefined,
      },
    });
  };

  // Sync notes when meeting detail loads
  useEffect(() => {
    if (meeting) {
      setSharedNotes(meeting.sharedNotes || '');
      setPrivateNotes('');
    }
  }, [meeting]);

  // ── Error fallback ─────────────────────────────────────────────────
  if (hasError) {
    return (
      <AppLayout activeMenuItem="one-on-one">
        <PageErrorFallback
          title="Failed to load meetings"
          error={new Error('Unable to fetch meeting data. Please try again.')}
          onReset={() => {
            upcomingQuery.refetch();
            allMeetingsQuery.refetch();
          }}
        />
      </AppLayout>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // DETAIL VIEW
  // ═══════════════════════════════════════════════════════════════════
  if (view === 'detail' && selectedMeetingId) {
    const statusBadge = getStatusBadge(meeting?.status);
    const isActive = meeting?.status === 'SCHEDULED' || meeting?.status === 'IN_PROGRESS';

    return (
      <AppLayout activeMenuItem="one-on-one">
        <div className="p-6 max-w-5xl mx-auto">
          {/* Back button */}
          <button
            onClick={() => { setView('list'); setSelectedMeetingId(null); }}
            className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to meetings
          </button>

          {detailQuery.isLoading ? (
            <div className="space-y-4">
              <SkeletonStatCard />
              <SkeletonStatCard />
            </div>
          ) : !meeting ? (
            <div className="text-center py-12 text-[var(--text-muted)]">Meeting not found.</div>
          ) : (
            <>
              {/* Meeting Header */}
              <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] p-6 shadow-sm skeuo-card mb-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-4 mb-2">
                      <h1 className="text-xl font-bold text-[var(--text-primary)] dark:text-[var(--text-secondary)] skeuo-emboss">
                        {meeting.title}
                      </h1>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusBadge.classes}`}>
                        {statusBadge.label}
                      </span>
                    </div>
                    {meeting.description && (
                      <p className="text-sm text-[var(--text-muted)] mb-3">{meeting.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-[var(--text-muted)]">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" /> {formatDate(meeting.meetingDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" /> {formatTime(meeting.startTime)}
                        {meeting.endTime && ` - ${formatTime(meeting.endTime)}`}
                      </span>
                      {meeting.durationMinutes && (
                        <span className="flex items-center gap-1">
                          {meeting.durationMinutes} min
                        </span>
                      )}
                      {meeting.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" /> {meeting.location}
                        </span>
                      )}
                      {meeting.meetingLink && (
                        <a
                          href={meeting.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-accent-700 dark:text-accent-400 hover:underline"
                        >
                          <Video className="h-4 w-4" /> Join
                        </a>
                      )}
                      {meeting.isRecurring && (
                        <span className="flex items-center gap-1">
                          <Repeat className="h-4 w-4" /> {meeting.recurrencePattern?.replace('_', '-')}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 mt-2 text-sm text-[var(--text-muted)]">
                      <span><strong>Type:</strong> {getMeetingTypeLabel(meeting.meetingType)}</span>
                      {meeting.employeeName && <span><strong>With:</strong> {meeting.employeeName}</span>}
                      {meeting.managerName && <span><strong>Manager:</strong> {meeting.managerName}</span>}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {isActive && (
                    <div className="flex flex-wrap gap-2">
                      {meeting.status === 'SCHEDULED' && (
                        <PermissionGate permission={Permissions.MEETING_CREATE}>
                          <button
                            onClick={handleStartMeeting}
                            disabled={startMutation.isPending}
                            className="flex items-center gap-1 px-4 py-1.5 text-sm bg-success-600 hover:bg-success-700 text-white rounded-lg transition-colors"
                          >
                            <Play className="h-3.5 w-3.5" /> Start
                          </button>
                        </PermissionGate>
                      )}
                      <PermissionGate permission={Permissions.MEETING_CREATE}>
                        <button
                          onClick={() => setShowCompleteModal(true)}
                          className="flex items-center gap-1 px-4 py-1.5 text-sm bg-accent-700 hover:bg-accent-800 text-white rounded-lg transition-colors"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                        </button>
                      </PermissionGate>
                      <button
                        onClick={() => setShowRescheduleModal(true)}
                        className="flex items-center gap-1 px-4 py-1.5 text-sm border border-[var(--border-main)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                      >
                        <CalendarClock className="h-3.5 w-3.5" /> Reschedule
                      </button>
                      <button
                        onClick={() => setShowCancelModal(true)}
                        className="flex items-center gap-1 px-4 py-1.5 text-sm border border-danger-300 text-danger-600 dark:text-danger-400 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
                      >
                        <Ban className="h-3.5 w-3.5" /> Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Detail Tabs */}
              <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] shadow-sm skeuo-card">
                <div className="flex border-b border-[var(--border-main)]">
                  {(['agenda', 'actions', 'notes', 'feedback'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setDetailTab(tab)}
                      className={`flex-1 px-4 py-4 text-sm font-medium transition-colors capitalize ${
                        detailTab === tab
                          ? 'border-b-2 border-accent-700 text-accent-700 dark:text-accent-400'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {tab === 'agenda' ? 'Talking Points' : tab === 'actions' ? 'Action Items' : tab === 'notes' ? 'Notes' : 'Feedback'}
                    </button>
                  ))}
                </div>

                <div className="p-6">
                  {/* ── Agenda / Talking Points Tab ── */}
                  {detailTab === 'agenda' && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold text-[var(--text-primary)]">Talking Points</h3>
                        {isActive && (
                          <button
                            onClick={() => setShowAgendaForm(!showAgendaForm)}
                            className="flex items-center gap-1 text-sm text-accent-700 dark:text-accent-400 hover:underline"
                          >
                            <Plus className="h-4 w-4" /> Add Point
                          </button>
                        )}
                      </div>

                      {showAgendaForm && (
                        <form onSubmit={agendaForm.handleSubmit(handleAddAgenda)} className="mb-4 p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-main)]">
                          <div className="space-y-4">
                            <div>
                              <input
                                {...agendaForm.register('title')}
                                placeholder="What would you like to discuss?"
                                className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-700"
                              />
                              {agendaForm.formState.errors.title && (
                                <p className="text-xs text-danger-500 mt-1">{agendaForm.formState.errors.title.message}</p>
                              )}
                            </div>
                            <textarea
                              {...agendaForm.register('description')}
                              placeholder="Additional details (optional)"
                              rows={2}
                              className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-700"
                            />
                            <div className="flex gap-4">
                              <select
                                {...agendaForm.register('priority')}
                                className="px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] text-sm"
                              >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="URGENT">Urgent</option>
                              </select>
                              <select
                                {...agendaForm.register('category')}
                                className="px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] text-sm"
                              >
                                <option value="">Category</option>
                                <option value="WORK_UPDATES">Work Updates</option>
                                <option value="BLOCKERS">Blockers</option>
                                <option value="FEEDBACK">Feedback</option>
                                <option value="CAREER_GROWTH">Career Growth</option>
                                <option value="GOALS">Goals</option>
                                <option value="WELLBEING">Wellbeing</option>
                                <option value="RECOGNITION">Recognition</option>
                                <option value="OTHER">Other</option>
                              </select>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="submit"
                                disabled={addAgendaMutation.isPending}
                                className="px-4 py-2 text-sm bg-accent-700 hover:bg-accent-800 text-white rounded-lg transition-colors"
                              >
                                {addAgendaMutation.isPending ? 'Adding...' : 'Add'}
                              </button>
                              <button
                                type="button"
                                onClick={() => { agendaForm.reset(); setShowAgendaForm(false); }}
                                className="px-4 py-2 text-sm border border-[var(--border-main)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-secondary)]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </form>
                      )}

                      {(meeting.agendaItems || []).length === 0 ? (
                        <div className="text-center py-8 text-[var(--text-muted)]">
                          <ListChecks className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          <p>No talking points yet. Add one to get started.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {(meeting.agendaItems || []).map((item: MeetingAgendaItemResponse) => (
                            <div
                              key={item.id}
                              className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                                item.isDiscussed
                                  ? 'bg-success-50/50 dark:bg-success-900/10 border-success-200 dark:border-success-800'
                                  : 'bg-[var(--bg-card)] border-[var(--border-main)]'
                              }`}
                            >
                              <button
                                onClick={() => {
                                  if (!item.isDiscussed && isActive) {
                                    markDiscussedMutation.mutate({
                                      meetingId: selectedMeetingId,
                                      itemId: item.id,
                                    });
                                  }
                                }}
                                disabled={item.isDiscussed || !isActive}
                                className="mt-0.5 flex-shrink-0"
                              >
                                {item.isDiscussed ? (
                                  <CheckCircle2 className="h-5 w-5 text-success-600" />
                                ) : (
                                  <CircleDot className="h-5 w-5 text-[var(--text-muted)] hover:text-accent-700" />
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className={`text-sm font-medium ${item.isDiscussed ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                                    {item.title}
                                  </p>
                                  {item.priority && item.priority !== 'MEDIUM' && (
                                    <span className={`text-xs font-medium ${getPriorityColor(item.priority)}`}>
                                      {item.priority}
                                    </span>
                                  )}
                                  {item.category && (
                                    <span className="text-xs px-1.5 py-0.5 bg-[var(--bg-secondary)] rounded text-[var(--text-muted)]">
                                      {item.category.replace('_', ' ')}
                                    </span>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{item.description}</p>
                                )}
                                {item.discussionNotes && (
                                  <p className="text-xs text-success-700 dark:text-success-400 mt-1 italic">{item.discussionNotes}</p>
                                )}
                                <span className="text-xs text-[var(--text-muted)]">Added by {item.addedBy?.toLowerCase()}</span>
                              </div>
                              {isActive && !item.isDiscussed && (
                                <button
                                  onClick={() => setDeleteAgendaItem({ meetingId: selectedMeetingId!, itemId: item.id })}
                                  className="text-[var(--text-muted)] hover:text-danger-500 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Action Items Tab ── */}
                  {detailTab === 'actions' && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold text-[var(--text-primary)]">Action Items</h3>
                        {isActive && (
                          <PermissionGate permission={Permissions.MEETING_CREATE}>
                            <button
                              onClick={() => setShowActionForm(!showActionForm)}
                              className="flex items-center gap-1 text-sm text-accent-700 dark:text-accent-400 hover:underline"
                            >
                              <Plus className="h-4 w-4" /> Add Action
                            </button>
                          </PermissionGate>
                        )}
                      </div>

                      {showActionForm && (
                        <form onSubmit={actionForm.handleSubmit(handleAddAction)} className="mb-4 p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-main)]">
                          <div className="space-y-4">
                            <input
                              {...actionForm.register('title')}
                              placeholder="Action item title"
                              className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-700"
                            />
                            {actionForm.formState.errors.title && (
                              <p className="text-xs text-danger-500">{actionForm.formState.errors.title.message}</p>
                            )}
                            <textarea
                              {...actionForm.register('description')}
                              placeholder="Description (optional)"
                              rows={2}
                              className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-700"
                            />
                            <div className="grid grid-cols-2 gap-4">
                              <input
                                {...actionForm.register('assigneeId')}
                                placeholder="Assignee Employee ID"
                                className="px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-700"
                              />
                              {actionForm.formState.errors.assigneeId && (
                                <p className="text-xs text-danger-500 col-span-2">{actionForm.formState.errors.assigneeId.message}</p>
                              )}
                              <select
                                {...actionForm.register('assigneeRole')}
                                className="px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] text-sm"
                              >
                                <option value="EMPLOYEE">Employee</option>
                                <option value="MANAGER">Manager</option>
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <input
                                type="date"
                                {...actionForm.register('dueDate')}
                                className="px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-700"
                              />
                              <select
                                {...actionForm.register('priority')}
                                className="px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] text-sm"
                              >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="URGENT">Urgent</option>
                              </select>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="submit"
                                disabled={createActionMutation.isPending}
                                className="px-4 py-2 text-sm bg-accent-700 hover:bg-accent-800 text-white rounded-lg transition-colors"
                              >
                                {createActionMutation.isPending ? 'Adding...' : 'Add Action'}
                              </button>
                              <button
                                type="button"
                                onClick={() => { actionForm.reset(); setShowActionForm(false); }}
                                className="px-4 py-2 text-sm border border-[var(--border-main)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-secondary)]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </form>
                      )}

                      {(meeting.actionItems || []).length === 0 ? (
                        <div className="text-center py-8 text-[var(--text-muted)]">
                          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          <p>No action items yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {(meeting.actionItems || []).map((item: MeetingActionItemResponse) => (
                            <div
                              key={item.id}
                              className="flex items-start gap-4 p-4 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)]"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-medium text-[var(--text-primary)]">{item.title}</p>
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${getActionStatusColor(item.status)}`}>
                                    {item.status.replace('_', ' ')}
                                  </span>
                                  {item.isOverdue && (
                                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-400 font-medium">
                                      Overdue
                                    </span>
                                  )}
                                  <span className={`text-xs font-medium ${getPriorityColor(item.priority)}`}>{item.priority}</span>
                                </div>
                                {item.description && (
                                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{item.description}</p>
                                )}
                                <div className="flex gap-4 mt-1 text-xs text-[var(--text-muted)]">
                                  <span>Assigned to: {item.assigneeName || item.assigneeRole.toLowerCase()}</span>
                                  {item.dueDate && <span>Due: {formatDate(item.dueDate)}</span>}
                                </div>
                              </div>
                              {item.status !== 'COMPLETED' && item.status !== 'CANCELLED' && (
                                <div className="flex gap-1">
                                  {item.status === 'OPEN' && (
                                    <button
                                      onClick={() =>
                                        updateActionStatusMutation.mutate({
                                          actionId: item.id,
                                          data: { status: 'IN_PROGRESS' },
                                        })
                                      }
                                      className="text-xs px-2 py-1 rounded border border-[var(--border-main)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] transition-colors"
                                      title="Mark In Progress"
                                    >
                                      Start
                                    </button>
                                  )}
                                  <button
                                    onClick={() =>
                                      updateActionStatusMutation.mutate({
                                        actionId: item.id,
                                        data: { status: 'COMPLETED' },
                                      })
                                    }
                                    className="text-xs px-2 py-1 rounded bg-success-600 text-white hover:bg-success-700 transition-colors"
                                    title="Mark Complete"
                                  >
                                    <Check className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Notes Tab ── */}
                  {detailTab === 'notes' && (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                          Shared Notes
                        </label>
                        <p className="text-xs text-[var(--text-muted)] mb-2">Visible to both participants</p>
                        <textarea
                          value={sharedNotes}
                          onChange={(e) => setSharedNotes(e.target.value)}
                          rows={5}
                          placeholder="Write shared meeting notes..."
                          className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-700"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                          Private Notes
                        </label>
                        <p className="text-xs text-[var(--text-muted)] mb-2">Only visible to you</p>
                        <textarea
                          value={privateNotes}
                          onChange={(e) => setPrivateNotes(e.target.value)}
                          rows={4}
                          placeholder="Write your private notes..."
                          className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-700"
                        />
                      </div>
                      <button
                        onClick={handleSaveNotes}
                        disabled={updateNotesMutation.isPending}
                        className="flex items-center gap-1 px-4 py-2 text-sm bg-accent-700 hover:bg-accent-800 text-white rounded-lg transition-colors"
                      >
                        <Send className="h-3.5 w-3.5" />
                        {updateNotesMutation.isPending ? 'Saving...' : 'Save Notes'}
                      </button>
                      {meeting.meetingSummary && (
                        <div className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-main)]">
                          <h4 className="text-sm font-medium text-[var(--text-primary)] mb-1">Meeting Summary</h4>
                          <p className="text-sm text-[var(--text-muted)]">{meeting.meetingSummary}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Feedback Tab ── */}
                  {detailTab === 'feedback' && (
                    <div>
                      {meeting.employeeRating ? (
                        <div className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-main)]">
                          <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">Meeting Feedback</h4>
                          <div className="flex items-center gap-1 mb-2">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`h-5 w-5 ${s <= (meeting.employeeRating || 0) ? 'text-warning-400 fill-warning-400' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                          {meeting.employeeFeedback && (
                            <p className="text-sm text-[var(--text-muted)]">{meeting.employeeFeedback}</p>
                          )}
                        </div>
                      ) : meeting.status === 'COMPLETED' ? (
                        <div>
                          {showFeedbackForm ? (
                            <form onSubmit={feedbackForm.handleSubmit(handleSubmitFeedback)} className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Rating</label>
                                <Controller
                                  name="rating"
                                  control={feedbackForm.control}
                                  render={({ field }) => (
                                    <div className="flex items-center gap-1">
                                      {[1, 2, 3, 4, 5].map((s) => (
                                        <button
                                          key={s}
                                          type="button"
                                          onClick={() => field.onChange(s)}
                                          className="focus:outline-none"
                                        >
                                          <Star
                                            className={`h-7 w-7 transition-colors ${
                                              s <= field.value ? 'text-warning-400 fill-warning-400' : 'text-gray-300 hover:text-warning-300'
                                            }`}
                                          />
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Feedback</label>
                                <textarea
                                  {...feedbackForm.register('feedback')}
                                  rows={3}
                                  placeholder="How was this meeting?"
                                  className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-700"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="submit"
                                  disabled={submitFeedbackMutation.isPending}
                                  className="px-4 py-2 text-sm bg-accent-700 hover:bg-accent-800 text-white rounded-lg"
                                >
                                  {submitFeedbackMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowFeedbackForm(false)}
                                  className="px-4 py-2 text-sm border border-[var(--border-main)] text-[var(--text-primary)] rounded-lg"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div className="text-center py-8">
                              <Star className="h-8 w-8 mx-auto mb-2 text-[var(--text-muted)] opacity-40" />
                              <p className="text-[var(--text-muted)] mb-3">No feedback submitted yet.</p>
                              <button
                                onClick={() => setShowFeedbackForm(true)}
                                className="px-4 py-2 text-sm bg-accent-700 hover:bg-accent-800 text-white rounded-lg transition-colors"
                              >
                                Submit Feedback
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-[var(--text-muted)]">
                          <Star className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          <p>Feedback can be submitted after the meeting is completed.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Modals ── */}
              {/* Cancel Modal */}
              {showCancelModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="bg-[var(--bg-card)] rounded-lg shadow-xl max-w-md w-full p-6">
                    <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Cancel Meeting</h3>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Reason for cancellation..."
                      rows={3}
                      className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-700 mb-4"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { setShowCancelModal(false); setCancelReason(''); }}
                        className="px-4 py-2 text-sm border border-[var(--border-main)] text-[var(--text-primary)] rounded-lg"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleCancelMeeting}
                        disabled={!cancelReason || cancelMutation.isPending}
                        className="px-4 py-2 text-sm bg-danger-600 hover:bg-danger-700 text-white rounded-lg disabled:opacity-50"
                      >
                        {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Meeting'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Reschedule Modal */}
              {showRescheduleModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="bg-[var(--bg-card)] rounded-lg shadow-xl max-w-md w-full p-6">
                    <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Reschedule Meeting</h3>
                    <div className="space-y-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">New Date</label>
                        <input
                          type="date"
                          value={rescheduleDate}
                          onChange={(e) => setRescheduleDate(e.target.value)}
                          className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-700"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">New Time</label>
                        <input
                          type="time"
                          value={rescheduleTime}
                          onChange={(e) => setRescheduleTime(e.target.value)}
                          className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-700"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { setShowRescheduleModal(false); setRescheduleDate(''); setRescheduleTime(''); }}
                        className="px-4 py-2 text-sm border border-[var(--border-main)] text-[var(--text-primary)] rounded-lg"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleRescheduleMeeting}
                        disabled={!rescheduleDate || !rescheduleTime || rescheduleMutation.isPending}
                        className="px-4 py-2 text-sm bg-accent-700 hover:bg-accent-800 text-white rounded-lg disabled:opacity-50"
                      >
                        {rescheduleMutation.isPending ? 'Rescheduling...' : 'Reschedule'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Complete Modal */}
              {showCompleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="bg-[var(--bg-card)] rounded-lg shadow-xl max-w-md w-full p-6">
                    <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Complete Meeting</h3>
                    <textarea
                      value={completeSummary}
                      onChange={(e) => setCompleteSummary(e.target.value)}
                      placeholder="Meeting summary (optional)..."
                      rows={4}
                      className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-700 mb-4"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { setShowCompleteModal(false); setCompleteSummary(''); }}
                        className="px-4 py-2 text-sm border border-[var(--border-main)] text-[var(--text-primary)] rounded-lg"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleCompleteMeeting}
                        disabled={completeMutation.isPending}
                        className="px-4 py-2 text-sm bg-accent-700 hover:bg-accent-800 text-white rounded-lg"
                      >
                        {completeMutation.isPending ? 'Completing...' : 'Complete'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Delete Agenda Item Confirm Dialog */}
        <ConfirmDialog
          isOpen={deleteAgendaItem !== null}
          onClose={() => setDeleteAgendaItem(null)}
          onConfirm={() => {
            if (deleteAgendaItem) {
              deleteAgendaMutation.mutate(deleteAgendaItem, {
                onSuccess: () => setDeleteAgendaItem(null),
                onError: () => setDeleteAgendaItem(null),
              });
            }
          }}
          title="Delete Agenda Item"
          message="Are you sure you want to delete this agenda item? This action cannot be undone."
          confirmText="Delete"
          type="danger"
          loading={deleteAgendaMutation.isPending}
        />
      </AppLayout>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // SCHEDULE VIEW
  // ═══════════════════════════════════════════════════════════════════
  if (view === 'schedule') {
    return (
      <AppLayout activeMenuItem="one-on-one">
        <div className="p-6 max-w-3xl mx-auto">
          <button
            onClick={() => setView('list')}
            className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to meetings
          </button>

          <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] p-6 shadow-sm skeuo-card">
            <h1 className="text-xl font-bold text-[var(--text-primary)] dark:text-[var(--text-secondary)] mb-6 skeuo-emboss">
              Schedule 1-on-1 Meeting
            </h1>

            <form onSubmit={scheduleForm.handleSubmit(handleSchedule)} className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Title *</label>
                <input
                  {...scheduleForm.register('title')}
                  placeholder="Weekly 1-on-1 check-in"
                  className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-700"
                />
                {scheduleForm.formState.errors.title && (
                  <p className="text-xs text-danger-500 mt-1">{scheduleForm.formState.errors.title.message}</p>
                )}
              </div>

              {/* Participant */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Participant (Employee ID) *</label>
                <input
                  {...scheduleForm.register('employeeId')}
                  placeholder="Enter employee ID"
                  className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-700"
                />
                {scheduleForm.formState.errors.employeeId && (
                  <p className="text-xs text-danger-500 mt-1">{scheduleForm.formState.errors.employeeId.message}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Description</label>
                <textarea
                  {...scheduleForm.register('description')}
                  placeholder="Meeting agenda or description..."
                  rows={3}
                  className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-700"
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Date *</label>
                  <input
                    type="date"
                    {...scheduleForm.register('meetingDate')}
                    className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-700"
                  />
                  {scheduleForm.formState.errors.meetingDate && (
                    <p className="text-xs text-danger-500 mt-1">{scheduleForm.formState.errors.meetingDate.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Start Time *</label>
                  <input
                    type="time"
                    {...scheduleForm.register('startTime')}
                    className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-700"
                  />
                  {scheduleForm.formState.errors.startTime && (
                    <p className="text-xs text-danger-500 mt-1">{scheduleForm.formState.errors.startTime.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Duration (min)</label>
                  <input
                    type="number"
                    {...scheduleForm.register('durationMinutes')}
                    min={15}
                    max={480}
                    className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-700"
                  />
                </div>
              </div>

              {/* Meeting Type & Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Meeting Type</label>
                  <select
                    {...scheduleForm.register('meetingType')}
                    className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)]"
                  >
                    <option value="REGULAR">Regular Check-in</option>
                    <option value="PERFORMANCE">Performance Review</option>
                    <option value="GOAL_REVIEW">Goal Review</option>
                    <option value="CAREER">Career Development</option>
                    <option value="FEEDBACK">Feedback Session</option>
                    <option value="ONBOARDING">Onboarding</option>
                    <option value="PROBATION">Probation Review</option>
                    <option value="EXIT">Exit Interview</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Location</label>
                  <input
                    {...scheduleForm.register('location')}
                    placeholder="Office / Virtual"
                    className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-700"
                  />
                </div>
              </div>

              {/* Meeting Link */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Meeting Link</label>
                <input
                  {...scheduleForm.register('meetingLink')}
                  placeholder="https://meet.google.com/..."
                  className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-700"
                />
              </div>

              {/* Recurring */}
              <div className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-main)]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...scheduleForm.register('isRecurring')}
                    className="h-4 w-4 rounded border-gray-300 text-accent-700 focus:ring-accent-700"
                  />
                  <span className="text-sm font-medium text-[var(--text-primary)]">Make this a recurring meeting</span>
                </label>
                {isRecurring && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Frequency</label>
                      <select
                        {...scheduleForm.register('recurrencePattern')}
                        className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)]"
                      >
                        <option value="WEEKLY">Weekly</option>
                        <option value="BI_WEEKLY">Bi-Weekly</option>
                        <option value="MONTHLY">Monthly</option>
                        <option value="QUARTERLY">Quarterly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">End Date</label>
                      <input
                        type="date"
                        {...scheduleForm.register('recurrenceEndDate')}
                        className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-700"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex gap-4 pt-2">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-6 py-2.5 text-sm font-medium bg-accent-700 hover:bg-accent-800 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Scheduling...' : 'Schedule Meeting'}
                </button>
                <button
                  type="button"
                  onClick={() => { scheduleForm.reset(); setView('list'); }}
                  className="px-6 py-2.5 text-sm font-medium border border-[var(--border-main)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // LIST VIEW (default)
  // ═══════════════════════════════════════════════════════════════════
  return (
    <AppLayout activeMenuItem="one-on-one">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-secondary)] skeuo-emboss">
              1-on-1 Meetings
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 skeuo-deboss">
              Schedule, manage, and track your 1-on-1 conversations
            </p>
          </div>
          <PermissionGate permission={Permissions.MEETING_CREATE}>
            <button
              onClick={() => setView('schedule')}
              className="flex items-center gap-2 px-4 py-2.5 bg-accent-700 hover:bg-accent-800 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" /> Schedule Meeting
            </button>
          </PermissionGate>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {dashboardQuery.isLoading ? (
            <>
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
            </>
          ) : (
            <>
              <StatCard
                title="Upcoming"
                value={dashboard?.upcomingMeetings ?? 0}
                subtitle="Scheduled meetings"
                icon={Calendar}
                color="bg-accent-600"
              />
              <StatCard
                title="Pending Actions"
                value={pendingActionsQuery.data?.length ?? 0}
                subtitle="Items to complete"
                icon={ListChecks}
                color="bg-warning-500"
              />
              <StatCard
                title="Overdue Actions"
                value={overdueActionsQuery.data?.length ?? 0}
                subtitle="Past due date"
                icon={AlertCircle}
                color="bg-danger-500"
              />
              <StatCard
                title="Completion Rate"
                value={`${Math.round((dashboard?.actionItemCompletionRate as number) || 0)}%`}
                subtitle="Action items completed"
                icon={CheckCircle2}
                color="bg-success-500"
              />
            </>
          )}
        </div>

        {/* Overdue Actions Banner */}
        {(overdueActionsQuery.data?.length || 0) > 0 && (
          <div className="mb-6 p-4 tint-orange border border-[var(--status-warning-border)] rounded-lg">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-warning-100 dark:bg-warning-900/40 rounded-lg">
                <AlertCircle className="h-5 w-5 text-warning-600 dark:text-warning-400" />
              </div>
              <div>
                <p className="font-medium text-warning-800 dark:text-warning-300">
                  You have {overdueActionsQuery.data?.length} overdue action item(s)
                </p>
                <p className="text-sm text-warning-600 dark:text-warning-400">
                  Review and complete your pending action items
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs + Filters */}
        <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] shadow-sm skeuo-card mb-6">
          <div className="flex border-b border-[var(--border-main)]">
            {([
              { key: 'upcoming', label: 'Upcoming' },
              { key: 'all', label: 'All Meetings' },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setPage(0); }}
                className={`flex-1 px-4 py-4 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'border-b-2 border-accent-700 text-accent-700 dark:text-accent-400'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          {activeTab === 'all' && (
            <div className="p-4 border-b border-[var(--border-main)]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-[var(--text-muted)]" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as MeetingStatus | 'ALL')}
                  className="px-4 py-1.5 text-sm border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="RESCHEDULED">Rescheduled</option>
                </select>
              </div>
            </div>
          )}

          {/* Meeting List */}
          <div className="divide-y divide-[var(--border-main)]">
            {isLoading ? (
              <div className="p-8 text-center text-[var(--text-muted)]">Loading meetings...</div>
            ) : displayMeetings.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="h-10 w-10 mx-auto mb-3 text-[var(--text-muted)] opacity-40" />
                <p className="text-[var(--text-muted)] mb-1">No meetings found</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {activeTab === 'upcoming'
                    ? 'Schedule a new 1-on-1 to get started.'
                    : 'Try adjusting your filters.'}
                </p>
              </div>
            ) : (
              displayMeetings.map((m) => {
                const badge = getStatusBadge(m.status);
                return (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedMeetingId(m.id); setView('detail'); }}
                    className="w-full text-left p-4 hover:bg-[var(--bg-secondary)] transition-colors flex items-center gap-4"
                  >
                    <div className="hidden md:flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-400">
                      <span className="text-xs font-medium uppercase">
                        {new Date(m.meetingDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-lg font-bold leading-tight">
                        {new Date(m.meetingDate + 'T00:00:00').getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{m.title}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${badge.classes}`}>
                          {badge.label}
                        </span>
                        {m.isRecurring && (
                          <Repeat className="h-3.5 w-3.5 text-[var(--text-muted)] flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex gap-4 text-xs text-[var(--text-muted)]">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {formatTime(m.startTime)}
                        </span>
                        {m.durationMinutes && <span>{m.durationMinutes} min</span>}
                        <span>{getMeetingTypeLabel(m.meetingType)}</span>
                        {m.employeeName && <span>with {m.employeeName}</span>}
                        {m.managerName && <span>with {m.managerName}</span>}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
                  </button>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {activeTab === 'all' && allMeetingsQuery.data && allMeetingsQuery.data.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-[var(--border-main)]">
              <p className="text-xs text-[var(--text-muted)]">
                Page {page + 1} of {allMeetingsQuery.data.totalPages} ({allMeetingsQuery.data.totalElements} meetings)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="px-4 py-1.5 text-xs border border-[var(--border-main)] rounded-lg text-[var(--text-primary)] disabled:opacity-50 hover:bg-[var(--bg-secondary)]"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= allMeetingsQuery.data.totalPages - 1}
                  className="px-4 py-1.5 text-xs border border-[var(--border-main)] rounded-lg text-[var(--text-primary)] disabled:opacity-50 hover:bg-[var(--bg-secondary)]"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
