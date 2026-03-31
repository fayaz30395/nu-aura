'use client';

import { useQuery } from '@tanstack/react-query';
import { statutoryService } from '@/lib/services/hrms/statutory.service';
import {
  ProvidentFundConfig,
  ESIConfig,
  ProfessionalTaxSlab,
  MonthlyStatutoryContribution,
} from '@/lib/types/hrms/statutory';

// Query key factory for statutory compliance
export const statutoryKeys = {
  all: ['statutory'] as const,
  pf: () => [...statutoryKeys.all, 'pf'] as const,
  pfConfigs: () => [...statutoryKeys.pf(), 'configs'] as const,
  pfEmployeeRecord: (employeeId: string) =>
    [...statutoryKeys.pf(), 'employee', employeeId] as const,
  esi: () => [...statutoryKeys.all, 'esi'] as const,
  esiConfigs: () => [...statutoryKeys.esi(), 'configs'] as const,
  esiEmployeeRecord: (employeeId: string) =>
    [...statutoryKeys.esi(), 'employee', employeeId] as const,
  pt: () => [...statutoryKeys.all, 'pt'] as const,
  ptSlabs: (stateCode: string) =>
    [...statutoryKeys.pt(), 'slabs', stateCode] as const,
  contributions: () => [...statutoryKeys.all, 'contributions'] as const,
  monthlyContributions: (month: number, year: number) =>
    [...statutoryKeys.contributions(), 'monthly', { month, year }] as const,
  employeeContributions: (employeeId: string) =>
    [...statutoryKeys.contributions(), 'employee', employeeId] as const,
};

// PF Queries
export function useActivePFConfigs(enabled: boolean = true) {
  return useQuery<ProvidentFundConfig[]>({
    queryKey: statutoryKeys.pfConfigs(),
    queryFn: () => statutoryService.getActivePFConfigs(),
    enabled,
  });
}

export function useEmployeePFRecord(employeeId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: statutoryKeys.pfEmployeeRecord(employeeId),
    queryFn: () => statutoryService.getEmployeePFRecord(employeeId),
    enabled: enabled && !!employeeId,
  });
}

// ESI Queries
export function useActiveESIConfigs(enabled: boolean = true) {
  return useQuery<ESIConfig[]>({
    queryKey: statutoryKeys.esiConfigs(),
    queryFn: () => statutoryService.getActiveESIConfigs(),
    enabled,
  });
}

export function useEmployeeESIRecord(employeeId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: statutoryKeys.esiEmployeeRecord(employeeId),
    queryFn: () => statutoryService.getEmployeeESIRecord(employeeId),
    enabled: enabled && !!employeeId,
  });
}

// Professional Tax (PT) Queries
export function usePTSlabsByState(stateCode: string, enabled: boolean = true) {
  return useQuery<ProfessionalTaxSlab[]>({
    queryKey: statutoryKeys.ptSlabs(stateCode),
    queryFn: () => statutoryService.getPTSlabsByState(stateCode),
    enabled: enabled && !!stateCode,
  });
}

// Monthly Contributions Queries
export function useMonthlyStatutoryContributions(
  month: number,
  year: number,
  enabled: boolean = true
) {
  return useQuery<MonthlyStatutoryContribution[]>({
    queryKey: statutoryKeys.monthlyContributions(month, year),
    queryFn: () =>
      statutoryService.getMonthlyContributions(month, year),
    enabled,
  });
}

export function useEmployeeStatutoryContributions(
  employeeId: string,
  enabled: boolean = true
) {
  return useQuery<MonthlyStatutoryContribution[]>({
    queryKey: statutoryKeys.employeeContributions(employeeId),
    queryFn: () =>
      statutoryService.getEmployeeContributions(employeeId),
    enabled: enabled && !!employeeId,
  });
}
