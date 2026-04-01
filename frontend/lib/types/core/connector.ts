export type ConnectorType = 'NOTIFICATION' | 'E_SIGNATURE' | 'PAYMENT' | 'STORAGE' | 'CALENDAR' | 'AUTH' | 'ANALYTICS';
export type ConnectorStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR';
export type EventLogStatus = 'SUCCESS' | 'FAILED' | 'SKIPPED';

export interface ConnectorCapabilities {
  supportedEvents: string[];
  supportsWebhookCallback: boolean;
  supportsActionButtons: boolean;
  supportsBatchOperations: boolean;
  configSchema: ConnectorConfigField[];
}

export interface ConnectorConfigField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'textarea' | 'select' | 'boolean';
  required: boolean;
  placeholder?: string;
  description?: string;
  options?: { label: string; value: string }[];
}

export interface ConnectorInfo {
  connectorId: string;
  name: string;
  description: string;
  type: ConnectorType;
  iconUrl?: string;
  capabilities: ConnectorCapabilities;
}

export interface ConnectorConfig {
  id: string;
  tenantId: string;
  connectorId: string;
  displayName: string;
  status: ConnectorStatus;
  eventSubscriptions: string[];
  lastHealthCheckAt?: string;
  lastErrorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs: number;
  diagnostics?: Record<string, unknown>;
}

export interface IntegrationEventLog {
  id: string;
  connectorId: string;
  eventType: string;
  entityType?: string;
  entityId?: string;
  status: EventLogStatus;
  errorMessage?: string;
  durationMs?: number;
  createdAt: string;
}

export interface DocuSignEnvelope {
  id: string;
  envelopeId: string;
  entityType: string;
  entityId: string;
  status: 'CREATED' | 'SENT' | 'DELIVERED' | 'COMPLETED' | 'DECLINED' | 'VOIDED' | 'ERROR';
  signedDocumentUrl?: string;
  sentAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface DocuSignTemplateMapping {
  id: string;
  documentType: string;
  docuSignTemplateId: string;
  description?: string;
  isActive: boolean;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

// Form submission types
export interface ConnectorConfigRequest {
  displayName: string;
  configData: Record<string, unknown>;
  eventSubscriptions?: string[];
}

export interface TemplateMappingRequest {
  documentType: string;
  docuSignTemplateId: string;
  description?: string;
  isActive: boolean;
}
