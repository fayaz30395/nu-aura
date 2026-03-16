'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  goalService,
  reviewService,
  feedbackService,
  reviewCycleService,
  performanceRevolutionService,
  pipService,
} from '@/lib/services/performance.service';
import { okrService } from '@/lib/services/okr.service';
import { feedback360Service } from '@/lib/services/feedback360.service';
import {
  Goal,
  GoalRequest,
  PerformanceReview,
  ReviewRequest,
  FeedbackRequest,
  ReviewCycle,
  ReviewCycleRequest,
  ActivateCycleRequest,
  ActivateCycleResponse,
  Objective,
  KeyResult,
} from '@/lib/types/performance';
import type { ObjectiveRequest, KeyResultRequest } from '@/lib/services/okr.service';
import type { CreatePIPRequest as CreatePIPRequestService, PIPCheckInRequest as PIPCheckInRequestService, ClosePIPRequest as ClosePIPRequestService } from '@/lib/services/performance.service';
import { notifications } from '@mantine/notifications';

// ─── Query Key Factory ─────────────────────────────────────────────────────
export const performanceKeys = {
  all: ['performance'] as const,
  // Goals
  goals: () => [...performanceKeys.all, 'goals'] as const,
  allGoals: (page: number, size: number) =>
    [...performanceKeys.goals(), 'all', { page, size }] as const,
  employeeGoals: (employeeId: string) =>
    [...performanceKeys.goals(), 'employee', employeeId] as const,
  teamGoals: (managerId: string) =>
    [...performanceKeys.goals(), 'team', managerId] as const,
  goalDetail: (id: string) => [...performanceKeys.goals(), 'detail', id] as const,
  goalAnalytics: () => [...performanceKeys.goals(), 'analytics'] as const,
  // Review Cycles
  cycles: () => [...performanceKeys.all, 'cycles'] as const,
  allCycles: (page: number, size: number) =>
    [...performanceKeys.cycles(), 'all', { page, size }] as const,
  activeCycles: () => [...performanceKeys.cycles(), 'active'] as const,
  cycleDetail: (id: string) => [...performanceKeys.cycles(), 'detail', id] as const,
  // Performance Reviews
  reviews: () => [...performanceKeys.all, 'reviews'] as const,
  allReviews: (page: number, size: number) =>
    [...performanceKeys.reviews(), 'all', { page, size }] as const,
  employeeReviews: (employeeId: string) =>
    [...performanceKeys.reviews(), 'employee', employeeId] as const,
  pendingReviews: (reviewerId: string) =>
    [...performanceKeys.reviews(), 'pending', reviewerId] as const,
  reviewDetail: (id: string) => [...performanceKeys.reviews(), 'detail', id] as const,
  // OKR
  okr: () => [...performanceKeys.all, 'okr'] as const,
  okrGraph: () => [...performanceKeys.okr(), 'graph'] as const,
  performanceSpider: (employeeId: string) =>
    [...performanceKeys.okr(), 'spider', employeeId] as const,
  // Feedback
  feedback: () => [...performanceKeys.all, 'feedback'] as const,
  // 360 Feedback
  feedback360: () => [...performanceKeys.all, 'feedback360'] as const,
  feedback360Cycles: () => [...performanceKeys.feedback360(), 'cycles'] as const,
};

// ─── Goal Hooks ───────────────────────────────────────────────────────────

export function useAllGoals(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: performanceKeys.allGoals(page, size),
    queryFn: () => goalService.getAllGoals(page, size),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useEmployeeGoals(employeeId: string) {
  return useQuery({
    queryKey: performanceKeys.employeeGoals(employeeId),
    queryFn: () => goalService.getByEmployee(employeeId),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useTeamGoals(managerId: string) {
  return useQuery({
    queryKey: performanceKeys.teamGoals(managerId),
    queryFn: () => goalService.getTeamGoals(managerId),
    enabled: !!managerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useGoalDetail(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: performanceKeys.goalDetail(id),
    queryFn: () => goalService.getGoalById(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useGoalAnalytics() {
  return useQuery({
    queryKey: performanceKeys.goalAnalytics(),
    queryFn: () => goalService.getGoalAnalytics(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GoalRequest) => goalService.createGoal(data),
    onSuccess: (_data: Goal) => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.goals() });
      notifications.show({
        title: 'Success',
        message: 'Goal created successfully',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to create goal',
        color: 'red',
      });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: GoalRequest }) =>
      goalService.updateGoal(id, data),
    onSuccess: (data: Goal) => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.goals() });
      queryClient.setQueryData(performanceKeys.goalDetail(data.id), data);
      notifications.show({
        title: 'Success',
        message: 'Goal updated successfully',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update goal',
        color: 'red',
      });
    },
  });
}

export function useUpdateGoalProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, progress }: { id: string; progress: number }) =>
      goalService.updateProgress(id, progress),
    onSuccess: (data: Goal) => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.goals() });
      queryClient.setQueryData(performanceKeys.goalDetail(data.id), data);
      notifications.show({
        title: 'Success',
        message: 'Goal progress updated',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update goal progress',
        color: 'red',
      });
    },
  });
}

