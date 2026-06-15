'use client';

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  ChevronDown,
  Clock,
  DollarSign,
  Filter,
  GripVertical,
  Inbox,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Star,
  TrendingUp,
  User,
  X,
} from 'lucide-react';
import type {DropResult} from '@hello-pangea/dnd';
// FUTURE: NUAURA-003 — Code-split the DnD library: extract the entire KanbanBoard
// section into a separate PipelineKanbanBoard.tsx component and dynamic-import that
// file instead of importing DragDropContext/Droppable/Draggable directly here.
import {DragDropContext, Draggable, Droppable} from '@hello-pangea/dnd';
import {AppLayout} from '@/components/layout/AppLayout';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {Button, Input, Modal, ModalBody, ModalFooter, ModalHeader, Select, Textarea,} from '@/components/ui';
import {applicantService} from '@/lib/services/hire/applicant.service';
import {useQueryClient} from '@tanstack/react-query';
import {useJobOpenings} from '@/lib/hooks/queries/useRecruitment';
import {applicantKeys, usePipelineByJob} from '@/lib/hooks/queries/useApplicants';
import type {Applicant, ApplicantRequest, ApplicantStatusUpdate, PipelineData,} from '@/lib/types/hire/applicant';
import {ApplicationSource, ApplicationStatus,} from '@/lib/types/hire/applicant';
import {createLogger} from '@/lib/utils/logger';

const log = createLogger('PipelinePage');

// ─── Constants ────────────────────────────────────────────────────────────────

const PIPELINE_STAGES: ApplicationStatus[] = [
  ApplicationStatus.APPLIED,
  ApplicationStatus.SCREENING,
  ApplicationStatus.PHONE_SCREEN,
  ApplicationStatus.INTERVIEW,
  ApplicationStatus.TECHNICAL_ROUND,
  ApplicationStatus.HR_ROUND,
  ApplicationStatus.OFFER_PENDING,
  ApplicationStatus.OFFERED,
  ApplicationStatus.ACCEPTED,
  ApplicationStatus.REJECTED,
];

const STAGE_LABELS: Record<ApplicationStatus, string> = {
  [ApplicationStatus.APPLIED]: 'Applied',
  [ApplicationStatus.SCREENING]: 'Screening',
  [ApplicationStatus.PHONE_SCREEN]: 'Phone Screen',
  [ApplicationStatus.INTERVIEW]: 'Interview',
  [ApplicationStatus.TECHNICAL_ROUND]: 'Technical',
  [ApplicationStatus.HR_ROUND]: 'HR Round',
  [ApplicationStatus.OFFER_PENDING]: 'Offer Pending',
  [ApplicationStatus.OFFERED]: 'Offered',
  [ApplicationStatus.ACCEPTED]: 'Accepted',
  [ApplicationStatus.REJECTED]: 'Rejected',
  [ApplicationStatus.WITHDRAWN]: 'Withdrawn',
};

const STAGE_COLORS: Record<ApplicationStatus, { col: string; header: string; badge: string; bg: string }> = {
  [ApplicationStatus.APPLIED]: {
    col: 'border-t-accent-500',
    header: 'bg-accent-50',
    badge: 'bg-accent-100 text-accent-700',
    bg: 'bg-accent-50/50'
  },
  [ApplicationStatus.SCREENING]: {
    col: 'border-t-accent-500',
    header: 'bg-accent-50',
    badge: 'bg-accent-100 text-accent-700',
    bg: 'bg-accent-50/50'
  },
  [ApplicationStatus.PHONE_SCREEN]: {
    col: 'border-t-accent-500',
    header: 'bg-accent-50',
    badge: 'bg-accent-100 text-accent-700',
    bg: 'bg-accent-50/50'
  },
  [ApplicationStatus.INTERVIEW]: {
    col: 'border-t-accent-700',
    header: 'bg-accent-50',
    badge: 'bg-accent-100 text-accent-700',
    bg: 'bg-accent-50/50'
  },
  [ApplicationStatus.TECHNICAL_ROUND]: {
    col: 'border-t-accent-700',
    header: 'bg-accent-50',
    badge: 'bg-accent-100 text-accent-700',
    bg: 'bg-accent-50/50'
  },
  [ApplicationStatus.HR_ROUND]: {
    col: 'border-t-accent-800',
    header: 'bg-accent-50',
    badge: 'bg-accent-100 text-accent-700',
    bg: 'bg-accent-50/50'
  },
  [ApplicationStatus.OFFER_PENDING]: {
    col: 'border-t-warning-500',
    header: 'bg-warning-50',
    badge: 'bg-warning-100 text-warning-700',
    bg: 'bg-warning-50/50'
  },
  [ApplicationStatus.OFFERED]: {
    col: 'border-t-success-500',
    header: 'bg-success-50',
    badge: 'bg-success-100 text-success-700',
    bg: 'bg-success-50/50'
  },
  [ApplicationStatus.ACCEPTED]: {
    col: 'border-t-success-600',
    header: 'bg-success-50',
    badge: 'bg-success-100 text-success-700',
    bg: 'bg-success-50/50'
  },
  [ApplicationStatus.REJECTED]: {
    col: 'border-t-danger-500',
    header: 'bg-danger-50',
    badge: 'bg-danger-100 text-danger-700',
    bg: 'bg-danger-50/50'
  },
  [ApplicationStatus.WITHDRAWN]: {
    col: 'border-t-[var(--border-main)]',
    header: 'bg-[var(--bg-surface)]',
    badge: 'bg-[var(--bg-surface)] text-[var(--text-secondary)]',
    bg: 'bg-[var(--bg-surface)]/50'
  },
};

