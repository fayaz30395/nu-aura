# Developer Checklist - Backend Unit Tests

## Test Files Created ✓

- [x] `backend/src/test/java/com/hrms/api/employee/controller/EmployeeControllerTest.java`
- [x] `backend/src/test/java/com/hrms/api/leave/controller/LeaveRequestControllerTest.java`
- [x] `backend/src/test/java/com/hrms/api/payroll/controller/PayrollControllerTest.java`
- [x] `backend/src/test/java/com/hrms/api/attendance/controller/AttendanceControllerTest.java`
- [x] `backend/src/test/java/com/hrms/api/user/controller/RoleControllerTest.java`

## Documentation Created ✓

- [x] `backend/TEST_SUMMARY.md` - Comprehensive overview of all tests
- [x] `backend/TESTING_GUIDE.md` - How to run and understand tests
- [x] `backend/DEVELOPER_CHECKLIST.md` - This file

## Test Coverage by Controller

### EmployeeController (24 tests)
**File:** `EmployeeControllerTest.java`

#### Endpoint Coverage:
- [x] POST `/api/v1/employees` - Create employee
  - [x] Happy path: Create with valid data
  - [x] Validation: Missing required fields
  - [x] Validation: Invalid email format
  - [x] Business: Duplicate employee code

- [x] GET `/api/v1/employees` - List employees
  - [x] Happy path: Paginated list
  - [x] Feature: Custom sort direction
  - [x] Edge case: Empty results

- [x] GET `/api/v1/employees/search` - Search employees
  - [x] Happy path: Search by query
  - [x] Edge case: No matching results

- [x] GET `/api/v1/employees/{id}` - Get by ID
  - [x] Happy path: Get existing employee
  - [x] Error: 404 not found

- [x] GET `/api/v1/employees/{id}/hierarchy` - Get hierarchy
  - [x] Happy path: Get organizational hierarchy

- [x] GET `/api/v1/employees/{id}/subordinates` - Get subordinates
  - [x] Happy path: Get direct reports
  - [x] Edge case: No subordinates

- [x] GET `/api/v1/employees/managers` - Get eligible managers
  - [x] Happy path: Get LEAD+ employees

- [x] PUT `/api/v1/employees/{id}` - Update employee
  - [x] Happy path: Update existing
  - [x] Error: 404 not found

- [x] DELETE `/api/v1/employees/{id}` - Delete employee
  - [x] Happy path: Delete existing
  - [x] Error: 404 not found

**Permission Tests:** VIEW_ALL, VIEW_DEPARTMENT, VIEW_TEAM, VIEW_SELF, CREATE, UPDATE, DELETE

---

### LeaveRequestController (24 tests)
**File:** `LeaveRequestControllerTest.java`

#### Endpoint Coverage:
- [x] POST `/api/v1/leave-requests` - Create leave request
  - [x] Happy path: Create with valid data
  - [x] Validation: Missing required fields
  - [x] Business: Invalid date range

- [x] POST `/api/v1/leave-requests/{id}/approve` - Approve leave
  - [x] Happy path: Approve successfully
  - [x] Error: 404 not found
  - [x] Permission: Only manager can approve

- [x] POST `/api/v1/leave-requests/{id}/reject` - Reject leave
  - [x] Happy path: Reject with reason
  - [x] Validation: Reason is required

- [x] POST `/api/v1/leave-requests/{id}/cancel` - Cancel leave
  - [x] Happy path: Cancel successfully
  - [x] Business: Cannot cancel past leave

- [x] GET `/api/v1/leave-requests/{id}` - Get by ID
  - [x] Happy path: Get existing request
  - [x] Error: 404 not found

- [x] GET `/api/v1/leave-requests` - Get all with pagination
  - [x] Happy path: Paginated list

- [x] GET `/api/v1/leave-requests/employee/{employeeId}` - Get by employee
  - [x] Happy path: Get employee's requests

- [x] GET `/api/v1/leave-requests/status/{status}` - Get by status
  - [x] Happy path: Filter by status

- [x] PUT `/api/v1/leave-requests/{id}` - Update leave request
  - [x] Happy path: Update existing
  - [x] Business: Cannot update approved leave

**Permission Tests:** REQUEST, VIEW_ALL, VIEW_TEAM, VIEW_SELF, APPROVE, REJECT, CANCEL

**Status Transitions Tested:** PENDING → APPROVED/REJECTED → LOCKED

---

### PayrollController (23 tests)
**File:** `PayrollControllerTest.java`

#### Endpoint Coverage:
- [x] POST `/api/v1/payroll/runs` - Create payroll run
  - [x] Happy path: Create draft run
  - [x] Validation: Missing fields
  - [x] Business: Duplicate period prevention

- [x] PUT `/api/v1/payroll/runs/{id}` - Update payroll run
  - [x] Happy path: Update draft run
  - [x] Business: Cannot update locked run

- [x] POST `/api/v1/payroll/runs/{id}/process` - Process payroll
  - [x] Happy path: Process successfully
  - [x] Error: 404 not found
  - [x] Business: Cannot process twice

