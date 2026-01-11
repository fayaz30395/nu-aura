# Testing Requirements Document

## 1. Overview

This document outlines the testing strategy, standards, and requirements for the NU-AURA HRMS platform to ensure quality, reliability, and maintainability.

### 1.1 Testing Objectives

| Objective | Description |
|-----------|-------------|
| **Correctness** | Verify features work as specified |
| **Reliability** | Ensure consistent behavior under various conditions |
| **Performance** | Validate response times and scalability |
| **Security** | Identify and prevent vulnerabilities |
| **Usability** | Confirm intuitive user experience |

### 1.2 Testing Pyramid

```
                    ┌─────────────────┐
                    │    E2E Tests    │  5%
                    │   (Playwright)  │
                    ├─────────────────┤
                    │  Integration    │  15%
                    │     Tests       │
                    ├─────────────────┤
                    │                 │
                    │   Unit Tests    │  80%
                    │                 │
                    └─────────────────┘
```

---

## 2. Unit Testing

### 2.1 Backend Unit Tests (Java/JUnit)

#### Coverage Requirements

| Component | Minimum Coverage |
|-----------|-----------------|
| Services | 80% |
| Controllers | 70% |
| Repositories | 60% |
| Utilities | 90% |
| DTOs/Entities | 50% |
| **Overall** | **75%** |

#### Test Structure

```java
// Service test example
@ExtendWith(MockitoExtension.class)
class EmployeeServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private TenantContext tenantContext;

    @InjectMocks
    private EmployeeService employeeService;

    @Test
    @DisplayName("Should create employee successfully")
    void shouldCreateEmployeeSuccessfully() {
        // Given
        UUID tenantId = UUID.randomUUID();
        EmployeeRequest request = createValidRequest();

        when(tenantContext.getCurrentTenant()).thenReturn(tenantId);
        when(employeeRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        // When
        Employee result = employeeService.createEmployee(request);

        // Then
        assertNotNull(result);
        assertEquals(request.getFirstName(), result.getFirstName());
        verify(employeeRepository).save(any(Employee.class));
    }

    @Test
    @DisplayName("Should throw exception for duplicate email")
    void shouldThrowExceptionForDuplicateEmail() {
        // Given
        EmployeeRequest request = createValidRequest();
        when(employeeRepository.existsByEmail(request.getEmail())).thenReturn(true);

        // When/Then
        assertThrows(DuplicateEmailException.class,
            () -> employeeService.createEmployee(request));
    }
}
```

#### Naming Conventions

```java
// Method naming pattern
void should<ExpectedBehavior>_when<Condition>()

// Examples
void shouldReturnEmployee_whenValidIdProvided()
void shouldThrowException_whenEmailAlreadyExists()
void shouldApproveLeave_whenManagerHasPermission()
```

### 2.2 Frontend Unit Tests (Jest/React Testing Library)

#### Coverage Requirements

| Component | Minimum Coverage |
|-----------|-----------------|
| Hooks | 80% |
| Utilities | 90% |
| Components | 60% |
| Services | 70% |
| **Overall** | **70%** |

#### Test Structure

```typescript
// Component test example
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EmployeeForm } from './EmployeeForm';

describe('EmployeeForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all required fields', () => {
    render(<EmployeeForm onSubmit={mockOnSubmit} />);

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('should show validation errors for empty required fields', async () => {
    render(<EmployeeForm onSubmit={mockOnSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should call onSubmit with form data when valid', async () => {
    render(<EmployeeForm onSubmit={mockOnSubmit} />);

    fireEvent.change(screen.getByLabelText(/first name/i), {
      target: { value: 'John' },
    });
    fireEvent.change(screen.getByLabelText(/last name/i), {
      target: { value: 'Doe' },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'john@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      });
    });
  });
});
```

#### Hook Testing

```typescript
// Custom hook test
import { renderHook, act } from '@testing-library/react';
import { useEmployees } from './useEmployees';

describe('useEmployees', () => {
  it('should fetch employees on mount', async () => {
    const { result } = renderHook(() => useEmployees());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.employees).toHaveLength(10);
    });
  });
});
```

---

## 3. Integration Testing

### 3.1 Backend Integration Tests

#### Database Integration

