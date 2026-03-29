'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import {
  importExportService,
  ImportDataType,
  ExportDataType,
  ExportFormat,
  ExportRequest,
} from '@/lib/services/importExport.service';

// Re-export existing Keka hooks for convenience
export {
  useKekaFileUpload,
  useKekaImportPreview,
  useKekaExecuteImport,
  useKekaImportHistory,
  useKekaImportDetails,
  useKekaCancelImport,
  useKekaDownloadErrorReport,
  useKekaFieldMappingSuggestions,
} from './useKekaImport';

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const importExportKeys = {
  all: ['import-export'] as const,
  migrationTemplates: () => [...importExportKeys.all, 'migration-templates'] as const,
};

// ─── Migration Templates ────────────────────────────────────────────────────

export function useMigrationTemplates() {
  return useQuery({
    queryKey: importExportKeys.migrationTemplates(),
    queryFn: () => importExportService.getMigrationTemplates(),
    staleTime: 30 * 60 * 1000, // 30 minutes - templates rarely change
  });
}

// ─── Data Import (Migration) ────────────────────────────────────────────────

export function useImportData() {
  return useMutation({
    mutationFn: ({ type, file }: { type: ImportDataType; file: File }) =>
      importExportService.importData(type, file),
    onSuccess: (result) => {
      const successRate = result.totalRows > 0
        ? Math.round((result.successCount / result.totalRows) * 100)
        : 0;
      notifications.show({
        title: 'Import Complete',
        message: `${result.successCount}/${result.totalRows} records imported successfully (${successRate}%)`,
        color: result.errorCount > 0 ? 'yellow' : 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Import Failed',
        message: error.message || 'An error occurred during import',
        color: 'red',
      });
    },
  });
}

export function useValidateFile() {
  return useMutation({
    mutationFn: ({ file, type }: { file: File; type: ImportDataType }) =>
      importExportService.validateFile(file, type),
  });
}

// ─── Employee Import ────────────────────────────────────────────────────────

export function usePreviewEmployeeImport() {
  return useMutation({
    mutationFn: (file: File) => importExportService.previewEmployeeImport(file),
  });
}

export function useExecuteEmployeeImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, skipInvalid }: { file: File; skipInvalid: boolean }) =>
      importExportService.executeEmployeeImport(file, skipInvalid),
    onSuccess: (result) => {
      notifications.show({
        title: 'Employee Import Complete',
        message: `${result.successCount} employees imported, ${result.failedCount} failed`,
        color: result.failedCount > 0 ? 'yellow' : 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Employee Import Failed',
        message: error.message || 'An error occurred during employee import',
        color: 'red',
      });
    },
  });
}

export function useDownloadEmployeeTemplate() {
  return useMutation({
    mutationFn: (format: 'csv' | 'xlsx') =>
      format === 'csv'
        ? importExportService.downloadEmployeeTemplateCsv()
        : importExportService.downloadEmployeeTemplateXlsx(),
    onSuccess: (blob, format) => {
      importExportService.triggerDownload(
        blob,
        `employee_import_template.${format}`,
      );
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Download Failed',
        message: error.message || 'Failed to download template',
        color: 'red',
      });
    },
  });
}

// ─── Export ─────────────────────────────────────────────────────────────────

export function useExportData() {
  return useMutation({
    mutationFn: ({
      type,
      format,
      request,
    }: {
      type: ExportDataType;
      format: ExportFormat;
      request: ExportRequest;
    }) => importExportService.exportData(type, format, request),
    onSuccess: (blob, { type, format }) => {
      const ext = format === 'CSV' ? '.csv' : format === 'EXCEL' ? '.xlsx' : '.pdf';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      importExportService.triggerDownload(blob, `${type}_${timestamp}${ext}`);
      notifications.show({
        title: 'Export Complete',
        message: `${type} data exported successfully`,
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Export Failed',
        message: error.message || 'An error occurred during export',
        color: 'red',
      });
    },
  });
}
