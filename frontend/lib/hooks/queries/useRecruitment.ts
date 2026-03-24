'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recruitmentService } from '@/lib/services/recruitment.service';
import { aiRecruitmentService } from '@/lib/services/ai-recruitment.service';
import {
  CreateJobOpeningRequest,
  CreateCandidateRequest,
  CreateInterviewRequest,
  JobStatus,
  MoveStageRequest,
  CreateOfferRequest,
} from '@/lib/types/recruitment';
import {
  ResumeParseRequest,
  CandidateScreeningSummaryRequest,
  JobDescriptionRequest,
  FeedbackSynthesisRequest,
} from '@/lib/types/ai-recruitment';

// ==================== Query Keys ====================

export const recruitmentKeys = {
  all: ['recruitment'] as const,

  // Job Openings
  jobs: () => [...recruitmentKeys.all, 'jobs'] as const,
  jobsList: (page: number, size: number) =>
    [...recruitmentKeys.jobs(), 'list', { page, size }] as const,
  jobsByStatus: (status: JobStatus) =>
    [...recruitmentKeys.jobs(), 'status', status] as const,
  jobDetail: (id: string) => [...recruitmentKeys.jobs(), 'detail', id] as const,

  // Candidates
  candidates: () => [...recruitmentKeys.all, 'candidates'] as const,
  candidatesList: (page: number, size: number) =>
    [...recruitmentKeys.candidates(), 'list', { page, size }] as const,
  candidatesByJob: (jobId: string) =>
    [...recruitmentKeys.candidates(), 'job', jobId] as const,
  candidateDetail: (id: string) =>
    [...recruitmentKeys.candidates(), 'detail', id] as const,

  // Interviews
  interviews: () => [...recruitmentKeys.all, 'interviews'] as const,
  interviewsByCandidate: (candidateId: string) =>
    [...recruitmentKeys.interviews(), 'candidate', candidateId] as const,
  interviewDetail: (id: string) =>
    [...recruitmentKeys.interviews(), 'detail', id] as const,

  // AI
  ai: () => [...recruitmentKeys.all, 'ai'] as const,
  rankedCandidates: (jobId: string) =>
    [...recruitmentKeys.ai(), 'ranked', jobId] as const,
  interviewQuestions: (jobId: string, candidateId?: string) =>
    [...recruitmentKeys.ai(), 'interview-questions', jobId, candidateId] as const,
};

// ==================== Job Opening Hooks ====================

export function useJobOpenings(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: recruitmentKeys.jobsList(page, size),
    queryFn: () => recruitmentService.getAllJobOpenings(page, size),
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useJobOpeningsByStatus(status: JobStatus) {
  return useQuery({
    queryKey: recruitmentKeys.jobsByStatus(status),
    queryFn: () => recruitmentService.getJobOpeningsByStatus(status),
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useJobOpening(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: recruitmentKeys.jobDetail(id),
    queryFn: () => recruitmentService.getJobOpening(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useCreateJobOpening() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateJobOpeningRequest) =>
      recruitmentService.createJobOpening(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recruitmentKeys.jobs() });
    },
  });
}

export function useUpdateJobOpening() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateJobOpeningRequest }) =>
      recruitmentService.updateJobOpening(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: recruitmentKeys.jobs() });
      queryClient.invalidateQueries({ queryKey: recruitmentKeys.jobDetail(id) });
    },
  });
}

export function useDeleteJobOpening() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recruitmentService.deleteJobOpening(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recruitmentKeys.jobs() });
    },
  });
}

// ==================== Candidate Hooks ====================

export function useCandidates(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: recruitmentKeys.candidatesList(page, size),
    queryFn: () => recruitmentService.getAllCandidates(page, size),
    staleTime: 3 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useCandidatesByJob(jobId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: recruitmentKeys.candidatesByJob(jobId),
    queryFn: () => recruitmentService.getCandidatesByJobOpening(jobId),
    enabled: enabled && !!jobId,
    staleTime: 3 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useCandidate(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: recruitmentKeys.candidateDetail(id),
    queryFn: () => recruitmentService.getCandidate(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useCreateCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCandidateRequest) =>
      recruitmentService.createCandidate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recruitmentKeys.candidates() });
    },
  });
}

