/**
 * Test Data Fixtures
 * Contains mock data for testing various features
 */

/** Shared password for all NuLogic demo accounts */
export const DEMO_PASSWORD = 'Welcome@123';

/**
 * Demo user role types matching the backend RBAC model
 */
export type DemoRole =
  | 'SUPER_ADMIN'
  | 'MANAGER'
  | 'TEAM_LEAD'
  | 'HR_MANAGER'
  | 'RECRUITMENT_ADMIN'
  | 'EMPLOYEE';

/**
 * Represents a demo user in the NuLogic tenant hierarchy
 */
export interface DemoUser {
  email: string;
  password: string;
  role: DemoRole;
  name: string;
  department: string;
  reportsTo: string | null;
}

/**
 * NuLogic Demo Tenant — Full Approval Hierarchy
 *
 * These accounts are seeded by Flyway V8 (demo profile) and match
 * the demo account buttons on the login page.
 *
 *   CEO: Fayaz M (SUPER_ADMIN)
 *   ├── Sumit Kumar (MANAGER, Engineering) ── reports to Fayaz
 *   │   ├── Mani S (TEAM_LEAD) ── reports to Sumit
 *   │   │   ├── Raj V (EMPLOYEE) ── reports to Mani
 *   │   │   └── Gokul R (TEAM_LEAD) ── reports to Mani
 *   │   │       └── Anshuman P (EMPLOYEE) ── reports to Gokul
 *   │   └── Saran V (EMPLOYEE) ── reports to Sumit
 *   └── Jagadeesh N (HR_MANAGER) ── reports to Fayaz
 *       ├── Suresh M (RECRUITMENT_ADMIN) ── reports to Jagadeesh
 *       │   ├── Arun K (EMPLOYEE) ── reports to Suresh
 *       │   └── Bharath S (EMPLOYEE) ── reports to Suresh
 *       └── Dhanush A (TEAM_LEAD, HR) ── reports to Jagadeesh
 *           ├── Chitra D (EMPLOYEE) ── reports to Dhanush
 *           └── Deepak R (EMPLOYEE) ── reports to Dhanush
 *   Sarankarthick Maran (SUPER_ADMIN) ── no reports-to
 */
