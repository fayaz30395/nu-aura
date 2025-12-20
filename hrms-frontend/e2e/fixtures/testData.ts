/**
 * Test Data Fixtures
 * Contains mock data for testing various features
 */

export const testUsers = {
  admin: {
    email: 'admin@demo.com',
    password: 'password',
    role: 'Admin',
  },
  hrManager: {
    email: 'michael.chen@company.com',
    password: 'password',
    role: 'HR Manager',
  },
  manager: {
    email: 'sarah.johnson@company.com',
    password: 'password',
    role: 'Manager',
  },
  employee: {
    email: 'john.smith@company.com',
    password: 'password',
    role: 'Employee',
  },
};

export const testEmployee = {
  basic: {
    employeeCode: `EMP${Date.now()}`,
    firstName: 'Test',
    middleName: 'E2E',
    lastName: 'Employee',
    workEmail: `test.employee.${Date.now()}@company.com`,
    password: 'Test@123456',
  },
  personal: {
    personalEmail: `personal.${Date.now()}@gmail.com`,
    phoneNumber: '+1-555-0123',
    emergencyContact: '+1-555-0124',
    dateOfBirth: '1990-01-15',
    gender: 'MALE',
    address: '123 Test Street',
    city: 'San Francisco',
    state: 'California',
    postalCode: '94102',
    country: 'United States',
  },
  employment: {
    designation: 'Software Engineer',
    employmentType: 'FULL_TIME',
    level: 'MID',
    jobRole: 'SOFTWARE_ENGINEER',
    joiningDate: '2024-01-01',
  },
  banking: {
    bankAccountNumber: '1234567890',
    bankName: 'Test Bank',
    bankIfscCode: 'TEST0001234',
    taxId: '123-45-6789',
  },
};

export const testLeave = {
  annual: {
    leaveType: 'ANNUAL',
    startDate: getDateString(7),
    endDate: getDateString(9),
    reason: 'Family vacation - E2E Test',
  },
  sick: {
    leaveType: 'SICK',
    startDate: getDateString(3),
    endDate: getDateString(3),
    reason: 'Medical appointment - E2E Test',
  },
  casual: {
    leaveType: 'CASUAL',
    startDate: getDateString(1),
    endDate: getDateString(1),
    halfDay: true,
    reason: 'Personal work - E2E Test',
  },
};

export const testProject = {
  basic: {
    name: `E2E Test Project ${Date.now()}`,
    code: `PRJ${Date.now()}`,
    description: 'This is a test project created by E2E tests',
    clientName: 'Test Client Inc.',
    startDate: getDateString(-7),
    endDate: getDateString(90),
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    budget: '100000',
  },
};

export const testAttendance = {
  regularization: {
    date: getDateString(-1),
    reason: 'Forgot to check in/out - E2E Test',
  },
};

export const apiMockData = {
  employees: [
    {
      id: '1',
      employeeCode: 'EMP001',
      firstName: 'John',
      lastName: 'Doe',
      fullName: 'John Doe',
      workEmail: 'john.doe@company.com',
      designation: 'Senior Software Engineer',
      departmentName: 'Engineering',
      level: 'SENIOR',
      status: 'ACTIVE',
      managerName: 'Jane Manager',
    },
    {
      id: '2',
      employeeCode: 'EMP002',
      firstName: 'Jane',
      lastName: 'Smith',
      fullName: 'Jane Smith',
      workEmail: 'jane.smith@company.com',
      designation: 'Product Manager',
      departmentName: 'Product',
      level: 'LEAD',
      status: 'ACTIVE',
      managerName: null,
    },
  ],
  departments: [
    {
      id: '1',
      code: 'ENG',
      name: 'Engineering',
      description: 'Software Development',
    },
    {
      id: '2',
      code: 'PROD',
      name: 'Product',
      description: 'Product Management',
    },
  ],
  leaveBalances: {
    ANNUAL: 15,
    SICK: 10,
    CASUAL: 5,
  },
  projects: [
    {
      id: '1',
      name: 'HRMS Platform',
      code: 'HRMS-001',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    },
  ],
};

/**
 * Helper function to get date string relative to today
 * @param daysOffset - Number of days to add/subtract from today
 * @returns Date string in YYYY-MM-DD format
 */
function getDateString(daysOffset: number = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
}

/**
 * Get random element from array
 */
export function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generate unique ID
 */
export function generateUniqueId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