export function useUpdateCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateCandidateRequest }) =>
      recruitmentService.updateCandidate(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: recruitmentKeys.candidates() });
      queryClient.invalidateQueries({
        queryKey: recruitmentKeys.candidateDetail(id),
      });
    },
  });
}

export function useDeleteCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recruitmentService.deleteCandidate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recruitmentKeys.candidates() });
    },
  });
}

export function useMoveCandidateStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      candidateId,
      data,
    }: {
      candidateId: string;
      data: MoveStageRequest;
    }) => recruitmentService.moveCandidateStage(candidateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recruitmentKeys.candidates() });
    },
  });
}

export function useCreateOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      candidateId,
      data,
    }: {
      candidateId: string;
      data: CreateOfferRequest;
    }) => recruitmentService.createOffer(candidateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recruitmentKeys.candidates() });
    },
  });
}

// ==================== Interview Hooks ====================

export function useAllInterviews(page: number = 0, size: number = 100) {
  return useQuery({
    queryKey: [...recruitmentKeys.interviews(), 'list', { page, size }],
    queryFn: () => recruitmentService.getAllInterviews(page, size),
    staleTime: 3 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useInterviewsByCandidate(
  candidateId: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: recruitmentKeys.interviewsByCandidate(candidateId),
    queryFn: () => recruitmentService.getInterviewsByCandidate(candidateId),
    enabled: enabled && !!candidateId,
    staleTime: 3 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useScheduleInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInterviewRequest) =>
      recruitmentService.scheduleInterview(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recruitmentKeys.interviews() });
    },
  });
}

export function useUpdateInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateInterviewRequest }) =>
      recruitmentService.updateInterview(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recruitmentKeys.interviews() });
    },
  });
}

export function useDeleteInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recruitmentService.deleteInterview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recruitmentKeys.interviews() });
    },
  });
}

// ==================== AI Mutation Hooks ====================

export function useParseResume() {
  return useMutation({
    mutationFn: (request: ResumeParseRequest) =>
      aiRecruitmentService.parseResume(request),
  });
}

export function useParseResumeFromUpload() {
  return useMutation({
    mutationFn: (file: File) =>
      aiRecruitmentService.parseResumeFromUpload(file),
  });
}

export function useCalculateMatchScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      candidateId,
      jobOpeningId,
    }: {
      candidateId: string;
      jobOpeningId: string;
    }) => aiRecruitmentService.calculateMatchScore(candidateId, jobOpeningId),
    onSuccess: (_, { jobOpeningId }) => {
      queryClient.invalidateQueries({
        queryKey: recruitmentKeys.rankedCandidates(jobOpeningId),
      });
    },
  });
}

export function useGenerateScreeningSummary() {
  return useMutation({
    mutationFn: (request: CandidateScreeningSummaryRequest) =>
      aiRecruitmentService.generateScreeningSummary(request),
  });
}

export function useRankedCandidates(jobOpeningId: string, enabled = true) {
  return useQuery({
    queryKey: recruitmentKeys.rankedCandidates(jobOpeningId),
    queryFn: () => aiRecruitmentService.rankCandidatesForJob(jobOpeningId),
    enabled: enabled && !!jobOpeningId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useGenerateJobDescription() {
  return useMutation({
    mutationFn: (request: JobDescriptionRequest) =>
      aiRecruitmentService.generateJobDescription(request),
  });
}

export function useGenerateInterviewQuestions() {
  return useMutation({
    mutationFn: ({
      jobOpeningId,
      candidateId,
    }: {
      jobOpeningId: string;
      candidateId?: string;
    }) =>
      aiRecruitmentService.generateInterviewQuestions(jobOpeningId, candidateId),
  });
}

/**
 * Query-based hook for interview questions (uses GET endpoint).
 * Prefer this over the mutation when you want cached/auto-fetched results.
 */
export function useInterviewQuestions(
  jobOpeningId: string,
  candidateId?: string,
  enabled = true
) {
  return useQuery({
    queryKey: recruitmentKeys.interviewQuestions(jobOpeningId, candidateId),
    queryFn: () =>
      aiRecruitmentService.generateInterviewQuestions(jobOpeningId, candidateId),
    enabled: enabled && !!jobOpeningId,
    staleTime: 10 * 60 * 1000,
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useSynthesizeFeedback() {
  return useMutation({
    mutationFn: (request: FeedbackSynthesisRequest) =>
      aiRecruitmentService.synthesizeFeedback(request),
  });
}
