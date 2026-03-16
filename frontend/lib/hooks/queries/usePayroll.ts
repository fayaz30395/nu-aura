'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollService } from '@/lib/services/payroll.service';
import {
  PayrollRunRequest,
  PayslipRequest,
  SalaryStructureRequest,
  PayrollRunStatus,
} from '@/lib/types/payroll';

// Query keys for cache management
export const payrollKeys = {
  all: ['payroll'] as const,
  runs: () => [...payrollKeys.all, 'runs'] as const,
  runsList: (page: number, size: number, status?: PayrollRunStatus) =>
    [...payrollKeys.runs(), { page, size, status }] as const,
  runsDetail: () => [...payrollKeys.runs(), 'detail'] as const,
  runsById: (id: string) => [...payrollKeys.runsDetail(), id] as const,
  payslips: () => [...payrollKeys.all, 'payslips'] as const,
  payslipsList: (page: number, size: number, month?: string, employeeId?: string) =>
    [...payrollKeys.payslips(), { page, size, month, employeeId }] as const,
  payslipsDetail: () => [...payrollKeys.payslips(), 'detail'] as const,
  payslipsById: (id: string) => [...payrollKeys.payslipsDetail(), id] as const,
  payslipsByEmployee: (employeeId: string, page: number, size: number) =>
    [...payrollKeys.payslips(), 'employee', { employeeId, page, size }] as const,
  payslipsByRun: (payrollRunId: string, page: number, size: number) =>
    [...payrollKeys.payslips(), 'run', { payrollRunId, page, size }] as const,
  structures: () => [...payrollKeys.all, 'structures'] as const,
  structuresList: (page: number, size: number) =>
    [...payrollKeys.structures(), { page, size }] as const,
  structuresDetail: () => [...payrollKeys.structures(), 'detail'] as const,
  structuresById: (id: string) => [...payrollKeys.structuresDetail(), id] as const,
  structuresByEmployee: (employeeId: string) =>
    [...payrollKeys.structures(), 'employee', employeeId] as const,
};

// ============ PAYROLL RUNS ============

/**
 * Get paginated list of payroll runs
 */
export function usePayrollRuns(
  page: number = 0,
  size: number = 20,
  status?: PayrollRunStatus,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: payrollKeys.runsList(page, size, status),
    queryFn: async () => {
      if (status) {
        return payrollService.getPayrollRunsByStatus(status, page, size);
      }
      return payrollService.getAllPayrollRuns(page, size);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled,
  });
}

/**
 * Get single payroll run by ID
 */
export function usePayrollRun(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: payrollKeys.runsById(id),
    queryFn: () => payrollService.getPayrollRunById(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Create payroll run mutation
 */
export function useCreatePayrollRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PayrollRunRequest) => payrollService.createPayrollRun(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.runs() });
    },
  });
}

/**
 * Update payroll run mutation
 */
export function useUpdatePayrollRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PayrollRunRequest }) =>
      payrollService.updatePayrollRun(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.runs() });
      queryClient.invalidateQueries({ queryKey: payrollKeys.runsById(id) });
    },
  });
}

/**
 * Process payroll run mutation (transition from DRAFT to PROCESSING)
 */
export function useProcessPayrollRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => payrollService.processPayrollRun(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.runs() });
      queryClient.invalidateQueries({ queryKey: payrollKeys.runsById(id) });
    },
  });
}

/**
 * Approve payroll run mutation (transition from PROCESSED to APPROVED)
 */
export function useApprovePayrollRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => payrollService.approvePayrollRun(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.runs() });
      queryClient.invalidateQueries({ queryKey: payrollKeys.runsById(id) });
    },
  });
}

/**
 * Lock payroll run mutation (final state, prevents changes)
 */
export function useLockPayrollRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => payrollService.lockPayrollRun(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.runs() });
      queryClient.invalidateQueries({ queryKey: payrollKeys.runsById(id) });
    },
  });
}

/**
 * Delete payroll run mutation
 */
export function useDeletePayrollRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => payrollService.deletePayrollRun(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.runs() });
    },
  });
}

// ============ PAYSLIPS ============

/**
 * Get paginated list of payslips with optional filters
 */
export function usePayslips(
  page: number = 0,
  size: number = 20,
  month?: string,
  employeeId?: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: payrollKeys.payslipsList(page, size, month, employeeId),
    queryFn: async () => {
      if (employeeId) {
        return payrollService.getPayslipsByEmployee(employeeId, page, size);
      }
      if (month) {
        const [year, monthNum] = month.split('-');
        const startDate = `${year}-${monthNum}-01`;
        const endDate = new Date(parseInt(year), parseInt(monthNum), 0).toISOString().split('T')[0];
        return payrollService.getPayslipsByPeriod(startDate, endDate, page, size);
      }
      return payrollService.getAllPayslips(page, size);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled,
  });
}

/**
 * Get single payslip by ID
 */
