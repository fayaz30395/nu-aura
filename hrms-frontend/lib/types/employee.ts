// Employee Management Types

export type Gender =
  | 'MALE'
  | 'FEMALE'
  | 'OTHER'
  | 'PREFER_NOT_TO_SAY';

export type EmploymentType =
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'CONTRACT'
  | 'INTERN'
  | 'CONSULTANT';

export type EmployeeStatus =
  | 'ACTIVE'
  | 'ON_LEAVE'
  | 'ON_NOTICE'
  | 'TERMINATED'
  | 'RESIGNED';

export type EmployeeLevel =
  | 'ENTRY'
  | 'MID'
  | 'SENIOR'
  | 'LEAD'
  | 'MANAGER'
  | 'SENIOR_MANAGER'
  | 'DIRECTOR'
  | 'VP'
  | 'SVP'
  | 'CXO';

export type JobRole =
  // Engineering
  | 'SOFTWARE_ENGINEER'
  | 'FRONTEND_DEVELOPER'
  | 'BACKEND_DEVELOPER'
  | 'FULLSTACK_DEVELOPER'
  | 'DEVOPS_ENGINEER'
  | 'QA_ENGINEER'
  | 'DATA_ENGINEER'
  | 'MOBILE_DEVELOPER'
  | 'SYSTEM_ARCHITECT'
  | 'TECH_LEAD'
  | 'ENGINEERING_MANAGER'
  // Product
  | 'PRODUCT_MANAGER'
  | 'PRODUCT_OWNER'
  | 'PRODUCT_ANALYST'
  // Design
  | 'UI_DESIGNER'
  | 'UX_DESIGNER'
  | 'GRAPHIC_DESIGNER'
  | 'PRODUCT_DESIGNER'
  // Data & Analytics
  | 'DATA_ANALYST'
  | 'DATA_SCIENTIST'
  | 'BUSINESS_ANALYST'
  // Marketing
  | 'MARKETING_MANAGER'
  | 'CONTENT_WRITER'
  | 'SEO_SPECIALIST'
  | 'SOCIAL_MEDIA_MANAGER'
  | 'DIGITAL_MARKETER'
  // Sales
  | 'SALES_REPRESENTATIVE'
  | 'SALES_MANAGER'
  | 'ACCOUNT_MANAGER'
  | 'BUSINESS_DEVELOPMENT'
  // Operations
  | 'OPERATIONS_MANAGER'
  | 'PROJECT_MANAGER'
  | 'SCRUM_MASTER'
  | 'PROGRAM_MANAGER'
  // HR
  | 'HR_MANAGER'
  | 'HR_GENERALIST'
  | 'RECRUITER'
  | 'TALENT_ACQUISITION'
  // Finance
  | 'ACCOUNTANT'
  | 'FINANCIAL_ANALYST'
  | 'FINANCE_MANAGER'
  // Admin & Support
  | 'ADMIN_ASSISTANT'
  | 'OFFICE_MANAGER'
  | 'CUSTOMER_SUPPORT'
  | 'TECH_SUPPORT'
  // Legal
  | 'LEGAL_COUNSEL'
  | 'COMPLIANCE_OFFICER'
  // Other
  | 'CONSULTANT'
  | 'INTERN'
  | 'OTHER';

export interface Employee {
  id: string;
  userId?: string;
  employeeCode: string;
  firstName: string;
  middleName?: string;
  lastName?: string;
  fullName: string;
  workEmail: string;
  personalEmail?: string;
  phoneNumber?: string;
  emergencyContactNumber?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  gender?: Gender;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  joiningDate: string; // YYYY-MM-DD
  confirmationDate?: string; // YYYY-MM-DD
  exitDate?: string; // YYYY-MM-DD
  departmentId?: string;
  departmentName?: string;
  designation?: string;
  managerId?: string;
  managerName?: string;
  employmentType: EmploymentType;
  status: EmployeeStatus;
  bankAccountNumber?: string;
  bankName?: string;
  bankIfscCode?: string;
  taxId?: string;
  createdAt: string;
  updatedAt: string;
  level?: EmployeeLevel;
  jobRole?: JobRole;
  subordinates?: Employee[];
}

