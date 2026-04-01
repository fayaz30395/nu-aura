# Backend Testing Guide

## Quick Start

```bash
# Run all tests
./mvnw test

# Run specific controller test
./mvnw test -Dtest=EmployeeControllerTest
./mvnw test -Dtest=LeaveRequestControllerTest
./mvnw test -Dtest=PayrollControllerTest
./mvnw test -Dtest=AttendanceControllerTest
./mvnw test -Dtest=RoleControllerTest

# Run with coverage
./mvnw test jacoco:report
```

## Prerequisites

- Java 21+
- Maven 3.8+
- Tests run with `@WebMvcTest` (no database or external services required)

## Test Structure

Tests use `@Nested` classes to group by operation:

```java
@WebMvcTest(EmployeeController.class)
@AutoConfigureMockMvc(addFilters = false) // Security filters disabled in unit tests
class EmployeeControllerTest {

    @Nested
    class CreateEmployee {
        @Test void shouldCreateEmployeeWhenValidRequest() { ... }
        @Test void shouldReturn400WhenRequiredFieldsMissing() { ... }
    }

    @Nested
    class GetEmployee {
        @Test void shouldReturnEmployeeWhenExists() { ... }
        @Test void shouldReturn404WhenNotFound() { ... }
    }
}
```

## Test Patterns

### 1. Happy Path
```java
@Test
void shouldCreateEmployeeWhenValidRequest() {
    when(employeeService.create(any())).thenReturn(expectedResponse);
    mockMvc.perform(post("/api/v1/employees")
            .contentType(APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").exists());
}
```

### 2. Validation Error
```java
@Test
void shouldReturn400WhenEmailInvalid() {
    request.setEmail("not-an-email");
    mockMvc.perform(post("/api/v1/employees")
            .contentType(APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isBadRequest());
}
```

### 3. Not Found
```java
@Test
void shouldReturn404WhenEmployeeNotFound() {
    when(employeeService.findById(any())).thenThrow(new ResourceNotFoundException("Employee not found"));
    mockMvc.perform(get("/api/v1/employees/{id}", UUID.randomUUID()))
        .andExpect(status().isNotFound());
}
```

### 4. Pagination
```java
@Test
void shouldReturnPagedResults() {
    Page<EmployeeResponse> page = new PageImpl<>(List.of(response1, response2));
    when(employeeService.findAll(any(Pageable.class))).thenReturn(page);
    mockMvc.perform(get("/api/v1/employees?page=0&size=10"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content").isArray())
        .andExpect(jsonPath("$.totalElements").value(2));
}
```

## Naming Convention

```
should[ExpectedBehavior]When[Condition]
```

Examples:
- `shouldCreateEmployeeWhenValidRequest`
- `shouldReturn400WhenRequiredFieldsMissing`
- `shouldReturn404WhenEmployeeNotFound`
- `shouldReturnPagedResultsWhenPageRequested`

## Debugging

```bash
# Run single test with verbose output
./mvnw test -Dtest="EmployeeControllerTest#shouldCreateEmployeeWhenValidRequest" -X

# Run tests matching pattern
./mvnw test -Dtest="*ControllerTest"
```
