# NU-AURA Backend Testing Guide

## Quick Start

### Run All Controller Tests
```bash
cd backend
mvn clean test
```

### Run Individual Controller Tests
```bash
# Employee Controller Tests
mvn test -Dtest=EmployeeControllerTest

# Leave Request Controller Tests
mvn test -Dtest=LeaveRequestControllerTest

# Payroll Controller Tests
mvn test -Dtest=PayrollControllerTest

# Attendance Controller Tests
mvn test -Dtest=AttendanceControllerTest

# Role Controller Tests
mvn test -Dtest=RoleControllerTest
```

### Run Specific Test Suite Within a Controller
```bash
# Run only CreateEmployee tests
mvn test -Dtest=EmployeeControllerTest#CreateEmployeeTests

# Run only ApproveLeaveRequest tests
mvn test -Dtest=LeaveRequestControllerTest#ApproveLeaveRequestTests
```

---

## Test Organization

Each test class uses **nested test classes** (@Nested) to organize tests by feature:

### EmployeeControllerTest Structure
```
EmployeeControllerTest
├── CreateEmployeeTests (4 tests)
├── GetAllEmployeesTests (3 tests)
├── SearchEmployeesTests (2 tests)
├── GetEmployeeByIdTests (2 tests)
├── GetEmployeeHierarchyTests (1 test)
├── GetSubordinatesTests (2 tests)
├── GetManagersTests (1 test)
├── UpdateEmployeeTests (2 tests)
└── DeleteEmployeeTests (2 tests)
```

### LeaveRequestControllerTest Structure
```
LeaveRequestControllerTest
├── CreateLeaveRequestTests (3 tests)
├── ApproveLeaveRequestTests (3 tests)
├── RejectLeaveRequestTests (2 tests)
├── CancelLeaveRequestTests (2 tests)
├── GetLeaveRequestTests (2 tests)
├── GetAllLeaveRequestsTests (1 test)
├── GetEmployeeLeaveRequestsTests (1 test)
├── GetLeaveRequestsByStatusTests (1 test)
└── UpdateLeaveRequestTests (2 tests)
```

---

## Understanding Test Patterns

### Pattern 1: Happy Path Testing
Tests the successful execution of an endpoint with valid input.

```java
@Test
@DisplayName("Should create employee successfully")
void shouldCreateEmployeeSuccessfully() throws Exception {
    // ARRANGE: Setup mock response
    when(employeeService.createEmployee(any(CreateEmployeeRequest.class)))
            .thenReturn(employeeResponse);

    // ACT: Perform HTTP request
    mockMvc.perform(post("/api/v1/employees")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
            // ASSERT: Verify response
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(employeeId.toString()))
            .andExpect(jsonPath("$.firstName").value("John"));

    // VERIFY: Service was called correctly
    verify(employeeService, times(1)).createEmployee(any());
}
```

### Pattern 2: Validation Error Testing
Tests that invalid input returns 400 Bad Request.

```java
@Test
@DisplayName("Should return 400 for missing required fields")
void shouldReturn400ForMissingFields() throws Exception {
    CreateEmployeeRequest invalidRequest = new CreateEmployeeRequest();
    // Missing firstName, email, etc.

    mockMvc.perform(post("/api/v1/employees")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(invalidRequest)))
            .andExpect(status().isBadRequest());

    // Verify service was never called
    verify(employeeService, never()).createEmployee(any());
}
```

### Pattern 3: Permission/Authorization Testing
Tests that unauthorized users receive 403 or 400 responses.

```java
@Test
@DisplayName("Should return 400 when not authorized")
void shouldReturnErrorWhenNotAuthorized() throws Exception {
    when(employeeService.updateEmployee(eq(id), any()))
            .thenThrow(new AccessDeniedException("No permission"));

    mockMvc.perform(put("/api/v1/employees/{id}", id)
            .contentType(MediaType.APPLICATION_JSON)
            .content(...))
            .andExpect(status().isBadRequest());
}
```

