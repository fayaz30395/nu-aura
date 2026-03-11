'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Star, MoreHorizontal, Loader2, ArrowRight, User } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  Textarea,
} from '@/components/ui';
import { applicantService } from '@/lib/services/applicant.service';
import { recruitmentService } from '@/lib/services/recruitment.service';
import { letterService } from '@/lib/services/letter.service';
import { LetterCategory } from '@/lib/types/letter';
import type { LetterTemplate } from '@/lib/types/letter';
import {
  ApplicationSource,
  ApplicationStatus,
} from '@/lib/types/applicant';
import type {
  Applicant,
  ApplicantRequest,
  ApplicantStatusUpdate,
  PipelineData,
} from '@/lib/types/applicant';
import type { JobOpening } from '@/lib/types/recruitment';

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

const STAGE_COLORS: Record<ApplicationStatus, { col: string; header: string; badge: string }> = {
  [ApplicationStatus.APPLIED]:        { col: 'border-t-blue-500',   header: 'bg-blue-50',   badge: 'bg-blue-100 text-blue-700' },
  [ApplicationStatus.SCREENING]:      { col: 'border-t-teal-500',   header: 'bg-teal-50',   badge: 'bg-teal-100 text-teal-700' },
  [ApplicationStatus.PHONE_SCREEN]:   { col: 'border-t-cyan-500',   header: 'bg-cyan-50',   badge: 'bg-cyan-100 text-cyan-700' },
  [ApplicationStatus.INTERVIEW]:      { col: 'border-t-purple-500', header: 'bg-purple-50', badge: 'bg-purple-100 text-purple-700' },
  [ApplicationStatus.TECHNICAL_ROUND]:{ col: 'border-t-indigo-500', header: 'bg-indigo-50', badge: 'bg-indigo-100 text-indigo-700' },
  [ApplicationStatus.HR_ROUND]:       { col: 'border-t-violet-500', header: 'bg-violet-50', badge: 'bg-violet-100 text-violet-700' },
  [ApplicationStatus.OFFER_PENDING]:  { col: 'border-t-orange-500', header: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700' },
  [ApplicationStatus.OFFERED]:        { col: 'border-t-green-500',  header: 'bg-green-50',  badge: 'bg-green-100 text-green-700' },
  [ApplicationStatus.ACCEPTED]:       { col: 'border-t-emerald-500',header: 'bg-emerald-50',badge: 'bg-emerald-100 text-emerald-700' },
  [ApplicationStatus.REJECTED]:       { col: 'border-t-red-500',    header: 'bg-red-50',    badge: 'bg-red-100 text-red-700' },
  [ApplicationStatus.WITHDRAWN]:      { col: 'border-t-gray-400',   header: 'bg-gray-50',   badge: 'bg-gray-100 text-gray-600' },
};

const SOURCE_BADGE_CLASS: Record<ApplicationSource, string> = {
  [ApplicationSource.WEBSITE]:  'bg-blue-50 text-blue-600',
  [ApplicationSource.REFERRAL]: 'bg-teal-50 text-teal-600',
  [ApplicationSource.JOB_BOARD]:'bg-indigo-50 text-indigo-600',
  [ApplicationSource.LINKEDIN]: 'bg-sky-50 text-sky-600',
  [ApplicationSource.CAMPUS]:   'bg-purple-50 text-purple-600',
  [ApplicationSource.AGENCY]:   'bg-orange-50 text-orange-600',
  [ApplicationSource.OTHER]:    'bg-gray-50 text-gray-500',
};

// All valid transition targets from each stage
const STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  [ApplicationStatus.APPLIED]:         [ApplicationStatus.SCREENING, ApplicationStatus.INTERVIEW, ApplicationStatus.REJECTED],
  [ApplicationStatus.SCREENING]:       [ApplicationStatus.PHONE_SCREEN, ApplicationStatus.INTERVIEW, ApplicationStatus.TECHNICAL_ROUND, ApplicationStatus.REJECTED],
  [ApplicationStatus.PHONE_SCREEN]:    [ApplicationStatus.INTERVIEW, ApplicationStatus.TECHNICAL_ROUND, ApplicationStatus.HR_ROUND, ApplicationStatus.REJECTED],
  [ApplicationStatus.INTERVIEW]:       [ApplicationStatus.TECHNICAL_ROUND, ApplicationStatus.HR_ROUND, ApplicationStatus.OFFER_PENDING, ApplicationStatus.OFFERED, ApplicationStatus.REJECTED],
  [ApplicationStatus.TECHNICAL_ROUND]: [ApplicationStatus.HR_ROUND, ApplicationStatus.OFFER_PENDING, ApplicationStatus.OFFERED, ApplicationStatus.REJECTED],
  [ApplicationStatus.HR_ROUND]:        [ApplicationStatus.OFFER_PENDING, ApplicationStatus.OFFERED, ApplicationStatus.REJECTED],
  [ApplicationStatus.OFFER_PENDING]:   [ApplicationStatus.OFFERED, ApplicationStatus.REJECTED],
  [ApplicationStatus.OFFERED]:         [ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED],
  [ApplicationStatus.ACCEPTED]:        [],
  [ApplicationStatus.REJECTED]:        [],
  [ApplicationStatus.WITHDRAWN]:       [],
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
  onChange?: (v: number) => void;
}

