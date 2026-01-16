import { apiClient } from '../api/client';
import {
  Shift,
  ShiftRequest,
  Holiday,
  HolidayRequest,
  AttendanceRecord,
  AttendanceStatus,
  CheckInRequest,
  CheckOutRequest,
  RegularizationRequest,
  Page,
  TimeEntry,
} from '../types/attendance';

// Backend AttendanceResponse structure
interface AttendanceDayResponse {
  id: string;
  employeeId: string;
  attendanceDate: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  checkInSource?: string | null;
  checkOutSource?: string | null;
  status?: string | null;
  workDurationMinutes?: number;
  breakDurationMinutes?: number;
  overtimeMinutes?: number;
  isLate?: boolean;
  lateByMinutes?: number;
  isEarlyDeparture?: boolean;
  earlyDepartureMinutes?: number;
  regularizationRequested?: boolean;
  regularizationApproved?: boolean;
  regularizationReason?: string | null;
}

const mapAttendanceStatus = (status?: string | null): AttendanceStatus => {
  switch (status) {
    case 'PRESENT':
      return 'PRESENT';
    case 'REGULARIZED':
      return 'PRESENT';
    case 'INCOMPLETE':
      return 'PENDING_REGULARIZATION';
    case 'ABSENT':
      return 'ABSENT';
    case 'HALF_DAY':
      return 'HALF_DAY';
    case 'ON_LEAVE':
      return 'ON_LEAVE';
    case 'WEEKLY_OFF':
      return 'WEEKLY_OFF';
    case 'HOLIDAY':
      return 'HOLIDAY';
    default:
      return 'ABSENT';
  }
};

const mapAttendanceDay = (day: AttendanceDayResponse): AttendanceRecord => {
  return {
    id: day.id,
    tenantId: '',
    employeeId: day.employeeId,
    attendanceDate: day.attendanceDate,
    checkInTime: day.checkInTime || undefined,
    checkOutTime: day.checkOutTime || undefined,
    status: mapAttendanceStatus(day.status),
    workDurationMinutes: day.workDurationMinutes,
    breakDurationMinutes: day.breakDurationMinutes,
    overtimeMinutes: day.overtimeMinutes,
    isLate: day.isLate,
    lateByMinutes: day.lateByMinutes,
    isEarlyDeparture: day.isEarlyDeparture,
    earlyDepartureMinutes: day.earlyDepartureMinutes,
    regularizationRequested: day.regularizationRequested || false,
    regularizationApproved: day.regularizationApproved || false,
    regularizationReason: day.regularizationReason || undefined,
    createdAt: day.checkInTime || new Date().toISOString(),
    updatedAt: day.checkOutTime || day.checkInTime || new Date().toISOString(),
  } as AttendanceRecord;
};

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
    const response = await apiClient.post<AttendanceDayResponse>('/attendance/check-in', data);
    return mapAttendanceDay(response.data);
  }

  async checkOut(data: CheckOutRequest): Promise<AttendanceRecord> {
    const response = await apiClient.post<AttendanceDayResponse>('/attendance/check-out', data);
    return mapAttendanceDay(response.data);
  }

  async getEmployeeAttendance(
    employeeId: string,
    page: number = 0,
    size: number = 50
  ): Promise<Page<AttendanceRecord>> {
    const response = await apiClient.get<Page<AttendanceDayResponse>>(
      `/attendance/employee/${employeeId}`,
      {
        params: { page, size },
      }
    );
    return {
      ...response.data,
      content: (response.data.content || []).map(mapAttendanceDay),
    };
  }

  async getAttendanceByDateRange(
    startDate: string,
    endDate: string
  ): Promise<AttendanceRecord[]> {
    const response = await apiClient.get<AttendanceDayResponse[]>(
      `/attendance/my-attendance`,
      {
        params: { startDate, endDate },
      }
    );
    return (response.data || []).map(mapAttendanceDay);
  }

  async getAttendanceByDate(
    date: string,
    page: number = 0,
    size: number = 100
  ): Promise<Page<AttendanceRecord>> {
    const response = await apiClient.get<Page<AttendanceDayResponse>>(
      `/attendance/date/${date}`,
      {
        params: { page, size },
      }
    );
    return {
      ...response.data,
      content: (response.data.content || []).map(mapAttendanceDay),
    };
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

  async approveRegularization(id: string): Promise<AttendanceRecord> {
    const response = await apiClient.post<AttendanceRecord>(
      `/attendance/${id}/approve-regularization`
    );
    return response.data;
  }

  // Time Entry History (Self-Service)
  async getMyTimeEntries(date: string): Promise<TimeEntry[]> {
    const response = await apiClient.get<TimeEntry[]>(
      `/attendance/my-time-entries`,
      {
        params: { date },
      }
    );
    return response.data;
  }
}

export const attendanceService = new AttendanceService();
