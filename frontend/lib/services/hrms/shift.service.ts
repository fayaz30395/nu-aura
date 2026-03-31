import { apiClient } from '../../api/client';
import {
  ShiftDefinition,
  ShiftDefinitionRequest,
  ShiftPattern,
  ShiftPatternRequest,
  ShiftAssignment,
  ShiftAssignmentRequest,
  ScheduleEntry,
  GenerateScheduleRequest,
  ShiftSwapRequest,
  SubmitSwapRequest,
  ShiftRuleViolation,
  Page,
} from '../../types/hrms/shift';

class ShiftService {
  // ========== Shift Definitions ==========

  async createShift(data: ShiftDefinitionRequest): Promise<ShiftDefinition> {
    const response = await apiClient.post<ShiftDefinition>('/shifts', data);
    return response.data;
  }

  async updateShift(id: string, data: ShiftDefinitionRequest): Promise<ShiftDefinition> {
    const response = await apiClient.put<ShiftDefinition>(`/shifts/${id}`, data);
    return response.data;
  }

  async getShiftById(id: string): Promise<ShiftDefinition> {
    const response = await apiClient.get<ShiftDefinition>(`/shifts/${id}`);
    return response.data;
  }

  async getAllShifts(page: number = 0, size: number = 20): Promise<Page<ShiftDefinition>> {
    const response = await apiClient.get<Page<ShiftDefinition>>('/shifts', {
      params: { page, size },
    });
    return response.data;
  }

  async getActiveShifts(): Promise<ShiftDefinition[]> {
    const response = await apiClient.get<ShiftDefinition[]>('/shifts/active');
    return response.data;
  }

  async deleteShift(id: string): Promise<void> {
    await apiClient.delete(`/shifts/${id}`);
  }

  async activateShift(id: string): Promise<ShiftDefinition> {
    const response = await apiClient.patch<ShiftDefinition>(`/shifts/${id}/activate`);
    return response.data;
  }

  async deactivateShift(id: string): Promise<ShiftDefinition> {
    const response = await apiClient.patch<ShiftDefinition>(`/shifts/${id}/deactivate`);
    return response.data;
  }

  // ========== Shift Patterns ==========

  async createPattern(data: ShiftPatternRequest): Promise<ShiftPattern> {
    const response = await apiClient.post<ShiftPattern>('/shifts/patterns', data);
    return response.data;
  }

  async updatePattern(id: string, data: ShiftPatternRequest): Promise<ShiftPattern> {
    const response = await apiClient.put<ShiftPattern>(`/shifts/patterns/${id}`, data);
    return response.data;
  }

  async getPatternById(id: string): Promise<ShiftPattern> {
    const response = await apiClient.get<ShiftPattern>(`/shifts/patterns/${id}`);
    return response.data;
  }

  async getAllPatterns(page: number = 0, size: number = 20): Promise<Page<ShiftPattern>> {
    const response = await apiClient.get<Page<ShiftPattern>>('/shifts/patterns', {
      params: { page, size },
    });
    return response.data;
  }

  async getActivePatterns(): Promise<ShiftPattern[]> {
    const response = await apiClient.get<ShiftPattern[]>('/shifts/patterns/active');
    return response.data;
  }

  async deletePattern(id: string): Promise<void> {
    await apiClient.delete(`/shifts/patterns/${id}`);
  }

  // ========== Shift Assignments ==========

  async assignShift(data: ShiftAssignmentRequest): Promise<ShiftAssignment> {
    const response = await apiClient.post<ShiftAssignment>('/shifts/assignments', data);
    return response.data;
  }

  async getEmployeeAssignments(
    employeeId: string,
    page: number = 0,
    size: number = 20
  ): Promise<Page<ShiftAssignment>> {
    const response = await apiClient.get<Page<ShiftAssignment>>(
      `/shifts/assignments/employee/${employeeId}`,
      { params: { page, size } }
    );
    return response.data;
  }

  async getAssignmentsForDate(date: string): Promise<ShiftAssignment[]> {
    const response = await apiClient.get<ShiftAssignment[]>(`/shifts/assignments/date/${date}`);
    return response.data;
  }

