import { apiClient } from '@/lib/api/client';

export interface BirthdayResponse {
  employeeId: string;
  employeeName: string;
  avatarUrl?: string;
  department?: string;
  dateOfBirth: string;
  birthdayDate: string;
  isToday: boolean;
  daysUntil: number;
}

export interface WorkAnniversaryResponse {
  employeeId: string;
  employeeName: string;
  avatarUrl?: string;
  department?: string;
  designation?: string;
  joiningDate: string;
  anniversaryDate: string;
  yearsCompleted: number;
  isToday: boolean;
  daysUntil: number;
}

export interface NewJoineeResponse {
  employeeId: string;
  employeeName: string;
  avatarUrl?: string;
  department?: string;
  designation?: string;
  joiningDate: string;
  daysSinceJoining: number;
}

export interface OnLeaveEmployeeResponse {
  employeeId: string;
  employeeName: string;
  avatarUrl?: string;
  department?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface AttendanceTodayResponse {
  attendanceId?: string;
  employeeId: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'ON_LEAVE' | 'HOLIDAY' | 'WEEKLY_OFF' | 'NOT_MARKED' | 'HALF_DAY' | 'INCOMPLETE';
  checkInTime?: string;
  checkOutTime?: string;
  totalWorkHours?: number;
  isCheckedIn: boolean;
  canCheckIn: boolean;
  canCheckOut: boolean;
  source?: string;
  location?: string;
}

export interface UpcomingHolidayResponse {
  id: string;
  name: string;
  date: string;
  type: string;
  description?: string;
  isOptional: boolean;
  daysUntil: number;
  dayOfWeek: string;
}

class HomeService {
  /**
   * Get upcoming birthdays for the next N days
   */
  async getUpcomingBirthdays(days: number = 7): Promise<BirthdayResponse[]> {
    const response = await apiClient.get<BirthdayResponse[]>('/home/birthdays', {
      params: { days },
    });
    return response.data;
  }

  /**
   * Get upcoming work anniversaries for the next N days
   */
  async getUpcomingAnniversaries(days: number = 7): Promise<WorkAnniversaryResponse[]> {
    const response = await apiClient.get<WorkAnniversaryResponse[]>('/home/anniversaries', {
      params: { days },
    });
    return response.data;
  }

  /**
   * Get new joinees from the last N days
   */
  async getNewJoinees(days: number = 30): Promise<NewJoineeResponse[]> {
    const response = await apiClient.get<NewJoineeResponse[]>('/home/new-joinees', {
      params: { days },
    });
    return response.data;
  }

  /**
   * Get employees on leave today
   */
  async getEmployeesOnLeaveToday(): Promise<OnLeaveEmployeeResponse[]> {
    const response = await apiClient.get<OnLeaveEmployeeResponse[]>('/home/on-leave');
    return response.data;
  }

  /**
   * Get today's attendance status for an employee
   */
  async getAttendanceToday(employeeId: string): Promise<AttendanceTodayResponse> {
    const response = await apiClient.get<AttendanceTodayResponse>(`/home/attendance/${employeeId}`);
    return response.data;
  }

  /**
   * Get upcoming holidays for the next N days
   */
  async getUpcomingHolidays(days: number = 30): Promise<UpcomingHolidayResponse[]> {
    const response = await apiClient.get<UpcomingHolidayResponse[]>('/home/holidays', {
      params: { days },
    });
    return response.data;
  }
}

export const homeService = new HomeService();
