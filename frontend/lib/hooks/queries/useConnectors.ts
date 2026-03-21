'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { connectorService } from '@/lib/services/connector.service';
import { ConnectorConfigRequest, TemplateMappingRequest } from '@/lib/types/connector';

// Query keys for cache management
export const connectorKeys = {
  all: ['connectors'] as const,
  // All connectors list
  list: () => [...connectorKeys.all, 'list'] as const,
  // Single connector detail
  detail: () => [...connectorKeys.all, 'detail'] as const,
  connectorDetail: (connectorId: string) => [...connectorKeys.detail(), connectorId] as const,
  // Event logs
  events: () => [...connectorKeys.all, 'events'] as const,
  eventsList: (connectorId?: string, status?: string, page?: number, size?: number) =>
    [...connectorKeys.events(), { connectorId, status, page, size }] as const,
  // DocuSign envelopes
  docuSignEnvelopes: () => [...connectorKeys.all, 'docusign-envelopes'] as const,
  envelopesList: (page?: number, size?: number) => [...connectorKeys.docuSignEnvelopes(), { page, size }] as const,
  // DocuSign template mappings
  docuSignMappings: () => [...connectorKeys.all, 'docusign-mappings'] as const,
  mappingsList: () => [...connectorKeys.docuSignMappings(), 'list'] as const,
};

// ========== QUERIES ==========

// Get all available connectors
export function useConnectors() {
  return useQuery({
    queryKey: connectorKeys.list(),
    queryFn: () => connectorService.getConnectors(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Get single connector with config
export function useConnectorDetails(connectorId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: connectorKeys.connectorDetail(connectorId),
    queryFn: () => connectorService.getConnectorDetails(connectorId),
    enabled: enabled && !!connectorId,
    staleTime: 5 * 60 * 1000,
  });
}

// Get integration event logs
export function useIntegrationEvents(
  connectorId?: string,
  status?: string,
  page: number = 0,
  size: number = 20
) {
  return useQuery({
    queryKey: connectorKeys.eventsList(connectorId, status, page, size),
    queryFn: () => connectorService.getIntegrationEvents(connectorId, status, page, size),
    staleTime: 2 * 60 * 1000,
  });
}

// Get DocuSign envelopes
export function useDocuSignEnvelopes(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: connectorKeys.envelopesList(page, size),
    queryFn: () => connectorService.getDocuSignEnvelopes(page, size),
    staleTime: 5 * 60 * 1000,
  });
}

// Get DocuSign template mappings
export function useDocuSignTemplateMappings() {
  return useQuery({
    queryKey: connectorKeys.mappingsList(),
    queryFn: () => connectorService.getDocuSignTemplateMappings(),
    staleTime: 10 * 60 * 1000,
  });
}

// ========== MUTATIONS ==========

// Test connection
export function useConnectionTest() {
  return useMutation({
    mutationFn: (connectorId: string) => connectorService.testConnection(connectorId),
  });
}

// Save connector configuration
export function useSaveConnectorConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ connectorId, data }: { connectorId: string; data: ConnectorConfigRequest }) =>
      connectorService.saveConnectorConfig(connectorId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: connectorKeys.connectorDetail(data.connectorId) });
      queryClient.invalidateQueries({ queryKey: connectorKeys.list() });
    },
  });
}

// Activate connector
export function useActivateConnector() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectorId: string) => connectorService.activateConnector(connectorId),
    onSuccess: (_, connectorId) => {
      queryClient.invalidateQueries({ queryKey: connectorKeys.connectorDetail(connectorId) });
      queryClient.invalidateQueries({ queryKey: connectorKeys.list() });
    },
  });
}

// Deactivate connector
export function useDeactivateConnector() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectorId: string) => connectorService.deactivateConnector(connectorId),
    onSuccess: (_, connectorId) => {
      queryClient.invalidateQueries({ queryKey: connectorKeys.connectorDetail(connectorId) });
      queryClient.invalidateQueries({ queryKey: connectorKeys.list() });
    },
  });
}

// Save DocuSign template mapping
export function useSaveTemplateMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TemplateMappingRequest) => connectorService.saveTemplateMapping(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connectorKeys.mappingsList() });
    },
  });
}