```java
@SpringBootTest
@AutoConfigureTestDatabase(replace = Replace.NONE)
@Testcontainers
class EmployeeRepositoryIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withDatabaseName("hrms_test");

    @Autowired
    private EmployeeRepository employeeRepository;

    @Test
    void shouldSaveAndRetrieveEmployee() {
        // Given
        Employee employee = new Employee();
        employee.setFirstName("John");
        employee.setLastName("Doe");
        employee.setEmail("john@test.com");

        // When
        Employee saved = employeeRepository.save(employee);
        Optional<Employee> found = employeeRepository.findById(saved.getId());

        // Then
        assertTrue(found.isPresent());
        assertEquals("John", found.get().getFirstName());
    }
}
```

#### API Integration

```java
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
class EmployeeControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @WithMockUser(roles = "HR_ADMIN")
    void shouldCreateEmployee() throws Exception {
        EmployeeRequest request = new EmployeeRequest();
        request.setFirstName("John");
        request.setLastName("Doe");
        request.setEmail("john@test.com");

        mockMvc.perform(post("/api/v1/employees")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-Tenant-ID", "550e8400-e29b-41d4-a716-446655440000")
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.firstName").value("John"));
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void shouldDenyAccessForUnauthorizedRole() throws Exception {
        mockMvc.perform(delete("/api/v1/employees/{id}", UUID.randomUUID())
                .header("X-Tenant-ID", "550e8400-e29b-41d4-a716-446655440000"))
            .andExpect(status().isForbidden());
    }
}
```

### 3.2 Service Integration Tests

```java
@SpringBootTest
@Transactional
class LeaveServiceIntegrationTest {

    @Autowired
    private LeaveService leaveService;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Test
    void shouldApplyLeaveAndUpdateBalance() {
        // Given
        Employee employee = createTestEmployee();
        LeaveRequest request = new LeaveRequest();
        request.setLeaveTypeId(casualLeaveId);
        request.setStartDate(LocalDate.now().plusDays(5));
        request.setEndDate(LocalDate.now().plusDays(7));

        // When
        LeaveApplication result = leaveService.applyLeave(employee.getId(), request);

        // Then
        assertNotNull(result);
        assertEquals(LeaveStatus.PENDING, result.getStatus());

        LeaveBalance balance = leaveService.getBalance(employee.getId(), casualLeaveId);
        assertEquals(3, balance.getPending());
    }
}
```

---

## 4. End-to-End Testing (Playwright)

### 4.1 Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 4.2 Test Structure

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[data-testid="email-input"]', 'admin@demo.com');
    await page.fill('[data-testid="password-input"]', 'password');
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[data-testid="email-input"]', 'wrong@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');

    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'Invalid credentials'
    );
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@demo.com');
    await page.fill('[data-testid="password-input"]', 'password');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    await expect(page).toHaveURL('/login');
  });
});
```

### 4.3 Page Object Model

```typescript
// tests/e2e/pages/EmployeePage.ts
import { Page, Locator, expect } from '@playwright/test';

export class EmployeePage {
  readonly page: Page;
  readonly employeeTable: Locator;
  readonly addButton: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.employeeTable = page.locator('[data-testid="employee-table"]');
    this.addButton = page.locator('[data-testid="add-employee-button"]');
    this.searchInput = page.locator('[data-testid="search-input"]');
  }

  async goto() {
    await this.page.goto('/employees');
    await expect(this.employeeTable).toBeVisible();
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForResponse('**/api/v1/employees*');
  }

  async addEmployee(data: EmployeeData) {
    await this.addButton.click();
    await this.page.fill('[data-testid="first-name-input"]', data.firstName);
    await this.page.fill('[data-testid="last-name-input"]', data.lastName);
    await this.page.fill('[data-testid="email-input"]', data.email);
    await this.page.click('[data-testid="submit-button"]');
    await expect(this.page.locator('[data-testid="success-toast"]')).toBeVisible();
  }

  async getEmployeeCount(): Promise<number> {
    const rows = this.employeeTable.locator('tbody tr');
    return await rows.count();
  }
}

