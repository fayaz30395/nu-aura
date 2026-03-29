'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { statutoryFilingService } from '@/lib/services/statutory-filing.service';
import {
  FilingTypeInfo,
  FilingRunResponse,
  GenerateFilingRequest,
  SubmitFilingRequest,
  ValidationResult,
  Page,
} from '@/lib/types/statutory-filing';

// ─── Query Key Factory ───────────────────────────────────────────────────────

export const statutoryFilingKeys = {
  all: ['statutory-filing'] as const,
  types: () => [...statutoryFilingKeys.all, 'types'] as const,
  history: () => [...statutoryFilingKeys.all, 'history'] as const,
  historyList: (page: number, size: number, filingType?: string) =>
    [...statutoryFilingKeys.history(), { page, size, filingType }] as const,
  detail: () => [...statutoryFilingKeys.all, 'detail'] as const,
  detailById: (id: string) => [...statutoryFilingKeys.detail(), id] as const,
};

// ─── Query Hooks ─────────────────────────────────────────────────────────────

/**
 * Fetch all available filing types with metadata.
 */
export function useFilingTypes(enabled: boolean = true) {
  return useQuery<FilingTypeInfo[]>({
    queryKey: statutoryFilingKeys.types(),
    queryFn: () => statutoryFilingService.getFilingTypes(),
    staleTime: 30 * 60 * 1000, // 30 minutes (rarely changes)
    enabled,
  });
}

/**
 * Fetch filing run history with pagination.
 */
export function useFilingHistory(
  page: number = 0,
  size: number = 20,
  filingType?: string,
  enabled: boolean = true
) {
  return useQuery<Page<FilingRunResponse>>({
    queryKey: statutoryFilingKeys.historyList(page, size, filingType),
    queryFn: () => statutoryFilingService.getFilingHistory(page, size, filingType),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled,
  });
}

/**
 * Fetch a single filing run detail.
 */
export function useFilingRunDetail(id: string, enabled: boolean = true) {
  return useQuery<FilingRunResponse>({
    queryKey: statutoryFilingKeys.detailById(id),
    queryFn: () => statutoryFilingService.getFilingRunDetail(id),
    enabled: enabled && !!id,
    staleTime: 60 * 1000,
  });
}

// ─── Mutation Hooks ──────────────────────────────────────────────────────────

/**
 * Generate a new statutory filing.
 */
export function useGenerateFiling() {
  const queryClient = useQueryClient();

  return useMutation<FilingRunResponse, Error, GenerateFilingRequest>({
    mutationFn: (data) => statutoryFilingService.generateFiling(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: statutoryFilingKeys.history() });
    },
  });
}

/**
 * Validate a filing run.
 */
export function useValidateFiling() {
  const queryClient = useQueryClient();

  return useMutation<ValidationResult, Error, string>({
    mutationFn: (id) => statutoryFilingService.validateFiling(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: statutoryFilingKeys.detailById(id) });
      queryClient.invalidateQueries({ queryKey: statutoryFilingKeys.history() });
    },
  });
}

/**
 * Submit a filing run.
 */
export function useSubmitFiling() {
  const queryClient = useQueryClient();

  return useMutation<FilingRunResponse, Error, { id: string; data: SubmitFilingRequest }>({
    mutationFn: ({ id, data }) => statutoryFilingService.submitFiling(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: statutoryFilingKeys.detailById(id) });
      queryClient.invalidateQueries({ queryKey: statutoryFilingKeys.history() });
    },
  });
}

/**
 * Download a filing file.
 */
export function useDownloadFiling() {
  return useMutation<Blob, Error, { id: string; fileName: string }>({
    mutationFn: async ({ id, fileName }) => {
      const blob = await statutoryFilingService.downloadFiling(id);
      // Trigger browser download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      return blob;
    },
  });
}
