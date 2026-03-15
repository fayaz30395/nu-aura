'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { benefitsService } from '@/lib/services/benefits.service';
import {
  BenefitPlan,
  BenefitEnrollment,
  BenefitClaim,
  EnrollmentRequest,
  ClaimRequest,
  BenefitPlanRequest,
  PlanType,
} from '@/lib/types/benefits';
import { Page } from '@/lib/types/payroll';

// Query keys for cache management
export const benefitKeys = {
  all: ['benefits'] as const,
  // Plans
  plans: () => [...benefitKeys.all, 'plans'] as const,
  plansList: (page: number, size: number) => [...benefitKeys.plans(), 'list', { page, size }] as const,
  plansActive: () => [...benefitKeys.plans(), 'active'] as const,
  plansByType: (type: string) => [...benefitKeys.plans(), 'type', type] as const,
  planDetail: (id: string) => [...benefitKeys.plans(), 'detail', id] as const,
  // Enrollments
  enrollments: () => [...benefitKeys.all, 'enrollments'] as const,
  enrollmentsByEmployee: (employeeId: string) =>
    [...benefitKeys.enrollments(), 'employee', employeeId] as const,
  activeEnrollments: (employeeId: string) =>
    [...benefitKeys.enrollments(), 'employee', employeeId, 'active'] as const,
  pendingEnrollments: () => [...benefitKeys.enrollments(), 'pending'] as const,
  // Claims
  claims: () => [...benefitKeys.all, 'claims'] as const,
  claimDetail: (id: string) => [...benefitKeys.claims(), 'detail', id] as const,
  pendingClaims: () => [...benefitKeys.claims(), 'pending'] as const,
};

// ========== QUERIES ==========

// Get all active benefit plans
export function useActiveBenefitPlans() {
  return useQuery({
    queryKey: benefitKeys.plansActive(),
    queryFn: () => benefitsService.getActivePlans(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Get all benefit plans (paginated)
export function useAllBenefitPlans(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: benefitKeys.plansList(page, size),
    queryFn: () => benefitsService.getAllPlans(page, size),
    staleTime: 10 * 60 * 1000,
  });
}

// Get benefit plans by type
export function useBenefitPlansByType(type: string) {
  return useQuery({
    queryKey: benefitKeys.plansByType(type),
    queryFn: () => benefitsService.getPlansByType(type),
    enabled: !!type,
    staleTime: 10 * 60 * 1000,
  });
}

// Get employee's benefit enrollments
export function useEmployeeBenefitEnrollments(employeeId: string) {
  return useQuery({
    queryKey: benefitKeys.enrollmentsByEmployee(employeeId),
    queryFn: () => benefitsService.getEmployeeEnrollments(employeeId),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
}

// Get employee's active enrollments
export function useActiveEnrollments(employeeId: string) {
  return useQuery({
    queryKey: benefitKeys.activeEnrollments(employeeId),
    queryFn: () => benefitsService.getActiveEnrollments(employeeId),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
}

// Get pending benefit enrollments (for approval)
export function usePendingBenefitEnrollments() {
  return useQuery({
    queryKey: benefitKeys.pendingEnrollments(),
    queryFn: () => benefitsService.getPendingEnrollments(),
    staleTime: 30 * 1000, // 30 seconds - pending items change frequently
  });
}

// ========== MUTATIONS ==========

// Enroll employee in a benefit plan
export function useEnrollEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EnrollmentRequest) => benefitsService.enrollEmployee(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: benefitKeys.enrollmentsByEmployee(data.employeeId) });
      queryClient.invalidateQueries({ queryKey: benefitKeys.pendingEnrollments() });
    },
  });
}

// Approve benefit enrollment
export function useApproveEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ enrollmentId, comments }: { enrollmentId: string; comments?: string }) =>
      benefitsService.approveEnrollment(enrollmentId, comments),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: benefitKeys.enrollmentsByEmployee(data.employeeId) });
      queryClient.invalidateQueries({ queryKey: benefitKeys.pendingEnrollments() });
    },
  });
}

// Terminate benefit enrollment
export function useTerminateEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ enrollmentId, reason }: { enrollmentId: string; reason: string }) =>
      benefitsService.terminateEnrollment(enrollmentId, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: benefitKeys.enrollmentsByEmployee(data.employeeId) });
      queryClient.invalidateQueries({ queryKey: benefitKeys.activeEnrollments(data.employeeId) });
    },
  });
}

// Submit benefit claim
export function useSubmitBenefitClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ClaimRequest) => benefitsService.submitClaim(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: benefitKeys.pendingClaims() });
      queryClient.invalidateQueries({ queryKey: benefitKeys.claims() });
    },
  });
}

// Process benefit claim (approve with amount)
export function useProcessBenefitClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      claimId,
      approvedAmount,
      comments,
    }: {
      claimId: string;
      approvedAmount: number;
      comments?: string;
    }) => benefitsService.processClaim(claimId, approvedAmount, comments),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: benefitKeys.claimDetail(data.id) });
      queryClient.invalidateQueries({ queryKey: benefitKeys.pendingClaims() });
    },
  });
}

// Create benefit plan
export function useCreateBenefitPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BenefitPlanRequest) => benefitsService.createPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: benefitKeys.plans() });
      queryClient.invalidateQueries({ queryKey: benefitKeys.plansActive() });
    },
  });
}

// Update benefit plan
export function useUpdateBenefitPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, data }: { planId: string; data: BenefitPlanRequest }) =>
      benefitsService.updatePlan(planId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: benefitKeys.planDetail(data.id) });
      queryClient.invalidateQueries({ queryKey: benefitKeys.plans() });
    },
  });
}