- [x] POST `/api/v1/payroll/runs/{id}/approve` - Approve payroll
  - [x] Happy path: Approve processed run

- [x] POST `/api/v1/payroll/runs/{id}/lock` - Lock payroll
  - [x] Happy path: Lock approved run
  - [x] Business: Only approved runs can be locked

- [x] DELETE `/api/v1/payroll/runs/{id}` - Delete payroll
  - [x] Happy path: Delete draft run
  - [x] Business: Cannot delete locked run

- [x] GET `/api/v1/payroll/runs/{id}` - Get by ID
  - [x] Happy path: Get existing run

- [x] GET `/api/v1/payroll/runs` - List all with pagination
  - [x] Happy path: Paginated list

- [x] GET `/api/v1/payroll/runs/period` - Get by period
  - [x] Happy path: Get by year and month

- [x] GET `/api/v1/payroll/runs/status/{status}` - Get by status
  - [x] Happy path: Filter by status

- [x] POST `/api/v1/payroll/payslips` - Create payslip
  - [x] Happy path: Create successfully

- [x] GET `/api/v1/payroll/payslips/{id}` - Get payslip by ID
  - [x] Happy path: Get existing payslip

- [x] GET `/api/v1/payroll/payslips/employee/{employeeId}` - Get by employee
  - [x] Happy path: Paginated employee payslips

- [x] GET `/api/v1/payroll/payslips/{id}/pdf` - Download PDF
  - [x] Happy path: Download payslip PDF

- [x] DELETE `/api/v1/payroll/payslips/{id}` - Delete payslip
  - [x] Happy path: Delete successfully

- [x] POST `/api/v1/payroll/salary-structures` - Create salary structure
  - [x] Happy path: Create successfully

- [x] GET `/api/v1/payroll/salary-structures/{id}` - Get by ID
  - [x] Happy path: Get existing structure

- [x] GET `/api/v1/payroll/salary-structures/employee/{employeeId}` - Get by employee
  - [x] Happy path: Get employee structures

**Permission Tests:** PROCESS, VIEW_ALL, APPROVE

**State Transitions Tested:** DRAFT → PROCESSED → APPROVED → LOCKED

---

### AttendanceController (23 tests)
**File:** `AttendanceControllerTest.java`

#### Endpoint Coverage:
- [x] POST `/api/v1/attendance/check-in` - Single check-in
  - [x] Happy path: Check in successfully
  - [x] Validation: Missing fields
  - [x] Business: Duplicate check-in prevention

- [x] POST `/api/v1/attendance/check-out` - Single check-out
  - [x] Happy path: Check out successfully
  - [x] Business: Check out without check-in error

- [x] GET `/api/v1/attendance/my-attendance` - Self attendance
  - [x] Happy path: Get own records

- [x] GET `/api/v1/attendance/employee/{employeeId}` - By employee
  - [x] Happy path: Paginated records

- [x] GET `/api/v1/attendance/employee/{employeeId}/range` - By date range
  - [x] Happy path: Get records in range

- [x] GET `/api/v1/attendance/all` - Get all records
  - [x] Happy path: Paginated all records

- [x] GET `/api/v1/attendance/date/{date}` - By specific date
  - [x] Happy path: Records for date

- [x] POST `/api/v1/attendance/multi-check-in` - Break tracking check-in
  - [x] Happy path: Multi-entry check-in

- [x] POST `/api/v1/attendance/multi-check-out` - Break tracking check-out
  - [x] Happy path: Multi-entry check-out

- [x] GET `/api/v1/attendance/time-entries/{attendanceRecordId}` - Get time entries
  - [x] Happy path: Get entries for record

- [x] GET `/api/v1/attendance/my-time-entries` - Self time entries
  - [x] Happy path: Get own entries

- [x] POST `/api/v1/attendance/{id}/request-regularization` - Request regularization
  - [x] Happy path: Request successfully

- [x] POST `/api/v1/attendance/{id}/approve-regularization` - Approve regularization
  - [x] Happy path: Approve successfully

- [x] GET `/api/v1/attendance/pending-regularizations` - Pending list
  - [x] Happy path: Get pending requests

- [x] POST `/api/v1/attendance/bulk-check-in` - Bulk check-in
  - [x] Happy path: Bulk check-in multiple

- [x] POST `/api/v1/attendance/bulk-check-out` - Bulk check-out
  - [x] Happy path: Bulk check-out multiple

- [x] GET `/api/v1/attendance/import/template` - Download template
  - [x] Happy path: Download Excel template

**Permission Tests:** MARK, VIEW_ALL, VIEW_TEAM, VIEW_SELF, REGULARIZE, APPROVE

---

### RoleController (28 tests)
**File:** `RoleControllerTest.java`

#### Endpoint Coverage:
- [x] GET `/api/v1/roles` - Get all roles
  - [x] Happy path: List all roles
  - [x] Edge case: Empty list

- [x] GET `/api/v1/roles/{id}` - Get by ID
  - [x] Happy path: Get existing role
  - [x] Error: 404 not found