const SOURCE_BADGE_CLASS: Record<ApplicationSource, string> = {
  [ApplicationSource.WEBSITE]: 'tint-info text-accent-600',
  [ApplicationSource.REFERRAL]: 'tint-success text-success-700',
  [ApplicationSource.JOB_BOARD]: 'tint-info text-accent-600',
  [ApplicationSource.LINKEDIN]: 'tint-info text-accent-600',
  [ApplicationSource.CAMPUS]: 'tint-accent text-accent-600',
  [ApplicationSource.AGENCY]: 'tint-warning text-warning-600',
  [ApplicationSource.OTHER]: 'bg-[var(--bg-surface)] text-[var(--text-muted)]',
};

// All valid transition targets from each stage
const STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  [ApplicationStatus.APPLIED]: [ApplicationStatus.SCREENING, ApplicationStatus.INTERVIEW, ApplicationStatus.REJECTED],
  [ApplicationStatus.SCREENING]: [ApplicationStatus.PHONE_SCREEN, ApplicationStatus.INTERVIEW, ApplicationStatus.TECHNICAL_ROUND, ApplicationStatus.REJECTED],
  [ApplicationStatus.PHONE_SCREEN]: [ApplicationStatus.INTERVIEW, ApplicationStatus.TECHNICAL_ROUND, ApplicationStatus.HR_ROUND, ApplicationStatus.REJECTED],
  [ApplicationStatus.INTERVIEW]: [ApplicationStatus.TECHNICAL_ROUND, ApplicationStatus.HR_ROUND, ApplicationStatus.OFFER_PENDING, ApplicationStatus.OFFERED, ApplicationStatus.REJECTED],
  [ApplicationStatus.TECHNICAL_ROUND]: [ApplicationStatus.HR_ROUND, ApplicationStatus.OFFER_PENDING, ApplicationStatus.OFFERED, ApplicationStatus.REJECTED],
  [ApplicationStatus.HR_ROUND]: [ApplicationStatus.OFFER_PENDING, ApplicationStatus.OFFERED, ApplicationStatus.REJECTED],
  [ApplicationStatus.OFFER_PENDING]: [ApplicationStatus.OFFERED, ApplicationStatus.REJECTED],
  [ApplicationStatus.OFFERED]: [ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED],
  [ApplicationStatus.ACCEPTED]: [],
  [ApplicationStatus.REJECTED]: [],
  [ApplicationStatus.WITHDRAWN]: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatLabel = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

const getDaysSince = (dateStr?: string | null): number | null => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  const diff = Date.now() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const getTimeInStage = (dateStr?: string | null): string => {
  if (!dateStr) return '—';
  const days = getDaysSince(dateStr);
  if (days === null) return '—';
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? '1 week' : `${weeks} weeks`;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const r = (error as { response?: { data?: { message?: string } } }).response;
    return r?.data?.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
};

// ─── Sub-components ──────────────────────────────────────────────────────────

interface StarRatingProps {
  value: number;
  readOnly?: boolean;
  size?: number;
  onChange?: (v: number) => void;
}

const StarRating: React.FC<StarRatingProps> = ({value, readOnly = false, size = 13, onChange}) => (
  <div className="flex items-center gap-0.5">
    {Array.from({length: 5}).map((_, i) => (
      <button
        key={i}
        type="button"
        disabled={readOnly}
        onClick={() => !readOnly && onChange?.(i + 1)}
        className={`p-0 rounded transition-colors ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2`}
        aria-label={`${i + 1} star`}
      >
        <Star
          size={size}
          className={i < value ? 'fill-warning-400 text-warning-400' : 'text-[var(--text-muted)]'}
        />
      </button>
    ))}
  </div>
);

interface CardMenuProps {
  applicant: Applicant;
  onViewDetails: () => void;
  onMoveToNextStage: () => void;
  onReject: () => void;
  onCreateOffer?: () => void;
}

