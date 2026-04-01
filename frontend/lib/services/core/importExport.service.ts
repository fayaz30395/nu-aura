import { apiClient } from '../../api/client';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ImportDataType =
  | 'employees'
  | 'attendance'
  | 'leave_balances'
  | 'salary_structures'
  | 'departments';

export type ExportDataType =
  | 'employees'
  | 'attendance'
  | 'leaves'
  | 'payroll'
  | 'timesheets'
  | 'projects';

export type ExportFormat = 'CSV' | 'EXCEL' | 'PDF';

// ─── Migration DTOs (DataMigrationController) ──────────────────────────────

export interface ImportError {
  rowNumber: number;
  field: string;
  value: string;
  errorMessage: string;
}

export interface ImportResult {
  importId: string;
  dataType: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  startTime: string;
  endTime: string;
  durationMs: number;
  errors: ImportError[];
  warnings: string[];
  successRate: number;
}

export interface MigrationTemplateColumn {
  description: string;
  requiredColumns: string[];
  optionalColumns: string[];
}

export interface MigrationTemplates {
  employees: MigrationTemplateColumn;
  attendance: MigrationTemplateColumn;
  leave_balances: MigrationTemplateColumn;
  salary_structures: MigrationTemplateColumn;
  departments: MigrationTemplateColumn;
  supportedFormats: string[];
  dateFormats: string[];
}

export interface FileValidationResult {
  filename: string;
  size: number;
  validFormat: boolean;
  type: string;
  requiredColumns: string[];
  message: string;
}

// ─── Employee Import DTOs (EmployeeImportController) ────────────────────────

export interface EmployeeImportRowPreview {
  rowNumber: number;
  employeeCode: string;
  fullName: string;
  workEmail: string;
  designation: string;
  departmentName: string;
  joiningDate: string;
  employmentType: string;
  isValid: boolean;
  rowErrors: string[];
}

export interface EmployeeImportPreview {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  hasErrors: boolean;
  rows: EmployeeImportRowPreview[];
  errors: Array<{ rowNumber: number; field: string; message: string }>;
  warnings: string[];
}

export interface ImportedEmployee {
  rowNumber: number;
  employeeId: string;
  employeeCode: string;
  fullName: string;
  workEmail: string;
}

export interface FailedImport {
  rowNumber: number;
  employeeCode: string;
  reason: string;
  errors: Array<{ rowNumber: number; field: string; message: string }>;
}

export interface EmployeeImportResult {
  importId: string;
  importedAt: string;
  importedBy: string;
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  status: 'COMPLETED' | 'PARTIAL_SUCCESS' | 'FAILED' | 'CANCELLED';
  importedEmployees: ImportedEmployee[];
  failedImports: FailedImport[];
}

// ─── Export Request (ExportController) ──────────────────────────────────────

export interface ExportRequest {
  headers: string[];
  data: Array<Record<string, unknown>>;
  columnKeys: string[];
}

// ─── Service ────────────────────────────────────────────────────────────────

class ImportExportService {
  // ========== Data Migration (Bulk Imports via /api/v1/migration/) ==========

  async importData(type: ImportDataType, file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ImportResult>(
      `/api/v1/migration/${type}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  }

  async getMigrationTemplates(): Promise<MigrationTemplates> {
    const response = await apiClient.get<MigrationTemplates>('/api/v1/migration/templates');
    return response.data;
  }

  async validateFile(file: File, type: ImportDataType): Promise<FileValidationResult> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<FileValidationResult>(
      `/api/v1/migration/validate?type=${type}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  }

  // ========== Employee Import (via /api/v1/employees/import/) ==========

  async downloadEmployeeTemplateCsv(): Promise<Blob> {
    const response = await apiClient.get<Blob>('/api/v1/employees/import/template/csv', {
      responseType: 'blob',
    });
    return response.data;
  }

  async downloadEmployeeTemplateXlsx(): Promise<Blob> {
    const response = await apiClient.get<Blob>('/api/v1/employees/import/template/xlsx', {
      responseType: 'blob',
    });
    return response.data;
  }

  async previewEmployeeImport(file: File): Promise<EmployeeImportPreview> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<EmployeeImportPreview>(
      '/api/v1/employees/import/preview',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  }

  async executeEmployeeImport(file: File, skipInvalid: boolean = true): Promise<EmployeeImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<EmployeeImportResult>(
      `/api/v1/employees/import/execute?skipInvalid=${skipInvalid}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  }

  // ========== Exports (via /api/v1/export/) ==========

  async exportData(
    type: ExportDataType,
    format: ExportFormat,
    request: ExportRequest,
  ): Promise<Blob> {
    const response = await apiClient.post<Blob>(
      `/api/v1/export/${type}?format=${format}`,
      request,
      { responseType: 'blob' },
    );
    return response.data;
  }

  // ========== Utility ==========

  triggerDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export const importExportService = new ImportExportService();