export function usePayslip(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: payrollKeys.payslipsById(id),
    queryFn: () => payrollService.getPayslipById(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get payslips for a specific employee
 */
export function usePayslipsByEmployee(
  employeeId: string,
  page: number = 0,
  size: number = 20,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: payrollKeys.payslipsByEmployee(employeeId, page, size),
    queryFn: () => payrollService.getPayslipsByEmployee(employeeId, page, size),
    enabled: enabled && !!employeeId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get payslips for a specific payroll run
 */
export function usePayslipsByPayrollRun(
  payrollRunId: string,
  page: number = 0,
  size: number = 20,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: payrollKeys.payslipsByRun(payrollRunId, page, size),
    queryFn: () => payrollService.getPayslipsByPayrollRun(payrollRunId, page, size),
    enabled: enabled && !!payrollRunId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Create payslip mutation
 */
export function useCreatePayslip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PayslipRequest) => payrollService.createPayslip(data),
    onSuccess: (newPayslip) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.payslips() });
      queryClient.invalidateQueries({
        queryKey: payrollKeys.payslipsByEmployee(newPayslip.employeeId, 0, 20),
      });
      queryClient.invalidateQueries({
        queryKey: payrollKeys.payslipsByRun(newPayslip.payrollRunId, 0, 20),
      });
    },
  });
}

/**
 * Update payslip mutation
 */
export function useUpdatePayslip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PayslipRequest }) =>
      payrollService.updatePayslip(id, data),
    onSuccess: (_, { id, data }) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.payslips() });
      queryClient.invalidateQueries({ queryKey: payrollKeys.payslipsById(id) });
      queryClient.invalidateQueries({
        queryKey: payrollKeys.payslipsByEmployee(data.employeeId, 0, 20),
      });
      queryClient.invalidateQueries({
        queryKey: payrollKeys.payslipsByRun(data.payrollRunId, 0, 20),
      });
    },
  });
}

/**
 * Delete payslip mutation
 */
export function useDeletePayslip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => payrollService.deletePayslip(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.payslips() });
    },
  });
}

/**
 * Download payslip as PDF
 */
export function useDownloadPayslipPdf() {
  return useMutation({
    mutationFn: (payslipId: string) => payrollService.downloadPayslipPdf(payslipId),
  });
}

/**
 * Download payslip PDF by period
 */
export function useDownloadPayslipPdfByPeriod() {
  return useMutation({
    mutationFn: ({ employeeId, year, month }: { employeeId: string; year: number; month: number }) =>
      payrollService.downloadPayslipPdfByPeriod(employeeId, year, month),
  });
}

// ============ SALARY STRUCTURES ============

/**
 * Get paginated list of salary structures
 */
export function useSalaryStructures(
  page: number = 0,
  size: number = 20,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: payrollKeys.structuresList(page, size),
    queryFn: () => payrollService.getAllSalaryStructures(page, size),
    staleTime: 5 * 60 * 1000, // 5 minutes (less frequently changing data)
    enabled,
  });
}

/**
 * Get single salary structure by ID
 */
export function useSalaryStructure(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: payrollKeys.structuresById(id),
    queryFn: () => payrollService.getSalaryStructureById(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get salary structure for a specific employee
 */
export function useSalaryStructureByEmployee(
  employeeId: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: payrollKeys.structuresByEmployee(employeeId),
    queryFn: () => payrollService.getSalaryStructureByEmployee(employeeId),
    enabled: enabled && !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create salary structure mutation
 */
export function useCreateSalaryStructure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SalaryStructureRequest) => payrollService.createSalaryStructure(data),
    onSuccess: (newStructure) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.structures() });
      queryClient.invalidateQueries({
        queryKey: payrollKeys.structuresByEmployee(newStructure.employeeId),
      });
    },
  });
}

/**
 * Update salary structure mutation
 */
export function useUpdateSalaryStructure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SalaryStructureRequest }) =>
      payrollService.updateSalaryStructure(id, data),
    onSuccess: (_, { id, data }) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.structures() });
      queryClient.invalidateQueries({ queryKey: payrollKeys.structuresById(id) });
      queryClient.invalidateQueries({
        queryKey: payrollKeys.structuresByEmployee(data.employeeId),
      });
    },
  });
}

/**
 * Approve salary structure mutation
 */
export function useApproveSalaryStructure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => payrollService.approveSalaryStructure(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.structures() });
      queryClient.invalidateQueries({ queryKey: payrollKeys.structuresById(id) });
    },
  });
}

/**
 * Deactivate salary structure mutation
 */
export function useDeactivateSalaryStructure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => payrollService.deactivateSalaryStructure(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.structures() });
      queryClient.invalidateQueries({ queryKey: payrollKeys.structuresById(id) });
    },
  });
}

/**
 * Delete salary structure mutation
 */
export function useDeleteSalaryStructure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => payrollService.deleteSalaryStructure(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.structures() });
    },
  });
}

// ============ BULK OPERATIONS ============

/**
 * Bulk process payroll for multiple employees
 */
export function useBulkProcessPayroll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      employeeIds: string[];
      payrollPeriodStart: string;
      payrollPeriodEnd: string;
      paymentDate: string;
      runName?: string;
    }) => payrollService.bulkProcessPayroll(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.runs() });
      queryClient.invalidateQueries({ queryKey: payrollKeys.payslips() });
    },
  });
}

/**
 * Get bulk processing status
 */
export function useBulkProcessingStatus(
  payrollRunId: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['payroll', 'bulk-process', payrollRunId],
    queryFn: () => payrollService.getBulkProcessingStatus(payrollRunId),
    enabled: enabled && !!payrollRunId,
    staleTime: 30 * 1000, // 30 seconds for status polling
  });
}

/**
 * Preview bulk processing (dry-run)
 */
export function usePreviewBulkProcessing() {
  return useMutation({
    mutationFn: (data: {
      employeeIds: string[];
      payrollPeriodStart: string;
      payrollPeriodEnd: string;
    }) => payrollService.previewBulkProcessing(data),
  });
}