- [x] POST `/api/v1/roles` - Create role
  - [x] Happy path: Create successfully
  - [x] Validation: Missing fields
  - [x] Validation: Duplicate code
  - [x] Validation: Code length (50 chars max)
  - [x] Validation: Name length (100 chars max)

- [x] PUT `/api/v1/roles/{id}` - Update role
  - [x] Happy path: Update successfully
  - [x] Error: 404 not found

- [x] DELETE `/api/v1/roles/{id}` - Delete role
  - [x] Happy path: Delete successfully
  - [x] Error: 404 not found
  - [x] Business: Cannot delete with active assignments

- [x] PUT `/api/v1/roles/{id}/permissions` - Assign (replace) permissions
  - [x] Happy path: Assign permissions
  - [x] Error: 404 not found

- [x] POST `/api/v1/roles/{id}/permissions` - Add permissions
  - [x] Happy path: Add new permissions

- [x] DELETE `/api/v1/roles/{id}/permissions` - Remove permissions
  - [x] Happy path: Remove permissions

- [x] PUT `/api/v1/roles/{id}/permissions-with-scope` - Assign with scope
  - [x] Happy path: Assign with RBAC scopes
  - [x] Feature: ALL scope support

- [x] PATCH `/api/v1/roles/{roleId}/permissions/{permissionCode}/scope` - Update permission scope
  - [x] Happy path: Update single permission scope
  - [x] Feature: Custom targets support
  - [x] Error: 404 role not found

**Permission Tests:** ROLE_MANAGE

**Scopes Tested:** ALL, LOCATION, DEPARTMENT, TEAM, SELF, CUSTOM

---

## Running Tests

### Command Summary

```bash
# Run all tests
mvn clean test

# Run specific controller tests
mvn test -Dtest=EmployeeControllerTest
mvn test -Dtest=LeaveRequestControllerTest
mvn test -Dtest=PayrollControllerTest
mvn test -Dtest=AttendanceControllerTest
mvn test -Dtest=RoleControllerTest

# Run specific test suite
mvn test -Dtest=EmployeeControllerTest#CreateEmployeeTests

# Run with coverage report
mvn clean test jacoco:report
```

## Pre-Commit Checklist

Before committing any changes to test files:

- [ ] All tests pass: `mvn clean test`
- [ ] No compilation errors: `mvn clean compile`
- [ ] Test coverage is adequate (>80% for critical paths)
- [ ] Descriptive test names with @DisplayName
- [ ] Tests are organized with @Nested classes
- [ ] Service mocks are set up with @MockBean
- [ ] Assertions cover both success and failure paths
- [ ] Permission tests are included
- [ ] Response validation includes HTTP status + content
- [ ] Edge cases are tested

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-java@v2
        with:
          java-version: '11'
      - run: cd backend && mvn clean test
```

### Jenkins Example
```groovy
stage('Unit Tests') {
    steps {
        dir('backend') {
            sh 'mvn clean test'
        }
    }
}
```

## Adding New Test Cases

When adding new controller endpoints:

1. **Identify the endpoint**: GET/POST/PUT/DELETE + path
2. **Create test class** if not exists (follows pattern: `EndpointControllerTest.java`)
3. **Create @Nested class** for the feature
4. **Write test methods**:
   - Happy path test
   - Validation error test
   - Permission/authorization test
   - Edge case tests (optional)
5. **Use @DisplayName** for clarity
6. **Mock service** with `@MockBean`
7. **Set up test data** in `@BeforeEach`
8. **Run tests**: `mvn test -Dtest=YourControllerTest`
9. **Verify coverage**: Check jsonPath assertions
10. **Update documentation** in TEST_SUMMARY.md

## Test Naming Convention

Follow this pattern for test method names:

```java
// Pattern: should[ExpectedBehavior][When|On][Condition]
void shouldCreateEmployeeSuccessfully() // Happy path
void shouldReturn400ForMissingFields() // Validation
void shouldReturn403WhenNotAuthorized() // Permission
void shouldHandleEmptyListGracefully() // Edge case
```

## Troubleshooting

### Issue: Tests fail with "No qualifying bean"
**Solution**: Add `@MockBean` for all service dependencies

### Issue: JSON assertions fail
**Solution**: Print response with `System.out.println(result.getResponse().getContentAsString())`

### Issue: Pageable parameter not recognized
**Solution**: Ensure test uses spring-data-domain.PageRequest

### Issue: Mock not working
**Solution**: Verify `@ExtendWith(MockitoExtension.class)` is present

## Test Metrics

- **Total Test Classes**: 5
- **Total Test Methods**: 122
- **Total Lines of Test Code**: ~2,700
- **Average Tests per Controller**: ~24
- **Coverage Target**: >85% for critical paths

## References

- JUnit 5 Documentation: https://junit.org/junit5/docs/current/user-guide/
- Mockito Documentation: https://javadoc.io/doc/org.mockito/mockito-core/latest/org/mockito/Mockito.html
- Spring MockMvc: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/test/web/servlet/MockMvc.html

## Contact & Support

For questions about tests:
1. Check `TESTING_GUIDE.md` for usage examples
2. Review existing test in same controller for patterns
3. Refer to TEST_SUMMARY.md for coverage details
