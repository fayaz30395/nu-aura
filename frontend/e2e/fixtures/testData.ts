/**
 * Test Data Fixtures
 * Contains mock data for testing various features
 */

/**
 * Mock Users for E2E Testing
 * These credentials match the seeded mock data in 100-seed-mock-data.xml
 */
export const testUsers = {
  admin: {
    email: 'admin@nulogic.io',
    password: 'password',
    role: 'Admin',
    name: 'Admin User',
  },
  hrManager: {
    email: 'priya.sharma@nulogic.io',
    password: 'password',
    role: 'HR Manager',
    name: 'Priya Sharma',
  },
  hrStaff: [
    { email: 'neha.gupta@nulogic.io', password: 'password', role: 'HR Staff', name: 'Neha Gupta' },
    { email: 'amit.kumar@nulogic.io', password: 'password', role: 'HR Staff', name: 'Amit Kumar' },
    { email: 'sneha.reddy@nulogic.io', password: 'password', role: 'HR Staff', name: 'Sneha Reddy' },
    { email: 'rahul.verma@nulogic.io', password: 'password', role: 'HR Staff', name: 'Rahul Verma' },
  ],
  managers: [
    { email: 'rajesh.kumar@nulogic.io', password: 'password', role: 'Manager', name: 'Rajesh Kumar', project: 'NuAura HRMS' },
    { email: 'sunita.patel@nulogic.io', password: 'password', role: 'Manager', name: 'Sunita Patel', project: 'E-Commerce Platform' },
    { email: 'vikram.singh@nulogic.io', password: 'password', role: 'Manager', name: 'Vikram Singh', project: 'Mobile Banking App' },
  ],
  developers: [
    { email: 'ankit.sharma@nulogic.io', password: 'password', role: 'Developer', name: 'Ankit Sharma' },
    { email: 'meera.nair@nulogic.io', password: 'password', role: 'Developer', name: 'Meera Nair' },
    { email: 'sanjay.gupta@nulogic.io', password: 'password', role: 'Developer', name: 'Sanjay Gupta' },
    { email: 'kavitha.menon@nulogic.io', password: 'password', role: 'Developer', name: 'Kavitha Menon' },
    { email: 'arun.krishnan@nulogic.io', password: 'password', role: 'Developer', name: 'Arun Krishnan' },
    { email: 'divya.iyer@nulogic.io', password: 'password', role: 'Developer', name: 'Divya Iyer' },
    { email: 'karthik.rajan@nulogic.io', password: 'password', role: 'Developer', name: 'Karthik Rajan' },
    { email: 'pooja.hegde@nulogic.io', password: 'password', role: 'Developer', name: 'Pooja Hegde' },
    { email: 'manoj.pillai@nulogic.io', password: 'password', role: 'Developer', name: 'Manoj Pillai' },
    { email: 'lakshmi.nambiar@nulogic.io', password: 'password', role: 'Developer', name: 'Lakshmi Nambiar' },
  ],
  manager: {
    email: 'rajesh.kumar@nulogic.io',
    password: 'password',
    role: 'Manager',
    name: 'Rajesh Kumar',
  },
  employee: {
    email: 'ankit.sharma@nulogic.io',
    password: 'password',
    role: 'Employee',
    name: 'Ankit Sharma',
  },
};

export const mockProjects = [
  { code: 'HRMS-001', name: 'NuAura HRMS', manager: 'Rajesh Kumar', status: 'IN_PROGRESS' },
  { code: 'ECOM-001', name: 'E-Commerce Platform', manager: 'Sunita Patel', status: 'IN_PROGRESS' },
  { code: 'BANK-001', name: 'Mobile Banking App', manager: 'Vikram Singh', status: 'IN_PROGRESS' },
  { code: 'CRM-001', name: 'CRM System', manager: 'Rajesh Kumar', status: 'PLANNING' },
  { code: 'AI-001', name: 'AI Analytics Dashboard', manager: 'Sunita Patel', status: 'PLANNING' },
];

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
