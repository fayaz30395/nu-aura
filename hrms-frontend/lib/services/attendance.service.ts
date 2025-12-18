import { apiClient } from '../api/client';
import {
  Shift,
  ShiftRequest,
  Holiday,
  HolidayRequest,
  AttendanceRecord,
  CheckInRequest,
  CheckOutRequest,
  RegularizationRequest,
  Page,
  TimeEntry,
} from '../types/attendance';

class AttendanceService {
  // Shift Management
  async createShift(data: ShiftRequest): Promise<Shift> {
    const response = await apiClient.post<Shift>('/shifts', data);
    return response.data;
  }

  async updateShift(id: string, data: ShiftRequest): Promise<Shift> {
    const response = await apiClient.put<Shift>(`/shifts/${id}`, data);
    return response.data;
  }

  async getShiftById(id: string): Promise<Shift> {
    const response = await apiClient.get<Shift>(`/shifts/${id}`);
    return response.data;
  }

  async getAllShifts(page: number = 0, size: number = 20): Promise<Page<Shift>> {
    const response = await apiClient.get<Page<Shift>>('/shifts', {
      params: { page, size },
    });
    return response.data;
  }

  async getActiveShifts(): Promise<Shift[]> {
    const response = await apiClient.get<Shift[]>('/shifts/active');
    return response.data;
  }

  async activateShift(id: string): Promise<Shift> {
    const response = await apiClient.patch<Shift>(`/shifts/${id}/activate`);
    return response.data;
  }

  async deactivateShift(id: string): Promise<Shift> {
    const response = await apiClient.patch<Shift>(`/shifts/${id}/deactivate`);
    return response.data;
  }

  async deleteShift(id: string): Promise<void> {
    await apiClient.delete(`/shifts/${id}`);
  }

  // Holiday Management
  async createHoliday(data: HolidayRequest): Promise<Holiday> {
    const response = await apiClient.post<Holiday>('/holidays', data);
    return response.data;
  }

  async updateHoliday(id: string, data: HolidayRequest): Promise<Holiday> {
    const response = await apiClient.put<Holiday>(`/holidays/${id}`, data);
    return response.data;
  }

  async getHolidayById(id: string): Promise<Holiday> {
    const response = await apiClient.get<Holiday>(`/holidays/${id}`);
    return response.data;
  }

  async getHolidaysByYear(year: number): Promise<Holiday[]> {
    const response = await apiClient.get<Holiday[]>(`/holidays/year/${year}`);
    return response.data;
  }

  async deleteHoliday(id: string): Promise<void> {
    await apiClient.delete(`/holidays/${id}`);
  }

  // Attendance Management
  async checkIn(data: CheckInRequest): Promise<AttendanceRecord> {
    const response = await apiClient.post<AttendanceRecord>('/attendance/check-in', data);
    return response.data;
  }

  async checkOut(data: CheckOutRequest): Promise<AttendanceRecord> {
    const response = await apiClient.post<AttendanceRecord>('/attendance/check-out', data);
    return response.data;
  }

  async getEmployeeAttendance(
    employeeId: string,
    page: number = 0,
    size: number = 50
  ): Promise<Page<AttendanceRecord>> {
    const response = await apiClient.get<Page<AttendanceRecord>>(
      `/attendance/employee/${employeeId}`,
      {
        params: { page, size },
      }
    );
    return response.data;
  }

  async getAttendanceByDateRange(
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<AttendanceRecord[]> {
    const response = await apiClient.get<AttendanceRecord[]>(
      `/attendance/my-attendance`,
      {
        params: { employeeId, startDate, endDate },
      }
    );
    return response.data;
  }

  async getAttendanceByDate(
    date: string,
    page: number = 0,
    size: number = 100
  ): Promise<Page<AttendanceRecord>> {
    const response = await apiClient.get<Page<AttendanceRecord>>(
      `/attendance/date/${date}`,
      {
        params: { page, size },
      }
    );
    return response.data;
  }

  async getPendingRegularizations(
    page: number = 0,
    size: number = 20
  ): Promise<Page<AttendanceRecord>> {
    const response = await apiClient.get<Page<AttendanceRecord>>(
      '/attendance/pending-regularizations',
      {
        params: { page, size },
      }
    );
    return response.data;
  }

  async requestRegularization(id: string, data: RegularizationRequest): Promise<AttendanceRecord> {
    const response = await apiClient.post<AttendanceRecord>(
      `/attendance/${id}/request-regularization`,
      null,
      {
        params: { reason: data.reason },
      }
    );
    return response.data;
  }

  async approveRegularization(id: string, approverId: string): Promise<AttendanceRecord> {
    const response = await apiClient.post<AttendanceRecord>(
      `/attendance/${id}/approve-regularization`,
      null,
      {
        params: { approverId },
      }
    );
    return response.data;
  }

  // Time Entry History (Self-Service)
  async getMyTimeEntries(employeeId: string, date: string): Promise<TimeEntry[]> {
    const response = await apiClient.get<TimeEntry[]>(
      `/attendance/my-time-entries`,
      {
        params: { employeeId, date },
      }
    );
    return response.data;
  }
}

export const attendanceService = new AttendanceService();
