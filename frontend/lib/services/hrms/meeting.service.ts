import {apiClient} from '../../api/client';
import type {
  MeetingActionItemRequest,
  MeetingActionItemResponse,
  MeetingActionItemStatusRequest,
  MeetingAgendaItemRequest,
  MeetingAgendaItemResponse,
  MeetingFeedbackRequest,
  MeetingNotesRequest,
  MeetingRescheduleRequest,
  OneOnOneMeetingEntity,
  OneOnOneMeetingRequest,
  OneOnOneMeetingResponse,
  Page,
} from '../../types/hrms/meeting';

export const meetingService = {
  // One-on-one legacy endpoints
  scheduleOneOnOneMeeting: async (
    data: OneOnOneMeetingEntity
  ): Promise<OneOnOneMeetingEntity> => {
    const response = await apiClient.post<OneOnOneMeetingEntity>('/one-on-one', data);
    return response.data;
  },

  getOneOnOneMeetingsByEmployee: async (
    employeeId: string
  ): Promise<OneOnOneMeetingEntity[]> => {
    const response = await apiClient.get<OneOnOneMeetingEntity[]>(
      `/one-on-one/employee/${employeeId}`
    );
    return response.data;
  },

  // Meeting CRUD
  createMeeting: async (data: OneOnOneMeetingRequest): Promise<OneOnOneMeetingResponse> => {
    const response = await apiClient.post<OneOnOneMeetingResponse>('/meetings', data);
    return response.data;
  },

  updateMeeting: async (
    meetingId: string,
    data: OneOnOneMeetingRequest
  ): Promise<OneOnOneMeetingResponse> => {
    const response = await apiClient.put<OneOnOneMeetingResponse>(`/meetings/${meetingId}`, data);
    return response.data;
  },

  getMeeting: async (meetingId: string): Promise<OneOnOneMeetingResponse> => {
    const response = await apiClient.get<OneOnOneMeetingResponse>(`/meetings/${meetingId}`);
    return response.data;
  },

  getMyMeetings: async (page: number = 0, size: number = 20): Promise<Page<OneOnOneMeetingResponse>> => {
    const response = await apiClient.get<Page<OneOnOneMeetingResponse>>('/meetings', {
      params: {page, size},
    });
    return response.data;
  },

  getUpcomingMeetings: async (): Promise<OneOnOneMeetingResponse[]> => {
    const response = await apiClient.get<OneOnOneMeetingResponse[]>('/meetings/upcoming');
    return response.data;
  },

  getMeetingsAsManager: async (
    page: number = 0,
    size: number = 20
  ): Promise<Page<OneOnOneMeetingResponse>> => {
    const response = await apiClient.get<Page<OneOnOneMeetingResponse>>('/meetings/as-manager', {
      params: {page, size},
    });
    return response.data;
  },

  getMeetingHistory: async (employeeId: string): Promise<OneOnOneMeetingResponse[]> => {
    const response = await apiClient.get<OneOnOneMeetingResponse[]>(
      `/meetings/history/${employeeId}`
    );
    return response.data;
  },

  // Meeting Lifecycle
  startMeeting: async (meetingId: string): Promise<OneOnOneMeetingResponse> => {
    const response = await apiClient.post<OneOnOneMeetingResponse>(`/meetings/${meetingId}/start`);
    return response.data;
  },

  completeMeeting: async (
    meetingId: string,
    summary?: string
  ): Promise<OneOnOneMeetingResponse> => {
    const payload = summary !== undefined ? {summary} : undefined;
    const response = await apiClient.post<OneOnOneMeetingResponse>(
      `/meetings/${meetingId}/complete`,
      payload
    );
    return response.data;
  },

  cancelMeeting: async (meetingId: string, reason: string): Promise<OneOnOneMeetingResponse> => {
    const response = await apiClient.post<OneOnOneMeetingResponse>(`/meetings/${meetingId}/cancel`, {
      reason,
    });
    return response.data;
  },

  rescheduleMeeting: async (
    meetingId: string,
    data: MeetingRescheduleRequest
  ): Promise<OneOnOneMeetingResponse> => {
    const response = await apiClient.post<OneOnOneMeetingResponse>(
      `/meetings/${meetingId}/reschedule`,
      data
    );
    return response.data;
  },

  // Notes & Feedback
  updateNotes: async (
    meetingId: string,
    data: MeetingNotesRequest
  ): Promise<OneOnOneMeetingResponse> => {
    const response = await apiClient.put<OneOnOneMeetingResponse>(`/meetings/${meetingId}/notes`, data);
    return response.data;
  },

  submitFeedback: async (
    meetingId: string,
    data: MeetingFeedbackRequest
  ): Promise<OneOnOneMeetingResponse> => {
    const response = await apiClient.post<OneOnOneMeetingResponse>(
      `/meetings/${meetingId}/feedback`,
      data
    );
    return response.data;
  },

  // Agenda Items
  addAgendaItem: async (
    meetingId: string,
    data: MeetingAgendaItemRequest
  ): Promise<MeetingAgendaItemResponse> => {
    const response = await apiClient.post<MeetingAgendaItemResponse>(
      `/meetings/${meetingId}/agenda`,
      data
    );
    return response.data;
  },

  getAgendaItems: async (meetingId: string): Promise<MeetingAgendaItemResponse[]> => {
    const response = await apiClient.get<MeetingAgendaItemResponse[]>(`/meetings/${meetingId}/agenda`);
    return response.data;
  },

  markAgendaItemDiscussed: async (
    meetingId: string,
    itemId: string,
    notes?: string
  ): Promise<MeetingAgendaItemResponse> => {
    const payload = notes !== undefined ? {notes} : undefined;
    const response = await apiClient.put<MeetingAgendaItemResponse>(
      `/meetings/${meetingId}/agenda/${itemId}/discussed`,
      payload
    );
    return response.data;
  },

  deleteAgendaItem: async (meetingId: string, itemId: string): Promise<void> => {
    await apiClient.delete(`/meetings/${meetingId}/agenda/${itemId}`);
  },

  // Action Items
  createActionItem: async (
    meetingId: string,
    data: MeetingActionItemRequest
  ): Promise<MeetingActionItemResponse> => {
    const response = await apiClient.post<MeetingActionItemResponse>(
      `/meetings/${meetingId}/actions`,
      data
    );
    return response.data;
  },

  getActionItems: async (meetingId: string): Promise<MeetingActionItemResponse[]> => {
    const response = await apiClient.get<MeetingActionItemResponse[]>(`/meetings/${meetingId}/actions`);
    return response.data;
  },

  getPendingActionItems: async (): Promise<MeetingActionItemResponse[]> => {
    const response = await apiClient.get<MeetingActionItemResponse[]>('/meetings/actions/pending');
    return response.data;
  },

  getOverdueActionItems: async (): Promise<MeetingActionItemResponse[]> => {
    const response = await apiClient.get<MeetingActionItemResponse[]>('/meetings/actions/overdue');
    return response.data;
  },

  updateActionItemStatus: async (
    actionId: string,
    data: MeetingActionItemStatusRequest
  ): Promise<MeetingActionItemResponse> => {
    const response = await apiClient.put<MeetingActionItemResponse>(
      `/meetings/actions/${actionId}/status`,
      data
    );
    return response.data;
  },

  // Dashboard
  getMeetingDashboard: async (): Promise<Record<string, unknown>> => {
    const response = await apiClient.get<Record<string, unknown>>('/meetings/dashboard');
    return response.data;
  },

  getManagerDashboard: async (): Promise<Record<string, unknown>> => {
    const response = await apiClient.get<Record<string, unknown>>('/meetings/dashboard/manager');
    return response.data;
  },
};