  async cancelAssignment(id: string): Promise<void> {
    await apiClient.delete(`/shifts/assignments/${id}`);
  }

  // ========== Schedule ==========

  async generateSchedule(data: GenerateScheduleRequest): Promise<ScheduleEntry[]> {
    const response = await apiClient.post<ScheduleEntry[]>('/shifts/generate-schedule', data);
    return response.data;
  }

  async getEmployeeSchedule(
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<ScheduleEntry[]> {
    const response = await apiClient.get<ScheduleEntry[]>('/shifts/schedule', {
      params: { employeeId, startDate, endDate },
    });
    return response.data;
  }

  async getTeamSchedule(
    managerId: string,
    startDate: string,
    endDate: string
  ): Promise<ScheduleEntry[]> {
    const response = await apiClient.get<ScheduleEntry[]>('/shifts/team-schedule', {
      params: { managerId, startDate, endDate },
    });
    return response.data;
  }

  // ========== Shift Rule Validation ==========

  async validateShiftRules(
    employeeId: string,
    shiftId: string,
    date: string
  ): Promise<ShiftRuleViolation[]> {
    const response = await apiClient.get<ShiftRuleViolation[]>('/shifts/validate-rules', {
      params: { employeeId, shiftId, date },
    });
    return response.data;
  }

  // ========== Shift Swap ==========

  async submitSwapRequest(data: SubmitSwapRequest): Promise<ShiftSwapRequest> {
    const response = await apiClient.post<ShiftSwapRequest>('/shift-swaps', data);
    return response.data;
  }

  async acceptSwapRequest(requestId: string, employeeId: string): Promise<ShiftSwapRequest> {
    const response = await apiClient.post<ShiftSwapRequest>(
      `/shift-swaps/${requestId}/accept`,
      { employeeId }
    );
    return response.data;
  }

  async declineSwapRequest(requestId: string, employeeId: string): Promise<ShiftSwapRequest> {
    const response = await apiClient.post<ShiftSwapRequest>(
      `/shift-swaps/${requestId}/decline`,
      { employeeId }
    );
    return response.data;
  }

  async cancelSwapRequest(requestId: string, employeeId: string): Promise<ShiftSwapRequest> {
    const response = await apiClient.post<ShiftSwapRequest>(
      `/shift-swaps/${requestId}/cancel`,
      { employeeId }
    );
    return response.data;
  }

  async approveSwapRequest(requestId: string, managerId: string): Promise<ShiftSwapRequest> {
    const response = await apiClient.post<ShiftSwapRequest>(
      `/shift-swaps/${requestId}/approve`,
      { managerId }
    );
    return response.data;
  }

  async rejectSwapRequest(
    requestId: string,
    managerId: string,
    reason?: string
  ): Promise<ShiftSwapRequest> {
    const response = await apiClient.post<ShiftSwapRequest>(
      `/shift-swaps/${requestId}/reject`,
      { managerId, reason }
    );
    return response.data;
  }

  async getMySwapRequests(
    employeeId: string,
    page: number = 0,
    size: number = 20
  ): Promise<Page<ShiftSwapRequest>> {
    const response = await apiClient.get<Page<ShiftSwapRequest>>(
      `/shift-swaps/my-requests/${employeeId}`,
      { params: { page, size } }
    );
    return response.data;
  }

  async getIncomingSwapRequests(employeeId: string): Promise<ShiftSwapRequest[]> {
    const response = await apiClient.get<ShiftSwapRequest[]>(
      `/shift-swaps/incoming/${employeeId}`
    );
    return response.data;
  }

  async getPendingApprovalSwaps(): Promise<ShiftSwapRequest[]> {
    const response = await apiClient.get<ShiftSwapRequest[]>('/shift-swaps/pending-approval');
    return response.data;
  }

  async getAllSwapRequests(
    page: number = 0,
    size: number = 20
  ): Promise<Page<ShiftSwapRequest>> {
    const response = await apiClient.get<Page<ShiftSwapRequest>>('/shift-swaps', {
      params: { page, size },
    });
    return response.data;
  }
}

export const shiftService = new ShiftService();
