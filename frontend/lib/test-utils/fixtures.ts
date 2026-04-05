import {Employee, EmployeeLevel, EmployeeStatus, EmploymentType, Gender, JobRole} from '@/lib/types/hrms/employee';
import {LeaveBalance, LeaveRequest, LeaveRequestStatus, LeaveType} from '@/lib/types/hrms/leave';
import {AttendanceRecord, AttendanceStatus, Holiday, HolidayType, Shift} from '@/lib/types/hrms/attendance';

// Employee Fixtures
export const createMockEmployee = (overrides: Partial<Employee> = {}): Employee => ({
  id: 'emp-001',
  tenantId: 'tenant-001',
  employeeCode: 'EMP001',
  userId: 'user-001',
  firstName: 'John',
  lastName: 'Doe',
  middleName: null,
  personalEmail: 'john.personal@email.com',
  workEmail: 'john.doe@company.com',
  phoneNumber: '+1234567890',
  emergencyContactNumber: '+0987654321',
  dateOfBirth: '1990-05-15',
  gender: 'MALE' as Gender,
  address: '123 Main St',
  city: 'New York',
  state: 'NY',
  postalCode: '10001',
  country: 'USA',
  joiningDate: '2023-01-15',
  confirmationDate: '2023-04-15',
  exitDate: null,
  departmentId: 'dept-001',
  departmentName: 'Engineering',
  officeLocationId: 'loc-001',
  teamId: 'team-001',
  designation: 'Software Engineer',
  level: 'MID' as EmployeeLevel,
  jobRole: 'SOFTWARE_ENGINEER' as JobRole,
  managerId: 'mgr-001',
  managerName: 'Jane Smith',
  employmentType: 'FULL_TIME' as EmploymentType,
  status: 'ACTIVE' as EmployeeStatus,
  bankAccountNumber: '1234567890',
  bankName: 'Test Bank',
  bankIfscCode: 'TEST0001234',
  taxId: 'TAX123456',
  createdAt: '2023-01-15T10:00:00Z',
  updatedAt: '2023-06-15T15:30:00Z',
  ...overrides,
});

export const mockEmployees: Employee[] = [
  createMockEmployee({id: 'emp-001', firstName: 'John', lastName: 'Doe', employeeCode: 'EMP001'}),
  createMockEmployee({
    id: 'emp-002',
    firstName: 'Jane',
    lastName: 'Smith',
    employeeCode: 'EMP002',
    designation: 'Senior Engineer',
    level: 'SENIOR' as EmployeeLevel
  }),
  createMockEmployee({
    id: 'emp-003',
    firstName: 'Bob',
    lastName: 'Johnson',
    employeeCode: 'EMP003',
    status: 'ON_LEAVE' as EmployeeStatus
  }),
];

// Leave Type Fixtures
export const createMockLeaveType = (overrides: Partial<LeaveType> = {}): LeaveType => ({
  id: 'lt-001',
  tenantId: 'tenant-001',
  name: 'Annual Leave',
  code: 'AL',
  description: 'Paid annual leave',
  defaultDays: 20,
  maxCarryForward: 5,
  isPaid: true,
  isAccrual: false,
  isActive: true,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  ...overrides,
});

export const mockLeaveTypes: LeaveType[] = [
  createMockLeaveType({id: 'lt-001', name: 'Annual Leave', code: 'AL', defaultDays: 20}),
  createMockLeaveType({id: 'lt-002', name: 'Sick Leave', code: 'SL', defaultDays: 10}),
  createMockLeaveType({id: 'lt-003', name: 'Personal Leave', code: 'PL', defaultDays: 5}),
];

// Leave Request Fixtures
export const createMockLeaveRequest = (overrides: Partial<LeaveRequest> = {}): LeaveRequest => ({
  id: 'lr-001',
  tenantId: 'tenant-001',
  employeeId: 'emp-001',
  employeeName: 'John Doe',
  leaveTypeId: 'lt-001',
  leaveTypeName: 'Annual Leave',
  startDate: '2024-02-01',
  endDate: '2024-02-05',
  numberOfDays: 5,
  isHalfDay: false,
  halfDayType: null,
  reason: 'Family vacation',
  status: 'PENDING' as LeaveRequestStatus,
  approverId: null,
  approverName: null,
  approverComments: null,
  rejectionReason: null,
  createdAt: '2024-01-20T10:00:00Z',
  updatedAt: '2024-01-20T10:00:00Z',
  ...overrides,
});