export function useApproveGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => goalService.approveGoal(id),
    onSuccess: (data: Goal) => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.goals() });
      queryClient.setQueryData(performanceKeys.goalDetail(data.id), data);
      notifications.show({
        title: 'Success',
        message: 'Goal approved',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to approve goal',
        color: 'red',
      });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => goalService.deleteGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.goals() });
      notifications.show({
        title: 'Success',
        message: 'Goal deleted successfully',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to delete goal',
        color: 'red',
      });
    },
  });
}

// ─── Review Cycle Hooks ───────────────────────────────────────────────────

export function usePerformanceActiveCycles() {
  return useQuery({
    queryKey: performanceKeys.activeCycles(),
    queryFn: () => reviewCycleService.getActiveCycles(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function usePerformanceAllCycles(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: performanceKeys.allCycles(page, size),
    queryFn: () => reviewCycleService.getAllCycles(page, size),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function usePerformanceCycleDetail(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: performanceKeys.cycleDetail(id),
    queryFn: () => reviewCycleService.getCycleById(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreatePerformanceCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReviewCycleRequest) => reviewCycleService.createCycle(data),
    onSuccess: (_data: ReviewCycle) => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.cycles() });
      notifications.show({
        title: 'Success',
        message: 'Review cycle created successfully',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to create review cycle',
        color: 'red',
      });
    },
  });
}

export function useUpdatePerformanceCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReviewCycleRequest }) =>
      reviewCycleService.updateCycle(id, data),
    onSuccess: (data: ReviewCycle) => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.cycles() });
      queryClient.setQueryData(performanceKeys.cycleDetail(data.id), data);
      notifications.show({
        title: 'Success',
        message: 'Review cycle updated successfully',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update review cycle',
        color: 'red',
      });
    },
  });
}

export function useActivatePerformanceCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ActivateCycleRequest }) =>
      reviewCycleService.activateCycle(id, data),
    onSuccess: (data: ActivateCycleResponse) => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.cycles() });
      queryClient.setQueryData(performanceKeys.cycleDetail(data.id), data);
      notifications.show({
        title: 'Success',
        message: `Review cycle activated: ${data.reviewsCreated} reviews created`,
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to activate review cycle',
        color: 'red',
      });
    },
  });
}

export function useCompletePerformanceCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reviewCycleService.completeCycle(id),
    onSuccess: (data: ReviewCycle) => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.cycles() });
      queryClient.setQueryData(performanceKeys.cycleDetail(data.id), data);
      notifications.show({
        title: 'Success',
        message: 'Review cycle completed',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to complete review cycle',
        color: 'red',
      });
    },
  });
}

export function useDeletePerformanceCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reviewCycleService.deleteCycle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.cycles() });
      notifications.show({
        title: 'Success',
        message: 'Review cycle deleted successfully',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to delete review cycle',
        color: 'red',
      });
    },
  });
}

// ─── Performance Review Hooks ──────────────────────────────────────────────

export function useAllReviews(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: performanceKeys.allReviews(page, size),
    queryFn: () => reviewService.getAllReviews(page, size),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useEmployeeReviews(employeeId: string) {
  return useQuery({
    queryKey: performanceKeys.employeeReviews(employeeId),
    queryFn: () => reviewService.getByEmployee(employeeId),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function usePendingReviews(reviewerId: string) {
  return useQuery({
    queryKey: performanceKeys.pendingReviews(reviewerId),
    queryFn: () => reviewService.getPendingReviews(reviewerId),
    enabled: !!reviewerId,
    staleTime: 2 * 60 * 1000, // 2 minutes (more frequent for pending items)
  });
}

export function useReviewDetail(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: performanceKeys.reviewDetail(id),
    queryFn: () => reviewService.getReviewById(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReviewRequest) => reviewService.createReview(data),
    onSuccess: (_data: PerformanceReview) => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.reviews() });
      notifications.show({
        title: 'Success',
        message: 'Performance review created successfully',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to create review',
        color: 'red',
      });
    },
  });
}

export function useUpdateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReviewRequest }) =>
      reviewService.updateReview(id, data),
    onSuccess: (data: PerformanceReview) => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.reviews() });
      queryClient.setQueryData(performanceKeys.reviewDetail(data.id), data);
      notifications.show({
        title: 'Success',
        message: 'Performance review updated successfully',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update review',
        color: 'red',
      });
    },
  });
}