// Usage in tests
test('should search employees', async ({ page }) => {
  const employeePage = new EmployeePage(page);
  await employeePage.goto();

  await employeePage.search('John');

  const count = await employeePage.getEmployeeCount();
  expect(count).toBeGreaterThan(0);
});
```

### 4.4 Test Scenarios

#### Authentication Tests
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Password reset flow
- [ ] Google SSO login
- [ ] Session timeout handling
- [ ] Concurrent session handling

#### Employee Management Tests
- [ ] List employees with pagination
- [ ] Search employees
- [ ] Filter employees by department
- [ ] Create new employee
- [ ] Edit employee details
- [ ] View employee profile
- [ ] Delete employee (soft delete)
- [ ] Bulk import employees

#### Attendance Tests
- [ ] Check-in functionality
- [ ] Check-out functionality
- [ ] View attendance calendar
- [ ] Attendance regularization request
- [ ] Manager approval of regularization

#### Leave Management Tests
- [ ] View leave balance
- [ ] Apply for leave
- [ ] Cancel leave request
- [ ] Manager approve/reject leave
- [ ] View leave calendar

#### Payroll Tests
- [ ] View payslip list
- [ ] Download payslip PDF
- [ ] View salary structure

#### Project Management Tests
- [ ] Create project
- [ ] View project details
- [ ] Add/remove team members
- [ ] Create and assign tasks
- [ ] Update task status (Kanban)
- [ ] Gantt chart interactions
- [ ] Log time against tasks

---

## 5. Performance Testing

### 5.1 Load Testing (k6)

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Ramp up to 200 users
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],    // Less than 1% failure rate
  },
};

const BASE_URL = 'http://localhost:8080/api/v1';
const TOKEN = 'your_test_token';

export default function () {
  const headers = {
    'Authorization': `Bearer ${TOKEN}`,
    'X-Tenant-ID': '550e8400-e29b-41d4-a716-446655440000',
    'Content-Type': 'application/json',
  };

  // Get employees list
  const employeesRes = http.get(`${BASE_URL}/employees`, { headers });
  check(employeesRes, {
    'employees status 200': (r) => r.status === 200,
    'employees response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);

  // Get dashboard metrics
  const dashboardRes = http.get(`${BASE_URL}/analytics/dashboard`, { headers });
  check(dashboardRes, {
    'dashboard status 200': (r) => r.status === 200,
    'dashboard response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

### 5.2 Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| API Response Time (P50) | < 100ms | < 200ms |
| API Response Time (P95) | < 200ms | < 500ms |
| API Response Time (P99) | < 500ms | < 1000ms |
| Throughput | 1000 RPS | 500 RPS |
| Error Rate | < 0.1% | < 1% |
| Apdex Score | > 0.9 | > 0.8 |

### 5.3 Stress Testing

```javascript
// stress-test.js
export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 500 },
    { duration: '2m', target: 1000 },
    { duration: '5m', target: 1000 },
    { duration: '10m', target: 0 },
  ],
};
```

---

## 6. Security Testing

### 6.1 OWASP ZAP Automated Scan

```yaml
# zap-config.yaml
env:
  contexts:
    - name: HRMS
      urls:
        - http://localhost:8080
      includePaths:
        - "http://localhost:8080/api/.*"
      excludePaths:
        - "http://localhost:8080/actuator/.*"
      authentication:
        method: json
        parameters:
          loginPageUrl: "http://localhost:8080/api/v1/auth/login"
          loginRequestData: '{"email":"admin@demo.com","password":"password"}'
          tokenUrl: "http://localhost:8080/api/v1/auth/refresh"

jobs:
  - type: spider
    parameters:
      maxDuration: 5
  - type: passiveScan-wait
  - type: activeScan
    parameters:
      maxRuleDurationInMins: 5
  - type: report
    parameters:
      template: traditional-html
      reportFile: zap-report.html