const CardMenu: React.FC<CardMenuProps> = ({applicant, onViewDetails, onMoveToNextStage, onReject, onCreateOffer}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const transitions = STATUS_TRANSITIONS[applicant.status] || [];
  const nextStage = transitions.find(s => s !== ApplicationStatus.REJECTED);
  const isTerminal = transitions.length === 0;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(v => !v);
        }}
        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
        aria-label="More options"
      >
        <MoreHorizontal size={14}/>
      </button>
      {open && (
        <div
          className="absolute right-0 top-6 z-30 w-44 bg-[var(--bg-elevated)] border border-[var(--border-main)] rounded-lg shadow-[var(--shadow-dropdown)] py-1 text-sm">
          <button
            type="button"
            className="w-full text-left px-4 py-2 hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            onClick={() => {
              setOpen(false);
              onViewDetails();
            }}
          >
            View Details
          </button>
          {!isTerminal && nextStage && (
            <button
              type="button"
              className="w-full text-left px-4 py-2 hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              onClick={() => {
                setOpen(false);
                onMoveToNextStage();
              }}
            >
              Move to {STAGE_LABELS[nextStage]}
            </button>
          )}
          {(applicant.status === ApplicationStatus.HR_ROUND || applicant.status === ApplicationStatus.OFFER_PENDING) && (
            <button
              type="button"
              className="w-full text-left px-4 py-2 hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              onClick={() => {
                setOpen(false);
                onCreateOffer?.();
              }}
            >
              Create Offer Letter
            </button>
          )}
          {applicant.status !== ApplicationStatus.REJECTED && (
            <button
              type="button"
              className="w-full text-left px-4 py-2 hover:bg-danger-50 text-danger-600 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              onClick={() => {
                setOpen(false);
                onReject();
              }}
            >
              Reject
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Analytics Bar Component ─────────────────────────────────────────────────

interface AnalyticsProps {
  pipelineData: PipelineData;
}

