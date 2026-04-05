'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {complianceService} from '@/lib/services/hrms/compliance.service';
import type {AlertStatus,} from '@/lib/types/hrms/compliance';

// ─── Query Key Factory ────────────────────────────────────────────────────────

export const complianceKeys = {
  all: ['compliance'] as const,
  dashboard: () => [...complianceKeys.all, 'dashboard'] as const,
  // Policies
  policies: () => [...complianceKeys.all, 'policies'] as const,
  policiesPaged: (page: number, size: number) =>
    [...complianceKeys.policies(), 'paged', {page, size}] as const,
  policiesActive: () => [...complianceKeys.policies(), 'active'] as const,
  policyById: (id: string) => [...complianceKeys.policies(), 'detail', id] as const,
  // Checklists
  checklists: () => [...complianceKeys.all, 'checklists'] as const,
  checklistsPaged: (page: number, size: number) =>
    [...complianceKeys.checklists(), 'paged', {page, size}] as const,
  checklistsActive: () => [...complianceKeys.checklists(), 'active'] as const,
  // Alerts
  alerts: () => [...complianceKeys.all, 'alerts'] as const,
  alertsPaged: (page: number, size: number) =>
    [...complianceKeys.alerts(), 'paged', {page, size}] as const,
  alertsActive: (page: number, size: number) =>
    [...complianceKeys.alerts(), 'active', {page, size}] as const,
  alertsCritical: (page: number, size: number) =>
    [...complianceKeys.alerts(), 'critical', {page, size}] as const,
  alertsMine: (page: number, size: number) =>
    [...complianceKeys.alerts(), 'mine', {page, size}] as const,
  // Audit
  auditLogs: (page: number, size: number) =>
    [...complianceKeys.all, 'audit', {page, size}] as const,
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function useComplianceDashboard() {
  return useQuery({
    queryKey: complianceKeys.dashboard(),
    queryFn: () => complianceService.getComplianceDashboard(),
    staleTime: 60_000,
  });
}

// ─── Policies ─────────────────────────────────────────────────────────────────

export function useCompliancePolicies(page = 0, size = 20) {
  return useQuery({
    queryKey: complianceKeys.policiesPaged(page, size),
    queryFn: () => complianceService.getAllPolicies(page, size),
  });
}

export function useActivePolicies() {
  return useQuery({
    queryKey: complianceKeys.policiesActive(),
    queryFn: () => complianceService.getActivePolicies(0, 20),
  });
}

export function usePublishPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => complianceService.publishPolicy(id),
    onSuccess: () => qc.invalidateQueries({queryKey: complianceKeys.policies()}),
  });
}

export function useArchivePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => complianceService.archivePolicy(id),
    onSuccess: () => qc.invalidateQueries({queryKey: complianceKeys.policies()}),
  });
}

export function useAcknowledgePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({policyId, signature}: { policyId: string; signature?: string }) =>
      complianceService.acknowledgePolicy(policyId, {signature}),
    onSuccess: () => qc.invalidateQueries({queryKey: complianceKeys.policies()}),
  });
}

// ─── Checklists ───────────────────────────────────────────────────────────────

export function useComplianceChecklists(page = 0, size = 20) {
  return useQuery({
    queryKey: complianceKeys.checklistsPaged(page, size),
    queryFn: () => complianceService.getAllChecklists(page, size),
  });
}

export function useActiveChecklists() {
  return useQuery({
    queryKey: complianceKeys.checklistsActive(),
    queryFn: () => complianceService.getActiveChecklists(0, 20),
  });
}

export function useCompleteChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => complianceService.completeChecklist(id),
    onSuccess: () => qc.invalidateQueries({queryKey: complianceKeys.checklists()}),
  });
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export function useActiveAlerts() {
  return useQuery({
    queryKey: complianceKeys.alertsActive(0, 100),
    queryFn: () => complianceService.getActiveAlerts(0, 100),
  });
}

export function useCriticalAlerts() {
  return useQuery({
    queryKey: complianceKeys.alertsCritical(0, 100),
    queryFn: () => complianceService.getCriticalAlerts(0, 100),
  });
}

export function useMyAlerts() {
  return useQuery({
    queryKey: complianceKeys.alertsMine(0, 100),
    queryFn: () => complianceService.getMyAlerts(0, 100),
  });
}

export function useUpdateAlertStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
                   id,
                   status,
                   resolution,
                 }: {
      id: string;
      status: AlertStatus;
      resolution?: string;
    }) => complianceService.updateAlertStatus(id, {status, resolution}),
    onSuccess: () => qc.invalidateQueries({queryKey: complianceKeys.alerts()}),
  });
}

export function useEscalateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => complianceService.escalateAlert(id),
    onSuccess: () => qc.invalidateQueries({queryKey: complianceKeys.alerts()}),
  });
}
