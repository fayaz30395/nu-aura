import { apiClient } from '../api/client';
import type {
  ApprovalActionRequest,
  ApprovalDelegateRequest,
  ApprovalDelegateResponse,
  Page,
  WorkflowDefinitionRequest,
  WorkflowDefinitionResponse,
  WorkflowEntityType,
  WorkflowExecutionRequest,
  WorkflowExecutionResponse,
} from '../types/workflow';

export const workflowService = {
  // Workflow Definition Endpoints
  createWorkflowDefinition: async (
    data: WorkflowDefinitionRequest
  ): Promise<WorkflowDefinitionResponse> => {
    const response = await apiClient.post<WorkflowDefinitionResponse>('/workflow/definitions', data);
    return response.data;
  },

  getWorkflowDefinition: async (id: string): Promise<WorkflowDefinitionResponse> => {
    const response = await apiClient.get<WorkflowDefinitionResponse>(`/workflow/definitions/${id}`);
    return response.data;
  },

  getAllWorkflowDefinitions: async (
    page: number = 0,
    size: number = 20
  ): Promise<Page<WorkflowDefinitionResponse>> => {
    const response = await apiClient.get<Page<WorkflowDefinitionResponse>>('/workflow/definitions', {
      params: { page, size },
    });
    return response.data;
  },

  getWorkflowsByEntityType: async (
    entityType: WorkflowEntityType
  ): Promise<WorkflowDefinitionResponse[]> => {
    const response = await apiClient.get<WorkflowDefinitionResponse[]>(
      `/workflow/definitions/entity-type/${entityType}`
    );
    return response.data;
  },

  updateWorkflowDefinition: async (
    id: string,
    data: WorkflowDefinitionRequest
  ): Promise<WorkflowDefinitionResponse> => {
    const response = await apiClient.put<WorkflowDefinitionResponse>(`/workflow/definitions/${id}`, data);
    return response.data;
  },

  deactivateWorkflowDefinition: async (id: string): Promise<void> => {
    await apiClient.delete(`/workflow/definitions/${id}`);
  },

  // Workflow Execution Endpoints
  startWorkflow: async (data: WorkflowExecutionRequest): Promise<WorkflowExecutionResponse> => {
    const response = await apiClient.post<WorkflowExecutionResponse>('/workflow/executions', data);
    return response.data;
  },

  getWorkflowExecution: async (id: string): Promise<WorkflowExecutionResponse> => {
    const response = await apiClient.get<WorkflowExecutionResponse>(`/workflow/executions/${id}`);
    return response.data;
  },

  getWorkflowByReferenceNumber: async (referenceNumber: string): Promise<WorkflowExecutionResponse> => {
    const response = await apiClient.get<WorkflowExecutionResponse>(
      `/workflow/executions/reference/${referenceNumber}`
    );
    return response.data;
  },

  processApprovalAction: async (
    id: string,
    data: ApprovalActionRequest
  ): Promise<WorkflowExecutionResponse> => {
    const response = await apiClient.post<WorkflowExecutionResponse>(
      `/workflow/executions/${id}/action`,
      data
    );
    return response.data;
  },

  approveExecution: async (id: string, comments?: string): Promise<WorkflowExecutionResponse> => {
    const payload = comments !== undefined ? { comments } : undefined;
    const response = await apiClient.post<WorkflowExecutionResponse>(
      `/workflow/executions/${id}/approve`,
      payload
    );
    return response.data;
  },

  rejectExecution: async (id: string, comments?: string): Promise<WorkflowExecutionResponse> => {
    const response = await apiClient.post<WorkflowExecutionResponse>(
      `/workflow/executions/${id}/reject`,
      { comments }
    );
    return response.data;
  },

  returnForModification: async (id: string, comments?: string): Promise<WorkflowExecutionResponse> => {
    const response = await apiClient.post<WorkflowExecutionResponse>(
      `/workflow/executions/${id}/return`,
      { comments }
    );
    return response.data;
  },

  cancelWorkflow: async (id: string, reason: string): Promise<void> => {
    await apiClient.post(`/workflow/executions/${id}/cancel`, { reason });
  },

  getMyPendingApprovals: async (): Promise<WorkflowExecutionResponse[]> => {
    const response = await apiClient.get<WorkflowExecutionResponse[]>('/workflow/my-pending-approvals');
    return response.data;
  },

  /**
   * Paginated approval inbox with server-side filters.
   */
  getApprovalInbox: async (params: {
    status?: string;
    module?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
    page?: number;
    size?: number;
  }): Promise<Page<WorkflowExecutionResponse>> => {
    const response = await apiClient.get<Page<WorkflowExecutionResponse>>('/workflow/inbox', {
      params: {
        status: params.status ?? 'PENDING',
        module: params.module,
        fromDate: params.fromDate ? `${params.fromDate}T00:00:00` : undefined,
        toDate: params.toDate ? `${params.toDate}T23:59:59` : undefined,
        search: params.search,
        page: params.page ?? 0,
        size: params.size ?? 20,
      },
    });
    return response.data;
  },

  /**
   * Returns inbox summary counts: pending, approvedToday, rejectedToday.
   */
  getInboxCounts: async (): Promise<{ pending: number; approvedToday: number; rejectedToday: number }> => {
    const response = await apiClient.get<{ pending: number; approvedToday: number; rejectedToday: number }>(
      '/workflow/inbox/count'
    );
    return response.data;
  },

  getMyRequests: async (): Promise<WorkflowExecutionResponse[]> => {
    const response = await apiClient.get<WorkflowExecutionResponse[]>('/workflow/my-requests');
    return response.data;
  },

  getPendingApprovalsForUser: async (userId: string): Promise<WorkflowExecutionResponse[]> => {
    const response = await apiClient.get<WorkflowExecutionResponse[]>(
      `/workflow/pending-approvals/user/${userId}`
    );
    return response.data;
  },

  // Delegation Endpoints
  createDelegation: async (data: ApprovalDelegateRequest): Promise<ApprovalDelegateResponse> => {
    const response = await apiClient.post<ApprovalDelegateResponse>('/workflow/delegations', data);
    return response.data;
  },

  getMyDelegations: async (): Promise<ApprovalDelegateResponse[]> => {
    const response = await apiClient.get<ApprovalDelegateResponse[]>('/workflow/delegations/my');
    return response.data;
  },

  getDelegationsToMe: async (): Promise<ApprovalDelegateResponse[]> => {
    const response = await apiClient.get<ApprovalDelegateResponse[]>('/workflow/delegations/to-me');
    return response.data;
  },

  revokeDelegation: async (id: string, reason: string): Promise<void> => {
    await apiClient.post(`/workflow/delegations/${id}/revoke`, { reason });
  },

  // Dashboard & Analytics
  getWorkflowDashboard: async (): Promise<Record<string, unknown>> => {
    const response = await apiClient.get<Record<string, unknown>>('/workflow/dashboard');
    return response.data;
  },

  getOverdueExecutions: async (): Promise<WorkflowExecutionResponse[]> => {
    const response = await apiClient.get<WorkflowExecutionResponse[]>('/workflow/executions/overdue');
    return response.data;
  },

  getExecutionsDueForEscalation: async (): Promise<WorkflowExecutionResponse[]> => {
    const response = await apiClient.get<WorkflowExecutionResponse[]>(
      '/workflow/executions/escalation-due'
    );
    return response.data;
  },
};