const StarRating: React.FC<StarRatingProps> = ({ value, readOnly = false, onChange }) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: 5 }).map((_, i) => (
      <button
        key={i}
        type="button"
        disabled={readOnly}
        onClick={() => !readOnly && onChange?.(i + 1)}
        className={`p-0.5 rounded transition-colors ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
        aria-label={`${i + 1} star`}
      >
        <Star
          size={13}
          className={i < value ? 'fill-yellow-400 text-yellow-400' : 'text-surface-300'}
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

const CardMenu: React.FC<CardMenuProps> = ({ applicant, onViewDetails, onMoveToNextStage, onReject, onCreateOffer }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
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
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        className="p-1 rounded text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
        aria-label="More options"
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-20 w-44 bg-white border border-surface-200 rounded-lg shadow-lg py-1 text-sm">
          <button
            type="button"
            className="w-full text-left px-3 py-2 hover:bg-surface-50 text-surface-700 transition-colors"
            onClick={() => { setOpen(false); onViewDetails(); }}
          >
            View Details
          </button>
          {!isTerminal && nextStage && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-surface-50 text-surface-700 transition-colors"
              onClick={() => { setOpen(false); onMoveToNextStage(); }}
            >
              Move to Next Stage
            </button>
          )}
          {(applicant.status === ApplicationStatus.HR_ROUND || applicant.status === ApplicationStatus.OFFER_PENDING) && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-surface-50 text-surface-700 transition-colors"
              onClick={() => { setOpen(false); onCreateOffer?.(); }}
            >
              Create Offer Letter
            </button>
          )}
          {applicant.status !== ApplicationStatus.REJECTED && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-danger-50 text-danger-600 transition-colors"
              onClick={() => { setOpen(false); onReject(); }}
            >
              Reject
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const EMPTY_PIPELINE: PipelineData = Object.values(ApplicationStatus).reduce<PipelineData>(
  (acc, s) => ({ ...acc, [s]: [] } as PipelineData),
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
  // ── Job Openings ──────────────────────────────────────────────────────────
  const [jobOpenings, setJobOpenings] = useState<JobOpening[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string>('');

  // ── Pipeline Data ─────────────────────────────────────────────────────────
  const [pipelineData, setPipelineData] = useState<PipelineData>(EMPTY_PIPELINE);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  // ── Add Applicant Modal ───────────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [newApplicant, setNewApplicant] = useState<ApplicantRequest>({ ...EMPTY_NEW_APPLICANT });
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  // ── Detail / Move Modal ───────────────────────────────────────────────────
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeApplicant, setActiveApplicant] = useState<Applicant | null>(null);
  const [detailNextStatus, setDetailNextStatus] = useState<ApplicationStatus | ''>('');
  const [detailNotes, setDetailNotes] = useState('');
  const [detailRejectionReason, setDetailRejectionReason] = useState('');
  const [detailRating, setDetailRating] = useState(0);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Action loading tracker per-applicant ────────────────────────────────
  const [movingId, setMovingId] = useState<string | null>(null);

  // ── Create Offer Modal ────────────────────────────────────────────────
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerApplicant, setOfferApplicant] = useState<Applicant | null>(null);
  const [offerTemplates, setOfferTemplates] = useState<LetterTemplate[]>([]);
  const [offerTemplatesLoading, setOfferTemplatesLoading] = useState(false);
  const [offerForm, setOfferForm] = useState({
    templateId: '',
    offeredCtc: '',
    offeredDesignation: '',
    proposedJoiningDate: '',
    additionalNotes: '',
  });
  const [offerLoading, setOfferLoading] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [offerSuccess, setOfferSuccess] = useState<string | null>(null);

  // ── Load Job Openings ────────────────────────────────────────────────────
  const loadJobOpenings = useCallback(async () => {
    try {
      setJobsLoading(true);
      setJobsError(null);
      const response = await recruitmentService.getAllJobOpenings(0, 200);
      const jobs = response.content ?? [];
      setJobOpenings(jobs);
      // Auto-select first job if none selected
      if (jobs.length > 0) {
        setSelectedJobId(jobs[0].id);
      }
    } catch (err) {
      setJobsError(getErrorMessage(err, 'Failed to load job openings'));
    } finally {
      setJobsLoading(false);
    }
  }, []);

  // ── Load Pipeline ─────────────────────────────────────────────────────────
  const loadPipeline = useCallback(async (jobId: string) => {
    if (!jobId) return;
    try {
      setPipelineLoading(true);
      setPipelineError(null);
      const data = await applicantService.getPipeline(jobId);
      setPipelineData(data || EMPTY_PIPELINE);
    } catch (err) {
      setPipelineError(getErrorMessage(err, 'Failed to load pipeline'));
      setPipelineData(EMPTY_PIPELINE);
    } finally {
      setPipelineLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobOpenings();
  }, [loadJobOpenings]);

  useEffect(() => {
    if (selectedJobId) {
      loadPipeline(selectedJobId);
    }
  }, [selectedJobId, loadPipeline]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleJobChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const jobId = e.target.value;
    setSelectedJobId(jobId);
    setPipelineData(EMPTY_PIPELINE);
  };

  const openAddModal = () => {
    setNewApplicant({ ...EMPTY_NEW_APPLICANT, jobOpeningId: selectedJobId });
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
      setNewApplicant({ ...EMPTY_NEW_APPLICANT });
      await loadPipeline(selectedJobId);
    } catch (err) {
      setAddError(getErrorMessage(err, 'Failed to add applicant'));
    } finally {
      setAddLoading(false);
    }
  };

  const openDetailModal = (applicant: Applicant) => {
    setActiveApplicant(applicant);
    setDetailNextStatus('');
    setDetailNotes(applicant.notes || '');
    setDetailRejectionReason(applicant.rejectionReason || '');
    setDetailRating(applicant.rating || 0);
    setDetailError(null);
    setShowDetailModal(true);
  };

  const handleUpdateApplicant = async () => {
    if (!activeApplicant) return;
    try {
      setDetailLoading(true);
      setDetailError(null);

      const targetStatus = (detailNextStatus || activeApplicant.status) as ApplicationStatus;
      const statusChanged = targetStatus !== activeApplicant.status;
      const notesChanged = detailNotes !== (activeApplicant.notes || '');
      const rejectionChanged = detailRejectionReason !== (activeApplicant.rejectionReason || '');

      if (statusChanged || notesChanged || rejectionChanged) {
        const payload: ApplicantStatusUpdate = {
          status: targetStatus,
          notes: detailNotes || undefined,
          rejectionReason:
            targetStatus === ApplicationStatus.REJECTED
              ? detailRejectionReason || undefined
              : undefined,
        };
        await applicantService.updateStatus(activeApplicant.id, payload);
      }

      if (detailRating && detailRating !== activeApplicant.rating) {
        await applicantService.rateApplicant(activeApplicant.id, detailRating);
      }

      setShowDetailModal(false);
      setActiveApplicant(null);
      await loadPipeline(selectedJobId);
    } catch (err) {
      setDetailError(getErrorMessage(err, 'Failed to update applicant'));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRejectApplicant = async () => {
    if (!activeApplicant) return;
    try {
      setDetailLoading(true);
      setDetailError(null);
      await applicantService.updateStatus(activeApplicant.id, {
        status: ApplicationStatus.REJECTED,
        notes: detailNotes || undefined,
        rejectionReason: detailRejectionReason || 'Not selected',
      });
      setShowDetailModal(false);
      setActiveApplicant(null);
      await loadPipeline(selectedJobId);
    } catch (err) {
      setDetailError(getErrorMessage(err, 'Failed to reject applicant'));
    } finally {
      setDetailLoading(false);
    }
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
      await loadPipeline(selectedJobId);
    } catch (err) {
      console.error('Failed to advance stage:', err);
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
      await loadPipeline(selectedJobId);
    } catch (err) {
      console.error('Failed to reject:', err);
    } finally {
      setMovingId(null);
    }
  };

  const openOfferModal = async (applicant: Applicant) => {
    setOfferApplicant(applicant);
    setOfferForm({
      templateId: '',
      offeredCtc: applicant.expectedSalary?.toString() ?? '',
      offeredDesignation: applicant.jobTitle ?? '',
      proposedJoiningDate: '',
      additionalNotes: '',
    });
    setOfferError(null);
    setOfferSuccess(null);
    setShowOfferModal(true);

    // Load offer templates
    setOfferTemplatesLoading(true);
    try {
      const templates = await letterService.getTemplatesByCategory(LetterCategory.OFFER);
      setOfferTemplates(templates);
      if (templates.length === 1) {
        setOfferForm(prev => ({ ...prev, templateId: templates[0].id }));
      }
    } catch {
      setOfferTemplates([]);
    } finally {
      setOfferTemplatesLoading(false);
    }
  };

  const handleCreateOffer = async () => {
    if (!offerApplicant) return;
    if (!offerForm.templateId) { setOfferError('Please select a letter template'); return; }
    if (!offerForm.offeredCtc || isNaN(Number(offerForm.offeredCtc))) { setOfferError('Please enter a valid CTC amount'); return; }
    if (!offerForm.offeredDesignation.trim()) { setOfferError('Please enter the offered designation'); return; }
    if (!offerForm.proposedJoiningDate) { setOfferError('Please select a proposed joining date'); return; }

    try {
      setOfferLoading(true);
      setOfferError(null);

      // Step 1: Generate the offer letter
      const letter = await letterService.generateOfferLetter({
        templateId: offerForm.templateId,
        candidateId: offerApplicant.candidateId,
        offeredCtc: Number(offerForm.offeredCtc),
        offeredDesignation: offerForm.offeredDesignation.trim(),
        proposedJoiningDate: offerForm.proposedJoiningDate,
        additionalNotes: offerForm.additionalNotes || undefined,
        sendForESign: true,
      }, '');  // generatedBy will be filled by server from JWT

      // Step 2: Generate PDF
      await letterService.generatePdf(letter.id);

      // Step 3: Issue with e-sign (sends email to candidate)
      await letterService.issueOfferLetterWithESign(letter.id, '');

      // Step 4: Advance applicant to OFFERED stage
      await applicantService.updateStatus(offerApplicant.id, {
        status: ApplicationStatus.OFFERED,
        notes: `Offer letter sent (Ref: ${letter.referenceNumber})`,
      });

      setOfferSuccess(`Offer letter sent successfully! Reference: ${letter.referenceNumber}`);
      await loadPipeline(selectedJobId);

      // Close modal after 2s
      setTimeout(() => {
        setShowOfferModal(false);
        setOfferApplicant(null);
        setOfferSuccess(null);
      }, 2000);
    } catch (err: unknown) {
      setOfferError(getErrorMessage(err, 'Failed to create and send offer letter'));
    } finally {
      setOfferLoading(false);
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  const selectedJob = jobOpenings.find(j => j.id === selectedJobId);

  const totalApplicants = PIPELINE_STAGES.reduce(
    (sum, s) => sum + (pipelineData?.[s]?.length || 0),
    0
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <AppLayout
      activeMenuItem="recruitment"
      breadcrumbs={[
        { label: 'Recruitment', href: '/recruitment' },
        { label: 'Pipeline' },
      ]}
    >
      <div className="p-6 space-y-6 min-h-screen bg-surface-50">
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-900">ATS Pipeline</h1>
            <p className="text-sm text-surface-500 mt-0.5">
              Track candidates through each hiring stage
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Job Selector */}
            <div className="w-72">
              {jobsLoading ? (
                <div className="flex items-center gap-2 text-sm text-surface-500 h-10 px-3 border border-surface-300 rounded-lg bg-white">
                  <Loader2 size={14} className="animate-spin" />
                  Loading job openings...
                </div>
              ) : (
                <Select
                  value={selectedJobId}
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
              leftIcon={<Plus size={16} />}
              onClick={openAddModal}
              disabled={!selectedJobId || jobsLoading}
            >
              Add Applicant
            </Button>
          </div>
        </div>

        {/* ── Errors ────────────────────────────────────────────────────── */}
        {jobsError && (
          <div className="bg-danger-50 border border-danger-200 text-danger-700 text-sm rounded-lg px-4 py-3">
            {jobsError}
          </div>
        )}

        {/* ── Empty / Loading / Content ─────────────────────────────────── */}
        {!selectedJobId && !jobsLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-100 flex items-center justify-center mb-4">
              <User size={28} className="text-surface-400" />
            </div>
            <h3 className="text-surface-700 font-semibold mb-1">No Job Selected</h3>
            <p className="text-surface-500 text-sm">
              Select a job opening above to view its applicant pipeline.
            </p>
          </div>
        ) : pipelineLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-primary-500" />
            <span className="ml-3 text-surface-500">
              Loading pipeline for {selectedJob?.jobTitle ?? 'selected job'}...
            </span>
          </div>
        ) : pipelineError ? (
          <div className="bg-danger-50 border border-danger-200 text-danger-700 text-sm rounded-lg px-4 py-3">
            {pipelineError}
          </div>
        ) : (
          <>
            {/* ── Pipeline Stats Bar ──────────────────────────────────── */}
            {selectedJob && (
              <div className="flex flex-wrap items-center gap-3 text-sm text-surface-600">
                <span className="font-medium text-surface-800">{selectedJob.jobTitle}</span>
                {selectedJob.jobCode && (
                  <span className="bg-surface-100 px-2 py-0.5 rounded text-surface-500 font-mono text-xs">
                    {selectedJob.jobCode}
                  </span>
                )}
                {selectedJob.departmentName && (
                  <span className="text-surface-500">{selectedJob.departmentName}</span>
                )}
                <span className="ml-auto text-surface-500">
                  {totalApplicants} applicant{totalApplicants !== 1 ? 's' : ''} total
                </span>
              </div>
            )}

            {/* ── Kanban Board ────────────────────────────────────────── */}
            <div className="overflow-x-auto pb-4 -mx-6 px-6">
              <div className="flex gap-3" style={{ minWidth: `${PIPELINE_STAGES.length * 256 + (PIPELINE_STAGES.length - 1) * 12}px` }}>
                {PIPELINE_STAGES.map(stage => {
                  const applicants = (pipelineData?.[stage] || []).slice().sort((a, b) => {
                    const at = a.appliedDate ? new Date(a.appliedDate).getTime() : 0;
                    const bt = b.appliedDate ? new Date(b.appliedDate).getTime() : 0;
                    return bt - at;
                  });
                  const colors = STAGE_COLORS[stage];
                  const transitions = STATUS_TRANSITIONS[stage];
                  const nextForward = transitions.find(s => s !== ApplicationStatus.REJECTED);

                  return (
                    <div
                      key={stage}
                      className={`flex-shrink-0 w-60 flex flex-col rounded-xl border border-surface-200 bg-white border-t-4 ${colors.col} overflow-hidden`}
                      style={{ maxHeight: 'calc(100vh - 260px)' }}
                    >
                      {/* Column Header */}
                      <div className={`px-3 py-2.5 ${colors.header} flex items-center justify-between`}>
                        <span className="text-sm font-semibold text-surface-800">
                          {STAGE_LABELS[stage]}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>
                          {applicants.length}
                        </span>
                      </div>

                      {/* Cards scroll area */}
                      <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {applicants.length === 0 ? (
                          <div className="py-6 text-center text-xs text-surface-400">
                            No applicants
                          </div>
                        ) : (
                          applicants.map(applicant => {
                            const days = getDaysSince(applicant.appliedDate);
                            const isMoving = movingId === applicant.id;

                            return (
                              <div
                                key={applicant.id}
                                className="bg-white border border-surface-200 rounded-lg p-3 shadow-sm hover:shadow-md hover:border-surface-300 transition-all cursor-pointer group"
                                onClick={() => openDetailModal(applicant)}
                              >
                                {/* Card Top Row */}
                                <div className="flex items-start justify-between gap-1 mb-1.5">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-surface-900 truncate leading-tight">
                                      {applicant.candidateName || `Candidate ${applicant.candidateId.slice(0, 8)}`}
                                    </p>
                                    {applicant.jobTitle && (
                                      <p className="text-xs text-surface-500 truncate mt-0.5">
                                        {applicant.jobTitle}
                                      </p>
                                    )}
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

                                {/* Source + Days */}
                                <div className="flex items-center justify-between mb-2">
                                  {applicant.source ? (
                                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${SOURCE_BADGE_CLASS[applicant.source]}`}>
                                      {formatLabel(applicant.source)}
                                    </span>
                                  ) : (
                                    <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-gray-50 text-gray-500">
                                      Other
                                    </span>
                                  )}
                                  {days !== null && (
                                    <span className="text-xs text-surface-400">
                                      {days === 0 ? 'Today' : `${days}d ago`}
                                    </span>
                                  )}
                                </div>

                                {/* Star Rating */}
                                {(applicant.rating != null && applicant.rating > 0) && (
                                  <div className="mb-2">
                                    <StarRating value={applicant.rating} readOnly />
                                  </div>
                                )}

                                {/* Quick Move Button */}
                                {nextForward && (
                                  <button
                                    type="button"
                                    disabled={isMoving}
                                    onClick={e => { e.stopPropagation(); handleMoveToNextStage(applicant); }}
                                    className="w-full mt-1 flex items-center justify-center gap-1 text-xs py-1.5 px-2 rounded-md bg-surface-50 hover:bg-primary-50 text-surface-500 hover:text-primary-600 border border-surface-200 hover:border-primary-200 transition-all"
                                  >
                                    {isMoving ? (
                                      <Loader2 size={11} className="animate-spin" />
                                    ) : (
                                      <>
                                        <ArrowRight size={11} />
                                        Move to {STAGE_LABELS[nextForward]}
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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
              <div className="bg-danger-50 border border-danger-200 text-danger-700 text-sm rounded-lg px-4 py-3">
                {addError}
              </div>
            )}

            <Input
              label="Candidate ID *"
              placeholder="Enter candidate ID"
              value={newApplicant.candidateId}
              onChange={e => setNewApplicant(prev => ({ ...prev, candidateId: e.target.value }))}
            />

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">
                Job Opening *
              </label>
              <Select
                value={newApplicant.jobOpeningId}
                onChange={e => setNewApplicant(prev => ({ ...prev, jobOpeningId: e.target.value }))}
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
              <label className="block text-sm font-medium text-surface-700 mb-1.5">
                Source
              </label>
              <Select
                value={newApplicant.source}
                onChange={e => setNewApplicant(prev => ({ ...prev, source: e.target.value as ApplicationSource }))}
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
              <label className="block text-sm font-medium text-surface-700 mb-1.5">
                Notes
              </label>
              <Textarea
                placeholder="Optional notes about this applicant..."
                value={newApplicant.notes ?? ''}
                onChange={e => setNewApplicant(prev => ({ ...prev, notes: e.target.value }))}
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

      {/* ── Detail / Edit Modal ──────────────────────────────────────────────── */}
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} size="lg">
        <ModalHeader onClose={() => setShowDetailModal(false)}>
          Applicant Details
        </ModalHeader>
        <ModalBody>
          {activeApplicant && (
            <div className="space-y-4">
              {detailError && (
                <div className="bg-danger-50 border border-danger-200 text-danger-700 text-sm rounded-lg px-4 py-3">
                  {detailError}
                </div>
              )}

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4 bg-surface-50 rounded-lg p-4 text-sm">
                <div>
                  <p className="text-surface-500 text-xs mb-0.5">Candidate</p>
                  <p className="font-semibold text-surface-900">
                    {activeApplicant.candidateName || `ID: ${activeApplicant.candidateId}`}
                  </p>
                </div>
                <div>
                  <p className="text-surface-500 text-xs mb-0.5">Job Title</p>
                  <p className="font-medium text-surface-800">{activeApplicant.jobTitle || '—'}</p>
                </div>
                <div>
                  <p className="text-surface-500 text-xs mb-0.5">Current Stage</p>
                  <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${STAGE_COLORS[activeApplicant.status]?.badge ?? 'bg-surface-100 text-surface-600'}`}>
                    {STAGE_LABELS[activeApplicant.status] ?? formatLabel(activeApplicant.status)}
                  </span>
                </div>
                <div>
                  <p className="text-surface-500 text-xs mb-0.5">Source</p>
                  <p className="font-medium text-surface-800">
                    {activeApplicant.source ? formatLabel(activeApplicant.source) : '—'}
                  </p>
                </div>
                {activeApplicant.appliedDate && (
                  <div>
                    <p className="text-surface-500 text-xs mb-0.5">Applied</p>
                    <p className="font-medium text-surface-800">
                      {new Date(activeApplicant.appliedDate).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-surface-500 text-xs mb-0.5">Expected Salary</p>
                  <p className="font-medium text-surface-800">
                    {activeApplicant.expectedSalary
                      ? activeApplicant.expectedSalary.toLocaleString('en-IN')
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Move to Stage */}
              {(STATUS_TRANSITIONS[activeApplicant.status] || []).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">
                    Move to Stage
                  </label>
                  <Select
                    value={detailNextStatus}
                    onChange={e => setDetailNextStatus(e.target.value as ApplicationStatus | '')}
                  >
                    <option value="">Keep current stage</option>
                    {(STATUS_TRANSITIONS[activeApplicant.status] || []).map(s => (
                      <option key={s} value={s}>
                        {STAGE_LABELS[s] ?? formatLabel(s)}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Rating
                </label>
                <StarRating
                  value={detailRating}
                  onChange={setDetailRating}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Notes
                </label>
                <Textarea
                  value={detailNotes}
                  onChange={e => setDetailNotes(e.target.value)}
                  placeholder="Add notes about this applicant..."
                  rows={3}
                />
              </div>

              {/* Rejection Reason */}
              {(detailNextStatus === ApplicationStatus.REJECTED ||
                activeApplicant.status === ApplicationStatus.REJECTED) && (
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">
                    Rejection Reason
                  </label>
                  <Textarea
                    value={detailRejectionReason}
                    onChange={e => setDetailRejectionReason(e.target.value)}
                    placeholder="Optional reason for rejection..."
                    rows={2}
                  />
                </div>
              )}
            </div>
          )}
        </ModalBody>
        <ModalFooter className="justify-between">
          <Button
            variant="soft-danger"
            onClick={handleRejectApplicant}
            isLoading={detailLoading}
            disabled={activeApplicant?.status === ApplicationStatus.REJECTED}
          >
            Reject
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setShowDetailModal(false)} disabled={detailLoading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUpdateApplicant} isLoading={detailLoading} loadingText="Saving...">
              Save Changes
            </Button>
          </div>
        </ModalFooter>
      </Modal>
      {/* ── Create Offer Modal ──────────────────────────────────────────────── */}
      <Modal isOpen={showOfferModal} onClose={() => setShowOfferModal(false)} size="lg">
        <ModalHeader onClose={() => setShowOfferModal(false)}>
          Create Offer Letter{offerApplicant ? ` for ${offerApplicant.candidateName || 'Candidate'}` : ''}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            {offerError && (
              <div className="bg-danger-50 border border-danger-200 text-danger-700 text-sm rounded-lg px-4 py-3">
                {offerError}
              </div>
            )}
            {offerSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 flex items-center gap-2">
                <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                {offerSuccess}
              </div>
            )}

            {/* Template selector */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">
                Offer Letter Template *
              </label>
              {offerTemplatesLoading ? (
                <div className="flex items-center gap-2 h-10 px-3 border border-surface-300 rounded-lg bg-surface-50 text-sm text-surface-500">
                  <Loader2 size={14} className="animate-spin" /> Loading templates...
                </div>
              ) : (
                <Select
                  value={offerForm.templateId}
                  onChange={e => setOfferForm(prev => ({ ...prev, templateId: e.target.value }))}
                  disabled={offerLoading}
                >
                  <option value="">Select a template</option>
                  {offerTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                  {offerTemplates.length === 0 && (
                    <option value="" disabled>No offer templates found — create one in Letters settings</option>
                  )}
                </Select>
              )}
            </div>

            <Input
              label="Offered CTC (Annual, INR) *"
              type="number"
              placeholder="e.g. 1200000"
              value={offerForm.offeredCtc}
              onChange={e => setOfferForm(prev => ({ ...prev, offeredCtc: e.target.value }))}
              disabled={offerLoading}
            />

            <Input
              label="Offered Designation *"
              placeholder="e.g. Senior Software Engineer"
              value={offerForm.offeredDesignation}
              onChange={e => setOfferForm(prev => ({ ...prev, offeredDesignation: e.target.value }))}
              disabled={offerLoading}
            />

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">
                Proposed Joining Date *
              </label>
              <input
                type="date"
                value={offerForm.proposedJoiningDate}
                onChange={e => setOfferForm(prev => ({ ...prev, proposedJoiningDate: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                disabled={offerLoading}
                className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm text-surface-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 disabled:bg-surface-50 disabled:text-surface-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">
                Additional Notes
              </label>
              <Textarea
                placeholder="Any additional terms or notes to include..."
                value={offerForm.additionalNotes}
                onChange={e => setOfferForm(prev => ({ ...prev, additionalNotes: e.target.value }))}
                rows={3}
                disabled={offerLoading}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
              The offer letter will be generated, a PDF created, and a signing link sent to the candidate&apos;s email.
              The applicant will be moved to <strong>Offered</strong> stage automatically.
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowOfferModal(false)} disabled={offerLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateOffer}
            isLoading={offerLoading}
            loadingText="Sending Offer..."
            disabled={!!offerSuccess}
          >
            Generate & Send Offer
          </Button>
        </ModalFooter>
      </Modal>
    </AppLayout>
  );
}
