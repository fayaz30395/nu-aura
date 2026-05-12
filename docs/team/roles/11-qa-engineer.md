# QA Engineer

**Role**: QA Engineer  
**Scope**: Test strategy, automation, manual testing, quality gates  
**Tech**: JUnit 5, Mockito, JaCoCo, Playwright, React Testing Library

## Core Responsibilities

### 1. Backend Testing

- Unit tests (JUnit 5 + Mockito)
- Integration tests (TestContainers)
- API tests (RestAssured)
- Coverage: 80% minimum (JaCoCo)

### 2. Frontend Testing

- Component tests (React Testing Library)
- E2E tests (Playwright)
- Accessibility tests (axe-core)

### 3. Test Automation

- CI/CD integration (GitHub Actions)
- Test data management
- Flaky test tracking (<5% tolerance)

### 4. Quality Gates

- PR review checklist
- Release readiness checklist
- Bug triage and prioritization

## Backend Test Patterns

### Controller Test

```java
@WebMvcTest(EmployeeController.class)
class EmployeeControllerTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private EmployeeService employeeService;
    
    @Test
    @WithMockUser(roles = "HR_MANAGER")
    void getEmployee_shouldReturn200() throws Exception {
        UUID id = UUID.randomUUID();
        EmployeeResponse response = new EmployeeResponse(id, "John Doe");
        
        when(employeeService.getById(id)).thenReturn(response);
        
        mockMvc.perform(get("/api/employees/{id}", id))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(id.toString()))
            .andExpect(jsonPath("$.fullName").value("John Doe"));
    }
    
    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void getEmployee_withoutPermission_shouldReturn403() throws Exception {
        mockMvc.perform(get("/api/employees/{id}", UUID.randomUUID()))
            .andExpect(status().isForbidden());
    }
}
```

### Service Test

```java
@ExtendWith(MockitoExtension.class)
class LeaveServiceTest {
    
    @Mock
    private LeaveRepository leaveRepository;
    
    @Mock
    private LeaveBalanceService leaveBalanceService;
    
    @InjectMocks
    private LeaveService leaveService;
    
    @Test
    void createLeaveRequest_shouldDeductBalance() {
        LeaveRequest request = new LeaveRequest();
        request.setLeaveTypeId(UUID.randomUUID());
        request.setStartDate(LocalDate.of(2026, 3, 20));
        request.setEndDate(LocalDate.of(2026, 3, 22));
        
        when(leaveRepository.save(any())).thenReturn(request);
        
        leaveService.createRequest(request);
        
        verify(leaveBalanceService).deduct(request.getEmployeeId(), request.getLeaveTypeId(), 3);
    }
}
```

## Frontend Test Patterns

### Component Test

```tsx
// frontend/components/leave/LeaveRequestForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeaveRequestForm } from './LeaveRequestForm';

describe('LeaveRequestForm', () => {
  it('should submit valid leave request', async () => {
    const onSubmit = jest.fn();
    render(<LeaveRequestForm onSubmit={onSubmit} />);
    
    await userEvent.selectOptions(screen.getByLabelText('Leave Type'), 'Casual Leave');
    await userEvent.type(screen.getByLabelText('Start Date'), '2026-03-20');
    await userEvent.type(screen.getByLabelText('End Date'), '2026-03-22');
    await userEvent.type(screen.getByLabelText('Reason'), 'Personal work that requires at least 10 characters');
    
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        leaveTypeId: expect.any(String),
        startDate: new Date('2026-03-20'),
        endDate: new Date('2026-03-22'),
        reason: expect.stringContaining('Personal work'),
      });
    });
  });
  
  it('should show validation errors', async () => {
    render(<LeaveRequestForm />);
    
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    
    expect(await screen.findByText('Reason must be at least 10 characters')).toBeInTheDocument();
  });
});
```

### E2E Test

```typescript
// e2e/leave-request.spec.ts
import { test, expect } from '@playwright/test';

test('employee can submit leave request', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'employee@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  await page.goto('/leave/request');
  await page.selectOption('[name="leaveTypeId"]', 'Casual Leave');
  await page.fill('[name="startDate"]', '2026-03-20');
  await page.fill('[name="endDate"]', '2026-03-22');
  await page.fill('[name="reason"]', 'Personal work requiring time off');
  
  await page.click('button[type="submit"]');
  
  await expect(page.locator('text=Leave request submitted')).toBeVisible();
});
```

## Test Data Management

```java
@TestConfiguration
public class TestDataConfig {
    
    @Bean
    public TestDataBuilder testDataBuilder() {
        return new TestDataBuilder();
    }
}

public class TestDataBuilder {
    
    public Employee buildEmployee() {
        return Employee.builder()
            .id(UUID.randomUUID())
            .fullName("Test Employee")
            .email("test@example.com")
            .tenantId(UUID.randomUUID())
            .build();
    }
    
    public LeaveRequest buildLeaveRequest(Employee employee) {
        return LeaveRequest.builder()
            .id(UUID.randomUUID())
            .employeeId(employee.getId())
            .leaveTypeId(UUID.randomUUID())
            .startDate(LocalDate.now())
            .endDate(LocalDate.now().plusDays(2))
            .status(LeaveStatus.PENDING)
            .build();
    }
}
```

## Quality Gates

### PR Checklist

- [ ] All tests pass (unit + integration)
- [ ] Code coverage >80%
- [ ] No flaky tests
- [ ] RBAC permissions verified
- [ ] Multi-tenant isolation tested

### Release Checklist

- [ ] Regression tests pass
- [ ] Performance benchmarks met (<200ms API, <2s page load)
- [ ] Security scan clean (no high/critical vulnerabilities)
- [ ] Database migrations tested (rollback plan ready)
- [ ] Monitoring alerts configured

## Success Criteria

- ✅ Test coverage >80%
- ✅ Flaky tests <5%
- ✅ Build success rate >95%
- ✅ Zero P0 bugs in production
- ✅ Test execution time <10 minutes

## Escalation Path

**Report to**: Engineering Manager  
**Escalate when**: Coverage drop >10%, flaky tests >10%, P0 bug detected, test infrastructure
failure
