'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  samlService,
  SamlConfigRequest,
  SamlConfigResponse,
  SamlTestConnectionResponse,
} from '@/lib/services/core/saml.service';

export const samlKeys = {
  all: ['saml'] as const,
  config: () => [...samlKeys.all, 'config'] as const,
  providers: () => [...samlKeys.all, 'providers'] as const,
  metadata: () => [...samlKeys.all, 'metadata'] as const,
};

/**
 * Fetch the current tenant's SAML configuration.
 */
export function useSamlConfig(enabled = true) {
  return useQuery<SamlConfigResponse, Error>({
    queryKey: samlKeys.config(),
    queryFn: () => samlService.getConfig(),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    retryDelay: 1000,
  });
}

/**
 * Create a new SAML configuration for the current tenant.
 */
export function useCreateSamlConfig() {
  const queryClient = useQueryClient();
  return useMutation<SamlConfigResponse, Error, SamlConfigRequest>({
    mutationFn: (config) => samlService.createConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: samlKeys.config() });
    },
  });
}

/**
 * Update the current tenant's SAML configuration.
 */
export function useUpdateSamlConfig() {
  const queryClient = useQueryClient();
  return useMutation<SamlConfigResponse, Error, SamlConfigRequest>({
    mutationFn: (config) => samlService.updateConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: samlKeys.config() });
    },
  });
}

/**
 * Delete the current tenant's SAML configuration.
 */
export function useDeleteSamlConfig() {
  const queryClient = useQueryClient();
  return useMutation<void, Error>({
    mutationFn: () => samlService.deleteConfig(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: samlKeys.config() });
    },
  });
}

/**
 * Test the SAML IdP connection.
 */
export function useTestSamlConnection() {
  return useMutation<SamlTestConnectionResponse, Error>({
    mutationFn: () => samlService.testConnection(),
  });
}

/**
 * Download the SP metadata XML.
 */
export function useSamlMetadata(enabled = false) {
  return useQuery<string, Error>({
    queryKey: samlKeys.metadata(),
    queryFn: () => samlService.getMetadata(),
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * List all SAML providers (SuperAdmin only).
 */
export function useSamlProviders(enabled = false) {
  return useQuery<SamlConfigResponse[], Error>({
    queryKey: samlKeys.providers(),
    queryFn: () => samlService.getAllProviders(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
