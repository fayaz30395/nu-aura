import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { attendanceService } from './attendance.service';
import { apiClient } from '@/lib/api/client';

// Types for test data
interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  active: boolean;
}

interface Holiday {
  id: string;
  name: string;
  holidayDate: string;
  type: string;
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  attendanceDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: string;
  workDurationMinutes?: number;
  isLate?: boolean;
  lateByMinutes?: number;
  isEarlyDeparture?: boolean;
  earlyDepartureMinutes?: number;
  regularizationRequested?: boolean;
  regularizationApproved?: boolean;
}

interface TimeEntry {
  id: string;
  employeeId: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  duration?: number;
}

interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

const mockApiClient = apiClient as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('AttendanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Shift Management
  describe('Shift Management', () => {
    describe('createShift', () => {
      it('should create a shift with valid data', async () => {
        const mockShift: Shift = {
          id: 'shift-123',
          name: 'Morning Shift',
          startTime: '09:00',
          endTime: '17:00',
          active: true,
        };

        mockApiClient.post.mockResolvedValue({ data: mockShift });

        const result = await attendanceService.createShift({
          name: 'Morning Shift',
          startTime: '09:00',
          endTime: '17:00',
        } as any);

        expect(mockApiClient.post).toHaveBeenCalledWith('/shifts', {
          name: 'Morning Shift',
          startTime: '09:00',
          endTime: '17:00',
        });
        expect(result.name).toBe('Morning Shift');
      });

      it('should handle errors when creating shift', async () => {
        mockApiClient.post.mockRejectedValue(new Error('API Error'));

        await expect(
          attendanceService.createShift({
            name: 'Morning Shift',
          } as any)
        ).rejects.toThrow('API Error');
      });
    });

    describe('updateShift', () => {
      it('should update a shift successfully', async () => {
        const mockUpdatedShift: Shift = {
          id: 'shift-123',
          name: 'Evening Shift',
          startTime: '17:00',
          endTime: '22:00',
          active: true,
        };

        mockApiClient.put.mockResolvedValue({ data: mockUpdatedShift });

        const result = await attendanceService.updateShift('shift-123', {
          name: 'Evening Shift',
          startTime: '17:00',
          endTime: '22:00',
        } as any);

        expect(mockApiClient.put).toHaveBeenCalledWith('/shifts/shift-123', {
          name: 'Evening Shift',
          startTime: '17:00',
          endTime: '22:00',
        });
        expect(result.name).toBe('Evening Shift');
      });

      it('should handle errors when updating shift', async () => {
        mockApiClient.put.mockRejectedValue(new Error('Update failed'));

        await expect(attendanceService.updateShift('shift-123', {} as any)).rejects.toThrow(
          'Update failed'
        );
      });
    });

    describe('getShiftById', () => {
      it('should retrieve a shift by ID', async () => {
        const mockShift: Shift = {
          id: 'shift-123',
          name: 'Morning Shift',
          startTime: '09:00',
          endTime: '17:00',
          active: true,
        };

        mockApiClient.get.mockResolvedValue({ data: mockShift });

        const result = await attendanceService.getShiftById('shift-123');

        expect(mockApiClient.get).toHaveBeenCalledWith('/shifts/shift-123');
        expect(result).toEqual(mockShift);
      });

      it('should handle 404 errors for missing shift', async () => {
        mockApiClient.get.mockRejectedValue(new Error('Not Found'));

        await expect(attendanceService.getShiftById('invalid-id')).rejects.toThrow('Not Found');
      });
    });

    describe('getAllShifts', () => {
      it('should retrieve all shifts with default pagination', async () => {
        const mockPage: Page<Shift> = {
          content: [
            {
              id: 'shift-1',
              name: 'Morning Shift',
              startTime: '09:00',
              endTime: '17:00',
              active: true,
            },
          ],
          totalElements: 1,
          totalPages: 1,
          currentPage: 0,
          pageSize: 20,
        };

        mockApiClient.get.mockResolvedValue({ data: mockPage });

        const result = await attendanceService.getAllShifts();

        expect(mockApiClient.get).toHaveBeenCalledWith('/shifts', {
          params: { page: 0, size: 20 },
        });
        expect(result.content).toHaveLength(1);
      });

      it('should retrieve shifts with custom pagination', async () => {
        const mockPage: Page<Shift> = {
          content: [],
          totalElements: 0,
          totalPages: 0,
          currentPage: 2,
          pageSize: 50,
        };

        mockApiClient.get.mockResolvedValue({ data: mockPage });

        await attendanceService.getAllShifts(2, 50);

        expect(mockApiClient.get).toHaveBeenCalledWith('/shifts', {
          params: { page: 2, size: 50 },
        });
      });
    });

    describe('getActiveShifts', () => {
      it('should retrieve active shifts', async () => {
        const mockShifts: Shift[] = [
          {
            id: 'shift-1',
            name: 'Morning Shift',
            startTime: '09:00',
            endTime: '17:00',
            active: true,
          },
          {
            id: 'shift-2',
            name: 'Evening Shift',
            startTime: '17:00',
            endTime: '22:00',
            active: true,
          },
        ];

        mockApiClient.get.mockResolvedValue({ data: mockShifts });

        const result = await attendanceService.getActiveShifts();

        expect(mockApiClient.get).toHaveBeenCalledWith('/shifts/active');
        expect(result).toHaveLength(2);
      });

      it('should handle errors when fetching active shifts', async () => {
        mockApiClient.get.mockRejectedValue(new Error('Fetch failed'));

        await expect(attendanceService.getActiveShifts()).rejects.toThrow('Fetch failed');
      });
    });

    describe('activateShift', () => {
      it('should activate a shift', async () => {
        const mockShift: Shift = {
          id: 'shift-123',
          name: 'Morning Shift',
          startTime: '09:00',
          endTime: '17:00',
          active: true,
        };

        mockApiClient.patch.mockResolvedValue({ data: mockShift });

        const result = await attendanceService.activateShift('shift-123');

        expect(mockApiClient.patch).toHaveBeenCalledWith('/shifts/shift-123/activate');
        expect(result.active).toBe(true);
      });

      it('should handle activation errors', async () => {
        mockApiClient.patch.mockRejectedValue(new Error('Activation failed'));

        await expect(attendanceService.activateShift('shift-123')).rejects.toThrow(
          'Activation failed'
        );
      });
    });

    describe('deactivateShift', () => {
      it('should deactivate a shift', async () => {
        const mockShift: Shift = {
          id: 'shift-123',
          name: 'Morning Shift',
          startTime: '09:00',
          endTime: '17:00',
          active: false,
        };

        mockApiClient.patch.mockResolvedValue({ data: mockShift });

        const result = await attendanceService.deactivateShift('shift-123');

        expect(mockApiClient.patch).toHaveBeenCalledWith('/shifts/shift-123/deactivate');
        expect(result.active).toBe(false);
      });

      it('should handle deactivation errors', async () => {
        mockApiClient.patch.mockRejectedValue(new Error('Deactivation failed'));

        await expect(attendanceService.deactivateShift('shift-123')).rejects.toThrow(
          'Deactivation failed'
        );
      });
    });

    describe('deleteShift', () => {
      it('should delete a shift', async () => {
        mockApiClient.delete.mockResolvedValue({});

        await attendanceService.deleteShift('shift-123');

        expect(mockApiClient.delete).toHaveBeenCalledWith('/shifts/shift-123');
      });

      it('should handle deletion errors', async () => {
        mockApiClient.delete.mockRejectedValue(new Error('Deletion failed'));

        await expect(attendanceService.deleteShift('shift-123')).rejects.toThrow(
          'Deletion failed'
        );
      });
    });
  });

  // Holiday Management
  describe('Holiday Management', () => {
    describe('createHoliday', () => {
      it('should create a holiday', async () => {
        const mockHoliday: Holiday = {
          id: 'hol-123',
          name: 'Christmas',
          holidayDate: '2026-12-25',
          type: 'NATIONAL',
        };

        mockApiClient.post.mockResolvedValue({ data: mockHoliday });

        const result = await attendanceService.createHoliday({
          name: 'Christmas',
          holidayDate: '2026-12-25',
          type: 'NATIONAL',
        } as any);

        expect(mockApiClient.post).toHaveBeenCalledWith('/holidays', {
          name: 'Christmas',
          holidayDate: '2026-12-25',
          type: 'NATIONAL',
        });
        expect(result.name).toBe('Christmas');
      });

      it('should handle errors when creating holiday', async () => {
        mockApiClient.post.mockRejectedValue(new Error('Creation failed'));

        await expect(
          attendanceService.createHoliday({
            name: 'Christmas',
          } as any)
        ).rejects.toThrow('Creation failed');
      });
    });

    describe('updateHoliday', () => {
      it('should update a holiday', async () => {
        const mockHoliday: Holiday = {
          id: 'hol-123',
          name: 'Christmas Day',
          holidayDate: '2026-12-25',
          type: 'NATIONAL',
        };

        mockApiClient.put.mockResolvedValue({ data: mockHoliday });

        const result = await attendanceService.updateHoliday('hol-123', {
          name: 'Christmas Day',
        } as any);

        expect(mockApiClient.put).toHaveBeenCalledWith('/holidays/hol-123', {
          name: 'Christmas Day',
        });
        expect(result.name).toBe('Christmas Day');
      });

      it('should handle errors when updating holiday', async () => {
        mockApiClient.put.mockRejectedValue(new Error('Update failed'));

        await expect(attendanceService.updateHoliday('hol-123', {} as any)).rejects.toThrow(
          'Update failed'
        );
      });
    });

    describe('getHolidayById', () => {
      it('should retrieve a holiday by ID', async () => {
        const mockHoliday: Holiday = {
          id: 'hol-123',
          name: 'Christmas',
          holidayDate: '2026-12-25',
          type: 'NATIONAL',
        };

        mockApiClient.get.mockResolvedValue({ data: mockHoliday });

        const result = await attendanceService.getHolidayById('hol-123');

        expect(mockApiClient.get).toHaveBeenCalledWith('/holidays/hol-123');
        expect(result).toEqual(mockHoliday);
      });

      it('should handle errors when fetching holiday', async () => {
        mockApiClient.get.mockRejectedValue(new Error('Not found'));

        await expect(attendanceService.getHolidayById('invalid-id')).rejects.toThrow('Not found');
      });
    });

    describe('getHolidaysByYear', () => {
      it('should retrieve holidays by year', async () => {
        const mockHolidays: Holiday[] = [
          {
            id: 'hol-1',
            name: 'New Year',
            holidayDate: '2026-01-01',
            type: 'NATIONAL',
          },
          {
            id: 'hol-2',
            name: 'Christmas',
            holidayDate: '2026-12-25',
            type: 'NATIONAL',
          },
        ];

        mockApiClient.get.mockResolvedValue({ data: mockHolidays });

        const result = await attendanceService.getHolidaysByYear(2026);

        expect(mockApiClient.get).toHaveBeenCalledWith('/holidays/year/2026');
        expect(result).toHaveLength(2);
      });

      it('should handle errors when fetching holidays by year', async () => {
        mockApiClient.get.mockRejectedValue(new Error('Fetch failed'));

        await expect(attendanceService.getHolidaysByYear(2026)).rejects.toThrow('Fetch failed');
      });
    });

    describe('deleteHoliday', () => {
      it('should delete a holiday', async () => {
        mockApiClient.delete.mockResolvedValue({});

        await attendanceService.deleteHoliday('hol-123');

        expect(mockApiClient.delete).toHaveBeenCalledWith('/holidays/hol-123');
      });

      it('should handle deletion errors', async () => {
        mockApiClient.delete.mockRejectedValue(new Error('Deletion failed'));

        await expect(attendanceService.deleteHoliday('hol-123')).rejects.toThrow(
          'Deletion failed'
        );
      });
    });
  });

  // Attendance Management
  describe('Attendance Management', () => {
    describe('checkIn', () => {
      it('should check in an employee', async () => {
        const mockAttendance: AttendanceRecord = {
          id: 'att-123',
          employeeId: 'emp-123',
          attendanceDate: '2026-03-18',
          checkInTime: '09:00',
          status: 'PRESENT',
          isLate: false,
        };

        mockApiClient.post.mockResolvedValue({ data: mockAttendance });

        const result = await attendanceService.checkIn({
          employeeId: 'emp-123',
          source: 'WEB',
        } as any);

        expect(mockApiClient.post).toHaveBeenCalledWith('/attendance/check-in', {
          employeeId: 'emp-123',
          source: 'WEB',
        });
        expect(result.employeeId).toBe('emp-123');
      });

      it('should handle errors when checking in', async () => {
        mockApiClient.post.mockRejectedValue(new Error('Check-in failed'));

        await expect(
          attendanceService.checkIn({
            employeeId: 'emp-123',
          } as any)
        ).rejects.toThrow('Check-in failed');
      });
    });

    describe('checkOut', () => {
      it('should check out an employee', async () => {
        const mockAttendance: AttendanceRecord = {
          id: 'att-123',
          employeeId: 'emp-123',
          attendanceDate: '2026-03-18',
          checkInTime: '09:00',
          checkOutTime: '17:30',
          status: 'PRESENT',
          workDurationMinutes: 510,
          isEarlyDeparture: true,
          earlyDepartureMinutes: 30,
        };

        mockApiClient.post.mockResolvedValue({ data: mockAttendance });

        const result = await attendanceService.checkOut({
          employeeId: 'emp-123',
          source: 'WEB',
        } as any);

        expect(mockApiClient.post).toHaveBeenCalledWith('/attendance/check-out', {
          employeeId: 'emp-123',
          source: 'WEB',
        });
        expect(result.checkOutTime).toBe('17:30');
      });

      it('should handle errors when checking out', async () => {
        mockApiClient.post.mockRejectedValue(new Error('Check-out failed'));

        await expect(
          attendanceService.checkOut({
            employeeId: 'emp-123',
          } as any)
        ).rejects.toThrow('Check-out failed');
      });
    });

    describe('getEmployeeAttendance', () => {
      it('should retrieve employee attendance records', async () => {
        const mockPage: Page<AttendanceRecord> = {
          content: [
            {
              id: 'att-1',
              employeeId: 'emp-123',
              attendanceDate: '2026-03-18',
              checkInTime: '09:00',
              checkOutTime: '17:00',
              status: 'PRESENT',
              workDurationMinutes: 480,
              isLate: false,
            },
          ],
          totalElements: 1,
          totalPages: 1,
          currentPage: 0,
          pageSize: 50,
        };

        mockApiClient.get.mockResolvedValue({ data: mockPage });

        const result = await attendanceService.getEmployeeAttendance('emp-123');

        expect(mockApiClient.get).toHaveBeenCalledWith('/attendance/employee/emp-123', {
          params: { page: 0, size: 50 },
        });
        expect(result.content).toHaveLength(1);
      });

      it('should handle pagination for employee attendance', async () => {
        mockApiClient.get.mockResolvedValue({ data: { content: [] } });

        await attendanceService.getEmployeeAttendance('emp-123', 1, 100);

        expect(mockApiClient.get).toHaveBeenCalledWith('/attendance/employee/emp-123', {
          params: { page: 1, size: 100 },
        });
      });
    });

    describe('getAttendanceByDateRange', () => {
      it('should retrieve attendance records by date range', async () => {
        const mockRecords: AttendanceRecord[] = [
          {
            id: 'att-1',
            employeeId: 'emp-123',
            attendanceDate: '2026-03-18',
            checkInTime: '09:00',
            checkOutTime: '17:00',
            status: 'PRESENT',
          },
        ];

        mockApiClient.get.mockResolvedValue({ data: mockRecords });

        const result = await attendanceService.getAttendanceByDateRange(
          '2026-03-01',
          '2026-03-31'
        );

        expect(mockApiClient.get).toHaveBeenCalledWith('/attendance/my-attendance', {
          params: { startDate: '2026-03-01', endDate: '2026-03-31' },
        });
        expect(result).toHaveLength(1);
      });

      it('should handle errors when fetching by date range', async () => {
        mockApiClient.get.mockRejectedValue(new Error('Fetch failed'));

        await expect(
          attendanceService.getAttendanceByDateRange('2026-03-01', '2026-03-31')
        ).rejects.toThrow('Fetch failed');
      });
    });

    describe('getAttendanceByDate', () => {
      it('should retrieve attendance records for a specific date', async () => {
        const mockPage: Page<AttendanceRecord> = {
          content: [
            {
              id: 'att-1',
              employeeId: 'emp-123',
              attendanceDate: '2026-03-18',
              checkInTime: '09:00',
              checkOutTime: '17:00',
              status: 'PRESENT',
            },
          ],
          totalElements: 1,
          totalPages: 1,
          currentPage: 0,
          pageSize: 100,
        };

        mockApiClient.get.mockResolvedValue({ data: mockPage });

        const result = await attendanceService.getAttendanceByDate('2026-03-18');

        expect(mockApiClient.get).toHaveBeenCalledWith('/attendance/date/2026-03-18', {
          params: { page: 0, size: 100 },
        });
        expect(result.content).toHaveLength(1);
      });

      it('should handle pagination for date-based search', async () => {
        mockApiClient.get.mockResolvedValue({ data: { content: [] } });

        await attendanceService.getAttendanceByDate('2026-03-18', 1, 50);

        expect(mockApiClient.get).toHaveBeenCalledWith('/attendance/date/2026-03-18', {
          params: { page: 1, size: 50 },
        });
      });
    });

    describe('getPendingRegularizations', () => {
      it('should retrieve pending regularization requests', async () => {
        const mockPage: Page<AttendanceRecord> = {
          content: [
            {
              id: 'att-1',
              employeeId: 'emp-123',
              attendanceDate: '2026-03-18',
              status: 'PENDING_REGULARIZATION',
              regularizationRequested: true,
              regularizationApproved: false,
            },
          ],
          totalElements: 1,
          totalPages: 1,
          currentPage: 0,
          pageSize: 20,
        };

        mockApiClient.get.mockResolvedValue({ data: mockPage });

        const result = await attendanceService.getPendingRegularizations();

        expect(mockApiClient.get).toHaveBeenCalledWith('/attendance/pending-regularizations', {
          params: { page: 0, size: 20 },
        });
        expect(result.content).toHaveLength(1);
      });

      it('should handle errors when fetching pending regularizations', async () => {
        mockApiClient.get.mockRejectedValue(new Error('Fetch failed'));

        await expect(attendanceService.getPendingRegularizations()).rejects.toThrow(
          'Fetch failed'
        );
      });
    });

    describe('requestRegularization', () => {
      it('should request regularization for an attendance record', async () => {
        const mockRecord: AttendanceRecord = {
          id: 'att-123',
          employeeId: 'emp-123',
          attendanceDate: '2026-03-18',
          status: 'PENDING_REGULARIZATION',
          regularizationRequested: true,
        };

        mockApiClient.post.mockResolvedValue({ data: mockRecord });

        const result = await attendanceService.requestRegularization('att-123', {
          reason: 'Late arrival due to traffic',
        });

        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/attendance/att-123/request-regularization',
          null,
          {
            params: { reason: 'Late arrival due to traffic' },
          }
        );
        expect(result.regularizationRequested).toBe(true);
      });

      it('should handle errors when requesting regularization', async () => {
        mockApiClient.post.mockRejectedValue(new Error('Request failed'));

        await expect(
          attendanceService.requestRegularization('att-123', { reason: 'Test' })
        ).rejects.toThrow('Request failed');
      });
    });

    describe('approveRegularization', () => {
      it('should approve a regularization request', async () => {
        const mockRecord: AttendanceRecord = {
          id: 'att-123',
          employeeId: 'emp-123',
          attendanceDate: '2026-03-18',
          status: 'PRESENT',
          regularizationRequested: true,
          regularizationApproved: true,
        };

        mockApiClient.post.mockResolvedValue({ data: mockRecord });

        const result = await attendanceService.approveRegularization('att-123');

        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/attendance/att-123/approve-regularization'
        );
        expect(result.regularizationApproved).toBe(true);
      });

      it('should handle errors when approving regularization', async () => {
        mockApiClient.post.mockRejectedValue(new Error('Approval failed'));

        await expect(attendanceService.approveRegularization('att-123')).rejects.toThrow(
          'Approval failed'
        );
      });
    });

    describe('rejectRegularization', () => {
      it('should reject a regularization request', async () => {
        const mockRecord: AttendanceRecord = {
          id: 'att-123',
          employeeId: 'emp-123',
          attendanceDate: '2026-03-18',
          status: 'ABSENT',
          regularizationRequested: false,
          regularizationApproved: false,
        };

        mockApiClient.post.mockResolvedValue({ data: mockRecord });

        const result = await attendanceService.rejectRegularization(
          'att-123',
          'Insufficient justification'
        );

        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/attendance/att-123/reject-regularization',
          null,
          {
            params: { reason: 'Insufficient justification' },
          }
        );
        expect(result.regularizationApproved).toBe(false);
      });

      it('should handle errors when rejecting regularization', async () => {
        mockApiClient.post.mockRejectedValue(new Error('Rejection failed'));

        await expect(
          attendanceService.rejectRegularization('att-123', 'Test reason')
        ).rejects.toThrow('Rejection failed');
      });
    });

    describe('getMyTimeEntries', () => {
      it('should retrieve my time entries for a date', async () => {
        const mockEntries: TimeEntry[] = [
          {
            id: 'entry-1',
            employeeId: 'emp-123',
            date: '2026-03-18',
            checkInTime: '09:00',
            checkOutTime: '17:00',
            duration: 480,
          },
        ];

        mockApiClient.get.mockResolvedValue({ data: mockEntries });

        const result = await attendanceService.getMyTimeEntries('2026-03-18');

        expect(mockApiClient.get).toHaveBeenCalledWith('/attendance/my-time-entries', {
          params: { date: '2026-03-18' },
        });
        expect(result).toHaveLength(1);
      });

      it('should handle errors when fetching time entries', async () => {
        mockApiClient.get.mockRejectedValue(new Error('Fetch failed'));

        await expect(attendanceService.getMyTimeEntries('2026-03-18')).rejects.toThrow(
          'Fetch failed'
        );
      });
    });
  });
});