### Pattern 4: Pagination Testing
Tests list endpoints with pagination.

```java
@Test
@DisplayName("Should get all employees with pagination")
void shouldGetAllEmployees() throws Exception {
    List<EmployeeResponse> employees = new ArrayList<>();
    employees.add(emp1);
    employees.add(emp2);

    Page<EmployeeResponse> page = new PageImpl<>(
            employees,
            PageRequest.of(0, 20),
            2  // totalElements
    );
    when(employeeService.getAllEmployees(any(Pageable.class)))
            .thenReturn(page);

    mockMvc.perform(get("/api/v1/employees")
            .param("page", "0")
            .param("size", "20")
            .param("sortBy", "createdAt"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content.length()").value(2))
            .andExpect(jsonPath("$.totalElements").value(2));
}
```

### Pattern 5: State Machine Testing
Tests workflow transitions (e.g., leave approval states).

```java
@Test
@DisplayName("Should approve leave request successfully")
void shouldApproveLeaveRequest() throws Exception {
    LeaveRequestResponse approvedResponse = new LeaveRequestResponse();
    approvedResponse.setStatus("APPROVED");  // State transition

    when(leaveRequestService.approveLeaveRequest(eq(id), any(UUID.class)))
            .thenReturn(mapToLeaveRequest(approvedResponse));

    mockMvc.perform(post("/api/v1/leave-requests/{id}/approve", id))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("APPROVED"));
}
```

---

## Common Assertions

### Status Codes
```java
.andExpect(status().isOk())           // 200 OK
.andExpect(status().isCreated())      // 201 Created
.andExpect(status().isNoContent())    // 204 No Content
.andExpect(status().isBadRequest())   // 400 Bad Request
.andExpect(status().isUnauthorized()) // 401 Unauthorized
.andExpect(status().isForbidden())    // 403 Forbidden
.andExpect(status().isNotFound())     // 404 Not Found
```

### JSON Path Assertions
```java
// Check field exists
.andExpect(jsonPath("$.id").exists())

// Check field value
.andExpect(jsonPath("$.firstName").value("John"))

// Check array
.andExpect(jsonPath("$").isArray())
.andExpect(jsonPath("$.length()").value(5))

// Check nested object
.andExpect(jsonPath("$.employee.name").value("John"))

// Check array element
.andExpect(jsonPath("$[0].id").value(id.toString()))
```

### Header Assertions
```java
.andExpect(header().string("Content-Type", "application/json"))
.andExpect(header().string("Content-Disposition", "attachment;..."))
.andExpect(header().exists("X-Custom-Header"))
```

### Mockito Verifications
```java
// Verify called once
verify(service, times(1)).method(any());

// Verify called with specific argument
verify(service).method(eq(expectedValue));

// Verify never called
verify(service, never()).method(any());

// Verify called with matcher
verify(service).method(argThat(arg -> arg.getId().equals(id)));
```

---

## Mock Setup Examples

### Mocking Service Response
```java
@BeforeEach
void setUp() {
    employeeResponse = new EmployeeResponse();
    employeeResponse.setId(UUID.randomUUID());
    employeeResponse.setFirstName("John");
}

@Test
void shouldGetEmployee() throws Exception {
    when(employeeService.getEmployee(any(UUID.class)))
            .thenReturn(employeeResponse);

    mockMvc.perform(get("/api/v1/employees/{id}", employeeResponse.getId()))
            .andExpect(status().isOk());
}
```

### Mocking Exception
```java
@Test
void shouldReturn404WhenNotFound() throws Exception {
    when(employeeService.getEmployee(any(UUID.class)))
            .thenThrow(new IllegalArgumentException("Employee not found"));

    mockMvc.perform(get("/api/v1/employees/{id}", UUID.randomUUID()))
            .andExpect(status().isBadRequest());
}
```

