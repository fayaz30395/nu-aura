'use client';

import React, { useState, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { notifications } from '@mantine/notifications';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Candidate, CandidateStatus, CandidateSource, CandidateStage, CreateCandidateRequest } from '@/lib/types/recruitment';
import { Users, Plus, Sparkles } from 'lucide-react';

import { CreateOfferRequest } from '@/lib/types/recruitment';
import { recruitmentService } from '@/lib/services/recruitment.service';
import {
  useCandidates,
  useJobOpenings,
  useCreateCandidate,
  useUpdateCandidate,
  useDeleteCandidate,
  useCreateOffer,
  useParseResume,
  useCalculateMatchScore,
  useGenerateScreeningSummary,
  useSynthesizeFeedback,
} from '@/lib/hooks/queries/useRecruitment';
import { useEmployees } from '@/lib/hooks/queries/useEmployees';
import { useActiveLetterTemplates } from '@/lib/hooks/queries/useLetter';
import {
  createCandidateSchema,
  createOfferSchema,
  resumeParseRequestSchema,
  CreateCandidateFormData,
  CreateOfferFormData,
  ResumeParseFormData,
} from '@/lib/validations/recruitment';
import {
  CandidateMatchResponse,
  CandidateScreeningSummaryResponse,
  FeedbackSynthesisResponse,
  ResumeParseResponse,
} from '@/lib/types/ai-recruitment';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';

// Extracted sub-components (Loop 3 refactor — FE-016)
import { CandidateStats } from './CandidateStats';
import { CandidateFilters } from './CandidateFilters';
import { CandidateTableRow } from './CandidateTableRow';
import { computeStats, filterCandidates } from './utils';

// Co-located modal components
import {
  ParseResumeModal,
  CandidateFormModal,
  ViewCandidateModal,
  DeleteCandidateModal,
  ScreeningSummaryModal,
  FeedbackSynthesisModal,
  CreateOfferModal,
  AcceptOfferModal,
  DeclineOfferModal,
} from './_components';

// ==================== Loading Fallback ====================

function CandidatesPageLoading() {
  return (
    <AppLayout>
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded w-1/4" />
        <div className="h-64 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded" />
      </div>
    </AppLayout>
  );
}

export default function CandidatesPageWrapper() {
  return (
    <Suspense fallback={<CandidatesPageLoading />}>
      <CandidatesPage />
    </Suspense>
  );
}

// ==================== Main Component ====================

function CandidatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobIdFilter = searchParams.get('jobId');

  // ==================== State ====================

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showParseResumeModal, setShowParseResumeModal] = useState(false);
  const [showScreeningSummaryModal, setShowScreeningSummaryModal] = useState(false);
  const [showFeedbackSynthesisModal, setShowFeedbackSynthesisModal] = useState(false);

  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [candidateForOffer, setCandidateForOffer] = useState<Candidate | null>(null);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>(jobIdFilter || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmedJoiningDate, setConfirmedJoiningDate] = useState('');
  const [declineReason, setDeclineReason] = useState('');

  // AI state
  const [matchScores, setMatchScores] = useState<Map<string, CandidateMatchResponse>>(new Map());
  const [screeningSummary, setScreeningSummary] = useState<CandidateScreeningSummaryResponse | null>(null);
  const [feedbackSynthesis, setFeedbackSynthesis] = useState<FeedbackSynthesisResponse | null>(null);
  const [parsedResume, setParsedResume] = useState<ResumeParseResponse | null>(null);
  const [aiLoadingState, setAiLoadingState] = useState<string | null>(null);

  // ==================== Queries & Mutations ====================

  const { data: candidatesData, isLoading: candidatesLoading, refetch: refetchCandidates } = useCandidates(0, 100);
  const { data: jobOpeningsData } = useJobOpenings(0, 100);
  const createCandidateMutation = useCreateCandidate();
  const updateCandidateMutation = useUpdateCandidate();
  const deleteCandidateMutation = useDeleteCandidate();
  const createOfferMutation = useCreateOffer();
  const parseResumeMutation = useParseResume();
  const calculateMatchScoreMutation = useCalculateMatchScore();
  const generateScreeningSummaryMutation = useGenerateScreeningSummary();
  const synthesizeFeedbackMutation = useSynthesizeFeedback();

  // Load initial data
  const { data: employeesData } = useEmployees(0, 100);
  useActiveLetterTemplates(true);

  const candidates = useMemo(() => candidatesData?.content || [], [candidatesData?.content]);
  const jobOpenings = jobOpeningsData?.content || [];
  const recruiters = employeesData?.content || [];

  // React Hook Form setup
  const candidateForm = useForm<CreateCandidateFormData>({
    resolver: zodResolver(createCandidateSchema),
    defaultValues: {
      candidateCode: '',
      jobOpeningId: jobIdFilter || '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      currentLocation: '',
      currentCompany: '',
      currentDesignation: '',
      totalExperience: undefined,
      currentCtc: undefined,
      expectedCtc: undefined,
      noticePeriodDays: undefined,
      resumeUrl: '',
      source: 'JOB_PORTAL',
      status: 'NEW',
      currentStage: 'RECRUITERS_PHONE_CALL',
      appliedDate: new Date().toISOString().split('T')[0],
      notes: '',
      assignedRecruiterId: '',
    },
  });

  const offerForm = useForm<CreateOfferFormData>({
    resolver: zodResolver(createOfferSchema),
    defaultValues: {
      offeredSalary: 0,
      positionTitle: '',
      joiningDate: '',
      offerExpiryDate: '',
      notes: '',
    },
  });

  const resumeParseForm = useForm<ResumeParseFormData>({
    resolver: zodResolver(resumeParseRequestSchema),
    defaultValues: {
      resumeText: '',
      resumeUrl: '',
    },
  });

  // ==================== Handlers ====================

  const handleCandidateSubmit = async (formData: CreateCandidateFormData) => {
    try {
      // Cast form data to match API requirements
      const data: CreateCandidateRequest = {
        candidateCode: formData.candidateCode,
        jobOpeningId: formData.jobOpeningId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        currentLocation: formData.currentLocation,
        currentCompany: formData.currentCompany,
        currentDesignation: formData.currentDesignation,
        totalExperience: formData.totalExperience,
        currentCtc: formData.currentCtc,
        expectedCtc: formData.expectedCtc,
        noticePeriodDays: formData.noticePeriodDays,
        resumeUrl: formData.resumeUrl,
        source: formData.source as CandidateSource,
        status: formData.status as CandidateStatus,
        currentStage: formData.currentStage as CandidateStage,
        appliedDate: formData.appliedDate,
        notes: formData.notes,
        assignedRecruiterId: formData.assignedRecruiterId,
      };

      if (editingCandidate) {
        await updateCandidateMutation.mutateAsync({
          id: editingCandidate.id,
          data,
        });
        notifications.show({
          title: 'Success',
          message: 'Candidate updated successfully',
          color: 'green',
        });
      } else {
        await createCandidateMutation.mutateAsync(data);
        notifications.show({
          title: 'Success',
          message: 'Candidate created successfully',
          color: 'green',
        });
      }
      setShowAddModal(false);
      candidateForm.reset();
      setEditingCandidate(null);
      refetchCandidates();
    } catch (err: unknown) {
      notifications.show({
        title: 'Error',
        message: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save candidate',
        color: 'red',
      });
    }
  };

  const handleEditCandidate = useCallback((candidate: Candidate) => {
    setEditingCandidate(candidate);
    candidateForm.reset({
      candidateCode: candidate.candidateCode,
      jobOpeningId: candidate.jobOpeningId,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email,
      phone: candidate.phone || '',
      currentLocation: candidate.currentLocation || '',
      currentCompany: candidate.currentCompany || '',
      currentDesignation: candidate.currentDesignation || '',
      totalExperience: candidate.totalExperience,
      currentCtc: candidate.currentCtc,
      expectedCtc: candidate.expectedCtc,
      noticePeriodDays: candidate.noticePeriodDays,
      resumeUrl: candidate.resumeUrl || '',
      source: candidate.source || 'JOB_PORTAL',
      status: candidate.status,
      currentStage: candidate.currentStage || 'RECRUITERS_PHONE_CALL',
      appliedDate: candidate.appliedDate || '',
      notes: candidate.notes || '',
      assignedRecruiterId: candidate.assignedRecruiterId || '',
    });
    setShowAddModal(true);
  }, [candidateForm]);

  const handleDeleteCandidate = async () => {
    if (!candidateToDelete) return;
    try {
      await deleteCandidateMutation.mutateAsync(candidateToDelete.id);
      notifications.show({
        title: 'Success',
        message: 'Candidate deleted successfully',
        color: 'green',
      });
      setShowDeleteModal(false);
      setCandidateToDelete(null);
      refetchCandidates();
    } catch (err: unknown) {
      notifications.show({
        title: 'Error',
        message: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete candidate',
        color: 'red',
      });
    }
  };

  const handleOfferSubmit = async (formData: CreateOfferFormData) => {
    if (!candidateForOffer) return;
    try {
      // Cast form data to match API requirements
      const data: CreateOfferRequest = {
        offeredSalary: formData.offeredSalary || 0,
        positionTitle: formData.positionTitle,
        joiningDate: formData.joiningDate || '',
        offerExpiryDate: formData.offerExpiryDate,
        notes: formData.notes,
      };

      await createOfferMutation.mutateAsync({
        candidateId: candidateForOffer.id,
        data,
      });
      notifications.show({
        title: 'Success',
        message: 'Offer created successfully',
        color: 'green',
      });
      setShowOfferModal(false);
      setCandidateForOffer(null);
      offerForm.reset();
      refetchCandidates();
    } catch (err: unknown) {
      notifications.show({
        title: 'Error',
        message: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create offer',
        color: 'red',
      });
    }
  };

  const handleAcceptOffer = async () => {
    if (!candidateForOffer) return;
    try {
      await recruitmentService.acceptOffer(candidateForOffer.id, {
        confirmedJoiningDate: confirmedJoiningDate || undefined,
      });
      notifications.show({
        title: 'Success',
        message: 'Offer accepted',
        color: 'green',
      });
      setShowAcceptModal(false);
      setCandidateForOffer(null);
      setConfirmedJoiningDate('');
      refetchCandidates();
    } catch (err: unknown) {
      notifications.show({
        title: 'Error',
        message: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to accept offer',
        color: 'red',
      });
    }
  };

  const handleDeclineOffer = async () => {
    if (!candidateForOffer) return;
    try {
      await recruitmentService.declineOffer(candidateForOffer.id, {
        declineReason: declineReason || undefined,
      });
      notifications.show({
        title: 'Success',
        message: 'Offer declined',
        color: 'green',
      });
      setShowDeclineModal(false);
      setCandidateForOffer(null);
      setDeclineReason('');
      refetchCandidates();
    } catch (err: unknown) {
      notifications.show({
        title: 'Error',
        message: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to decline offer',
        color: 'red',
      });
    }
  };

  // ==================== AI Handlers ====================

  const handleParseResume = async (data: ResumeParseFormData) => {
    setAiLoadingState('parse');
    try {
      const result = await parseResumeMutation.mutateAsync(data);
      setParsedResume(result);
      notifications.show({
        title: 'Success',
        message: 'Resume parsed successfully',
        color: 'green',
      });
    } catch (err: unknown) {
      notifications.show({
        title: 'Error',
        message: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to parse resume',
        color: 'red',
      });
    } finally {
      setAiLoadingState(null);
    }
  };

  const applyParsedResume = (parsed: ResumeParseResponse) => {
    const [firstName, ...lastNameParts] = (parsed.fullName || '').split(' ');
    const lastName = lastNameParts.join(' ');
    candidateForm.setValue('firstName', firstName || '');
    candidateForm.setValue('lastName', lastName || '');
    candidateForm.setValue('email', parsed.email || '');
    candidateForm.setValue('phone', parsed.phone || '');
    candidateForm.setValue('currentCompany', parsed.currentCompany || '');
    candidateForm.setValue('currentDesignation', parsed.currentDesignation || '');
    candidateForm.setValue('currentLocation', parsed.currentLocation || '');
    if (parsed.totalExperienceYears) {
      candidateForm.setValue('totalExperience', parsed.totalExperienceYears);
    }
    setShowParseResumeModal(false);
    setParsedResume(null);
    resumeParseForm.reset();
  };

  const handleCalculateMatchScore = useCallback(async (candidate: Candidate) => {
    if (!candidate.jobOpeningId) {
      notifications.show({
        title: 'Info',
        message: 'Candidate must have a job opening assigned',
        color: 'blue',
      });
      return;
    }
    setAiLoadingState(`match-${candidate.id}`);
    try {
      const result = await calculateMatchScoreMutation.mutateAsync({
        candidateId: candidate.id,
        jobOpeningId: candidate.jobOpeningId,
      });
      setMatchScores(prev => {
        const next = new Map(prev);
        next.set(candidate.id, result);
        return next;
      });
      notifications.show({
        title: 'Success',
        message: 'Match score calculated',
        color: 'green',
      });
    } catch (err: unknown) {
      notifications.show({
        title: 'Error',
        message: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to calculate match score',
        color: 'red',
      });
    } finally {
      setAiLoadingState(null);
    }
  }, [calculateMatchScoreMutation]);

  const handleGenerateScreeningSummary = useCallback(async (candidate: Candidate) => {
    if (!candidate.jobOpeningId) {
      notifications.show({
        title: 'Info',
        message: 'Candidate must have a job opening assigned',
        color: 'blue',
      });
      return;
    }
    setAiLoadingState(`screening-${candidate.id}`);
    try {
      const result = await generateScreeningSummaryMutation.mutateAsync({
        candidateId: candidate.id,
        jobOpeningId: candidate.jobOpeningId,
      });
      setScreeningSummary(result);
      setShowScreeningSummaryModal(true);
      notifications.show({
        title: 'Success',
        message: 'Screening summary generated',
        color: 'green',
      });
    } catch (err: unknown) {
      notifications.show({
        title: 'Error',
        message: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to generate screening summary',
        color: 'red',
      });
    } finally {
      setAiLoadingState(null);
    }
  }, [generateScreeningSummaryMutation]);

  const handleSynthesizeFeedback = useCallback(async (candidate: Candidate) => {
    if (!candidate.jobOpeningId) {
      notifications.show({
        title: 'Info',
        message: 'Candidate must have a job opening assigned',
        color: 'blue',
      });
      return;
    }
    setAiLoadingState(`feedback-${candidate.id}`);
    try {
      const result = await synthesizeFeedbackMutation.mutateAsync({
        candidateId: candidate.id,
        jobOpeningId: candidate.jobOpeningId,
      });
      setFeedbackSynthesis(result);
      setShowFeedbackSynthesisModal(true);
      notifications.show({
        title: 'Success',
        message: 'Feedback synthesized',
        color: 'green',
      });
    } catch (err: unknown) {
      notifications.show({
        title: 'Error',
        message: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to synthesize feedback',
        color: 'red',
      });
    } finally {
      setAiLoadingState(null);
    }
  }, [synthesizeFeedbackMutation]);

  // ==================== Derived Data (memoized) ====================

  const filteredCandidates = useMemo(
    () => filterCandidates(candidates, searchQuery, statusFilter, selectedJobFilter),
    [candidates, searchQuery, statusFilter, selectedJobFilter]
  );

  const stats = useMemo(() => computeStats(candidates), [candidates]);

  // ==================== Stable Callbacks for Memoized Children ====================

  const handleView = useCallback((c: Candidate) => { setSelectedCandidate(c); setShowViewModal(true); }, []);
  const handleStartEdit = useCallback((c: Candidate) => handleEditCandidate(c), [handleEditCandidate]);
  const handleStartDelete = useCallback((c: Candidate) => { setCandidateToDelete(c); setShowDeleteModal(true); }, []);
  const handleStartOffer = useCallback((c: Candidate) => { setCandidateForOffer(c); setShowOfferModal(true); }, []);
  const handleStartAccept = useCallback((c: Candidate) => { setCandidateForOffer(c); setShowAcceptModal(true); }, []);
  const handleStartDecline = useCallback((c: Candidate) => { setCandidateForOffer(c); setShowDeclineModal(true); }, []);

  return (
    <AppLayout activeMenuItem="recruitment">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="p-6 space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Candidates</h1>
            <p className="text-[var(--text-secondary)] mt-1">Track and manage candidate applications</p>
          </div>
          <div className="flex gap-2">
            <PermissionGate permission={Permissions.CANDIDATE_VIEW}>
              <Button
                onClick={() => {
                  setEditingCandidate(null);
                  candidateForm.reset();
                  setShowAddModal(true);
                }}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Candidate
              </Button>
            </PermissionGate>
            <PermissionGate permission={Permissions.CANDIDATE_EVALUATE}>
              <Button
                onClick={() => setShowParseResumeModal(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Parse Resume
              </Button>
            </PermissionGate>
          </div>
        </div>

        {/* Stats Cards */}
        <CandidateStats
          total={stats.total}
          newCount={stats.new}
          interview={stats.interview}
          selected={stats.selected}
        />

        {/* Search and Filters */}
        <CandidateFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          jobFilter={selectedJobFilter}
          onJobChange={setSelectedJobFilter}
          jobOpenings={jobOpenings}
        />

        {/* Candidates Table */}
        <Card className="bg-[var(--bg-card)]">
          <CardContent className="p-0">
            {candidatesLoading ? (
              <div className="text-center py-12 text-[var(--text-muted)]">Loading candidates...</div>
            ) : filteredCandidates.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-[var(--text-muted)] dark:text-[var(--text-secondary)] mx-auto mb-4" />
                <p className="text-[var(--text-muted)]">No candidates found</p>
                <Button onClick={() => { setEditingCandidate(null); candidateForm.reset(); setShowAddModal(true); }} className="mt-4">
                  Add First Candidate
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--bg-secondary)]/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Candidate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Job</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Experience</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Stage</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Source</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                    {filteredCandidates.map((candidate) => (
                      <CandidateTableRow
                        key={candidate.id}
                        candidate={candidate}
                        matchScore={matchScores.get(candidate.id)}
                        aiLoadingState={aiLoadingState}
                        onView={handleView}
                        onEdit={handleStartEdit}
                        onDelete={handleStartDelete}
                        onOffer={handleStartOffer}
                        onAccept={handleStartAccept}
                        onDecline={handleStartDecline}
                        onCalculateMatch={handleCalculateMatchScore}
                        onScreeningSummary={handleGenerateScreeningSummary}
                        onSynthesizeFeedback={handleSynthesizeFeedback}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ==================== MODALS ==================== */}

        <ParseResumeModal
          open={showParseResumeModal}
          parsedResume={parsedResume}
          aiLoadingState={aiLoadingState}
          resumeParseForm={resumeParseForm}
          onSubmit={handleParseResume}
          onApply={applyParsedResume}
          onClose={() => { setShowParseResumeModal(false); setParsedResume(null); resumeParseForm.reset(); }}
        />

        <CandidateFormModal
          open={showAddModal}
          editingCandidate={editingCandidate}
          candidateForm={candidateForm}
          jobOpenings={jobOpenings}
          recruiters={recruiters}
          isSubmitting={createCandidateMutation.isPending || updateCandidateMutation.isPending}
          onSubmit={handleCandidateSubmit}
          onClose={() => { setShowAddModal(false); setEditingCandidate(null); candidateForm.reset(); }}
        />

        <ViewCandidateModal
          open={showViewModal}
          candidate={selectedCandidate}
          onClose={() => setShowViewModal(false)}
          onEdit={handleEditCandidate}
          onScheduleInterview={(c) => router.push(`/recruitment/interviews?candidateId=${c.id}`)}
        />

        <DeleteCandidateModal
          open={showDeleteModal}
          candidate={candidateToDelete}
          isDeleting={deleteCandidateMutation.isPending}
          onConfirm={handleDeleteCandidate}
          onClose={() => { setShowDeleteModal(false); setCandidateToDelete(null); }}
        />

        <ScreeningSummaryModal
          open={showScreeningSummaryModal}
          screeningSummary={screeningSummary}
          onClose={() => { setShowScreeningSummaryModal(false); setScreeningSummary(null); }}
        />

        <FeedbackSynthesisModal
          open={showFeedbackSynthesisModal}
          feedbackSynthesis={feedbackSynthesis}
          onClose={() => { setShowFeedbackSynthesisModal(false); setFeedbackSynthesis(null); }}
        />

        <CreateOfferModal
          open={showOfferModal}
          candidate={candidateForOffer}
          offerForm={offerForm}
          isSubmitting={createOfferMutation.isPending}
          onSubmit={handleOfferSubmit}
          onClose={() => setShowOfferModal(false)}
        />

        <AcceptOfferModal
          open={showAcceptModal}
          candidate={candidateForOffer}
          confirmedJoiningDate={confirmedJoiningDate}
          onJoiningDateChange={setConfirmedJoiningDate}
          onConfirm={handleAcceptOffer}
          onClose={() => { setShowAcceptModal(false); setCandidateForOffer(null); }}
        />

        <DeclineOfferModal
          open={showDeclineModal}
          candidate={candidateForOffer}
          declineReason={declineReason}
          onDeclineReasonChange={setDeclineReason}
          onConfirm={handleDeclineOffer}
          onClose={() => { setShowDeclineModal(false); setCandidateForOffer(null); }}
        />
      </motion.div>
    </AppLayout>
  );
}
