// KEKA HRMS Data Import Types

export interface KekaEmployee {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  personalEmail?: string;
  phone?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  department?: string;
  designation?: string;
  joiningDate: string; // YYYY-MM-DD
  reportingManager?: string;
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN' | 'CONSULTANT';
  status?: 'ACTIVE' | 'INACTIVE' | 'TERMINATED' | 'RESIGNED' | 'ON_LEAVE';
  location?: string;
  ctc?: number;
  panNumber?: string;
  aadharNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  pfAccountNumber?: string;
  esiNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bloodGroup?: string;
  maritalStatus?: string;
}

/**
 * Maps KEKA source columns to NU-AURA target fields
 */
export interface KekaImportMapping {
  sourceColumn: string; // Column name from KEKA export
  targetField: keyof KekaEmployee; // Target field in NU-AURA
  transform?: 'NONE' | 'DATE_FORMAT' | 'UPPERCASE' | 'LOWERCASE' | 'TRIM' | 'PHONE_FORMAT';
  isRequired?: boolean;
  description?: string;
}

/**
 * Suggested mapping with confidence score
 */
export interface KekaImportMappingSuggestion extends KekaImportMapping {
  confidence: number; // 0-1, higher = more confident
  suggestedSourceColumn?: string;
}

/**
 * Individual row validation error
 */
export interface KekaImportError {
  row: number; // 1-indexed
  field: string; // Field name
  value?: string; // The problematic value
  message: string; // Error message
  severity?: 'ERROR' | 'WARNING';
}

/**
 * Preview data for first 10 rows and validation summary
 */
export interface KekaImportPreview {
  totalRows: number;
  validRows: number;
  errorRows: number;
  errors: KekaImportError[];
  warnings: KekaImportError[];
  preview: KekaEmployee[]; // First 10 valid rows
  detectedColumns: string[]; // Columns found in the file
  unmappedColumns: string[]; // Columns not mapped
}

/**
 * Result of executing the import
 */
export interface KekaImportResult {
  totalProcessed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: KekaImportError[];
  warnings: KekaImportError[];
  importId: string;
  startedAt: string;
  completedAt: string;
  duration: number; // milliseconds
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';
}

/**
 * Upload response from backend
 */
export interface KekaFileUploadResponse {
  fileId: string;
  fileName: string;
  size: number;
  uploadedAt: string;
  detectedColumns: string[];
}

/**
 * Import history entry
 */
export interface KekaImportHistoryEntry {
  id: string;
  fileName: string;
  uploadedAt: string;
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED' | 'IN_PROGRESS';
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  duration?: number;
  uploadedBy: string;
}

export type KekaImportStep = 'upload' | 'mapping' | 'preview' | 'import' | 'result';

/**
 * Preset mappings for common KEKA column names
 */
export const KEKA_COLUMN_PRESETS: Record<string, keyof KekaEmployee> = {
  // ID & Names
  'Employee ID': 'employeeNumber',
  'Employee #': 'employeeNumber',
  'Emp ID': 'employeeNumber',
  'First Name': 'firstName',
  'Last Name': 'lastName',

  // Contact
  'Work Email': 'email',
  'Email': 'email',
  'Personal Email': 'personalEmail',
  'Phone': 'phone',
  'Mobile': 'phone',
  'Phone Number': 'phone',

  // Personal
  'Date of Birth': 'dateOfBirth',
  'DOB': 'dateOfBirth',
  'Gender': 'gender',
  'Blood Group': 'bloodGroup',
  'Marital Status': 'maritalStatus',

  // Employment
  'Department': 'department',
  'Designation': 'designation',
  'Joining Date': 'joiningDate',
  'Date of Joining': 'joiningDate',
  'DOJ': 'joiningDate',
  'Reporting Manager': 'reportingManager',
  'Manager': 'reportingManager',
  'Employment Type': 'employmentType',
  'Status': 'status',
  'Location': 'location',
  'Office Location': 'location',

  // Compensation
  'CTC': 'ctc',
  'Annual Salary': 'ctc',

  // Tax & Bank
  'PAN': 'panNumber',
  'PAN Number': 'panNumber',
  'Aadhaar': 'aadharNumber',
  'Aadhaar Number': 'aadharNumber',
  'Bank Name': 'bankName',
  'Account Number': 'bankAccountNumber',
  'Bank Account': 'bankAccountNumber',
  'IFSC': 'ifscCode',
  'IFSC Code': 'ifscCode',
  'PF Account': 'pfAccountNumber',
  'PF Account Number': 'pfAccountNumber',
  'ESI Number': 'esiNumber',

  // Address
  'Address': 'address',
  'Street Address': 'address',
  'City': 'city',
  'State': 'state',
  'Postal Code': 'postalCode',
  'ZIP': 'postalCode',
  'Country': 'country',

  // Emergency Contact
  'Emergency Contact Name': 'emergencyContactName',
  'Emergency Contact': 'emergencyContactName',
  'Emergency Phone': 'emergencyContactPhone',
  'Emergency Contact Phone': 'emergencyContactPhone',
};
