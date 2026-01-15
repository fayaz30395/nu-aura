/**
 * Unit Tests for Home Service
 * Run with: npx vitest run lib/services/home.service.test.ts
 * Or with Jest: npm test -- home.service.test.ts
 */

import { homeService } from './home.service';

// Mock the API client
jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

import { apiClient } from '@/lib/api/client';

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('HomeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUpcomingBirthdays', () => {
    it('should fetch birthdays with default days parameter', async () => {
      const mockBirthdays = [
        {
          employeeId: '1',
          employeeName: 'John Doe',
          department: 'Engineering',
          dateOfBirth: '1990-01-15',
          birthdayDate: '2024-01-15',
          isToday: false,
          daysUntil: 2,
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({ data: mockBirthdays });

      const result = await homeService.getUpcomingBirthdays();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/home/birthdays', { params: { days: 7 } });
      expect(result).toEqual(mockBirthdays);
    });

    it('should fetch birthdays with custom days parameter', async () => {
      const mockBirthdays: any[] = [];
      mockedApiClient.get.mockResolvedValueOnce({ data: mockBirthdays });

      const result = await homeService.getUpcomingBirthdays(14);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/home/birthdays', { params: { days: 14 } });
      expect(result).toEqual([]);
    });

    it('should handle empty response', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: [] });

      const result = await homeService.getUpcomingBirthdays();

      expect(result).toEqual([]);
    });

    it('should propagate API errors', async () => {
      const error = new Error('Network error');
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(homeService.getUpcomingBirthdays()).rejects.toThrow('Network error');
    });
  });

  describe('getUpcomingAnniversaries', () => {
    it('should fetch anniversaries with default days parameter', async () => {
      const mockAnniversaries = [
        {
          employeeId: '1',
          employeeName: 'Jane Smith',
          department: 'HR',
          designation: 'HR Manager',
          joiningDate: '2020-01-15',
          anniversaryDate: '2024-01-15',
          yearsCompleted: 4,
          isToday: false,
          daysUntil: 2,
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({ data: mockAnniversaries });

      const result = await homeService.getUpcomingAnniversaries();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/home/anniversaries', { params: { days: 7 } });
      expect(result).toEqual(mockAnniversaries);
    });

    it('should fetch anniversaries with custom days parameter', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: [] });

      await homeService.getUpcomingAnniversaries(30);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/home/anniversaries', { params: { days: 30 } });
    });
  });

  describe('getNewJoinees', () => {
    it('should fetch new joinees with default days parameter', async () => {
      const mockJoinees = [
        {
          employeeId: '1',
          employeeName: 'New Employee',
          department: 'Engineering',
          designation: 'Software Developer',
          joiningDate: '2024-01-10',
          daysSinceJoining: 5,
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({ data: mockJoinees });

      const result = await homeService.getNewJoinees();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/home/new-joinees', { params: { days: 30 } });
      expect(result).toEqual(mockJoinees);
    });

    it('should fetch new joinees with custom days parameter', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: [] });

      await homeService.getNewJoinees(60);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/home/new-joinees', { params: { days: 60 } });
    });
  });

  describe('getEmployeesOnLeaveToday', () => {
    it('should fetch employees on leave today', async () => {
      const mockOnLeave = [
        {
          employeeId: '1',
          employeeName: 'Leave Employee',
          department: 'Sales',
          leaveType: 'Sick Leave',
          startDate: '2024-01-15',
          endDate: '2024-01-17',
          reason: 'Not feeling well',
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({ data: mockOnLeave });

      const result = await homeService.getEmployeesOnLeaveToday();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/home/on-leave');
      expect(result).toEqual(mockOnLeave);
    });

    it('should handle no employees on leave', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: [] });

      const result = await homeService.getEmployeesOnLeaveToday();

      expect(result).toEqual([]);
    });
  });

  describe('getMyAttendanceToday', () => {
    const employeeId = '123e4567-e89b-12d3-a456-426614174000';

    it('should fetch attendance for NOT_MARKED status', async () => {
      const mockAttendance = {
        employeeId,
        date: '2024-01-15',
        status: 'NOT_MARKED' as const,
        isCheckedIn: false,
        canCheckIn: true,
        canCheckOut: false,
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockAttendance });

      const result = await homeService.getMyAttendanceToday();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/home/attendance/me');
      expect(result).toEqual(mockAttendance);
      expect(result.canCheckIn).toBe(true);
      expect(result.canCheckOut).toBe(false);
    });

    it('should fetch attendance for PRESENT status', async () => {
      const mockAttendance = {
        attendanceId: 'att-123',
        employeeId,
        date: '2024-01-15',
        status: 'PRESENT' as const,
        checkInTime: '2024-01-15T09:00:00',
        isCheckedIn: true,
        canCheckIn: false,
        canCheckOut: true,
        source: 'WEB',
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockAttendance });

      const result = await homeService.getMyAttendanceToday();

      expect(result.status).toBe('PRESENT');
      expect(result.isCheckedIn).toBe(true);
      expect(result.canCheckOut).toBe(true);
    });

    it('should fetch attendance for HOLIDAY status', async () => {
      const mockAttendance = {
        employeeId,
        date: '2024-01-26',
        status: 'HOLIDAY' as const,
        isCheckedIn: false,
        canCheckIn: false,
        canCheckOut: false,
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockAttendance });

      const result = await homeService.getMyAttendanceToday();

      expect(result.status).toBe('HOLIDAY');
      expect(result.canCheckIn).toBe(false);
    });

    it('should fetch attendance for WEEKLY_OFF status', async () => {
      const mockAttendance = {
        employeeId,
        date: '2024-01-20',
        status: 'WEEKLY_OFF' as const,
        isCheckedIn: false,
        canCheckIn: true,
        canCheckOut: false,
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockAttendance });

      const result = await homeService.getMyAttendanceToday();

      expect(result.status).toBe('WEEKLY_OFF');
    });

    it('should fetch attendance for ON_LEAVE status', async () => {
      const mockAttendance = {
        employeeId,
        date: '2024-01-15',
        status: 'ON_LEAVE' as const,
        isCheckedIn: false,
        canCheckIn: false,
        canCheckOut: false,
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockAttendance });

      const result = await homeService.getMyAttendanceToday();

      expect(result.status).toBe('ON_LEAVE');
      expect(result.canCheckIn).toBe(false);
    });
  });

  describe('getUpcomingHolidays', () => {
    it('should fetch holidays with default days parameter', async () => {
      const mockHolidays = [
        {
          id: '1',
          name: 'Republic Day',
          date: '2024-01-26',
          type: 'NATIONAL',
          description: 'National holiday',
          isOptional: false,
          daysUntil: 10,
          dayOfWeek: 'Friday',
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({ data: mockHolidays });

      const result = await homeService.getUpcomingHolidays();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/home/holidays', { params: { days: 30 } });
      expect(result).toEqual(mockHolidays);
    });

    it('should fetch holidays with custom days parameter', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: [] });

      await homeService.getUpcomingHolidays(90);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/home/holidays', { params: { days: 90 } });
    });

    it('should handle multiple holidays', async () => {
      const mockHolidays = [
        { id: '1', name: 'Republic Day', date: '2024-01-26', type: 'NATIONAL', isOptional: false, daysUntil: 10, dayOfWeek: 'Friday' },
        { id: '2', name: 'Holi', date: '2024-03-25', type: 'NATIONAL', isOptional: false, daysUntil: 68, dayOfWeek: 'Monday' },
        { id: '3', name: 'Good Friday', date: '2024-03-29', type: 'OPTIONAL', isOptional: true, daysUntil: 72, dayOfWeek: 'Friday' },
      ];

      mockedApiClient.get.mockResolvedValueOnce({ data: mockHolidays });

      const result = await homeService.getUpcomingHolidays(90);

      expect(result).toHaveLength(3);
      expect(result[2].isOptional).toBe(true);
    });
  });

  describe('Response Type Validation', () => {
    it('BirthdayResponse should have all required fields', async () => {
      const mockBirthday = {
        employeeId: '1',
        employeeName: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        department: 'Engineering',
        dateOfBirth: '1990-05-15',
        birthdayDate: '2024-05-15',
        isToday: true,
        daysUntil: 0,
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: [mockBirthday] });

      const result = await homeService.getUpcomingBirthdays();

      expect(result[0]).toHaveProperty('employeeId');
      expect(result[0]).toHaveProperty('employeeName');
      expect(result[0]).toHaveProperty('dateOfBirth');
      expect(result[0]).toHaveProperty('birthdayDate');
      expect(result[0]).toHaveProperty('isToday');
      expect(result[0]).toHaveProperty('daysUntil');
    });

    it('WorkAnniversaryResponse should have all required fields', async () => {
      const mockAnniversary = {
        employeeId: '1',
        employeeName: 'Test User',
        department: 'HR',
        designation: 'Manager',
        joiningDate: '2019-01-15',
        anniversaryDate: '2024-01-15',
        yearsCompleted: 5,
        isToday: false,
        daysUntil: 3,
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: [mockAnniversary] });

      const result = await homeService.getUpcomingAnniversaries();

      expect(result[0]).toHaveProperty('yearsCompleted');
      expect(result[0]).toHaveProperty('joiningDate');
      expect(result[0]).toHaveProperty('anniversaryDate');
    });

    it('AttendanceTodayResponse should have correct status enum values', async () => {
      const validStatuses = ['PRESENT', 'ABSENT', 'ON_LEAVE', 'HOLIDAY', 'WEEKLY_OFF', 'NOT_MARKED', 'HALF_DAY', 'INCOMPLETE'];

      for (const status of validStatuses) {
        const mockAttendance = {
          employeeId: '1',
          date: '2024-01-15',
          status,
          isCheckedIn: false,
          canCheckIn: true,
          canCheckOut: false,
        };

        mockedApiClient.get.mockResolvedValueOnce({ data: mockAttendance });

        const result = await homeService.getMyAttendanceToday();
        expect(validStatuses).toContain(result.status);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 unauthorized error', async () => {
      const error = { response: { status: 401, data: { message: 'Unauthorized' } } };
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(homeService.getUpcomingBirthdays()).rejects.toEqual(error);
    });

    it('should handle 500 server error', async () => {
      const error = { response: { status: 500, data: { message: 'Internal Server Error' } } };
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(homeService.getEmployeesOnLeaveToday()).rejects.toEqual(error);
    });

    it('should handle network timeout', async () => {
      const error = { code: 'ECONNABORTED', message: 'timeout of 5000ms exceeded' };
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(homeService.getUpcomingHolidays()).rejects.toEqual(error);
    });
  });
});
