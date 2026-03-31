'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  helpdeskSLAService,
  TicketSLA,
} from '@/lib/services/hrms/helpdesk-sla.service';

export const helpdeskSlaKeys = {
  all: ['helpdesk-sla'] as const,
  slas: () => [...helpdeskSlaKeys.all, 'slas'] as const,
  slaDetail: (id: string) => [...helpdeskSlaKeys.all, 'sla', id] as const,
  activeSlas: () => [...helpdeskSlaKeys.all, 'active'] as const,
  escalations: () => [...helpdeskSlaKeys.all, 'escalations'] as const,
  ticketEscalations: (ticketId: string) =>
    [...helpdeskSlaKeys.all, 'escalations', ticketId] as const,
  pendingEscalations: () => [...helpdeskSlaKeys.all, 'pending-escalations'] as const,
  metrics: (ticketId: string) =>
    [...helpdeskSlaKeys.all, 'metrics', ticketId] as const,
  dashboard: () => [...helpdeskSlaKeys.all, 'dashboard'] as const,
};

// ========== Queries ==========

/**
 * Fetch all SLA configurations with pagination
 */
export function useSlaConfigs(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: [...helpdeskSlaKeys.slas(), { page, size }],
    queryFn: () => helpdeskSLAService.getSLAs(page, size),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch a single SLA configuration
 */
export function useSlaConfig(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: helpdeskSlaKeys.slaDetail(id),
    queryFn: () => helpdeskSLAService.getSLA(id),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch all active SLAs
 */
export function useActiveSlas() {
  return useQuery({
    queryKey: helpdeskSlaKeys.activeSlas(),
    queryFn: () => helpdeskSLAService.getActiveSLAs(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch escalations for a specific ticket
 */
export function useTicketEscalations(ticketId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: helpdeskSlaKeys.ticketEscalations(ticketId),
    queryFn: () => helpdeskSLAService.getTicketEscalations(ticketId),
    enabled,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch current user's pending escalations
 */
export function useMyPendingEscalations() {
  return useQuery({
    queryKey: helpdeskSlaKeys.pendingEscalations(),
    queryFn: () => helpdeskSLAService.getMyPendingEscalations(),
    staleTime: 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Fetch metrics for a specific ticket
 */
export function useTicketMetrics(ticketId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: helpdeskSlaKeys.metrics(ticketId),
    queryFn: () => helpdeskSLAService.getTicketMetrics(ticketId),
    enabled,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch SLA dashboard data
 */
export function useSLADashboard() {
  return useQuery({
    queryKey: helpdeskSlaKeys.dashboard(),
    queryFn: () => helpdeskSLAService.getDashboard(),
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// ========== Mutations ==========

/**
 * Create a new SLA configuration
 */
export function useCreateSlaConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<TicketSLA>) =>
      helpdeskSLAService.createSLA(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: helpdeskSlaKeys.slas() });
      queryClient.invalidateQueries({ queryKey: helpdeskSlaKeys.activeSlas() });
      queryClient.invalidateQueries({ queryKey: helpdeskSlaKeys.dashboard() });
    },
  });
}

/**
 * Update an SLA configuration
 */
export function useUpdateSlaConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TicketSLA> }) =>
      helpdeskSLAService.updateSLA(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: helpdeskSlaKeys.slaDetail(id) });
      queryClient.invalidateQueries({ queryKey: helpdeskSlaKeys.slas() });
      queryClient.invalidateQueries({ queryKey: helpdeskSlaKeys.activeSlas() });
      queryClient.invalidateQueries({ queryKey: helpdeskSlaKeys.dashboard() });
    },
  });
}

/**
 * Delete an SLA configuration
 */
export function useDeleteSlaConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => helpdeskSLAService.deleteSLA(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: helpdeskSlaKeys.slas() });
      queryClient.invalidateQueries({ queryKey: helpdeskSlaKeys.activeSlas() });
      queryClient.invalidateQueries({ queryKey: helpdeskSlaKeys.dashboard() });
    },
  });
}

/**
 * Escalate a ticket
 */
export function useEscalateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ticketId,
      escalatedTo,
      level,
      reason,
      notes,
    }: {
      ticketId: string;
      escalatedTo: string;
      level: string;
      reason: string;
      notes?: string;
    }) =>
      helpdeskSLAService.escalateTicket(
        ticketId,
        escalatedTo,
        level,
        reason,
        notes
      ),
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({
        queryKey: helpdeskSlaKeys.ticketEscalations(ticketId),
      });
      queryClient.invalidateQueries({
        queryKey: helpdeskSlaKeys.pendingEscalations(),
      });
      queryClient.invalidateQueries({ queryKey: helpdeskSlaKeys.dashboard() });
    },
  });
}

/**
 * Acknowledge an escalation
 */
export function useAcknowledgeEscalation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (escalationId: string) =>
      helpdeskSLAService.acknowledgeEscalation(escalationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: helpdeskSlaKeys.pendingEscalations(),
      });
      queryClient.invalidateQueries({ queryKey: helpdeskSlaKeys.dashboard() });
    },
  });
}

/**
 * Submit CSAT rating for a ticket
 */
export function useSubmitCSAT() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ticketId,
      rating,
      feedback,
    }: {
      ticketId: string;
      rating: number;
      feedback?: string;
    }) => helpdeskSLAService.submitCSAT(ticketId, rating, feedback),
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({
        queryKey: helpdeskSlaKeys.metrics(ticketId),
      });
      queryClient.invalidateQueries({ queryKey: helpdeskSlaKeys.dashboard() });
    },
  });
}
