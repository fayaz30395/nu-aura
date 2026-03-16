// Entity types that support custom fields
export type EntityType =
  | 'EMPLOYEE'
  | 'DEPARTMENT'
  | 'PROJECT'
  | 'LEAVE_REQUEST'
  | 'EXPENSE'
  | 'ASSET'
  | 'JOB_OPENING'
  | 'CANDIDATE';

// EntityType as a const object for runtime use
export const EntityType = {
  EMPLOYEE: 'EMPLOYEE' as const,
  DEPARTMENT: 'DEPARTMENT' as const,
  PROJECT: 'PROJECT' as const,
  LEAVE_REQUEST: 'LEAVE_REQUEST' as const,
  EXPENSE: 'EXPENSE' as const,
  ASSET: 'ASSET' as const,
  JOB_OPENING: 'JOB_OPENING' as const,
  CANDIDATE: 'CANDIDATE' as const,
};

// Supported field types
export type FieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'DATE'
  | 'DATETIME'
  | 'DROPDOWN'
  | 'MULTI_SELECT'
  | 'CHECKBOX'
  | 'EMAIL'
  | 'PHONE'
  | 'URL'
  | 'FILE'
  | 'CURRENCY'
  | 'PERCENTAGE';

// Field visibility levels
export type FieldVisibility =
  | 'ALL'
  | 'SELF'
  | 'MANAGER'
  | 'HR'
  | 'ADMIN_HR'
  | 'ADMIN_ONLY';

// Validation rules for fields
export interface ValidationRules {
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
}

// Custom field definition
export interface CustomFieldDefinition {
  id: string;
  fieldCode: string;
  fieldName: string;
  description?: string;
  entityType: EntityType;
  fieldType: FieldType;
  fieldGroup?: string;
  displayOrder: number;
  isRequired: boolean;
  isActive: boolean;
  isSearchable: boolean;
  showInList: boolean;
  defaultValue?: string;
  placeholder?: string;
  options?: string[];
  validationRules?: ValidationRules;
  allowedFileTypes?: string[];
  maxFileSize?: number;
  viewVisibility: FieldVisibility;
  editVisibility: FieldVisibility;
  createdAt: string;
  updatedAt: string;
}

// Request to create/update a field definition
export interface CustomFieldDefinitionRequest {
  fieldCode: string;
  fieldName: string;
  description?: string;
  entityType: EntityType;
  fieldType: FieldType;
  fieldGroup?: string;
  displayOrder?: number;
  isRequired?: boolean;
  isSearchable?: boolean;
  showInList?: boolean;
  defaultValue?: string;
  placeholder?: string;
  options?: string[];
  validationRules?: ValidationRules;
  allowedFileTypes?: string[];
  maxFileSize?: number;
  viewVisibility?: FieldVisibility;
  editVisibility?: FieldVisibility;
}

// Custom field value
export interface CustomFieldValue {
  id: string;
  fieldDefinitionId: string;
  fieldCode: string;
  fieldName: string;
  fieldType: FieldType;
  fieldGroup?: string;
  entityType: EntityType;
  entityId: string;
  value: string;
  rawValue: unknown;
  fileValue?: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
  currencyCode?: string;
  createdAt: string;
  updatedAt: string;
}

// Request to set a field value
export interface CustomFieldValueRequest {
  fieldDefinitionId: string;
  value?: string;
  fileValue?: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
  currencyCode?: string;
}

// Request to set multiple field values at once
export interface BulkCustomFieldValueRequest {
  entityType: EntityType;
  entityId: string;
  values: CustomFieldValueRequest[];
}

// Paginated response
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

// Field type display info
export const FIELD_TYPE_INFO: Record<FieldType, { label: string; description: string }> = {
  TEXT: { label: 'Text', description: 'Single line text input' },
  TEXTAREA: { label: 'Text Area', description: 'Multi-line text input' },
  NUMBER: { label: 'Number', description: 'Numeric value' },
  DATE: { label: 'Date', description: 'Date picker' },
  DATETIME: { label: 'Date & Time', description: 'Date and time picker' },
  DROPDOWN: { label: 'Dropdown', description: 'Single select from options' },
  MULTI_SELECT: { label: 'Multi-Select', description: 'Multiple select from options' },
  CHECKBOX: { label: 'Checkbox', description: 'Yes/No toggle' },
  EMAIL: { label: 'Email', description: 'Email address with validation' },
  PHONE: { label: 'Phone', description: 'Phone number' },
  URL: { label: 'URL', description: 'Web address' },
  FILE: { label: 'File', description: 'File attachment' },
  CURRENCY: { label: 'Currency', description: 'Money value' },
  PERCENTAGE: { label: 'Percentage', description: 'Percentage value' },
};

// Entity type display info
export const ENTITY_TYPE_INFO: Record<EntityType, { label: string; description: string }> = {
  EMPLOYEE: { label: 'Employee', description: 'Employee profiles and records' },
  DEPARTMENT: { label: 'Department', description: 'Department information' },
  PROJECT: { label: 'Project', description: 'Project details' },
  LEAVE_REQUEST: { label: 'Leave Request', description: 'Leave request forms' },
  EXPENSE: { label: 'Expense', description: 'Expense claims' },
  ASSET: { label: 'Asset', description: 'Company assets' },
  JOB_OPENING: { label: 'Job Opening', description: 'Recruitment job postings' },
  CANDIDATE: { label: 'Candidate', description: 'Job candidates' },
};

// Visibility display info
export const VISIBILITY_INFO: Record<FieldVisibility, { label: string; description: string }> = {
  ALL: { label: 'Everyone', description: 'Visible to all users' },
  SELF: { label: 'Self Only', description: 'Only the employee themselves' },
  MANAGER: { label: 'Manager+', description: 'Manager and above' },
  HR: { label: 'HR Team', description: 'HR team only' },
  ADMIN_HR: { label: 'Admin & HR', description: 'Admins and HR only' },
  ADMIN_ONLY: { label: 'Admin Only', description: 'System admins only' },
};