export function useSubmitReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reviewService.submitReview(id),
    onSuccess: (data: PerformanceReview) => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.reviews() });
      queryClient.setQueryData(performanceKeys.reviewDetail(data.id), data);
      notifications.show({
        title: 'Success',
        message: 'Performance review submitted',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to submit review',
        color: 'red',
      });
    },
  });
}

export function useCompleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reviewService.completeReview(id),
    onSuccess: (data: PerformanceReview) => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.reviews() });
      queryClient.setQueryData(performanceKeys.reviewDetail(data.id), data);
      notifications.show({
        title: 'Success',
        message: 'Performance review completed',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to complete review',
        color: 'red',
      });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reviewService.deleteReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.reviews() });
      notifications.show({
        title: 'Success',
        message: 'Performance review deleted successfully',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to delete review',
        color: 'red',
      });
    },
  });
}

// ─── Feedback Hooks ───────────────────────────────────────────────────────

export function useReceivedFeedback(employeeId: string) {
  return useQuery({
    queryKey: [...performanceKeys.feedback(), 'received', employeeId],
    queryFn: () => feedbackService.getReceivedFeedback(employeeId),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useGivenFeedback(employeeId: string) {
  return useQuery({
    queryKey: [...performanceKeys.feedback(), 'given', employeeId],
    queryFn: () => feedbackService.getGivenFeedback(employeeId),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FeedbackRequest) => feedbackService.giveFeedback(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.feedback() });
      notifications.show({
        title: 'Success',
        message: 'Feedback submitted successfully',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to submit feedback',
        color: 'red',
      });
    },
  });
}

export function useUpdateFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: FeedbackRequest }) =>
      feedbackService.updateFeedback(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.feedback() });
      notifications.show({
        title: 'Success',
        message: 'Feedback updated successfully',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update feedback',
        color: 'red',
      });
    },
  });
}

export function useDeleteFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => feedbackService.deleteFeedback(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.feedback() });
      notifications.show({
        title: 'Success',
        message: 'Feedback deleted successfully',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to delete feedback',
        color: 'red',
      });
    },
  });
}

// ─── 360 Feedback Hooks ───────────────────────────────────────────────────