### Mocking Page Response
```java
@Test
void shouldGetPagedList() throws Exception {
    List<EmployeeResponse> items = Arrays.asList(emp1, emp2);
    Page<EmployeeResponse> page = new PageImpl<>(
            items,
            PageRequest.of(0, 20),
            2
    );

    when(employeeService.getAllEmployees(any(Pageable.class)))
            .thenReturn(page);

    mockMvc.perform(get("/api/v1/employees"))
            .andExpect(jsonPath("$.content.length()").value(2))
            .andExpect(jsonPath("$.totalPages").value(1));
}
```

---

## Testing Checklist

### Before Running Tests
- [ ] Java version is 11+ installed
- [ ] Maven is installed and in PATH
- [ ] All dependencies in `pom.xml` are downloaded
- [ ] No syntax errors in test files
- [ ] Test database configuration is correct

### When Writing New Tests
- [ ] Use @DisplayName for clarity
- [ ] Organize with @Nested classes
- [ ] Test happy path first
- [ ] Test validation errors
- [ ] Test permission scenarios
- [ ] Test edge cases
- [ ] Use meaningful variable names
- [ ] Mock only what's necessary
- [ ] Verify service calls
- [ ] Assert on response status AND content

### Common Issues & Solutions

#### Issue: Tests fail with "No such bean"
**Solution**: Ensure @MockBean is used for all service dependencies

#### Issue: JSON parsing error in assertions
**Solution**: Verify response is actually JSON with `.andExpect(content().contentType(...))`

#### Issue: Permission tests not working
**Solution**: Remember tests use `@AutoConfigureMockMvc(addFilters = false)` - security filters are disabled

#### Issue: Pageable test fails
**Solution**: Ensure Pageable parameter matches REST API expectations (page, size, sort)

---

## Test Execution Flow

```
mvn test
  ├── Compile test sources
  ├── Load Spring context (once per test class)
  ├── Run @BeforeEach (before each test)
  ├── Execute test method
  ├── Clean up resources (if any)
  ├── Print test results
  └── Repeat for next test
```

---

## Performance Tips

1. **Use @WebMvcTest** instead of @SpringBootTest (faster)
2. **Mock external services** to avoid network calls
3. **Reuse test data** with @BeforeEach instead of creating per test
4. **Parallel execution** with Maven Surefire:
   ```bash
   mvn test -DparallelTestClasses=true
   ```

---

## Debugging Tests

### Run with Debug Output
```bash
mvn test -X  # Maximum verbosity
```

### Run Single Test with Debug
```bash
mvn test -Dtest=EmployeeControllerTest#CreateEmployeeTests -X
```

### Print Test Output
```bash
mvn test -Dorg.slf4j.simpleLogger.defaultLogLevel=debug
```

### Add Debugging to Test
```java
@Test
void shouldDebugTest() throws Exception {
    // Enable detailed response output
    MvcResult result = mockMvc.perform(get("/api/v1/endpoint"))
            .andReturn();

    System.out.println("Response: " + result.getResponse().getContentAsString());
    System.out.println("Status: " + result.getResponse().getStatus());
}
```

---

## Best Practices Summary

✓ Use descriptive @DisplayName annotations
✓ Organize tests with @Nested classes by feature
✓ Follow AAA pattern (Arrange, Act, Assert)
✓ Mock service dependencies with @MockBean
✓ Test both success and failure paths
✓ Verify method calls with Mockito.verify()
✓ Test validation with invalid input
✓ Test permission/authorization scenarios
✓ Use parameterized tests for multiple similar cases
✓ Keep tests independent and isolated
✓ Use meaningful assertion messages
✓ Test edge cases and boundary conditions

---

## Related Documentation

- Test Files: `backend/src/test/java/com/hrms/api/*/controller/*ControllerTest.java`
- Test Summary: `backend/TEST_SUMMARY.md`
- Main Controllers: `backend/src/main/java/com/hrms/api/*/controller/*.java`
- DTOs: `backend/src/main/java/com/hrms/api/*/dto/*.java`
