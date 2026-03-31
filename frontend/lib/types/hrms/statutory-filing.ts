/**
 * Types for the Statutory Filing Format Generation feature.
 */

export type FilingType = 'PF_ECR' | 'ESI_RETURN' | 'PT_CHALLAN' | 'FORM_16' | 'FORM_24Q' | 'LWF_RETURN';
export type OutputFormat = 'CSV' | 'EXCEL' | 'PDF' | 'TEXT';
export type FilingStatus = 'DRAFT' | 'GENERATED' | 'VALIDATED' | 'SUBMITTED' | 'REJECTED';

export interface FilingTypeInfo {
  filingType: FilingType;
  name: string;
  description: string;
  format: OutputFormat;
  frequency: string;
  portalName: string;
  portalUrl: string;
}

export interface FilingRunResponse {
  id: string;
  filingType: FilingType;
  filingTypeName: string;
  periodMonth: number;
  periodYear: number;
  periodLabel: string;
  status: FilingStatus;
  generatedBy: string;
  generatedAt: string | null;
  fileName: string | null;
  fileSize: number | null;
  validationErrors: string | null;
  totalRecords: number | null;
  submittedAt: string | null;
  submittedBy: string | null;
  remarks: string | null;
  createdAt: string;
}

export interface GenerateFilingRequest {
  filingType: FilingType;
  month: number;
  year: number;
  remarks?: string;
}

export interface SubmitFilingRequest {
  remarks?: string;
}

export interface ValidationResult {
  filingRunId: string;
  valid: boolean;
  errorCount: number;
  warningCount: number;
  validationErrors: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}