```

### 6.2 Security Test Cases

| Category | Test Case | Expected Result |
|----------|-----------|-----------------|
| Authentication | SQL injection in login | Blocked |
| Authentication | Brute force attack | Rate limited after 5 attempts |
| Authorization | Access without token | 401 Unauthorized |
| Authorization | Cross-tenant access | 403 Forbidden |
| Input Validation | XSS in text fields | Sanitized/Blocked |
| Input Validation | XXE in file upload | Blocked |
| Session | Token manipulation | Invalid token error |
| Session | Expired token access | 401 Unauthorized |

---

## 7. Accessibility Testing

### 7.1 WCAG 2.1 Compliance

```typescript
// accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('should have no accessibility violations on login page', async ({ page }) => {
    await page.goto('/login');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have no accessibility violations on dashboard', async ({ page }) => {
    // Login first
    await loginAsAdmin(page);

    await page.goto('/dashboard');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .exclude('[data-testid="chart"]')  // Charts may have known issues
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
```

### 7.2 Accessibility Checklist

- [ ] All images have alt text
- [ ] Forms have proper labels
- [ ] Color contrast meets WCAG AA standards
- [ ] Keyboard navigation works throughout
- [ ] Focus indicators are visible
- [ ] Skip navigation link present
- [ ] ARIA roles used correctly
- [ ] Dynamic content announced to screen readers

---

## 8. Test Data Management

### 8.1 Test Fixtures

```typescript
// fixtures/employees.ts
export const testEmployees = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@test.com',
    department: 'Engineering',
    designation: 'Software Engineer',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@test.com',
    department: 'HR',
    designation: 'HR Manager',
  },
];
```

### 8.2 Database Seeding

```java
// TestDataSeeder.java
@Component
@Profile("test")
public class TestDataSeeder {

    @Autowired
    private EmployeeRepository employeeRepository;

    @PostConstruct
    public void seedData() {
        if (employeeRepository.count() == 0) {
            Employee employee = new Employee();
            employee.setFirstName("Test");
            employee.setLastName("User");
            employee.setEmail("test@example.com");
            employeeRepository.save(employee);
        }
    }
}
```

### 8.3 Mock Services

```typescript
// mocks/api.ts
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { testEmployees } from '../fixtures/employees';

export const handlers = [
  rest.get('/api/v1/employees', (req, res, ctx) => {
    return res(
      ctx.json({
        status: 'SUCCESS',
        data: {
          content: testEmployees,
          page: 0,
          size: 20,
          totalElements: testEmployees.length,
        },
      })
    );
  }),

  rest.post('/api/v1/employees', async (req, res, ctx) => {
    const body = await req.json();
    return res(
      ctx.status(201),
      ctx.json({
        status: 'SUCCESS',
        data: { id: 'new-id', ...body },
      })
    );
  }),
];

export const server = setupServer(...handlers);
```

---

## 9. CI/CD Integration

### 9.1 GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK 21
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'

      - name: Run backend unit tests
        run: |
          cd hrms-backend
          mvn test -Dtest=*Test

      - name: Upload coverage report
        uses: codecov/codecov-action@v3
        with:
          files: ./hrms-backend/target/site/jacoco/jacoco.xml

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: hrms-frontend/package-lock.json

      - name: Install dependencies
        run: |
          cd hrms-frontend
          npm ci

      - name: Run frontend tests
        run: |
          cd hrms-frontend
          npm test -- --coverage

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [unit-tests, frontend-tests]
    steps:
      - uses: actions/checkout@v4

      - name: Start services
        run: docker-compose up -d

      - name: Wait for services
        run: sleep 30

      - name: Install Playwright
        run: |
          cd hrms-frontend
          npm ci
          npx playwright install --with-deps

      - name: Run E2E tests
        run: |
          cd hrms-frontend
          npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: hrms-frontend/playwright-report/
```

### 9.2 Test Reporting

```yaml
# Test report generation
- name: Generate test reports
  run: |
    # JUnit XML for CI integration
    mvn test -DtestResultsFiles=**/surefire-reports/*.xml

    # HTML report for human review
    mvn surefire-report:report

    # Coverage report
    mvn jacoco:report
```

---

## 10. Test Execution Commands

### Backend

```bash
# Run all tests
mvn test

# Run specific test class
mvn test -Dtest=EmployeeServiceTest

# Run with coverage
mvn test jacoco:report

# Run integration tests only
mvn verify -P integration-tests

# Skip tests
mvn install -DskipTests
```

### Frontend

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests in UI mode
npm run test:e2e -- --ui

# Run specific E2E test file
npm run test:e2e -- tests/e2e/auth.spec.ts
```

---

*Document Version: 1.0*
*Last Updated: January 11, 2026*
