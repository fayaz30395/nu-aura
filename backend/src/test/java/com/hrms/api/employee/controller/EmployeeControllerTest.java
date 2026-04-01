package com.hrms.api.employee.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.employee.EmployeeController;
import com.hrms.api.employee.dto.CreateEmployeeRequest;
import com.hrms.api.employee.dto.EmployeeResponse;
import com.hrms.api.employee.dto.UpdateEmployeeRequest;
import com.hrms.application.employee.service.EmployeeService;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.TenantFilter;
import com.hrms.domain.employee.Employee;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.user.RoleScope;

import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(EmployeeController.class)
@ContextConfiguration(classes = {EmployeeController.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("EmployeeController Unit Tests")
class EmployeeControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private EmployeeService employeeService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private EmployeeResponse employeeResponse;
    private CreateEmployeeRequest createEmployeeRequest;
    private UpdateEmployeeRequest updateEmployeeRequest;
    private UUID employeeId;
    private UUID departmentId;
    private UUID managerId;

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
    }

    @BeforeEach
    void setUp() {
        employeeId = UUID.randomUUID();
        departmentId = UUID.randomUUID();
        managerId = UUID.randomUUID();

        // Set up SecurityContext so enforceEmployeeViewScope passes
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.EMPLOYEE_VIEW_ALL, RoleScope.GLOBAL);
        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Set.of("ADMIN"), permissions);

        // Set up employee response
        employeeResponse = new EmployeeResponse();
        employeeResponse.setId(employeeId);
        employeeResponse.setEmployeeCode("EMP001");
        employeeResponse.setFirstName("John");
        employeeResponse.setLastName("Doe");
        employeeResponse.setWorkEmail("john.doe@example.com");
        employeeResponse.setDepartmentId(departmentId);
        employeeResponse.setDesignation("Senior Engineer");
        employeeResponse.setEmploymentType(Employee.EmploymentType.FULL_TIME);
        employeeResponse.setJoiningDate(LocalDate.of(2020, 1, 15));
        employeeResponse.setManagerId(managerId);

        // Set up create request
        createEmployeeRequest = new CreateEmployeeRequest();
        createEmployeeRequest.setEmployeeCode("EMP001");
        createEmployeeRequest.setFirstName("John");
        createEmployeeRequest.setLastName("Doe");
        createEmployeeRequest.setWorkEmail("john.doe@example.com");
        createEmployeeRequest.setPassword("TempPassword@123");
        createEmployeeRequest.setDepartmentId(departmentId);
        createEmployeeRequest.setDesignation("Senior Engineer");
        createEmployeeRequest.setEmploymentType(Employee.EmploymentType.FULL_TIME);
        createEmployeeRequest.setJoiningDate(LocalDate.of(2020, 1, 15));
        createEmployeeRequest.setManagerId(managerId);

        // Set up update request
        updateEmployeeRequest = new UpdateEmployeeRequest();
        updateEmployeeRequest.setFirstName("Jane");
        updateEmployeeRequest.setDesignation("Lead Engineer");
    }

    @Nested
    @DisplayName("Create Employee Tests")
    class CreateEmployeeTests {

        @Test
        @DisplayName("Should create employee successfully with valid data")
        void shouldCreateEmployeeSuccessfully() throws Exception {
            when(employeeService.createEmployee(any(CreateEmployeeRequest.class)))
                    .thenReturn(employeeResponse);

            mockMvc.perform(post("/api/v1/employees")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(createEmployeeRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(employeeId.toString()))
                    .andExpect(jsonPath("$.employeeCode").value("EMP001"))
                    .andExpect(jsonPath("$.firstName").value("John"))
                    .andExpect(jsonPath("$.workEmail").value("john.doe@example.com"));

            verify(employeeService, times(1)).createEmployee(any(CreateEmployeeRequest.class));
        }

        @Test
        @DisplayName("Should return 400 for missing required fields")
        void shouldReturn400ForMissingFields() throws Exception {
            CreateEmployeeRequest invalidRequest = new CreateEmployeeRequest();
            invalidRequest.setEmployeeCode("EMP001");
            // Missing firstName, workEmail, password, etc.

            mockMvc.perform(post("/api/v1/employees")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalidRequest)))
                    .andExpect(status().isBadRequest());

            verify(employeeService, never()).createEmployee(any());
        }

        @Test
        @DisplayName("Should return 400 for invalid email format")
        void shouldReturn400ForInvalidEmail() throws Exception {
            createEmployeeRequest.setWorkEmail("invalid-email");

            mockMvc.perform(post("/api/v1/employees")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(createEmployeeRequest)))
                    .andExpect(status().isBadRequest());

            verify(employeeService, never()).createEmployee(any());
        }

        @Test
        @DisplayName("Should throw for duplicate employee code")
        void shouldReturn409ForDuplicateCode() throws Exception {
            when(employeeService.createEmployee(any(CreateEmployeeRequest.class)))
                    .thenThrow(new IllegalArgumentException("Employee code already exists"));

            assertThrows(Exception.class, () ->
                    mockMvc.perform(post("/api/v1/employees")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(createEmployeeRequest))));
        }
    }

    @Nested
    @DisplayName("Get All Employees Tests")
    class GetAllEmployeesTests {

        @Test
        @DisplayName("Should retrieve all employees with pagination")
        void shouldGetAllEmployees() throws Exception {
            List<EmployeeResponse> employees = new ArrayList<>();
            employees.add(employeeResponse);

            EmployeeResponse emp2 = new EmployeeResponse();
            emp2.setId(UUID.randomUUID());
            emp2.setEmployeeCode("EMP002");
            emp2.setFirstName("Jane");
            emp2.setLastName("Smith");
            employees.add(emp2);

            Page<EmployeeResponse> page = new PageImpl<>(employees, PageRequest.of(0, 20), 2);
            when(employeeService.getAllEmployees(any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/employees")
                            .param("page", "0")
                            .param("size", "20")
                            .param("sortBy", "createdAt")
                            .param("sortDirection", "DESC"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray())
                    .andExpect(jsonPath("$.content.length()").value(2))
                    .andExpect(jsonPath("$.totalElements").value(2))
                    .andExpect(jsonPath("$.content[0].employeeCode").value("EMP001"))
                    .andExpect(jsonPath("$.content[1].employeeCode").value("EMP002"));

            verify(employeeService).getAllEmployees(any(Pageable.class));
        }

        @Test
        @DisplayName("Should support custom sort direction")
        void shouldSupportCustomSortDirection() throws Exception {
            Page<EmployeeResponse> emptyPage = Page.empty();
            when(employeeService.getAllEmployees(any(Pageable.class)))
                    .thenReturn(emptyPage);

            mockMvc.perform(get("/api/v1/employees")
                            .param("page", "0")
                            .param("size", "10")
                            .param("sortBy", "firstName")
                            .param("sortDirection", "ASC"))
                    .andExpect(status().isOk());

            verify(employeeService).getAllEmployees(argThat(pageable ->
                    pageable.getSort().stream()
                            .anyMatch(order -> "firstName".equals(order.getProperty()))
            ));
        }

        @Test
        @DisplayName("Should return empty page when no employees exist")
        void shouldReturnEmptyPageWhenNoEmployees() throws Exception {
            Page<EmployeeResponse> emptyPage = Page.empty();
            when(employeeService.getAllEmployees(any(Pageable.class)))
                    .thenReturn(emptyPage);

            mockMvc.perform(get("/api/v1/employees"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray())
                    .andExpect(jsonPath("$.content.length()").value(0))
                    .andExpect(jsonPath("$.totalElements").value(0));
        }
    }

    @Nested
    @DisplayName("Search Employees Tests")
    class SearchEmployeesTests {

        @Test
        @DisplayName("Should search employees by query")
        void shouldSearchEmployees() throws Exception {
            List<EmployeeResponse> results = new ArrayList<>();
            results.add(employeeResponse);

            Page<EmployeeResponse> page = new PageImpl<>(results, PageRequest.of(0, 20), 1);
            when(employeeService.searchEmployees(eq("John"), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/employees/search")
                            .param("query", "John")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1))
                    .andExpect(jsonPath("$.content[0].firstName").value("John"));

            verify(employeeService).searchEmployees(eq("John"), any(Pageable.class));
        }

        @Test
        @DisplayName("Should return empty results for non-matching search")
        void shouldReturnEmptyResultsForNonMatchingSearch() throws Exception {
            Page<EmployeeResponse> emptyPage = Page.empty();
            when(employeeService.searchEmployees(eq("XYZ"), any(Pageable.class)))
                    .thenReturn(emptyPage);

            mockMvc.perform(get("/api/v1/employees/search")
                            .param("query", "XYZ"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(0));
        }
    }

    @Nested
    @DisplayName("Get Employee by ID Tests")
    class GetEmployeeByIdTests {

        @Test
        @DisplayName("Should get employee by ID successfully")
        void shouldGetEmployeeById() throws Exception {
            when(employeeService.getEmployee(eq(employeeId)))
                    .thenReturn(employeeResponse);

            mockMvc.perform(get("/api/v1/employees/{id}", employeeId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(employeeId.toString()))
                    .andExpect(jsonPath("$.employeeCode").value("EMP001"))
                    .andExpect(jsonPath("$.firstName").value("John"))
                    .andExpect(jsonPath("$.workEmail").value("john.doe@example.com"));

            verify(employeeService).getEmployee(eq(employeeId));
        }

        @Test
        @DisplayName("Should throw for non-existent employee")
        void shouldReturn404ForNonExistent() throws Exception {
            UUID nonExistentId = UUID.randomUUID();
            when(employeeService.getEmployee(eq(nonExistentId)))
                    .thenThrow(new IllegalArgumentException("Employee not found"));

            assertThrows(Exception.class, () ->
                    mockMvc.perform(get("/api/v1/employees/{id}", nonExistentId)));
        }
    }

    @Nested
    @DisplayName("Get Employee Hierarchy Tests")
    class GetEmployeeHierarchyTests {

        @Test
        @DisplayName("Should get employee hierarchy")
        void shouldGetEmployeeHierarchy() throws Exception {
            when(employeeService.getEmployeeHierarchy(eq(employeeId)))
                    .thenReturn(employeeResponse);

            mockMvc.perform(get("/api/v1/employees/{id}/hierarchy", employeeId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(employeeId.toString()));

            verify(employeeService).getEmployeeHierarchy(eq(employeeId));
        }
    }

    @Nested
    @DisplayName("Get Subordinates Tests")
    class GetSubordinatesTests {

        @Test
        @DisplayName("Should get subordinates of an employee")
        void shouldGetSubordinates() throws Exception {
            List<EmployeeResponse> subordinates = new ArrayList<>();

            EmployeeResponse sub1 = new EmployeeResponse();
            sub1.setId(UUID.randomUUID());
            sub1.setEmployeeCode("EMP002");
            sub1.setFirstName("Alice");
            subordinates.add(sub1);

            when(employeeService.getSubordinates(eq(managerId)))
                    .thenReturn(subordinates);

            mockMvc.perform(get("/api/v1/employees/{id}/subordinates", managerId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].employeeCode").value("EMP002"));

            verify(employeeService).getSubordinates(eq(managerId));
        }

        @Test
        @DisplayName("Should return empty list when employee has no subordinates")
        void shouldReturnEmptyListForNoSubordinates() throws Exception {
            when(employeeService.getSubordinates(eq(employeeId)))
                    .thenReturn(new ArrayList<>());

            mockMvc.perform(get("/api/v1/employees/{id}/subordinates", employeeId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$.length()").value(0));
        }
    }

    @Nested
    @DisplayName("Get Managers Tests")
    class GetManagersTests {

        @Test
        @DisplayName("Should get eligible managers")
        void shouldGetManagers() throws Exception {
            List<EmployeeResponse> managers = new ArrayList<>();

            EmployeeResponse manager = new EmployeeResponse();
            manager.setId(managerId);
            manager.setEmployeeCode("MGR001");
            manager.setFirstName("Mike");
            manager.setDesignation("Engineering Manager");
            managers.add(manager);

            when(employeeService.getManagerEmployees())
                    .thenReturn(managers);

            mockMvc.perform(get("/api/v1/employees/managers"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].employeeCode").value("MGR001"));

            verify(employeeService).getManagerEmployees();
        }
    }

    @Nested
    @DisplayName("Update Employee Tests")
    class UpdateEmployeeTests {

        @Test
        @DisplayName("Should update employee successfully")
        void shouldUpdateEmployee() throws Exception {
            EmployeeResponse updatedResponse = new EmployeeResponse();
            updatedResponse.setId(employeeId);
            updatedResponse.setEmployeeCode("EMP001");
            updatedResponse.setFirstName("Jane");
            updatedResponse.setDesignation("Lead Engineer");
            updatedResponse.setWorkEmail("john.doe@example.com");

            when(employeeService.updateEmployee(eq(employeeId), any(UpdateEmployeeRequest.class)))
                    .thenReturn(updatedResponse);

            mockMvc.perform(put("/api/v1/employees/{id}", employeeId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(updateEmployeeRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(employeeId.toString()))
                    .andExpect(jsonPath("$.firstName").value("Jane"))
                    .andExpect(jsonPath("$.designation").value("Lead Engineer"));

            verify(employeeService).updateEmployee(eq(employeeId), any(UpdateEmployeeRequest.class));
        }

        @Test
        @DisplayName("Should throw when updating non-existent employee")
        void shouldReturn404WhenUpdatingNonExistent() throws Exception {
            UUID nonExistentId = UUID.randomUUID();
            when(employeeService.updateEmployee(eq(nonExistentId), any(UpdateEmployeeRequest.class)))
                    .thenThrow(new IllegalArgumentException("Employee not found"));

            assertThrows(Exception.class, () ->
                    mockMvc.perform(put("/api/v1/employees/{id}", nonExistentId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(updateEmployeeRequest))));
        }
    }

    @Nested
    @DisplayName("Delete Employee Tests")
    class DeleteEmployeeTests {

        @Test
        @DisplayName("Should delete employee successfully")
        void shouldDeleteEmployee() throws Exception {
            doNothing().when(employeeService).deleteEmployee(eq(employeeId));

            mockMvc.perform(delete("/api/v1/employees/{id}", employeeId))
                    .andExpect(status().isNoContent());

            verify(employeeService).deleteEmployee(eq(employeeId));
        }

        @Test
        @DisplayName("Should throw when deleting non-existent employee")
        void shouldReturn404WhenDeletingNonExistent() throws Exception {
            UUID nonExistentId = UUID.randomUUID();
            doThrow(new IllegalArgumentException("Employee not found"))
                    .when(employeeService).deleteEmployee(eq(nonExistentId));

            assertThrows(Exception.class, () ->
                    mockMvc.perform(delete("/api/v1/employees/{id}", nonExistentId)));
        }
    }
}
