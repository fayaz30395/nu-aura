'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {
  ConductExitInterviewRequest,
  CreateAssetRecoveryRequest,
  CreateExitClearanceRequest,
  CreateExitInterviewRequest,
  CreateExitProcessRequest,
  CreateFnFSettlementRequest,
  ExitStatus,
  PaymentMode,
  RecordAssetReturnRequest,
  UpdateExitClearanceRequest,
  UpdateExitProcessRequest,
  UpdateFnFSettlementRequest,
} from '@/lib/types/hrms/exit';
import {exitService} from '@/lib/services/hrms/exit.service';

// Query Key Factory
export const exitKeys = {
  all: ['exit'] as const,
  processes: () => [...exitKeys.all, 'processes'] as const,
  processesPaginated: (page: number, size: number) =>
    [...exitKeys.processes(), 'paginated', {page, size}] as const,
  processById: (id: string) => [...exitKeys.processes(), 'detail', id] as const,
  processByEmployeeId: (employeeId: string) =>
    [...exitKeys.processes(), 'employee', employeeId] as const,
  processByStatus: (status: ExitStatus) =>
    [...exitKeys.processes(), 'status', status] as const,
  dashboard: () => [...exitKeys.all, 'dashboard'] as const,
  // Clearances
  clearances: () => [...exitKeys.all, 'clearances'] as const,
  clearancesByProcess: (exitProcessId: string) =>
    [...exitKeys.clearances(), 'process', exitProcessId] as const,
  clearancesByApprover: (approverId: string) =>
    [...exitKeys.clearances(), 'approver', approverId] as const,
  // Settlements
  settlements: () => [...exitKeys.all, 'settlements'] as const,
  settlementsPaginated: (page: number, size: number) =>
    [...exitKeys.settlements(), 'paginated', {page, size}] as const,
  settlementById: (id: string) => [...exitKeys.settlements(), 'detail', id] as const,
  settlementByProcess: (exitProcessId: string) =>
    [...exitKeys.settlements(), 'process', exitProcessId] as const,
  pendingApprovals: () => [...exitKeys.settlements(), 'pending'] as const,
  // Interviews
  interviews: () => [...exitKeys.all, 'interviews'] as const,
  interviewsPaginated: (page: number, size: number) =>
    [...exitKeys.interviews(), 'paginated', {page, size}] as const,
  interviewById: (id: string) => [...exitKeys.interviews(), 'detail', id] as const,
  scheduledInterviews: () => [...exitKeys.interviews(), 'scheduled'] as const,
  interviewAnalytics: () => [...exitKeys.interviews(), 'analytics'] as const,
  // Assets
  assets: () => [...exitKeys.all, 'assets'] as const,
  assetsByProcess: (exitProcessId: string) =>
    [...exitKeys.assets(), 'process', exitProcessId] as const,
  pendingAssets: () => [...exitKeys.assets(), 'pending'] as const,
  assetDeductions: (exitProcessId: string) =>
    [...exitKeys.assets(), 'deductions', exitProcessId] as const,
  allAssetsRecovered: (exitProcessId: string) =>
    [...exitKeys.assets(), 'recovered', exitProcessId] as const,
};

// Query Hooks

/**
 * Fetch paginated exit processes
 */
export function useExitProcesses(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: exitKeys.processesPaginated(page, size),
    queryFn: () => exitService.getAllExitProcesses(page, size),
  });
}

/**
 * Fetch a single exit process by ID
 */
export function useExitProcess(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: exitKeys.processById(id),
    queryFn: () => exitService.getExitProcess(id),
    enabled,
  });
}

/**
 * Fetch exit process by employee ID
 */
export function useExitProcessByEmployee(employeeId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: exitKeys.processByEmployeeId(employeeId),
    queryFn: () => exitService.getExitProcessByEmployee(employeeId),
    enabled,
  });
}

/**
 * Fetch exit processes by status
 */
export function useExitProcessesByStatus(status: ExitStatus) {
  return useQuery({
    queryKey: exitKeys.processByStatus(status),
    queryFn: () => exitService.getExitProcessesByStatus(status),
  });
}

/**
 * Fetch exit dashboard metrics
 */
export function useExitDashboard() {
  return useQuery({
    queryKey: exitKeys.dashboard(),
    queryFn: () => exitService.getDashboard(),
  });
}

