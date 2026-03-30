'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { workflowService } from '@/lib/services/workflow.service';
import type { WorkflowExecutionResponse, WorkflowExecutionStatus, Page, ApprovalDelegateRequest, ApprovalDelegateResponse } from '@/lib/types/workflow';

export const approvalKeys = {
  all: ['approvals'] as const,
  inbox: (params?: InboxFilterParams) => [...approvalKeys.all, 'inbox', params ?? {}] as const,
  inboxCount: () => [...approvalKeys.all, 'inbox-count'] as const,
};

export type ApprovalInboxItemStatus = WorkflowExecutionStatus;

export interface ApprovalInboxItem {
  id: string;
  entityType: string;
  entityId: string;
  module: string;
  title: string;
  referenceNumber?: string;
  requesterName?: string;
  status: ApprovalInboxItemStatus;
  currentStepName?: string;
  currentAssigneeName?: string;
  submittedAt?: string;
  deadline?: string;
}

export interface InboxFilterParams {
  status?: string;
  module?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  size?: number;
}

export interface InboxCounts {
  pending: number;
  approvedToday: number;
  rejectedToday: number;
}

export const MODULE_MAP: Record<string, string> = {
  LEAVE_REQUEST: 'Leave',
  EXPENSE_CLAIM: 'Expense',
  TRAVEL_REQUEST: 'Travel',
  LOAN_REQUEST: 'Loan',
  ASSET_REQUEST: 'Asset',
  TIMESHEET: 'Timesheet',
  RESIGNATION: 'Exit',
  SALARY_REVISION: 'Compensation',
  PROMOTION: 'Promotion',
  TRANSFER: 'Transfer',
  ONBOARDING: 'Onboarding',
  OFFBOARDING: 'Offboarding',
  DOCUMENT_REQUEST: 'Document',
  POLICY_ACKNOWLEDGMENT: 'Policy',
  TRAINING_REQUEST: 'Training',
  REIMBURSEMENT: 'Reimbursement',
  OVERTIME: 'Overtime',
  SHIFT_CHANGE: 'Shift change',
  WORK_FROM_HOME: 'Work from home',
  RECRUITMENT_OFFER: 'Recruitment',
  CUSTOM: 'Custom',
};

export function mapExecutionToInboxItem(execution: WorkflowExecutionResponse): ApprovalInboxItem {
  const moduleLabel = MODULE_MAP[execution.entityType] ?? execution.entityType;

  return {
    id: execution.id,
    entityType: execution.entityType,
    entityId: execution.entityId,
    module: moduleLabel,
    title: execution.title ?? execution.workflowName ?? execution.entityType,
    referenceNumber: execution.referenceNumber,
    requesterName: execution.requesterName,
    status: execution.status,
    currentStepName: execution.currentStepName,
    currentAssigneeName: execution.currentAssigneeName,
    submittedAt: execution.submittedAt,
    deadline: execution.deadline,
  };
}

/**
 * Paginated approval inbox with server-side filters.
 */
export function useApprovalInbox(params: InboxFilterParams = {}) {
  return useQuery({
    queryKey: approvalKeys.inbox(params),
    queryFn: async () => {
      const page: Page<WorkflowExecutionResponse> = await workflowService.getApprovalInbox(params);
      return {
        content: page.content.map(mapExecutionToInboxItem),
        totalElements: page.totalElements,
        totalPages: page.totalPages,
        size: page.size,
        number: page.number,
      };
    },
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });
}

/**
 * Inbox summary counts for sidebar badge and summary row.
 * Polls every 30 seconds. Uses `placeholderData` and a generous `staleTime`
 * so that the sidebar badge doesn't trigger a blocking refetch on every
 * client-side navigation (the layout component remounts on route change).
 */
export function useApprovalInboxCount() {
  return useQuery({
    queryKey: approvalKeys.inboxCount(),
    queryFn: () => workflowService.getInboxCounts(),
    staleTime: 60 * 1000,          // data considered fresh for 60s
    gcTime: 5 * 60 * 1000,         // keep cache for 5 min after unmount
    refetchInterval: 60 * 1000,    // poll every 60s (was 30s — halves background requests)
    refetchOnMount: false,         // don't refetch if cache exists
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useApproveExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ executionId, comments }: { executionId: string; comments?: string }) =>
      workflowService.approveExecution(executionId, comments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.inbox() });
      queryClient.invalidateQueries({ queryKey: approvalKeys.inboxCount() });
    },
  });
}

export function useRejectExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ executionId, comments }: { executionId: string; comments?: string }) =>
      workflowService.rejectExecution(executionId, comments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.inbox() });
      queryClient.invalidateQueries({ queryKey: approvalKeys.inboxCount() });
    },
  });
}

export function useReturnForModification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ executionId, comments }: { executionId: string; comments?: string }) =>
      workflowService.returnForModification(executionId, comments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.inbox() });
      queryClient.invalidateQueries({ queryKey: approvalKeys.inboxCount() });
    },
  });
}

// ── Delegation Queries & Mutations ──────────────────────────────

export const delegationKeys = {
  all: ['delegations'] as const,
  my: () => [...delegationKeys.all, 'my'] as const,
  toMe: () => [...delegationKeys.all, 'to-me'] as const,
};

export function useCreateDelegation() {
  const queryClient = useQueryClient();

  return useMutation<ApprovalDelegateResponse, Error, ApprovalDelegateRequest>({
    mutationFn: (data: ApprovalDelegateRequest) => workflowService.createDelegation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: delegationKeys.all });
    },
  });
}

export function useMyDelegations() {
  return useQuery({
    queryKey: delegationKeys.my(),
    queryFn: () => workflowService.getMyDelegations(),
    staleTime: 30 * 1000,
  });
}

export function useDelegationsToMe() {
  return useQuery({
    queryKey: delegationKeys.toMe(),
    queryFn: () => workflowService.getDelegationsToMe(),
    staleTime: 30 * 1000,
  });
}

export function useRevokeDelegation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await workflowService.revokeDelegation(id, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: delegationKeys.all });
    },
  });
}