export const demoUsers = {
  // ── SUPER_ADMIN ────────────────────────────────────────────
  superAdmin: {
    email: 'fayaz.m@nulogic.io',
    password: DEMO_PASSWORD,
    role: 'SUPER_ADMIN' as DemoRole,
    name: 'Fayaz M',
    department: 'Executive',
    reportsTo: null,
  },
  superAdmin2: {
    email: 'sarankarthick.maran@nulogic.io',
    password: DEMO_PASSWORD,
    role: 'SUPER_ADMIN' as DemoRole,
    name: 'Sarankarthick Maran',
    department: 'Executive',
    reportsTo: null,
  },

  // ── ENGINEERING CHAIN ──────────────────────────────────────
  managerEng: {
    email: 'sumit@nulogic.io',
    password: DEMO_PASSWORD,
    role: 'MANAGER' as DemoRole,
    name: 'Sumit Kumar',
    department: 'Engineering',
    reportsTo: 'fayaz.m@nulogic.io',
  },
  teamLeadEng: {
    email: 'mani@nulogic.io',
    password: DEMO_PASSWORD,
    role: 'TEAM_LEAD' as DemoRole,
    name: 'Mani S',
    department: 'Engineering',
    reportsTo: 'sumit@nulogic.io',
  },
  teamLeadEng2: {
    email: 'gokul@nulogic.io',
    password: DEMO_PASSWORD,
    role: 'TEAM_LEAD' as DemoRole,
    name: 'Gokul R',
    department: 'Engineering',
    reportsTo: 'mani@nulogic.io',
  },
  employeeSaran: {
    email: 'saran@nulogic.io',
    password: DEMO_PASSWORD,
    role: 'EMPLOYEE' as DemoRole,
    name: 'Saran V',
    department: 'Engineering',
    reportsTo: 'sumit@nulogic.io',
  },
  employeeRaj: {
    email: 'raj@nulogic.io',
    password: DEMO_PASSWORD,
    role: 'EMPLOYEE' as DemoRole,
    name: 'Raj V',
    department: 'Engineering',
    reportsTo: 'mani@nulogic.io',
  },
  employeeAnshuman: {
    email: 'anshuman@nulogic.io',
    password: DEMO_PASSWORD,
    role: 'EMPLOYEE' as DemoRole,
    name: 'Anshuman P',
    department: 'Engineering',
    reportsTo: 'gokul@nulogic.io',
  },

  // ── HR CHAIN ───────────────────────────────────────────────
  hrManager: {
    email: 'jagadeesh@nulogic.io',
    password: DEMO_PASSWORD,
    role: 'HR_MANAGER' as DemoRole,
    name: 'Jagadeesh N',
    department: 'HR',
    reportsTo: 'fayaz.m@nulogic.io',
  },
  recruitmentAdmin: {
    email: 'suresh@nulogic.io',
    password: DEMO_PASSWORD,
    role: 'RECRUITMENT_ADMIN' as DemoRole,
    name: 'Suresh M',
    department: 'Recruitment',
    reportsTo: 'jagadeesh@nulogic.io',
  },
  teamLeadHR: {
    email: 'dhanush@nulogic.io',
    password: DEMO_PASSWORD,
    role: 'TEAM_LEAD' as DemoRole,
    name: 'Dhanush A',
    department: 'HR',
    reportsTo: 'jagadeesh@nulogic.io',
  },
  employeeArun: {
    email: 'arun@nulogic.io',
    password: DEMO_PASSWORD,
    role: 'EMPLOYEE' as DemoRole,
    name: 'Arun K',
    department: 'Recruitment',
    reportsTo: 'suresh@nulogic.io',
  },
  employeeBharath: {
    email: 'bharath@nulogic.io',
    password: DEMO_PASSWORD,
    role: 'EMPLOYEE' as DemoRole,
    name: 'Bharath S',
    department: 'Recruitment',
    reportsTo: 'suresh@nulogic.io',
  },
  employeeChitra: {
    email: 'chitra@nulogic.io',
    password: DEMO_PASSWORD,
    role: 'EMPLOYEE' as DemoRole,
    name: 'Chitra D',
    department: 'HR',
    reportsTo: 'dhanush@nulogic.io',
  },
  employeeDeepak: {
    email: 'deepak@nulogic.io',
    password: DEMO_PASSWORD,
    role: 'EMPLOYEE' as DemoRole,
    name: 'Deepak R',
    department: 'HR',
    reportsTo: 'dhanush@nulogic.io',
  },
};

/** Flat array of all demo users for iteration */
export const allDemoUsers: DemoUser[] = Object.values(demoUsers);

/**
 * Find the reporting manager for a given demo user email.
 * Returns the DemoUser object of the direct manager, or null if top-level.
 */
export function getManagerOf(email: string): DemoUser | null {
  const user = allDemoUsers.find((u) => u.email === email);
  if (!user?.reportsTo) return null;
  return allDemoUsers.find((u) => u.email === user.reportsTo) ?? null;
}

/**
 * Legacy testUsers — mapped to real demo accounts for backward compatibility.
 * New tests should use `demoUsers` directly.
 */
export const testUsers = {
  admin: demoUsers.superAdmin,
  hrManager: demoUsers.hrManager,
  manager: demoUsers.managerEng,
  employee: demoUsers.employeeSaran,
};

export const mockProjects = [
  {code: 'HRMS-001', name: 'NuAura HRMS', manager: 'Rajesh Kumar', status: 'IN_PROGRESS'},
  {code: 'ECOM-001', name: 'E-Commerce Platform', manager: 'Sunita Patel', status: 'IN_PROGRESS'},
  {code: 'BANK-001', name: 'Mobile Banking App', manager: 'Vikram Singh', status: 'IN_PROGRESS'},
  {code: 'CRM-001', name: 'CRM System', manager: 'Rajesh Kumar', status: 'PLANNING'},
  {code: 'AI-001', name: 'AI Analytics Dashboard', manager: 'Sunita Patel', status: 'PLANNING'},
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