// Mutation Hooks

/**
 * Create a new exit process
 */
export function useCreateExitProcess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateExitProcessRequest) => exitService.createExitProcess(data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: exitKeys.processes()});
      queryClient.invalidateQueries({queryKey: exitKeys.dashboard()});
    },
  });
}

/**
 * Update an exit process
 */
export function useUpdateExitProcess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({id, data}: { id: string; data: UpdateExitProcessRequest }) =>
      exitService.updateExitProcess(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({queryKey: exitKeys.processes()});
      queryClient.invalidateQueries({queryKey: exitKeys.processById(data.id)});
      queryClient.invalidateQueries({queryKey: exitKeys.dashboard()});
    },
  });
}

/**
 * Update exit process status
 */
export function useUpdateExitStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({id, status}: { id: string; status: ExitStatus }) =>
      exitService.updateExitStatus(id, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({queryKey: exitKeys.processes()});
      queryClient.invalidateQueries({queryKey: exitKeys.processById(data.id)});
      queryClient.invalidateQueries({queryKey: exitKeys.dashboard()});
    },
  });
}

/**
 * Delete an exit process
 */
export function useDeleteExitProcess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => exitService.deleteExitProcess(id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: exitKeys.processes()});
      queryClient.invalidateQueries({queryKey: exitKeys.dashboard()});
    },
  });
}

// ==================== Exit Clearance Hooks ====================

export function useClearancesByExitProcess(exitProcessId: string, enabled = true) {
  return useQuery({
    queryKey: exitKeys.clearancesByProcess(exitProcessId),
    queryFn: () => exitService.getClearancesByExitProcess(exitProcessId),
    enabled: !!exitProcessId && enabled,
  });
}

export function useCreateClearance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateExitClearanceRequest) => exitService.createClearance(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({queryKey: exitKeys.clearancesByProcess(data.exitProcessId)});
    },
  });
}

export function useUpdateClearance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({id, data}: { id: string; data: UpdateExitClearanceRequest }) =>
      exitService.updateClearance(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({queryKey: exitKeys.clearancesByProcess(data.exitProcessId)});
    },
  });
}

// ==================== Full & Final Settlement Hooks ====================

export function useSettlementByExitProcess(exitProcessId: string, enabled = true) {
  return useQuery({
    queryKey: exitKeys.settlementByProcess(exitProcessId),
    queryFn: () => exitService.getSettlementByExitProcess(exitProcessId),
    enabled: !!exitProcessId && enabled,
    retry: false,
  });
}

export function useSettlementById(id: string, enabled = true) {
  return useQuery({
    queryKey: exitKeys.settlementById(id),
    queryFn: () => exitService.getSettlementById(id),
    enabled: !!id && enabled,
  });
}

export function usePendingSettlementApprovals() {
  return useQuery({
    queryKey: exitKeys.pendingApprovals(),
    queryFn: () => exitService.getPendingApprovals(),
  });
}

export function useCreateSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFnFSettlementRequest) => exitService.createSettlement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: exitKeys.settlements()});
    },
  });
}

export function useUpdateSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({id, data}: { id: string; data: UpdateFnFSettlementRequest }) =>
      exitService.updateSettlement(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({queryKey: exitKeys.settlementById(data.id)});
      queryClient.invalidateQueries({queryKey: exitKeys.settlementByProcess(data.exitProcessId)});
    },
  });
}

export function useSubmitSettlementForApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => exitService.submitSettlementForApproval(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({queryKey: exitKeys.settlementById(data.id)});
      queryClient.invalidateQueries({queryKey: exitKeys.settlementByProcess(data.exitProcessId)});
      queryClient.invalidateQueries({queryKey: exitKeys.pendingApprovals()});
    },
  });
}

export function useApproveSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => exitService.approveSettlement(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({queryKey: exitKeys.settlementById(data.id)});
      queryClient.invalidateQueries({queryKey: exitKeys.settlementByProcess(data.exitProcessId)});
      queryClient.invalidateQueries({queryKey: exitKeys.pendingApprovals()});
    },
  });
}

export function useProcessSettlementPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({id, paymentMode, paymentReference}: {
      id: string;
      paymentMode: PaymentMode;
      paymentReference: string
    }) =>
      exitService.processSettlementPayment(id, paymentMode, paymentReference),
    onSuccess: (data) => {
      queryClient.invalidateQueries({queryKey: exitKeys.settlementById(data.id)});
      queryClient.invalidateQueries({queryKey: exitKeys.settlementByProcess(data.exitProcessId)});
    },
  });
}

