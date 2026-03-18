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
import {
  Users, Plus, Mail, Phone, Building, MapPin, Trash2, X,
  CheckCircle, XCircle, Loader2, Sparkles, Brain, MessageSquare,
  AlertTriangle, ShieldAlert
} from 'lucide-react';

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
import { computeStats, filterCandidates, getStatusColor, getStageColor } from './utils';

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

  // ==================== Helpers ====================

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
  const handleStartAccept = useCallback((c: Candidate) => { setSelectedCandidate(c); setShowAcceptModal(true); }, []);
  const handleStartDecline = useCallback((c: Candidate) => { setSelectedCandidate(c); setShowDeclineModal(true); }, []);


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

        {/* Parse Resume Modal */}
        {showParseResumeModal && (
          <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--bg-card)] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-[var(--border-main)] shadow-xl">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-primary-500" />
                    Parse Resume
                  </h2>
                  <button onClick={() => { setShowParseResumeModal(false); setParsedResume(null); resumeParseForm.reset(); }} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)]">
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {!parsedResume ? (
                  <form onSubmit={resumeParseForm.handleSubmit(handleParseResume)} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Resume Text</label>
                      <textarea
                        {...resumeParseForm.register('resumeText')}
                        rows={6}
                        placeholder="Paste resume content here..."
                        className="w-full px-3 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                      {resumeParseForm.formState.errors.resumeText && (
                        <p className="text-xs text-red-500 mt-1">{resumeParseForm.formState.errors.resumeText.message}</p>
                      )}
                    </div>

                    <div className="text-center text-[var(--text-muted)]">OR</div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Resume URL</label>
                      <input
                        {...resumeParseForm.register('resumeUrl')}
                        type="url"
                        placeholder="https://example.com/resume.pdf"
                        className="w-full px-3 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                      {resumeParseForm.formState.errors.resumeUrl && (
                        <p className="text-xs text-red-500 mt-1">{resumeParseForm.formState.errors.resumeUrl.message}</p>
                      )}
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-[var(--border-main)]">
                      <Button type="button" variant="outline" onClick={() => { setShowParseResumeModal(false); resumeParseForm.reset(); setParsedResume(null); }} className="flex-1">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={aiLoadingState === 'parse'} className="flex-1">
                        {aiLoadingState === 'parse' ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Parsing...</> : 'Parse Resume'}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl space-y-4">
                      {parsedResume.fullName && (
                        <div>
                          <p className="text-xs text-[var(--text-muted)]">Full Name</p>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{parsedResume.fullName}</p>
                        </div>
                      )}
                      {parsedResume.email && (
                        <div>
                          <p className="text-xs text-[var(--text-muted)]">Email</p>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{parsedResume.email}</p>
                        </div>
                      )}
                      {parsedResume.phone && (
                        <div>
                          <p className="text-xs text-[var(--text-muted)]">Phone</p>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{parsedResume.phone}</p>
                        </div>
                      )}
                      {parsedResume.currentCompany && (
                        <div>
                          <p className="text-xs text-[var(--text-muted)]">Current Company</p>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{parsedResume.currentCompany}</p>
                        </div>
                      )}
                      {parsedResume.currentDesignation && (
                        <div>
                          <p className="text-xs text-[var(--text-muted)]">Current Designation</p>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{parsedResume.currentDesignation}</p>
                        </div>
                      )}
                      {parsedResume.totalExperienceYears && (
                        <div>
                          <p className="text-xs text-[var(--text-muted)]">Total Experience</p>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{parsedResume.totalExperienceYears} years</p>
                        </div>
                      )}
                      {parsedResume.skills && parsedResume.skills.length > 0 && (
                        <div>
                          <p className="text-xs text-[var(--text-muted)] mb-2">Skills</p>
                          <div className="flex flex-wrap gap-2">
                            {parsedResume.skills.map((skill, idx) => (
                              <span key={idx} className="px-2.5 py-1 text-xs rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-[var(--border-main)]">
                      <Button type="button" variant="outline" onClick={() => { setShowParseResumeModal(false); setParsedResume(null); resumeParseForm.reset(); }} className="flex-1">
                        Cancel
                      </Button>
                      <Button onClick={() => applyParsedResume(parsedResume)} className="flex-1">
                        Apply to Form
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Candidate Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--bg-card)] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-main)] shadow-xl">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                    {editingCandidate ? 'Edit Candidate' : 'Add Candidate'}
                  </h2>
                  <button onClick={() => { setShowAddModal(false); setEditingCandidate(null); candidateForm.reset(); }} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)]">
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={candidateForm.handleSubmit(handleCandidateSubmit)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Candidate Code *</label>
                      <input
                        type="text"
                        {...candidateForm.register('candidateCode')}
                        className="w-full px-3 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        placeholder="CAN-001"
                      />
                      {candidateForm.formState.errors.candidateCode && (
                        <p className="text-xs text-red-500 mt-1">{candidateForm.formState.errors.candidateCode.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Job Opening *</label>
                      <select
                        {...candidateForm.register('jobOpeningId')}
                        className="w-full px-3 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      >
                        <option value="">Select Job Opening</option>
                        {jobOpenings.map((job) => (
                          <option key={job.id} value={job.id}>{job.jobTitle}</option>
                        ))}
                      </select>
                      {candidateForm.formState.errors.jobOpeningId && (
                        <p className="text-xs text-red-500 mt-1">{candidateForm.formState.errors.jobOpeningId.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">First Name *</label>
                      <input
                        type="text"
                        {...candidateForm.register('firstName')}
                        className="w-full px-3 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                      {candidateForm.formState.errors.firstName && (
                        <p className="text-xs text-red-500 mt-1">{candidateForm.formState.errors.firstName.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Last Name *</label>
                      <input
                        type="text"
                        {...candidateForm.register('lastName')}
                        className="w-full px-3 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                      {candidateForm.formState.errors.lastName && (
                        <p className="text-xs text-red-500 mt-1">{candidateForm.formState.errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Email *</label>
                      <input
                        type="email"
                        {...candidateForm.register('email')}
                        className="w-full px-3 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                      {candidateForm.formState.errors.email && (
                        <p className="text-xs text-red-500 mt-1">{candidateForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Phone</label>
                      <input
                        type="tel"
                        {...candidateForm.register('phone')}
                        className="w-full px-3 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                      {candidateForm.formState.errors.phone && (
                        <p className="text-xs text-red-500 mt-1">{candidateForm.formState.errors.phone.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Current Company</label>
                      <input
                        type="text"
                        {...candidateForm.register('currentCompany')}
                        className="w-full px-3 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Current Designation</label>
                      <input
                        type="text"
                        {...candidateForm.register('currentDesignation')}
                        className="w-full px-3 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Location</label>
                      <input
                        type="text"
                        {...candidateForm.register('currentLocation')}
                        className="w-full px-3 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Experience (years)</label>
                      <input
                        type="number"
                        step="0.5"
                        {...candidateForm.register('totalExperience', { valueAsNumber: true })}
                        className="w-full px-3 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Current CTC</label>
                      <input
                        type="number"
                        {...candidateForm.register('currentCtc', { valueAsNumber: true })}
                        className="w-full px-3 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Expected CTC</label>
                      <input
                        type="number"
                        {...candidateForm.register('expectedCtc', { valueAsNumber: true })}
                        className="w-full px-3 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Notice (days)</label>
                      <input
                        type="number"
                        {...candidateForm.register('noticePeriodDays', { valueAsNumber: true })}
                        className="w-full px-3 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Source</label>
                      <select
                        {...candidateForm.register('source')}
                        className="w-full px-3 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      >
                        <option value="JOB_PORTAL">Job Portal</option>
                        <option value="REFERRAL">Referral</option>
                        <option value="LINKEDIN">LinkedIn</option>
                        <option value="COMPANY_WEBSITE">Company Website</option>
                        <option value="WALK_IN">Walk In</option>
                        <option value="CAMPUS">Campus</option>
                        <option value="CONSULTANT">Consultant</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Status</label>
                      <select
                        {...candidateForm.register('status')}
                        className="w-full px-3 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      >
                        <option value="NEW">New</option>
                        <option value="SCREENING">Screening</option>
                        <option value="INTERVIEW">Interview</option>
                        <option value="SELECTED">Selected</option>
                        <option value="OFFER_EXTENDED">Offer Extended</option>
                        <option value="OFFER_ACCEPTED">Offer Accepted</option>
                        <option value="OFFER_DECLINED">Offer Declined</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="WITHDRAWN">Withdrawn</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Current Stage</label>
                      <select
                        {...candidateForm.register('currentStage')}
                        className="w-full px-3 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      >
                        <option value="RECRUITERS_PHONE_CALL">Phone Call</option>
                        <option value="PANEL_REVIEW">Panel Review</option>
                        <option value="PANEL_SHORTLISTED">Shortlisted</option>
                        <option value="TECHNICAL_INTERVIEW_SCHEDULED">Tech Interview Scheduled</option>
                        <option value="TECHNICAL_INTERVIEW_COMPLETED">Tech Interview Done</option>
                        <option value="MANAGEMENT_INTERVIEW_SCHEDULED">Mgmt Interview Scheduled</option>
                        <option value="MANAGEMENT_INTERVIEW_COMPLETED">Mgmt Interview Done</option>
                        <option value="CLIENT_INTERVIEW_SCHEDULED">Client Interview Scheduled</option>
                        <option value="CLIENT_INTERVIEW_COMPLETED">Client Interview Done</option>
                        <option value="HR_FINAL_INTERVIEW_COMPLETED">HR Final Done</option>
                        <option value="OFFER_NDA_TO_BE_RELEASED">Offer / NDA</option>
                        <option value="PANEL_REJECT">Panel Reject</option>
                        <option value="CANDIDATE_REJECTED">Rejected</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Assigned Recruiter</label>
                      <select
                        {...candidateForm.register('assignedRecruiterId')}
                        className="w-full px-3 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      >
                        <option value="">Select Recruiter</option>
                        {recruiters.map((recruiter) => (
                          <option key={recruiter.id} value={recruiter.id}>{recruiter.fullName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Resume URL</label>
                      <input
                        type="url"
                        {...candidateForm.register('resumeUrl')}
                        className="w-full px-3 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        placeholder="https://..."
                      />
                      {candidateForm.formState.errors.resumeUrl && (
                        <p className="text-xs text-red-500 mt-1">{candidateForm.formState.errors.resumeUrl.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Notes</label>
                    <textarea
                      rows={3}
                      {...candidateForm.register('notes')}
                      className="w-full px-3 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      placeholder="Additional notes..."
                    />
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-[var(--border-main)]">
                    <Button type="button" variant="outline" onClick={() => { setShowAddModal(false); setEditingCandidate(null); candidateForm.reset(); }} className="flex-1">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createCandidateMutation.isPending || updateCandidateMutation.isPending} className="flex-1">
                      {editingCandidate ? 'Update Candidate' : 'Add Candidate'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* View Candidate Modal */}
        {showViewModal && selectedCandidate && (
          <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--bg-card)] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-main)] shadow-xl">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">Candidate Details</h2>
                  <button onClick={() => setShowViewModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)]">
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary-700 dark:text-primary-300">
                        {selectedCandidate.firstName.charAt(0)}{selectedCandidate.lastName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-[var(--text-primary)]">{selectedCandidate.fullName}</h3>
                      <p className="text-[var(--text-muted)]">{selectedCandidate.candidateCode}</p>
                      <div className="flex gap-2 mt-2">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedCandidate.status)}`}>
                          {selectedCandidate.status.replace(/_/g, ' ')}
                        </span>
                        {selectedCandidate.currentStage && (
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStageColor(selectedCandidate.currentStage)}`}>
                            {selectedCandidate.currentStage.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-4 p-4 bg-[var(--bg-secondary)] rounded-xl">
                      <Mail className="h-5 w-5 text-[var(--text-muted)]" />
                      <div>
                        <p className="text-xs text-[var(--text-muted)]">Email</p>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{selectedCandidate.email}</p>
                      </div>
                    </div>
                    {selectedCandidate.phone && (
                      <div className="flex items-center gap-4 p-4 bg-[var(--bg-secondary)] rounded-xl">
                        <Phone className="h-5 w-5 text-[var(--text-muted)]" />
                        <div>
                          <p className="text-xs text-[var(--text-muted)]">Phone</p>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{selectedCandidate.phone}</p>
                        </div>
                      </div>
                    )}
                    {selectedCandidate.currentLocation && (
                      <div className="flex items-center gap-4 p-4 bg-[var(--bg-secondary)] rounded-xl">
                        <MapPin className="h-5 w-5 text-[var(--text-muted)]" />
                        <div>
                          <p className="text-xs text-[var(--text-muted)]">Location</p>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{selectedCandidate.currentLocation}</p>
                        </div>
                      </div>
                    )}
                    {selectedCandidate.currentCompany && (
                      <div className="flex items-center gap-4 p-4 bg-[var(--bg-secondary)] rounded-xl">
                        <Building className="h-5 w-5 text-[var(--text-muted)]" />
                        <div>
                          <p className="text-xs text-[var(--text-muted)]">Current Company</p>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{selectedCandidate.currentCompany}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 bg-[var(--bg-secondary)] rounded-xl text-center">
                      <p className="text-xs text-[var(--text-muted)]">Experience</p>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">
                        {selectedCandidate.totalExperience ? `${selectedCandidate.totalExperience}y` : '-'}
                      </p>
                    </div>
                    <div className="p-4 bg-[var(--bg-secondary)] rounded-xl text-center">
                      <p className="text-xs text-[var(--text-muted)]">Current CTC</p>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">
                        {selectedCandidate.currentCtc?.toLocaleString() || '-'}
                      </p>
                    </div>
                    <div className="p-4 bg-[var(--bg-secondary)] rounded-xl text-center">
                      <p className="text-xs text-[var(--text-muted)]">Expected CTC</p>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">
                        {selectedCandidate.expectedCtc?.toLocaleString() || '-'}
                      </p>
                    </div>
                    <div className="p-4 bg-[var(--bg-secondary)] rounded-xl text-center">
                      <p className="text-xs text-[var(--text-muted)]">Notice Period</p>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">
                        {selectedCandidate.noticePeriodDays ? `${selectedCandidate.noticePeriodDays}d` : '-'}
                      </p>
                    </div>
                  </div>

                  {selectedCandidate.notes && (
                    <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
                      <p className="text-xs text-[var(--text-muted)] mb-2">Notes</p>
                      <p className="text-sm text-[var(--text-primary)]">{selectedCandidate.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-4 pt-4 border-t border-[var(--border-main)]">
                    <Button variant="outline" onClick={() => setShowViewModal(false)} className="flex-1">
                      Close
                    </Button>
                    <Button onClick={() => { setShowViewModal(false); handleEditCandidate(selectedCandidate); }} className="flex-1">
                      Edit Candidate
                    </Button>
                    <Button onClick={() => router.push(`/recruitment/interviews?candidateId=${selectedCandidate.id}`)} className="flex-1">
                      Schedule Interview
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Candidate Modal */}
        {showDeleteModal && candidateToDelete && (
          <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--bg-card)] rounded-2xl max-w-md w-full p-6 border border-[var(--border-main)] shadow-xl">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="ml-4 text-lg font-medium text-[var(--text-primary)]">Delete Candidate</h3>
              </div>
              <p className="text-sm text-[var(--text-muted)] mb-6">
                Are you sure you want to delete <strong className="text-[var(--text-secondary)]">{candidateToDelete.fullName}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => { setShowDeleteModal(false); setCandidateToDelete(null); }} className="flex-1">
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteCandidate} disabled={deleteCandidateMutation.isPending} className="flex-1">
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Screening Summary Modal */}
        {showScreeningSummaryModal && screeningSummary && (
          <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--bg-card)] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-main)] shadow-xl">
              <div className="p-6">
                {/* Demo Mode Banner */}
                {screeningSummary.aiModelVersion === 'mock-v1' && (
                  <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700 flex items-start gap-4">
                    <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Demo Mode</p>
                      <p className="text-xs text-amber-700 dark:text-amber-400">Connect OpenAI for real AI scoring</p>
                    </div>
                  </div>
                )}

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Brain className="h-6 w-6 text-purple-500" />
                    AI Screening Summary
                  </h2>
                  <button onClick={() => { setShowScreeningSummaryModal(false); setScreeningSummary(null); }} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)]">
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Info Bar */}
                <div className="mb-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
                      <p className="text-xs text-[var(--text-muted)] mb-1">Candidate</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{screeningSummary.candidateName}</p>
                    </div>
                    <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
                      <p className="text-xs text-[var(--text-muted)] mb-1">Job Title</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{screeningSummary.jobTitle}</p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-center">
                    <span className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap ${
                      screeningSummary.fitLevel === 'HIGH' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                      screeningSummary.fitLevel === 'MEDIUM' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                      'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                    }`}>
                      Fit Level: {screeningSummary.fitLevel}
                    </span>

                    <span className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap ${
                      screeningSummary.recommendation === 'ADVANCE' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                      screeningSummary.recommendation === 'HOLD' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                      'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                    }`}>
                      {screeningSummary.recommendation}
                    </span>
                  </div>
                </div>

                {/* Two-Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    {/* Strengths Card */}
                    {screeningSummary.strengths && screeningSummary.strengths.length > 0 && (
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                        <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-3 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Strengths
                        </p>
                        <ul className="space-y-2">
                          {screeningSummary.strengths.map((strength, idx) => (
                            <li key={idx} className="text-sm text-green-700 dark:text-green-400 flex items-start gap-2">
                              <CheckCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                              <span>{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Follow-up Questions Card */}
                    {screeningSummary.followUpQuestions && screeningSummary.followUpQuestions.length > 0 && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Follow-up Questions
                        </p>
                        <ol className="space-y-2 list-inside">
                          {screeningSummary.followUpQuestions.map((q, idx) => (
                            <li key={idx} className="text-sm text-blue-700 dark:text-blue-400 flex gap-2">
                              <span className="flex-shrink-0 font-medium">{idx + 1}.</span>
                              <span>{q}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    {/* Gaps Card */}
                    {screeningSummary.gaps && screeningSummary.gaps.length > 0 && (
                      <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                        <p className="text-sm font-medium text-orange-800 dark:text-orange-300 mb-3 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Gaps
                        </p>
                        <ul className="space-y-2">
                          {screeningSummary.gaps.map((gap, idx) => (
                            <li key={idx} className="text-sm text-orange-700 dark:text-orange-400 flex items-start gap-2">
                              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                              <span>{gap}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Risk Flags Card */}
                    {screeningSummary.riskFlags && screeningSummary.riskFlags.length > 0 && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                        <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-3 flex items-center gap-2">
                          <ShieldAlert className="h-4 w-4" />
                          Risk Flags
                        </p>
                        <ul className="space-y-2">
                          {screeningSummary.riskFlags.map((flag, idx) => (
                            <li key={idx} className="text-sm text-red-700 dark:text-red-400 flex items-start gap-2">
                              <ShieldAlert className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                              <span>{flag}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary Section */}
                <div className="mb-6 p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-main)]">
                  <p className="text-sm font-medium text-[var(--text-primary)] mb-3">Summary</p>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{screeningSummary.summary}</p>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center pt-4 border-t border-[var(--border-main)]">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Powered by AI</span>
                    <span className="px-2 py-1 rounded bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-mono">
                      {screeningSummary.aiModelVersion}
                    </span>
                  </div>
                  <Button variant="outline" onClick={() => { setShowScreeningSummaryModal(false); setScreeningSummary(null); }}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Synthesis Modal */}
        {showFeedbackSynthesisModal && feedbackSynthesis && (
          <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--bg-card)] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-main)] shadow-xl">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <MessageSquare className="h-6 w-6 text-lime-500" />
                    Feedback Synthesis
                  </h2>
                  <button onClick={() => { setShowFeedbackSynthesisModal(false); setFeedbackSynthesis(null); }} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)]">
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
                    <p className="text-xs text-[var(--text-muted)] mb-1">Candidate</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{feedbackSynthesis.candidateName}</p>
                  </div>

                  <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
                    <p className="text-xs text-[var(--text-muted)] mb-2">Candidate Narrative</p>
                    <p className="text-sm text-[var(--text-primary)]">{feedbackSynthesis.candidateNarrative}</p>
                  </div>

                  {feedbackSynthesis.themes && feedbackSynthesis.themes.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)] mb-2">Key Themes</p>
                      <ul className="list-disc list-inside space-y-1">
                        {feedbackSynthesis.themes.map((theme, idx) => (
                          <li key={idx} className="text-sm text-[var(--text-secondary)]">{theme}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {feedbackSynthesis.agreements && feedbackSynthesis.agreements.length > 0 && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                      <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">Agreements</p>
                      <ul className="list-disc list-inside space-y-1">
                        {feedbackSynthesis.agreements.map((agreement, idx) => (
                          <li key={idx} className="text-sm text-green-700 dark:text-green-400">{agreement}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {feedbackSynthesis.disagreements && feedbackSynthesis.disagreements.length > 0 && (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">Disagreements</p>
                      <ul className="list-disc list-inside space-y-1">
                        {feedbackSynthesis.disagreements.map((disagreement, idx) => (
                          <li key={idx} className="text-sm text-yellow-700 dark:text-yellow-400">{disagreement}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {feedbackSynthesis.missingData && feedbackSynthesis.missingData.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)] mb-2">Missing Data</p>
                      <ul className="list-disc list-inside space-y-1">
                        {feedbackSynthesis.missingData.map((missing, idx) => (
                          <li key={idx} className="text-sm text-[var(--text-secondary)]">{missing}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {feedbackSynthesis.openQuestions && feedbackSynthesis.openQuestions.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)] mb-2">Open Questions</p>
                      <ul className="list-disc list-inside space-y-1">
                        {feedbackSynthesis.openQuestions.map((question, idx) => (
                          <li key={idx} className="text-sm text-[var(--text-secondary)]">{question}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
                    <p className="text-xs text-[var(--text-muted)] mb-2">Recommended Next Step</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{feedbackSynthesis.recommendedNextStep}</p>
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-[var(--border-main)]">
                    <Button variant="outline" onClick={() => { setShowFeedbackSynthesisModal(false); setFeedbackSynthesis(null); }} className="flex-1">
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Generate Offer Modal */}
        {showOfferModal && candidateForOffer && (
          <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--bg-card)] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-[var(--border-main)] shadow-xl">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">
                    Generate Offer Letter
                  </h2>
                  <button onClick={() => setShowOfferModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)]">
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="mb-4 p-4 bg-teal-50 dark:bg-teal-900/20 rounded-xl">
                  <p className="text-sm text-teal-700 dark:text-teal-300">
                    Creating offer letter for <strong>{candidateForOffer.fullName}</strong>
                  </p>
                </div>

                <form onSubmit={offerForm.handleSubmit(handleOfferSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Offered Salary *</label>
                    <input
                      type="number"
                      {...offerForm.register('offeredSalary', { valueAsNumber: true })}
                      className="w-full px-3 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    />
                    {offerForm.formState.errors.offeredSalary && (
                      <p className="text-xs text-red-500 mt-1">{offerForm.formState.errors.offeredSalary.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Position Title</label>
                    <input
                      type="text"
                      {...offerForm.register('positionTitle')}
                      className="w-full px-3 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Joining Date *</label>
                    <input
                      type="date"
                      {...offerForm.register('joiningDate')}
                      className="w-full px-3 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    />
                    {offerForm.formState.errors.joiningDate && (
                      <p className="text-xs text-red-500 mt-1">{offerForm.formState.errors.joiningDate.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Offer Expiry Date</label>
                    <input
                      type="date"
                      {...offerForm.register('offerExpiryDate')}
                      className="w-full px-3 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Notes</label>
                    <textarea
                      rows={3}
                      {...offerForm.register('notes')}
                      className="w-full px-3 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    />
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-[var(--border-main)]">
                    <Button type="button" variant="outline" onClick={() => setShowOfferModal(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createOfferMutation.isPending} className="flex-1">
                      {createOfferMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : 'Create Offer'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Accept Offer Modal */}
        {showAcceptModal && candidateForOffer && (
          <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--bg-card)] rounded-2xl max-w-md w-full p-6 border border-[var(--border-main)] shadow-xl">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="ml-4 text-lg font-medium text-[var(--text-primary)]">Accept Offer</h3>
              </div>
              <p className="text-sm text-[var(--text-muted)] mb-4">
                Mark offer as accepted for <strong className="text-[var(--text-secondary)]">{candidateForOffer.fullName}</strong>?
              </p>
              <div className="mb-6">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Confirmed Joining Date</label>
                <input
                  type="date"
                  value={confirmedJoiningDate}
                  onChange={(e) => setConfirmedJoiningDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => { setShowAcceptModal(false); setCandidateForOffer(null); }} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleAcceptOffer} className="flex-1 bg-green-600 hover:bg-green-700">
                  Accept Offer
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Decline Offer Modal */}
        {showDeclineModal && candidateForOffer && (
          <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--bg-card)] rounded-2xl max-w-md w-full p-6 border border-[var(--border-main)] shadow-xl">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="ml-4 text-lg font-medium text-[var(--text-primary)]">Decline Offer</h3>
              </div>
              <p className="text-sm text-[var(--text-muted)] mb-4">
                Mark offer as declined for <strong className="text-[var(--text-secondary)]">{candidateForOffer.fullName}</strong>?
              </p>
              <div className="mb-6">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Decline Reason</label>
                <textarea
                  rows={3}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Optional: Enter reason for declining..."
                  className="w-full px-3 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => { setShowDeclineModal(false); setCandidateForOffer(null); }} className="flex-1">
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeclineOffer} className="flex-1">
                  Decline Offer
                </Button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AppLayout>
  );
}