export const mockLeaveRequests: LeaveRequest[] = [
  createMockLeaveRequest({id: 'lr-001', status: 'PENDING' as LeaveRequestStatus}),
  createMockLeaveRequest({
    id: 'lr-002',
    status: 'APPROVED' as LeaveRequestStatus,
    approverId: 'mgr-001',
    approverName: 'Jane Smith'
  }),
  createMockLeaveRequest({id: 'lr-003', status: 'REJECTED' as LeaveRequestStatus, rejectionReason: 'Team deadline'}),
];

// Leave Balance Fixtures
export const createMockLeaveBalance = (overrides: Partial<LeaveBalance> = {}): LeaveBalance => ({
  id: 'lb-001',
  tenantId: 'tenant-001',
  employeeId: 'emp-001',
  leaveTypeId: 'lt-001',
  leaveTypeName: 'Annual Leave',
  year: 2024,
  totalDays: 20,
  usedDays: 5,
  pendingDays: 2,
  availableDays: 13,
  carryForwardDays: 3,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
  ...overrides,
});

// Attendance Fixtures
export const createMockAttendanceRecord = (overrides: Partial<AttendanceRecord> = {}): AttendanceRecord => ({
  id: 'att-001',
  tenantId: 'tenant-001',
  employeeId: 'emp-001',
  shiftId: 'shift-001',
  attendanceDate: '2024-01-15',
  checkInTime: '2024-01-15T09:00:00Z',
  checkOutTime: '2024-01-15T18:00:00Z',
  checkInSource: 'WEB',
  checkOutSource: 'WEB',
  status: 'PRESENT' as AttendanceStatus,
  workDurationMinutes: 540,
  breakDurationMinutes: 60,
  overtimeMinutes: 0,
  isLate: false,
  lateByMinutes: 0,
  isEarlyDeparture: false,
  earlyDepartureMinutes: 0,
  regularizationRequested: false,
  regularizationApproved: false,
  createdAt: '2024-01-15T09:00:00Z',
  updatedAt: '2024-01-15T18:00:00Z',
  ...overrides,
});

// Shift Fixtures
export const createMockShift = (overrides: Partial<Shift> = {}): Shift => ({
  id: 'shift-001',
  tenantId: 'tenant-001',
  shiftCode: 'DAY',
  shiftName: 'Day Shift',
  description: 'Standard day shift',
  startTime: '09:00',
  endTime: '18:00',
  gracePeriodInMinutes: 15,
  lateMarkAfterMinutes: 30,
  halfDayAfterMinutes: 240,
  fullDayHours: 8,
  breakDurationMinutes: 60,
  isNightShift: false,
  weeklyOffDays: 2,
  isRotational: false,
  isActive: true,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  ...overrides,
});

// Holiday Fixtures
export const createMockHoliday = (overrides: Partial<Holiday> = {}): Holiday => ({
  id: 'hol-001',
  tenantId: 'tenant-001',
  holidayName: 'New Year',
  holidayDate: '2024-01-01',
  holidayType: 'NATIONAL' as HolidayType,
  description: 'New Year celebration',
  isOptional: false,
  isRestricted: false,
  year: 2024,
  createdAt: '2023-12-01T00:00:00Z',
  updatedAt: '2023-12-01T00:00:00Z',
  ...overrides,
});

// Paginated response helper
export function createMockPage<T>(content: T[], page = 0, size = 20) {
  return {
    content,
    totalElements: content.length,
    totalPages: Math.ceil(content.length / size),
    size,
    number: page,
    first: page === 0,
    last: page === Math.ceil(content.length / size) - 1,
    empty: content.length === 0,
  };
}

// User fixtures for auth testing
export const mockUser = {
  id: 'user-001',
  email: 'john.doe@company.com',
  firstName: 'John',
  lastName: 'Doe',
  roles: ['EMPLOYEE'],
  tenantId: 'tenant-001',
  employeeId: 'emp-001',
};

export const mockAdminUser = {
  ...mockUser,
  id: 'admin-001',
  email: 'admin@company.com',
  firstName: 'Admin',
  lastName: 'User',
  roles: ['ADMIN', 'HR_MANAGER'],
};