const PipelineAnalytics: React.FC<AnalyticsProps> = ({pipelineData}) => {
  const funnelStages = [
    ApplicationStatus.APPLIED,
    ApplicationStatus.SCREENING,
    ApplicationStatus.PHONE_SCREEN,
    ApplicationStatus.INTERVIEW,
    ApplicationStatus.TECHNICAL_ROUND,
    ApplicationStatus.HR_ROUND,
    ApplicationStatus.OFFER_PENDING,
    ApplicationStatus.OFFERED,
    ApplicationStatus.ACCEPTED,
  ];

  const stageCounts = funnelStages.map(s => ({
    stage: s,
    label: STAGE_LABELS[s],
    count: pipelineData?.[s]?.length ?? 0,
  }));

  const totalApplied = stageCounts[0].count;
  const totalAccepted = stageCounts[stageCounts.length - 1].count;
  const totalRejected = pipelineData?.[ApplicationStatus.REJECTED]?.length ?? 0;
  const totalActive = stageCounts.reduce((s, c) => s + c.count, 0) - totalAccepted;
  const conversionRate = totalApplied > 0 ? ((totalAccepted / totalApplied) * 100).toFixed(1) : '0.0';

  // Avg time in stage
  const allApplicants = Object.values(pipelineData || {}).flat();
  const avgDaysInStage = useMemo(() => {
    const withStageTime = allApplicants.filter(a => a.currentStageEnteredAt);
    if (withStageTime.length === 0) return null;
    const totalDays = withStageTime.reduce((sum, a) => sum + (getDaysSince(a.currentStageEnteredAt) || 0), 0);
    return Math.round(totalDays / withStageTime.length);
  }, [allApplicants]);

  // Source breakdown
  const sourceBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    allApplicants.forEach(a => {
      const src = a.source || 'OTHER';
      counts[src] = (counts[src] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [allApplicants]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Active */}
      <div className="card-aura p-4">
        <div className="flex items-center gap-2 mb-1">
          <User size={14} className="text-accent-500"/>
          <span className="text-caption font-medium">Active Pipeline</span>
        </div>
        <p className="text-xl font-bold text-[var(--text-primary)]">{totalActive}</p>
        <p className="text-caption mt-0.5">{totalAccepted} accepted, {totalRejected} rejected</p>
      </div>

      {/* Conversion Rate */}
      <div className="card-aura p-4">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={14} className="text-success-500"/>
          <span className="text-caption font-medium">Conversion Rate</span>
        </div>
        <p className="text-xl font-bold text-[var(--text-primary)]">{conversionRate}%</p>
        <p className="text-caption mt-0.5">Applied → Accepted</p>
      </div>

      {/* Avg Time in Stage */}
      <div className="card-aura p-4">
        <div className="flex items-center gap-2 mb-1">
          <Clock size={14} className="text-warning-500"/>
          <span className="text-caption font-medium">Avg. Time in Stage</span>
        </div>
        <p
          className="text-xl font-bold text-[var(--text-primary)]">{avgDaysInStage !== null ? `${avgDaysInStage}d` : '—'}</p>
        <p className="text-caption mt-0.5">Across all stages</p>
      </div>

      {/* Top Sources */}
      <div className="card-aura p-4">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 size={14} className="text-accent-500"/>
          <span className="text-caption font-medium">Top Sources</span>
        </div>
        {sourceBreakdown.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {sourceBreakdown.map(([src, count]) => (
              <span key={src}
                    className={`text-xs px-1.5 py-0.5 rounded font-medium ${SOURCE_BADGE_CLASS[src as ApplicationSource] || 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
                {formatLabel(src)} ({count})
              </span>
            ))}
          </div>
        ) : (
          <p className="text-body-muted mt-1">No data</p>
        )}
      </div>
    </div>
  );
};

// ─── Funnel Visualization ────────────────────────────────────────────────────

const FunnelBar: React.FC<{ pipelineData: PipelineData }> = ({pipelineData}) => {
  const stages = [
    ApplicationStatus.APPLIED,
    ApplicationStatus.SCREENING,
    ApplicationStatus.PHONE_SCREEN,
    ApplicationStatus.INTERVIEW,
    ApplicationStatus.TECHNICAL_ROUND,
    ApplicationStatus.HR_ROUND,
    ApplicationStatus.OFFERED,
    ApplicationStatus.ACCEPTED,
  ];

  const counts = stages.map(s => pipelineData?.[s]?.length ?? 0);
  const maxCount = Math.max(...counts, 1);

  return (
    <div className="card-aura p-4">
      <p className="text-xs font-semibold text-[var(--text-secondary)] mb-4 flex items-center gap-1.5">
        <TrendingUp size={13} className="text-accent-500"/>
        Hiring Funnel
      </p>
      <div className="flex items-end gap-1.5 h-14">
        {stages.map((stage, i) => {
          const count = counts[i];
          const height = maxCount > 0 ? Math.max((count / maxCount) * 100, 4) : 4;
          const colors = STAGE_COLORS[stage];
          return (
            <div key={stage} className="flex-1 flex flex-col items-center gap-1"
                 title={`${STAGE_LABELS[stage]}: ${count}`}>
              <span className="text-xs font-semibold text-[var(--text-secondary)]">{count}</span>
              <div
                className={`w-full rounded-t-sm ${colors.badge.split(' ')[0]}`}
                style={{height: `${height}%`, minHeight: '2px'}}
              />
              <span
                className="text-2xs text-[var(--text-muted)] truncate w-full text-center">{STAGE_LABELS[stage].split(' ')[0]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const EMPTY_PIPELINE: PipelineData = Object.values(ApplicationStatus).reduce<PipelineData>(
  (acc, s) => ({...acc, [s]: []} as PipelineData),
  {} as PipelineData
);

const EMPTY_NEW_APPLICANT: ApplicantRequest = {
  candidateId: '',
  jobOpeningId: '',
  source: ApplicationSource.WEBSITE,
  notes: '',
  expectedSalary: undefined,
};

export default function ApplicantPipelinePage() {
  // ── React Query Hooks ──────────────────────────────────────────────────────
  const router = useRouter();
  const queryClient = useQueryClient();
  const jobOpeningsQuery = useJobOpenings(0, 200);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  // Default to the first job opening without an extra render cycle: derive the
  // effective id directly so usePipelineByJob can fire as soon as the job list
  // resolves, instead of waiting for a useEffect-driven setState round-trip.
  const effectiveJobId = selectedJobId || jobOpeningsQuery.data?.content?.[0]?.id || '';
  const pipelineQuery = usePipelineByJob(effectiveJobId, !!effectiveJobId);

  // Extract data from queries
  const jobOpenings = jobOpeningsQuery.data?.content ?? [];
  const jobsLoading = jobOpeningsQuery.isLoading;
  const jobsError = jobOpeningsQuery.isError ? 'Failed to load job openings' : null;

  const pipelineData = pipelineQuery.data || EMPTY_PIPELINE;
  const pipelineLoading = pipelineQuery.isLoading;
  const pipelineError = pipelineQuery.isError ? 'Failed to load pipeline' : null;

  // ── Search & Filters ──────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<ApplicationSource | ''>('');
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // ── Add Applicant Modal ───────────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [newApplicant, setNewApplicant] = useState<ApplicantRequest>({...EMPTY_NEW_APPLICANT});
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  // ── Action loading tracker per-applicant ────────────────────────────────
  const [movingId, setMovingId] = useState<string | null>(null);

  // ── Drag-and-drop error toast ──────────────────────────────────────────
  const [dragError, setDragError] = useState<string | null>(null);

  // ── Clear drag error after 4s ─────────────────────────────────────────
  useEffect(() => {
    if (!dragError) return;
    const t = setTimeout(() => setDragError(null), 4000);
    return () => clearTimeout(t);
  }, [dragError]);

  // ── Filtered pipeline data ────────────────────────────────────────────
  const filteredPipeline = useMemo((): PipelineData => {
    if (!searchQuery && !sourceFilter && minRating === 0) return pipelineData;
    const result = {} as PipelineData;
    const q = searchQuery.toLowerCase().trim();
    for (const stage of Object.values(ApplicationStatus)) {
      const applicants = pipelineData?.[stage] || [];
      result[stage] = applicants.filter(a => {
        if (q && !(a.candidateName?.toLowerCase().includes(q) || a.jobTitle?.toLowerCase().includes(q))) return false;
        if (sourceFilter && a.source !== sourceFilter) return false;
        if (minRating > 0 && (!a.rating || a.rating < minRating)) return false;
        return true;
      });
    }
    return result;
  }, [pipelineData, searchQuery, sourceFilter, minRating]);

  const hasActiveFilters = !!searchQuery || !!sourceFilter || minRating > 0;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleJobChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const jobId = e.target.value;
    setSelectedJobId(jobId);
  };

  const openAddModal = () => {
    setNewApplicant({...EMPTY_NEW_APPLICANT, jobOpeningId: effectiveJobId});
    setAddError(null);
    setShowAddModal(true);
  };

  const handleAddApplicant = async () => {
    if (!newApplicant.candidateId.trim()) {
      setAddError('Candidate ID is required');
      return;
    }
    if (!newApplicant.jobOpeningId) {
      setAddError('Job Opening is required');
      return;
    }
    try {
      setAddLoading(true);
      setAddError(null);
      await applicantService.createApplicant(newApplicant);
      setShowAddModal(false);
      setNewApplicant({...EMPTY_NEW_APPLICANT});
      await queryClient.invalidateQueries({queryKey: applicantKeys.pipeline(effectiveJobId)});
    } catch (err) {
      setAddError(getErrorMessage(err, 'Failed to add applicant'));
    } finally {
      setAddLoading(false);
    }
  };

  const openDetailModal = (applicant: Applicant) => {
    // Navigate to the candidate detail page instead of opening a modal.
    router.push(`/recruitment/candidates/${applicant.candidateId}`);
  };

  const handleMoveToNextStage = async (applicant: Applicant) => {
    const transitions = STATUS_TRANSITIONS[applicant.status] || [];
    const nextStage = transitions.find(s => s !== ApplicationStatus.REJECTED);
    if (!nextStage) return;
    try {
      setMovingId(applicant.id);
      await applicantService.updateStatus(applicant.id, {
        status: nextStage,
        notes: applicant.notes,
      });
      await queryClient.invalidateQueries({queryKey: applicantKeys.pipeline(effectiveJobId)});
    } catch (err) {
      log.error('Failed to advance stage:', err);
    } finally {
      setMovingId(null);
    }
  };

  const handleQuickReject = async (applicant: Applicant) => {
    try {
      setMovingId(applicant.id);
      await applicantService.updateStatus(applicant.id, {
        status: ApplicationStatus.REJECTED,
        rejectionReason: 'Not selected',
      });
      await queryClient.invalidateQueries({queryKey: applicantKeys.pipeline(effectiveJobId)});
    } catch (err) {
      log.error('Failed to reject:', err);
    } finally {
      setMovingId(null);
    }
  };

  // ── Drag-and-Drop Handler ─────────────────────────────────────────────
  const handleDragEnd = async (result: DropResult) => {
    const {draggableId, destination, source} = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return; // same column

    const fromStage = source.droppableId as ApplicationStatus;
    const toStage = destination.droppableId as ApplicationStatus;
    const allowedTransitions = STATUS_TRANSITIONS[fromStage] || [];

    if (!allowedTransitions.includes(toStage)) {
      setDragError(`Cannot move from "${STAGE_LABELS[fromStage]}" to "${STAGE_LABELS[toStage]}". Allowed: ${allowedTransitions.map(s => STAGE_LABELS[s]).join(', ') || 'none'}`);
      return;
    }

    // Find the applicant
    const applicants = pipelineData?.[fromStage] || [];
    const applicant = applicants.find(a => a.id === draggableId);
    if (!applicant) return;

    try {
      setMovingId(draggableId);

      const payload: ApplicantStatusUpdate = {
        status: toStage,
        notes: applicant.notes,
        rejectionReason: toStage === ApplicationStatus.REJECTED ? 'Not selected' : undefined,
      };
      await applicantService.updateStatus(draggableId, payload);
      // Refetch pipeline after status update
      await queryClient.invalidateQueries({queryKey: applicantKeys.pipeline(effectiveJobId)});
    } catch (err) {
      setDragError(getErrorMessage(err, 'Failed to move applicant'));
    } finally {
      setMovingId(null);
    }
  };

  // Navigate to the dedicated offer-letter route instead of opening a modal.
  // Full form logic lives on /recruitment/candidates/[id]/offer.
  // The applicantId query param tells the page which application row to update.
  const openOfferModal = (applicant: Applicant) => {
    router.push(`/recruitment/candidates/${applicant.candidateId}/offer?applicantId=${applicant.id}`);
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  const selectedJob = jobOpenings.find(j => j.id === effectiveJobId);

  const totalApplicants = PIPELINE_STAGES.reduce(
    (sum, s) => sum + (pipelineData?.[s]?.length || 0),
    0
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <AppLayout
      activeMenuItem="recruitment"
      breadcrumbs={[
        {label: 'Recruitment', href: '/recruitment'},
        {label: 'Pipeline'},
      ]}
    >
      {/* DEF-53: Gate pipeline page on RECRUITMENT_VIEW to prevent UI leak */}
      <PermissionGate
        anyOf={[Permissions.RECRUITMENT_VIEW, Permissions.RECRUITMENT_VIEW_ALL]}
        fallback={
          <div className="flex items-center justify-center h-[60vh]">
            <p className="text-[var(--text-muted)]">You do not have permission to view the recruitment pipeline.</p>
          </div>
        }
      >
        <div className="page-shell-centered motion-rise p-6 space-y-6">
          {/* ── Header ────────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">ATS Pipeline</h1>
              <p className="text-body-muted mt-0.5">
                Drag candidates between stages or use the quick-move buttons
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* Job Selector */}
              <div className="w-72">
                {jobsLoading ? (
                  <div
                    className="flex items-center gap-2 text-body-muted h-10 px-4 border border-[var(--border-main)] rounded-lg bg-[var(--bg-input)]">
                    <Loader2 size={14} className="animate-spin"/>
                    Loading job openings...
                  </div>
                ) : (
                  <Select
                    value={effectiveJobId}
                    onChange={handleJobChange}
                    disabled={jobOpenings.length === 0}
                  >
                    <option value="" disabled>
                      {jobOpenings.length === 0 ? 'No job openings found' : 'Select a job opening'}
                    </option>
                    {jobOpenings.map(job => (
                      <option key={job.id} value={job.id}>
                        {job.jobTitle}{job.jobCode ? ` (${job.jobCode})` : ''}
                      </option>
                    ))}
                  </Select>
                )}
              </div>

              {/* Add Applicant Button */}
              <Button
                variant="primary"
                leftIcon={<Plus size={16}/>}
                onClick={openAddModal}
                disabled={!effectiveJobId || jobsLoading}
              >
                Add Applicant
              </Button>
            </div>
          </div>

          {/* ── Errors ────────────────────────────────────────────────────── */}
          {jobsError && (
            <div className="bg-danger-50 border border-danger-200 text-danger-700 text-sm rounded-lg px-4 py-4">
              {jobsError}
            </div>
          )}

          {/* ── Drag Error Toast ───────────────────────────────────────────── */}
          {dragError && (
            <div
              className="bg-danger-50 border border-danger-200 text-danger-700 text-sm rounded-lg px-4 py-4 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={16} className="flex-shrink-0"/>
              <span className="flex-1">{dragError}</span>
              <button onClick={() => setDragError(null)} aria-label="Close error message"
                      className="p-1 hover:bg-danger-100 rounded cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                <X size={14}/>
              </button>
            </div>
          )}

          {/* ── Empty / Loading / Content ─────────────────────────────────── */}
          {!effectiveJobId && !jobsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mb-4">
                <User size={28} className="text-[var(--text-muted)]"/>
              </div>
              <h2 className="text-[var(--text-secondary)] font-semibold mb-1">No Job Selected</h2>
              <p className="text-[var(--text-muted)] text-sm">
                Select a job opening above to view its applicant pipeline.
              </p>
            </div>
          ) : pipelineLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-accent-500"/>
              <span className="ml-4 text-[var(--text-muted)]">
              Loading pipeline for {selectedJob?.jobTitle ?? 'selected job'}...
            </span>
            </div>
          ) : pipelineError ? (
            <div className="bg-danger-50 border border-danger-200 text-danger-700 text-sm rounded-lg px-4 py-4">
              {pipelineError}
            </div>
          ) : (
            <>
              {/* ── Pipeline Stats Bar ──────────────────────────────────── */}
              {selectedJob && (
                <div className="meta-row">
                  <span className="font-medium text-[var(--text-secondary)]">{selectedJob.jobTitle}</span>
                  {selectedJob.jobCode && (
                    <span
                      className="bg-[var(--bg-secondary)] px-2 py-0.5 rounded text-[var(--text-muted)] font-mono text-xs">
                    {selectedJob.jobCode}
                  </span>
                  )}
                  {selectedJob.departmentName && (
                    <span className="text-[var(--text-muted)]">{selectedJob.departmentName}</span>
                  )}
                  <span className="ml-auto text-[var(--text-muted)]">
                  {totalApplicants} applicant{totalApplicants !== 1 ? 's' : ''} total
                </span>
                </div>
              )}

              {/* ── Analytics Section ──────────────────────────────────── */}
              {totalApplicants > 0 && (
                <div className="space-y-4">
                  <PipelineAnalytics pipelineData={pipelineData}/>
                  <FunnelBar pipelineData={pipelineData}/>
                </div>
              )}

              {/* ── Search & Filters ───────────────────────────────────── */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"/>
                  <input
                    type="text"
                    placeholder="Search by candidate name..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-[var(--border-main)] rounded-lg bg-[var(--bg-input)] focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-400 text-[var(--text-secondary)] placeholder:text-[var(--text-muted)]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                    >
                      <X size={14}/>
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setShowFilters(v => !v)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm border rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                    hasActiveFilters
                      ? 'border-accent-300 bg-accent-50 text-accent-700'
                      : 'border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  <Filter size={14}/>
                  Filters
                  {hasActiveFilters && (
                    <span className="bg-accent-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {(sourceFilter ? 1 : 0) + (minRating > 0 ? 1 : 0)}
                  </span>
                  )}
                  <ChevronDown size={12} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`}/>
                </button>

                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSourceFilter('');
                      setMinRating(0);
                    }}
                    className="text-xs text-accent-700 hover:text-accent-800 font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* ── Filter Dropdowns ───────────────────────────────────── */}
              {showFilters && (
                <div
                  className="card-aura flex flex-wrap items-end gap-4 p-4 animate-in fade-in slide-in-from-top-1">
                  <div className="min-w-[160px]">
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Source</label>
                    <select
                      aria-label="Filter by source"
                      value={sourceFilter}
                      onChange={e => setSourceFilter(e.target.value as ApplicationSource | '')}
                      className="w-full px-4 py-2 text-sm border border-[var(--border-main)] rounded-lg bg-[var(--bg-input)] text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-accent-500/20"
                    >
                      <option value="">All sources</option>
                      {Object.values(ApplicationSource).map(src => (
                        <option key={src} value={src}>{formatLabel(src)}</option>
                      ))}
                    </select>
                  </div>

                  <div className="min-w-[140px]">
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Min. Rating</label>
                    <div
                      className="flex items-center gap-2 px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-input)]">
                      <StarRating value={minRating} onChange={v => setMinRating(v === minRating ? 0 : v)} size={15}/>
                      {minRating > 0 && (
                        <button onClick={() => setMinRating(0)} aria-label="Clear rating filter"
                                className="text-caption hover:text-[var(--text-secondary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                          <X size={12}/>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Kanban Board with Drag & Drop ────────────────────── */}
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="overflow-x-auto pb-4 -mx-6 px-6">
                  <div className="flex gap-4"
                       style={{minWidth: `${PIPELINE_STAGES.length * 256 + (PIPELINE_STAGES.length - 1) * 12}px`}}>
                    {PIPELINE_STAGES.map(stage => {
                      const applicants = (filteredPipeline?.[stage] || []).slice().sort((a, b) => {
                        const at = a.appliedDate ? new Date(a.appliedDate).getTime() : 0;
                        const bt = b.appliedDate ? new Date(b.appliedDate).getTime() : 0;
                        return bt - at;
                      });
                      const unfilteredCount = pipelineData?.[stage]?.length ?? 0;
                      const colors = STAGE_COLORS[stage];
                      const transitions = STATUS_TRANSITIONS[stage];
                      const nextForward = transitions.find(s => s !== ApplicationStatus.REJECTED);

                      return (
                        <Droppable key={stage} droppableId={stage}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`flex-shrink-0 w-60 flex flex-col rounded-xl border border-[var(--border-main)] border-t-2 ${colors.col} bg-[var(--bg-card)] overflow-hidden transition-shadow max-h-[calc(100dvh-380px)] ${
                                snapshot.isDraggingOver
                                  ? 'shadow-[var(--shadow-card-hover)] border-accent-300'
                                  : ''
                              }`}
                            >
                              {/* Column Header */}
                              <div className={`px-4 py-2.5 ${colors.header} row-between`}>
                              <span className="text-sm font-semibold text-[var(--text-secondary)]">
                                {STAGE_LABELS[stage]}
                              </span>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>
                                {hasActiveFilters && applicants.length !== unfilteredCount
                                  ? `${applicants.length}/${unfilteredCount}`
                                  : applicants.length}
                              </span>
                              </div>

                              {/* Cards scroll area */}
                              <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[60px]">
                                {applicants.length === 0 ? (
                                  <div className="flex flex-col items-center justify-center py-6 px-3 text-center">
                                    <Inbox className="h-6 w-6 text-[var(--text-muted)] opacity-60 mb-2" aria-hidden="true"/>
                                    <p className="text-caption">
                                      {hasActiveFilters ? 'No matches in this stage' : 'No applicants here yet'}
                                    </p>
                                  </div>
                                ) : (
                                  applicants.map((applicant, index) => {
                                    const days = getDaysSince(applicant.appliedDate);
                                    const stageTime = getTimeInStage(applicant.currentStageEnteredAt);
                                    const isMoving = movingId === applicant.id;

                                    return (
                                      <Draggable key={applicant.id} draggableId={applicant.id} index={index}>
                                        {(dragProvided, dragSnapshot) => (
                                          <div
                                            ref={dragProvided.innerRef}
                                            {...dragProvided.draggableProps}
                                            className={`card-interactive p-4 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded-lg ${
                                              dragSnapshot.isDragging
                                                ? 'shadow-[var(--shadow-dropdown)] border-accent-300 ring-2 ring-accent-200 rotate-1'
                                                : ''
                                            } ${isMoving ? 'opacity-50' : ''}`}
                                            onClick={() => !dragSnapshot.isDragging && openDetailModal(applicant)}
                                            onKeyDown={(e) => {
                                              if ((e.key === 'Enter' || e.key === ' ') && !dragSnapshot.isDragging) {
                                                e.preventDefault();
                                                openDetailModal(applicant);
                                              }
                                            }}
                                            role="button"
                                            tabIndex={0}
                                            aria-label={`View details for ${applicant.candidateName || `Candidate ${applicant.candidateId.slice(0, 8)}`}`}
                                          >
                                            {/* Card Top Row */}
                                            <div className="flex items-start justify-between gap-1 mb-1.5">
                                              <div className="flex items-start gap-1.5 flex-1 min-w-0">
                                                <div
                                                  {...dragProvided.dragHandleProps}
                                                  className="mt-0.5 text-[var(--text-muted)] hover:text-[var(--text-muted)] cursor-grab active:cursor-grabbing flex-shrink-0"
                                                >
                                                  <GripVertical size={12}/>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                  <p
                                                    className="text-sm font-semibold text-[var(--text-primary)] truncate leading-tight">
                                                    {applicant.candidateName || `Candidate ${applicant.candidateId.slice(0, 8)}`}
                                                  </p>
                                                  {applicant.jobTitle && (
                                                    <p className="text-caption truncate mt-0.5">
                                                      {applicant.jobTitle}
                                                    </p>
                                                  )}
                                                </div>
                                              </div>
                                              <div
                                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={e => e.stopPropagation()}
                                              >
                                                <CardMenu
                                                  applicant={applicant}
                                                  onViewDetails={() => openDetailModal(applicant)}
                                                  onMoveToNextStage={() => handleMoveToNextStage(applicant)}
                                                  onReject={() => handleQuickReject(applicant)}
                                                  onCreateOffer={() => openOfferModal(applicant)}
                                                />
                                              </div>
                                            </div>

                                            {/* Source + Days Applied */}
                                            <div className="row-between mb-1.5">
                                              {applicant.source ? (
                                                <span
                                                  className={`text-xs px-1.5 py-0.5 rounded font-medium ${SOURCE_BADGE_CLASS[applicant.source]}`}>
                                                {formatLabel(applicant.source)}
                                              </span>
                                              ) : (
                                                <span
                                                  className="text-xs px-1.5 py-0.5 rounded font-medium bg-[var(--bg-surface)] text-[var(--text-muted)]">
                                                Other
                                              </span>
                                              )}
                                              {days !== null && (
                                                <span className="text-caption">
                                                {days === 0 ? 'Today' : `${days}d ago`}
                                              </span>
                                              )}
                                            </div>

                                            {/* Extra Info Row */}
                                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                              {/* Time in stage */}
                                              {stageTime !== '—' && (
                                                <span className="flex items-center gap-0.5 text-caption">
                                                <Clock size={9}/>
                                                  {stageTime}
                                              </span>
                                              )}
                                              {/* Expected salary */}
                                              {applicant.expectedSalary && (
                                                <span className="flex items-center gap-0.5 text-caption">
                                                <DollarSign size={9}/>
                                                  {(applicant.expectedSalary / 100000).toFixed(1)}L
                                              </span>
                                              )}
                                            </div>

                                            {/* Star Rating */}
                                            {(applicant.rating != null && applicant.rating > 0) && (
                                              <div className="mb-1.5">
                                                <StarRating value={applicant.rating} readOnly size={11}/>
                                              </div>
                                            )}

                                            {/* Quick Move Button */}
                                            {nextForward && (
                                              <button
                                                type="button"
                                                disabled={isMoving}
                                                onClick={e => {
                                                  e.stopPropagation();
                                                  handleMoveToNextStage(applicant);
                                                }}
                                                className="w-full mt-1 flex items-center justify-center gap-1 text-xs py-1.5 px-2 rounded-md bg-[var(--bg-secondary)] hover:bg-accent-50 text-[var(--text-muted)] hover:text-accent-700 border border-[var(--border-main)] hover:border-accent-200 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                                              >
                                                {isMoving ? (
                                                  <Loader2 size={10} className="animate-spin"/>
                                                ) : (
                                                  <>
                                                    <ArrowRight size={10}/>
                                                    {STAGE_LABELS[nextForward]}
                                                  </>
                                                )}
                                              </button>
                                            )}
                                          </div>
                                        )}
                                      </Draggable>
                                    );
                                  })
                                )}
                                {provided.placeholder}
                              </div>
                            </div>
                          )}
                        </Droppable>
                      );
                    })}
                  </div>
                </div>
              </DragDropContext>
            </>
          )}
        </div>

        {/* ── Add Applicant Modal ──────────────────────────────────────────────── */}
        <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} size="lg">
          <ModalHeader onClose={() => setShowAddModal(false)}>
            Add New Applicant
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              {addError && (
                <div className="bg-danger-50 border border-danger-200 text-danger-700 text-sm rounded-lg px-4 py-4">
                  {addError}
                </div>
              )}

              <Input
                label="Candidate ID *"
                placeholder="Enter candidate ID"
                value={newApplicant.candidateId}
                onChange={e => setNewApplicant(prev => ({...prev, candidateId: e.target.value}))}
              />

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  Job Opening *
                </label>
                <Select
                  value={newApplicant.jobOpeningId}
                  onChange={e => setNewApplicant(prev => ({...prev, jobOpeningId: e.target.value}))}
                >
                  <option value="">Select job opening</option>
                  {jobOpenings.map(job => (
                    <option key={job.id} value={job.id}>
                      {job.jobTitle}{job.jobCode ? ` (${job.jobCode})` : ''}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  Source
                </label>
                <Select
                  value={newApplicant.source}
                  onChange={e => setNewApplicant(prev => ({...prev, source: e.target.value as ApplicationSource}))}
                >
                  {Object.values(ApplicationSource).map(src => (
                    <option key={src} value={src}>{formatLabel(src)}</option>
                  ))}
                </Select>
              </div>

              <Input
                label="Expected Salary"
                type="number"
                placeholder="e.g. 80000"
                value={newApplicant.expectedSalary?.toString() ?? ''}
                onChange={e => {
                  const val = e.target.value;
                  setNewApplicant(prev => ({
                    ...prev,
                    expectedSalary: val ? Number(val) : undefined,
                  }));
                }}
              />

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  Notes
                </label>
                <Textarea
                  placeholder="Optional notes about this applicant..."
                  value={newApplicant.notes ?? ''}
                  onChange={e => setNewApplicant(prev => ({...prev, notes: e.target.value}))}
                  rows={3}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)} disabled={addLoading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddApplicant} isLoading={addLoading} loadingText="Adding...">
              Add Applicant
            </Button>
          </ModalFooter>
        </Modal>

      </PermissionGate>
    </AppLayout>
  );
}
