import { apiClient } from '../api/client';

export interface TicketSLA {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  categoryId?: string;
  priority?: string;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  escalationAfterMinutes?: number;
  escalationTo?: string;
  secondEscalationMinutes?: number;
  secondEscalationTo?: string;
  isBusinessHoursOnly: boolean;
  businessStartHour: number;
  businessEndHour: number;
  workingDays: string;
  isActive: boolean;
  applyToAllCategories: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface TicketEscalation {
  id: string;
  tenantId: string;
  ticketId: string;
  escalationLevel: 'FIRST' | 'SECOND' | 'THIRD';
  escalationReason: 'SLA_BREACH' | 'NO_RESPONSE' | 'CUSTOMER_REQUEST' | 'COMPLEXITY' | 'MANUAL';
  escalatedFrom?: string;
  escalatedTo: string;
  escalatedAt: string;
  isAutoEscalated: boolean;
  notes?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

export interface TicketMetrics {
  id: string;
  ticketId: string;
  slaId?: string;
  firstResponseAt?: string;
  firstResponseMinutes?: number;
  firstResponseSlaBreached: boolean;
  resolutionAt?: string;
  resolutionMinutes?: number;
  resolutionSlaBreached: boolean;
  totalHandleTimeMinutes: number;
  totalWaitTimeMinutes: number;
  reopenCount: number;
  reassignmentCount: number;
  escalationCount: number;
  commentCount: number;
  csatRating?: number;
  csatFeedback?: string;
  firstContactResolution: boolean;
  slaMet: boolean;
}

export interface SLADashboard {
  averageCSAT: number;
  firstContactResolutions: number;
  slaMetCount: number;
  slaBreachedCount: number;
  slaComplianceRate: number;
  averageFirstResponseMinutes: number;
  averageResolutionMinutes: number;
}

class HelpdeskSLAService {
  async createSLA(data: Partial<TicketSLA>): Promise<TicketSLA> {
    const response = await apiClient.post<TicketSLA>('/helpdesk/sla', data);
    return response.data;
  }

  async getSLAs(page: number = 0, size: number = 20): Promise<{ content: TicketSLA[], totalElements: number }> {
    const response = await apiClient.get<{ content: TicketSLA[], totalElements: number }>('/helpdesk/sla', { params: { page, size } });
    return response.data;
  }

  async getActiveSLAs(): Promise<TicketSLA[]> {
    const response = await apiClient.get<TicketSLA[]>('/helpdesk/sla/active');
    return response.data;
  }

  async getSLA(id: string): Promise<TicketSLA> {
    const response = await apiClient.get<TicketSLA>(`/helpdesk/sla/${id}`);
    return response.data;
  }

  async updateSLA(id: string, data: Partial<TicketSLA>): Promise<TicketSLA> {
    const response = await apiClient.put<TicketSLA>(`/helpdesk/sla/${id}`, data);
    return response.data;
  }

  async deleteSLA(id: string): Promise<void> {
    await apiClient.delete(`/helpdesk/sla/${id}`);
  }

  async escalateTicket(ticketId: string, escalatedTo: string, level: string, reason: string, notes?: string): Promise<TicketEscalation> {
    const response = await apiClient.post<TicketEscalation>(`/helpdesk/sla/escalate/${ticketId}`, null, {
      params: { escalatedTo, level, reason, notes }
    });
    return response.data;
  }

  async getTicketEscalations(ticketId: string): Promise<TicketEscalation[]> {
    const response = await apiClient.get<TicketEscalation[]>(`/helpdesk/sla/escalations/ticket/${ticketId}`);
    return response.data;
  }

  async getMyPendingEscalations(): Promise<TicketEscalation[]> {
    const response = await apiClient.get<TicketEscalation[]>('/helpdesk/sla/escalations/pending');
    return response.data;
  }

  async acknowledgeEscalation(escalationId: string): Promise<void> {
    await apiClient.post(`/helpdesk/sla/escalations/${escalationId}/acknowledge`);
  }

  async getTicketMetrics(ticketId: string): Promise<TicketMetrics> {
    const response = await apiClient.get<TicketMetrics>(`/helpdesk/sla/metrics/${ticketId}`);
    return response.data;
  }

  async submitCSAT(ticketId: string, rating: number, feedback?: string): Promise<void> {
    await apiClient.post(`/helpdesk/sla/metrics/${ticketId}/csat`, null, {
      params: { rating, feedback }
    });
  }

  async getDashboard(): Promise<SLADashboard> {
    const response = await apiClient.get<SLADashboard>('/helpdesk/sla/dashboard');
    return response.data;
  }
}

export const helpdeskSLAService = new HelpdeskSLAService();
