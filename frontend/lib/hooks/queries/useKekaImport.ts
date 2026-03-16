import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  KekaImportMapping,
} from '../../types/keka-import';
import { kekaImportService } from '../../services/keka-import.service';

// Query keys
const kekaImportKeys = {
  all: ['keka-import'] as const,
  uploads: () => [...kekaImportKeys.all, 'uploads'] as const,
  history: () => [...kekaImportKeys.all, 'history'] as const,
  historyPage: (page: number, size: number) =>
    [...kekaImportKeys.history(), { page, size }] as const,
  details: (importId: string) =>
    [...kekaImportKeys.all, 'details', importId] as const,
  preview: (fileId: string) =>
    [...kekaImportKeys.all, 'preview', fileId] as const,
};

/**
 * Hook to upload KEKA file
 */
export function useKekaFileUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => kekaImportService.uploadKekaFile(file),
    onSuccess: () => {
      // Invalidate history when a new file is uploaded
      queryClient.invalidateQueries({
        queryKey: kekaImportKeys.history(),
      });
    },
  });
}

/**
 * Hook to get field mapping suggestions
 */
export function useKekaFieldMappingSuggestions(headers: string[]) {
  return useQuery({
    queryKey: [...kekaImportKeys.all, 'suggestions', headers],
    queryFn: () => kekaImportService.getFieldMappingSuggestions(headers),
    staleTime: Infinity, // Suggestions don't change
    enabled: headers && headers.length > 0,
  });
}

/**
 * Hook to download KEKA template
 */
export function useKekaDownloadTemplate(format: 'csv' | 'xlsx') {
  return useMutation({
    mutationFn: () => kekaImportService.downloadKekaTemplate(format),
  });
}

/**
 * Hook to preview KEKA import
 */
export function useKekaImportPreview() {
  return useMutation({
    mutationFn: ({
      fileId,
      mappings,
    }: {
      fileId: string;
      mappings: KekaImportMapping[];
    }) => kekaImportService.previewKekaImport(fileId, mappings),
  });
}

/**
 * Hook to execute KEKA import
 */
export function useKekaExecuteImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      fileId,
      mappings,
      options,
    }: {
      fileId: string;
      mappings: KekaImportMapping[];
      options?: {
        skipInvalidRows?: boolean;
        updateExistingEmployees?: boolean;
        sendWelcomeEmail?: boolean;
        autoApproveEmployees?: boolean;
      };
    }) => kekaImportService.executeKekaImport(fileId, mappings, options),
    onSuccess: () => {
      // Invalidate history and employees
      queryClient.invalidateQueries({
        queryKey: kekaImportKeys.history(),
      });
      queryClient.invalidateQueries({
        queryKey: ['employees'],
      });
    },
  });
}

/**
 * Hook to get import history
 */
export function useKekaImportHistory(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: kekaImportKeys.historyPage(page, size),
    queryFn: () => kekaImportService.getKekaImportHistory(page, size),
  });
}

/**
 * Hook to get import details
 */
export function useKekaImportDetails(importId: string) {
  return useQuery({
    queryKey: kekaImportKeys.details(importId),
    queryFn: () => kekaImportService.getKekaImportDetails(importId),
    enabled: !!importId,
  });
}

/**
 * Hook to download error report
 */
export function useKekaDownloadErrorReport() {
  return useMutation({
    mutationFn: (importId: string) =>
      kekaImportService.downloadKekaImportErrorReport(importId),
  });
}

/**
 * Hook to cancel import
 */
export function useKekaCancelImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (importId: string) =>
      kekaImportService.cancelKekaImport(importId),
    onSuccess: (_, importId) => {
      queryClient.invalidateQueries({
        queryKey: kekaImportKeys.details(importId),
      });
    },
  });
}
