'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { lwfService } from '@/lib/services/hrms/lwf.service';
import {
  LWFConfiguration,
  LWFConfigurationRequest,
  LWFDeduction,
  LWFCalculationRequest,
  LWFRemittanceReport,
} from '@/lib/types/hrms/lwf';

// ─── Query Key Factory ──────────────────────────────────────────────────────

export const lwfKeys = {
  all: ['lwf'] as const,
  configurations: () => [...lwfKeys.all, 'configurations'] as const,
  deductions: () => [...lwfKeys.all, 'deductions'] as const,
  deductionsByPeriod: (month: number, year: number) =>
    [...lwfKeys.deductions(), 'period', { month, year }] as const,
  deductionsByEmployee: (employeeId: string) =>
    [...lwfKeys.deductions(), 'employee', employeeId] as const,
  deductionsByEmployeeYear: (employeeId: string, year: number) =>
    [...lwfKeys.deductions(), 'employee', employeeId, { year }] as const,
  report: () => [...lwfKeys.all, 'report'] as const,
  remittanceReport: (month: number, year: number) =>
    [...lwfKeys.report(), { month, year }] as const,
};

// ─── Queries ────────────────────────────────────────────────────────────────

/** Fetch all LWF state configurations */
export function useLWFConfigurations(enabled: boolean = true) {
  return useQuery<LWFConfiguration[]>({
    queryKey: lwfKeys.configurations(),
    queryFn: () => lwfService.getConfigurations(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetch LWF deductions for a specific month/year */
export function useLWFDeductions(month: number, year: number, enabled: boolean = true) {
  return useQuery<LWFDeduction[]>({
    queryKey: lwfKeys.deductionsByPeriod(month, year),
    queryFn: () => lwfService.getDeductions(month, year),
    enabled: enabled && month >= 1 && month <= 12 && year >= 2020,
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetch LWF deduction history for a specific employee */
export function useLWFEmployeeDeductions(
  employeeId: string,
  enabled: boolean = true
) {
  return useQuery<LWFDeduction[]>({
    queryKey: lwfKeys.deductionsByEmployee(employeeId),
    queryFn: () => lwfService.getEmployeeDeductions(employeeId),
    enabled: enabled && !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetch LWF deductions for employee filtered by year */
export function useLWFEmployeeDeductionsByYear(
  employeeId: string,
  year: number,
  enabled: boolean = true
) {
  return useQuery<LWFDeduction[]>({
    queryKey: lwfKeys.deductionsByEmployeeYear(employeeId, year),
    queryFn: () => lwfService.getEmployeeDeductions(employeeId, year),
    enabled: enabled && !!employeeId && year >= 2020,
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetch LWF remittance report for a period */
export function useLWFRemittanceReport(
  month: number,
  year: number,
  enabled: boolean = true
) {
  return useQuery<LWFRemittanceReport>({
    queryKey: lwfKeys.remittanceReport(month, year),
    queryFn: () => lwfService.getRemittanceReport(month, year),
    enabled: enabled && month >= 1 && month <= 12 && year >= 2020,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

/** Create or update an LWF state configuration */
export function useCreateOrUpdateLWFConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LWFConfigurationRequest) =>
      lwfService.createOrUpdateConfiguration(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lwfKeys.configurations() });
    },
  });
}

/** Deactivate an LWF state configuration */
export function useDeactivateLWFConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (stateCode: string) =>
      lwfService.deactivateConfiguration(stateCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lwfKeys.configurations() });
    },
  });
}

/** Trigger LWF calculation for a payroll run */
export function useCalculateLWF() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LWFCalculationRequest) => lwfService.calculateLWF(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: lwfKeys.deductionsByPeriod(variables.month, variables.year),
      });
      queryClient.invalidateQueries({ queryKey: lwfKeys.report() });
    },
  });
}
