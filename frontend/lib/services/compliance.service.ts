import { apiClient } from '../api/client';
import type {
  AuditLog,
  ComplianceAlert,
  ComplianceAlertAssignRequest,
  ComplianceAlertStatusRequest,
  ComplianceChecklist,
  CompliancePolicy,
  Page,
  PolicyAcknowledgment,
  PolicyAcknowledgmentRequest,
  PolicyCategory,
} from '../types/compliance';

export const complianceService = {
  // Policy Endpoints
  createPolicy: async (data: CompliancePolicy): Promise<CompliancePolicy> => {
    const response = await apiClient.post<CompliancePolicy>('/compliance/policies', data);
    return response.data;
  },

  updatePolicy: async (id: string, data: CompliancePolicy): Promise<CompliancePolicy> => {
    const response = await apiClient.put<CompliancePolicy>(`/compliance/policies/${id}`, data);
    return response.data;
  },

  publishPolicy: async (id: string): Promise<CompliancePolicy> => {
    const response = await apiClient.post<CompliancePolicy>(`/compliance/policies/${id}/publish`);
    return response.data;
  },

  archivePolicy: async (id: string): Promise<CompliancePolicy> => {
    const response = await apiClient.post<CompliancePolicy>(`/compliance/policies/${id}/archive`);
    return response.data;
  },

  createNewVersion: async (id: string): Promise<CompliancePolicy> => {
    const response = await apiClient.post<CompliancePolicy>(`/compliance/policies/${id}/new-version`);
    return response.data;
  },

  getAllPolicies: async (
    page: number = 0,
    size: number = 20
  ): Promise<Page<CompliancePolicy>> => {
    const response = await apiClient.get<Page<CompliancePolicy>>('/compliance/policies', {
      params: { page, size },
    });
    return response.data;
  },

  getPolicy: async (id: string): Promise<CompliancePolicy> => {
    const response = await apiClient.get<CompliancePolicy>(`/compliance/policies/${id}`);
    return response.data;
  },

  getActivePolicies: async (): Promise<CompliancePolicy[]> => {
    const response = await apiClient.get<CompliancePolicy[]>('/compliance/policies/active');
    return response.data;
  },

  getPoliciesByCategory: async (category: PolicyCategory): Promise<CompliancePolicy[]> => {
    const response = await apiClient.get<CompliancePolicy[]>(
      `/compliance/policies/category/${category}`
    );
    return response.data;
  },

  // Policy Acknowledgment Endpoints
  acknowledgePolicy: async (
    policyId: string,
    data: PolicyAcknowledgmentRequest
  ): Promise<PolicyAcknowledgment> => {
    const response = await apiClient.post<PolicyAcknowledgment>(
      `/compliance/policies/${policyId}/acknowledge`,
      data
    );
    return response.data;
  },

  getEmployeeAcknowledgments: async (employeeId: string): Promise<PolicyAcknowledgment[]> => {
    const response = await apiClient.get<PolicyAcknowledgment[]>(
      `/compliance/acknowledgments/employee/${employeeId}`
    );
    return response.data;
  },

  getPolicyAcknowledgments: async (policyId: string): Promise<PolicyAcknowledgment[]> => {
    const response = await apiClient.get<PolicyAcknowledgment[]>(
      `/compliance/policies/${policyId}/acknowledgments`
    );
    return response.data;
  },

  getPendingAcknowledgments: async (employeeId: string): Promise<CompliancePolicy[]> => {
    const response = await apiClient.get<CompliancePolicy[]>(
      `/compliance/acknowledgments/pending/${employeeId}`
    );
    return response.data;
  },

  // Checklist Endpoints
  createChecklist: async (data: ComplianceChecklist): Promise<ComplianceChecklist> => {
    const response = await apiClient.post<ComplianceChecklist>('/compliance/checklists', data);
    return response.data;
  },

  updateChecklist: async (id: string, data: ComplianceChecklist): Promise<ComplianceChecklist> => {
    const response = await apiClient.put<ComplianceChecklist>(`/compliance/checklists/${id}`, data);
    return response.data;
  },

  completeChecklist: async (id: string): Promise<ComplianceChecklist> => {
    const response = await apiClient.post<ComplianceChecklist>(`/compliance/checklists/${id}/complete`);
    return response.data;
  },

  getAllChecklists: async (
    page: number = 0,
    size: number = 20
  ): Promise<Page<ComplianceChecklist>> => {
    const response = await apiClient.get<Page<ComplianceChecklist>>('/compliance/checklists', {
      params: { page, size },
    });
    return response.data;
  },

  getActiveChecklists: async (): Promise<ComplianceChecklist[]> => {
    const response = await apiClient.get<ComplianceChecklist[]>('/compliance/checklists/active');
    return response.data;
  },

  getMyChecklists: async (): Promise<ComplianceChecklist[]> => {
    const response = await apiClient.get<ComplianceChecklist[]>('/compliance/checklists/my');
    return response.data;
  },

  getOverdueChecklists: async (): Promise<ComplianceChecklist[]> => {
    const response = await apiClient.get<ComplianceChecklist[]>('/compliance/checklists/overdue');
    return response.data;
  },

  // Audit Log Endpoints
  getAuditLogs: async (page: number = 0, size: number = 20): Promise<Page<AuditLog>> => {
    const response = await apiClient.get<Page<AuditLog>>('/compliance/audit-logs', {
      params: { page, size },
    });
    return response.data;
  },

  getEntityAuditHistory: async (entityType: string, entityId: string): Promise<AuditLog[]> => {
    const response = await apiClient.get<AuditLog[]>(
      `/compliance/audit-logs/entity/${entityType}/${entityId}`
    );
    return response.data;
  },

  getUserAuditHistory: async (
    userId: string,
    page: number = 0,
    size: number = 20
  ): Promise<Page<AuditLog>> => {
    const response = await apiClient.get<Page<AuditLog>>(`/compliance/audit-logs/user/${userId}`,
      {
        params: { page, size },
      }
    );
    return response.data;
  },

  getAuditLogsByDateRange: async (
    startDate: string,
    endDate: string,
    page: number = 0,
    size: number = 20
  ): Promise<Page<AuditLog>> => {
    const response = await apiClient.get<Page<AuditLog>>('/compliance/audit-logs/date-range', {
      params: { startDate, endDate, page, size },
    });
    return response.data;
  },

  // Alert Endpoints
  createAlert: async (data: ComplianceAlert): Promise<ComplianceAlert> => {
    const response = await apiClient.post<ComplianceAlert>('/compliance/alerts', data);
    return response.data;
  },

  updateAlertStatus: async (
    id: string,
    data: ComplianceAlertStatusRequest
  ): Promise<ComplianceAlert> => {
    const response = await apiClient.put<ComplianceAlert>(`/compliance/alerts/${id}/status`, data);
    return response.data;
  },

  assignAlert: async (
    id: string,
    data: ComplianceAlertAssignRequest
  ): Promise<ComplianceAlert> => {
    const response = await apiClient.put<ComplianceAlert>(`/compliance/alerts/${id}/assign`, data);
    return response.data;
  },

  escalateAlert: async (id: string): Promise<ComplianceAlert> => {
    const response = await apiClient.post<ComplianceAlert>(`/compliance/alerts/${id}/escalate`);
    return response.data;
  },

  getAllAlerts: async (
    page: number = 0,
    size: number = 20
  ): Promise<Page<ComplianceAlert>> => {
    const response = await apiClient.get<Page<ComplianceAlert>>('/compliance/alerts', {
      params: { page, size },
    });
    return response.data;
  },

  getActiveAlerts: async (): Promise<ComplianceAlert[]> => {
    const response = await apiClient.get<ComplianceAlert[]>('/compliance/alerts/active');
    return response.data;
  },

  getMyAlerts: async (): Promise<ComplianceAlert[]> => {
    const response = await apiClient.get<ComplianceAlert[]>('/compliance/alerts/my');
    return response.data;
  },

  getCriticalAlerts: async (): Promise<ComplianceAlert[]> => {
    const response = await apiClient.get<ComplianceAlert[]>('/compliance/alerts/critical');
    return response.data;
  },

  // Dashboard
  getComplianceDashboard: async (): Promise<Record<string, unknown>> => {
    const response = await apiClient.get<Record<string, unknown>>('/compliance/dashboard');
    return response.data;
  },
};