// ==================== Exit Interview Hooks ====================

export function useExitInterviewById(id: string, enabled = true) {
  return useQuery({
    queryKey: exitKeys.interviewById(id),
    queryFn: () => exitService.getExitInterviewById(id),
    enabled: !!id && enabled,
  });
}

export function useAllExitInterviews(page = 0, size = 20) {
  return useQuery({
    queryKey: exitKeys.interviewsPaginated(page, size),
    queryFn: () => exitService.getAllExitInterviews(page, size),
  });
}

export function useScheduledInterviews() {
  return useQuery({
    queryKey: exitKeys.scheduledInterviews(),
    queryFn: () => exitService.getScheduledInterviews(),
  });
}

export function useExitInterviewAnalytics() {
  return useQuery({
    queryKey: exitKeys.interviewAnalytics(),
    queryFn: () => exitService.getExitInterviewAnalytics(),
  });
}

export function useCreateExitInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateExitInterviewRequest) => exitService.createExitInterview(data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: exitKeys.interviews()});
    },
  });
}

export function useConductExitInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({id, data}: { id: string; data: ConductExitInterviewRequest }) =>
      exitService.conductExitInterview(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({queryKey: exitKeys.interviewById(data.id)});
      queryClient.invalidateQueries({queryKey: exitKeys.interviews()});
    },
  });
}

export function useRescheduleInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({id, newDate}: { id: string; newDate: string }) =>
      exitService.rescheduleInterview(id, newDate),
    onSuccess: (data) => {
      queryClient.invalidateQueries({queryKey: exitKeys.interviewById(data.id)});
      queryClient.invalidateQueries({queryKey: exitKeys.interviews()});
    },
  });
}

// ==================== Asset Recovery Hooks ====================

export function useAssetsByExitProcess(exitProcessId: string, enabled = true) {
  return useQuery({
    queryKey: exitKeys.assetsByProcess(exitProcessId),
    queryFn: () => exitService.getAssetsByExitProcess(exitProcessId),
    enabled: !!exitProcessId && enabled,
  });
}

export function usePendingAssetRecoveries() {
  return useQuery({
    queryKey: exitKeys.pendingAssets(),
    queryFn: () => exitService.getPendingAssetRecoveries(),
  });
}

export function useAssetDeductions(exitProcessId: string, enabled = true) {
  return useQuery({
    queryKey: exitKeys.assetDeductions(exitProcessId),
    queryFn: () => exitService.getTotalDeductions(exitProcessId),
    enabled: !!exitProcessId && enabled,
  });
}

export function useAllAssetsRecovered(exitProcessId: string, enabled = true) {
  return useQuery({
    queryKey: exitKeys.allAssetsRecovered(exitProcessId),
    queryFn: () => exitService.areAllAssetsRecovered(exitProcessId),
    enabled: !!exitProcessId && enabled,
  });
}

export function useCreateAssetRecovery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAssetRecoveryRequest) => exitService.createAssetRecovery(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({queryKey: exitKeys.assetsByProcess(data.exitProcessId)});
    },
  });
}

export function useRecordAssetReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({id, data}: { id: string; data: RecordAssetReturnRequest }) =>
      exitService.recordAssetReturn(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({queryKey: exitKeys.assetsByProcess(data.exitProcessId)});
    },
  });
}

export function useMarkAssetAsLost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({id, deductionAmount, remarks}: { id: string; deductionAmount?: number; remarks?: string }) =>
      exitService.markAssetAsLost(id, deductionAmount, remarks),
    onSuccess: (data) => {
      queryClient.invalidateQueries({queryKey: exitKeys.assetsByProcess(data.exitProcessId)});
    },
  });
}

export function useWaiveAssetRecovery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({id, waiverReason}: { id: string; waiverReason: string }) =>
      exitService.waiveAssetRecovery(id, waiverReason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({queryKey: exitKeys.assetsByProcess(data.exitProcessId)});
    },
  });
}

export function useVerifyAssetReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => exitService.verifyAssetReturn(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({queryKey: exitKeys.assetsByProcess(data.exitProcessId)});
    },
  });
}