export interface CreateEmployeeRequest {
  employeeCode: string;
  firstName: string;
  middleName?: string;
  lastName?: string;
  workEmail: string;
  password?: string;
  personalEmail?: string;
  phoneNumber?: string;
  emergencyContactNumber?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  gender?: Gender;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  joiningDate: string; // YYYY-MM-DD
  confirmationDate?: string; // YYYY-MM-DD
  departmentId?: string;
  designation?: string;
  managerId?: string;
  employmentType: EmploymentType;
  status: EmployeeStatus;
  bankAccountNumber?: string;
  bankName?: string;
  bankIfscCode?: string;
  taxId?: string;
  level?: EmployeeLevel;
  jobRole?: JobRole;
}

export interface UpdateEmployeeRequest {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  personalEmail?: string;
  phoneNumber?: string;
  emergencyContactNumber?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  gender?: Gender;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  confirmationDate?: string; // YYYY-MM-DD
  departmentId?: string;
  designation?: string;
  managerId?: string;
  employmentType?: EmploymentType;
  status?: EmployeeStatus;
  bankAccountNumber?: string;
  bankName?: string;
  bankIfscCode?: string;
  taxId?: string;
  level?: EmployeeLevel;
  jobRole?: JobRole;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// Department Types

export type DepartmentType =
  | 'ENGINEERING'
  | 'PRODUCT'
  | 'DESIGN'
  | 'MARKETING'
  | 'SALES'
  | 'OPERATIONS'
  | 'FINANCE'
  | 'HR'
  | 'LEGAL'
  | 'ADMIN'
  | 'SUPPORT'
  | 'OTHER';

export interface Department {
  id: string;
  code: string;
  name: string;
  description?: string;
  parentDepartmentId?: string;
  parentDepartmentName?: string;
  managerId?: string;
  managerName?: string;
  isActive: boolean;
  location?: string;
  costCenter?: string;
  type?: DepartmentType;
  employeeCount?: number;
  subDepartmentCount?: number;
  createdAt: string;
  updatedAt: string;
  subDepartments?: Department[]; // For hierarchical structure
}

export interface DepartmentRequest {
  code: string;
  name: string;
  description?: string;
  parentDepartmentId?: string;
  managerId?: string;
  isActive?: boolean;
  location?: string;
  costCenter?: string;
  type?: DepartmentType;
}

// Employee Import Types

export type ImportErrorType =
  | 'REQUIRED_FIELD_MISSING'
  | 'INVALID_FORMAT'
  | 'INVALID_VALUE'
  | 'DUPLICATE_IN_FILE'
  | 'DUPLICATE_IN_DATABASE'
  | 'REFERENCE_NOT_FOUND'
  | 'BUSINESS_RULE_VIOLATION';

export interface ImportValidationError {
  rowNumber: number;
  field: string;
  value?: string;
  message: string;
  errorType: ImportErrorType;
}

export interface EmployeeImportRowPreview {
  rowNumber: number;
  employeeCode: string;
  fullName: string;
  workEmail: string;
  designation: string;
  departmentName?: string;
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
  errors: ImportValidationError[];
}

export type ImportStatus =
  | 'COMPLETED'
  | 'PARTIAL_SUCCESS'
  | 'FAILED';

export interface ImportedEmployee {
  rowNumber: number;
  employeeId: string;
  employeeCode: string;
  fullName: string;
  workEmail: string;
}

export interface FailedImport {
  rowNumber: number;
  employeeCode?: string;
  reason: string;
  errors?: ImportValidationError[];
}

export interface EmployeeImportResult {
  importId: string;
  importedAt: string;
  importedBy: string;
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  skippedCount?: number;
  status: ImportStatus;
  importedEmployees?: ImportedEmployee[];
  failedImports?: FailedImport[];
}