export function useActiveFeedback360Cycles() {
  return useQuery({
    queryKey: [...performanceKeys.feedback360Cycles(), 'active'],
    queryFn: () => feedback360Service.getActiveCycles(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useMyPending360Reviews() {
  return useQuery({
    queryKey: [...performanceKeys.feedback360(), 'my-pending'],
    queryFn: () => feedback360Service.getMyPendingReviews(),
    staleTime: 2 * 60 * 1000, // 2 minutes (more frequent for pending items)
  });
}

export function useMyFeedback360Summaries() {
  return useQuery({
    queryKey: [...performanceKeys.feedback360(), 'my-summaries'],
    queryFn: () => feedback360Service.getMySummaries(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// ─── OKR / Performance Revolution Hooks ────────────────────────────────────

export function useOKRGraph() {
  return useQuery({
    queryKey: performanceKeys.okrGraph(),
    queryFn: () => performanceRevolutionService.getOKRGraph(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function usePerformanceSpider(employeeId: string) {
  return useQuery({
    queryKey: performanceKeys.performanceSpider(employeeId),
    queryFn: () => performanceRevolutionService.getPerformanceSpider(employeeId),
    enabled: !!employeeId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useOkrDashboardSummary() {
  return useQuery({
    queryKey: [...performanceKeys.okr(), 'dashboard-summary'],
    queryFn: () => okrService.getDashboardSummary(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// ─── OKR Hooks (from okrService) ──────────────────────────────────────────

export function useMyObjectives() {
  return useQuery({
    queryKey: [...performanceKeys.okr(), 'my'],
    queryFn: () => okrService.getMyObjectives(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCompanyObjectives() {
  return useQuery({
    queryKey: [...performanceKeys.okr(), 'company'],
    queryFn: () => okrService.getCompanyObjectives(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useObjective(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: [...performanceKeys.okr(), 'detail', id],
    queryFn: () => okrService.getObjective(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateObjective() {
  const queryClient = useQueryClient();

  return useMutation<Objective, Error, ObjectiveRequest>({
    mutationFn: (data: ObjectiveRequest) => okrService.createObjective(data) as unknown as Promise<Objective>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...performanceKeys.okr(), 'my'] });
      queryClient.invalidateQueries({ queryKey: [...performanceKeys.okr(), 'company'] });
      notifications.show({
        title: 'Success',
        message: 'Objective created successfully',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to create objective',
        color: 'red',
      });
    },
  });
}

export function useUpdateObjective() {
  const queryClient = useQueryClient();

  return useMutation<Objective, Error, { id: string; data: ObjectiveRequest }>({
    mutationFn: ({ id, data }: { id: string; data: ObjectiveRequest }) =>
      okrService.updateObjective(id, data) as unknown as Promise<Objective>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...performanceKeys.okr(), 'my'] });
      queryClient.invalidateQueries({ queryKey: [...performanceKeys.okr(), 'company'] });
      notifications.show({
        title: 'Success',
        message: 'Objective updated successfully',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update objective',
        color: 'red',
      });
    },
  });
}

export function useDeleteObjective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => okrService.deleteObjective(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...performanceKeys.okr(), 'my'] });
      queryClient.invalidateQueries({ queryKey: [...performanceKeys.okr(), 'company'] });
      notifications.show({
        title: 'Success',
        message: 'Objective deleted successfully',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to delete objective',
        color: 'red',
      });
    },
  });
}

export function useApproveObjective() {
  const queryClient = useQueryClient();

  return useMutation<Objective, Error, string>({
    mutationFn: (id: string) => okrService.approveObjective(id) as unknown as Promise<Objective>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...performanceKeys.okr(), 'my'] });
      notifications.show({
        title: 'Success',
        message: 'Objective approved',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to approve objective',
        color: 'red',
      });
    },
  });
}

export function useUpdateObjectiveStatus() {
  const queryClient = useQueryClient();

  return useMutation<Objective, Error, { id: string; status: string }>({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      okrService.updateObjectiveStatus(id, status) as unknown as Promise<Objective>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...performanceKeys.okr(), 'my'] });
      notifications.show({
        title: 'Success',
        message: 'Objective status updated',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update status',
        color: 'red',
      });
    },
  });
}

export function useAddKeyResult() {
  const queryClient = useQueryClient();

  return useMutation<KeyResult, Error, { objectiveId: string; data: KeyResultRequest }>({
    mutationFn: ({ objectiveId, data }: { objectiveId: string; data: KeyResultRequest }) =>
      okrService.addKeyResult(objectiveId, data) as unknown as Promise<KeyResult>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...performanceKeys.okr(), 'my'] });
      notifications.show({
        title: 'Success',
        message: 'Key result added successfully',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to add key result',
        color: 'red',
      });
    },
  });
}

export function useUpdateKeyResultProgress() {
  const queryClient = useQueryClient();

  return useMutation<KeyResult, Error, { id: string; value: number }>({
    mutationFn: ({ id, value }: { id: string; value: number }) =>
      okrService.updateKeyResultProgress(id, value) as unknown as Promise<KeyResult>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...performanceKeys.okr(), 'my'] });
      notifications.show({
        title: 'Success',
        message: 'Key result progress updated',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update progress',
        color: 'red',
      });
    },
  });
}

export function useDeleteKeyResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => okrService.deleteKeyResult(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...performanceKeys.okr(), 'my'] });
      notifications.show({
        title: 'Success',
        message: 'Key result deleted successfully',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to delete key result',
        color: 'red',
      });
    },
  });
}

export function useCreateCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => okrService.createCheckIn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...performanceKeys.okr()] });
      notifications.show({
        title: 'Success',
        message: 'Check-in recorded successfully',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to record check-in',
        color: 'red',
      });
    },
  });
}

// ─── PIP Hooks ────────────────────────────────────────────────────────────

export function usePips(employeeId?: string, managerId?: string) {
  return useQuery({
    queryKey: [...performanceKeys.all, 'pip', { employeeId, managerId }],
    queryFn: () => pipService.getAll(employeeId, managerId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function usePipDetail(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: [...performanceKeys.all, 'pip', 'detail', id],
    queryFn: () => pipService.getById(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreatePip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePIPRequestService) => pipService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...performanceKeys.all, 'pip'] });
      notifications.show({
        title: 'Success',
        message: 'PIP created successfully',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to create PIP',
        color: 'red',
      });
    },
  });
}

export function useRecordPipCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PIPCheckInRequestService }) =>
      pipService.recordCheckIn(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...performanceKeys.all, 'pip'] });
      notifications.show({
        title: 'Success',
        message: 'Check-in recorded successfully',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to record check-in',
        color: 'red',
      });
    },
  });
}

export function useClosePip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ClosePIPRequestService }) =>
      pipService.close(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...performanceKeys.all, 'pip'] });
      notifications.show({
        title: 'Success',
        message: 'PIP closed successfully',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to close PIP',
        color: 'red',
      });
    },
  });
}
