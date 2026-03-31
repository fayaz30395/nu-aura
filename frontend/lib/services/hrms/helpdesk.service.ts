import { apiClient } from '../../api/client';

// ─── Enums ───────────────────────────────────────────────────────────────────

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_RESPONSE' | 'RESOLVED' | 'CLOSED';

// ─── Request / Response Types ────────────────────────────────────────────────

export interface TicketRequest {
  employeeId: string;
  categoryId?: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  status?: TicketStatus;
  assignedTo?: string;
  assignedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  resolutionNotes?: string;
  dueDate?: string;
  tags?: string;
  attachmentUrls?: string;
}

export interface TicketResponse {
  id: string;
  tenantId: string;
  ticketNumber: string;
  employeeId: string;
  employeeName: string;
  categoryId: string;
  categoryName: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo: string;
  assignedToName: string;
  assignedAt: string;
  resolvedAt: string;
  closedAt: string;
  resolutionNotes: string;
  dueDate: string;
  tags: string;
  attachmentUrls: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketCommentRequest {
  ticketId: string;
  commenterId: string;
  comment: string;
  isInternal?: boolean;
  attachmentUrls?: string;
}

export interface TicketCommentResponse {
  id: string;
  tenantId: string;
  ticketId: string;
  ticketNumber: string;
  commenterId: string;
  commenterName: string;
  comment: string;
  isInternal: boolean;
  attachmentUrls: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketCategoryResponse {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  defaultAssigneeId: string;
  defaultAssigneeName: string;
  slaHours: number;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// ─── Service ─────────────────────────────────────────────────────────────────

class HelpdeskService {
  // ========== Tickets ==========

  async createTicket(data: TicketRequest): Promise<TicketResponse> {
    const response = await apiClient.post<TicketResponse>('/helpdesk/tickets', data);
    return response.data;
  }

  async updateTicket(id: string, data: TicketRequest): Promise<TicketResponse> {
    const response = await apiClient.put<TicketResponse>(`/helpdesk/tickets/${id}`, data);
    return response.data;
  }

  async updateTicketStatus(id: string, status: TicketStatus): Promise<TicketResponse> {
    const response = await apiClient.patch<TicketResponse>(`/helpdesk/tickets/${id}/status`, null, {
      params: { status },
    });
    return response.data;
  }

  async assignTicket(id: string, assigneeId: string): Promise<TicketResponse> {
    const response = await apiClient.patch<TicketResponse>(`/helpdesk/tickets/${id}/assign`, null, {
      params: { assigneeId },
    });
    return response.data;
  }

  async getTicketById(id: string): Promise<TicketResponse> {
    const response = await apiClient.get<TicketResponse>(`/helpdesk/tickets/${id}`);
    return response.data;
  }

  async getTicketByNumber(ticketNumber: string): Promise<TicketResponse> {
    const response = await apiClient.get<TicketResponse>(`/helpdesk/tickets/number/${ticketNumber}`);
    return response.data;
  }

  async getAllTickets(page: number = 0, size: number = 20): Promise<PageResponse<TicketResponse>> {
    const response = await apiClient.get<PageResponse<TicketResponse>>('/helpdesk/tickets', {
      params: { page, size, sort: 'createdAt,desc' },
    });
    return response.data;
  }

  async getTicketsByEmployee(employeeId: string): Promise<TicketResponse[]> {
    const response = await apiClient.get<TicketResponse[]>(`/helpdesk/tickets/employee/${employeeId}`);
    return response.data;
  }

  async getTicketsByAssignee(assigneeId: string): Promise<TicketResponse[]> {
    const response = await apiClient.get<TicketResponse[]>(`/helpdesk/tickets/assignee/${assigneeId}`);
    return response.data;
  }

  async getTicketsByStatus(status: TicketStatus): Promise<TicketResponse[]> {
    const response = await apiClient.get<TicketResponse[]>(`/helpdesk/tickets/status/${status}`);
    return response.data;
  }

  async getTicketsByCategory(categoryId: string): Promise<TicketResponse[]> {
    const response = await apiClient.get<TicketResponse[]>(`/helpdesk/tickets/category/${categoryId}`);
    return response.data;
  }

  async deleteTicket(id: string): Promise<void> {
    await apiClient.delete(`/helpdesk/tickets/${id}`);
  }

  // ========== Comments ==========

  async addComment(data: TicketCommentRequest): Promise<TicketCommentResponse> {
    const response = await apiClient.post<TicketCommentResponse>('/helpdesk/comments', data);
    return response.data;
  }

  async updateComment(id: string, data: TicketCommentRequest): Promise<TicketCommentResponse> {
    const response = await apiClient.put<TicketCommentResponse>(`/helpdesk/comments/${id}`, data);
    return response.data;
  }

  async getCommentsByTicket(ticketId: string): Promise<TicketCommentResponse[]> {
    const response = await apiClient.get<TicketCommentResponse[]>(`/helpdesk/comments/ticket/${ticketId}`);
    return response.data;
  }

  async deleteComment(id: string): Promise<void> {
    await apiClient.delete(`/helpdesk/comments/${id}`);
  }

  // ========== Categories ==========

  async getCategories(): Promise<TicketCategoryResponse[]> {
    const response = await apiClient.get<TicketCategoryResponse[]>('/helpdesk/categories');
    return response.data;
  }

  async getActiveCategories(): Promise<TicketCategoryResponse[]> {
    const response = await apiClient.get<TicketCategoryResponse[]>('/helpdesk/categories/active');
    return response.data;
  }
}

export const helpdeskService = new HelpdeskService();
