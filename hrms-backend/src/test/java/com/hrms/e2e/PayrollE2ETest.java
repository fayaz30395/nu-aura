package com.hrms.e2e;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.payroll.service.PayrollRunService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.payroll.PayrollRun;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.payroll.repository.PayrollRunRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * End-to-End tests for Payroll functionality.
 * Tests the complete payroll workflow from run creation to approval.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class PayrollE2ETest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PayrollRunService payrollRunService;

    @Autowired
    private PayrollRunRepository payrollRunRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    private static final String BASE_URL = "/api/v1/payroll";
    private static final UUID TEST_USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440000");
    private static final UUID TEST_TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");

    private UUID testEmployeeId;
    private UUID createdPayrollRunId;

    @BeforeAll
    void setUpTestData() {
        setupSecurityContext();

        // Create test employee for payroll
        Employee employee = Employee.builder()
                .employeeCode("PAY_EMP_" + System.currentTimeMillis())
                .firstName("Payroll")
                .lastName("TestEmployee")
                .personalEmail("payroll.test" + System.currentTimeMillis() + "@test.com")
                .status(Employee.EmployeeStatus.ACTIVE)
                .joiningDate(LocalDate.now().minusYears(1))
                .build();
        employee.setTenantId(TEST_TENANT_ID);
        Employee savedEmployee = employeeRepository.save(employee);
        testEmployeeId = savedEmployee.getId();
    }

    @BeforeEach
    void setUp() {
        setupSecurityContext();
    }

    private void setupSecurityContext() {
        Set<String> roles = new HashSet<>(Arrays.asList("ADMIN", "HR", "PAYROLL_ADMIN"));
        Set<String> permissions = new HashSet<>();
        permissions.add(Permission.SYSTEM_ADMIN);
        permissions.add("HRMS:PAYROLL:VIEW_SELF");
        permissions.add("HRMS:PAYROLL:PROCESS");
        permissions.add("HRMS:PAYROLL:APPROVE");

        SecurityContext.setCurrentUser(TEST_USER_ID, testEmployeeId != null ? testEmployeeId : TEST_USER_ID, roles, permissions);
        SecurityContext.setCurrentTenantId(TEST_TENANT_ID);
    }

    // ==================== Payroll Run Creation Tests ====================

    @Test
    @Order(1)
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    @DisplayName("E2E: Create payroll run for current month")
    void createPayrollRun_Success() throws Exception {
        YearMonth currentMonth = YearMonth.now();

        Map<String, Object> createRequest = new HashMap<>();
        createRequest.put("year", currentMonth.getYear());
        createRequest.put("month", currentMonth.getMonthValue());
        createRequest.put("name", "E2E Test Payroll Run - " + currentMonth);
        createRequest.put("description", "Payroll run created by E2E test");

        MvcResult result = mockMvc.perform(post(BASE_URL + "/runs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.year").value(currentMonth.getYear()))
                .andExpect(jsonPath("$.month").value(currentMonth.getMonthValue()))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andReturn();

        String responseBody = result.getResponse().getContentAsString();
        createdPayrollRunId = UUID.fromString(
                objectMapper.readTree(responseBody).get("id").asText()
        );

        assertThat(createdPayrollRunId).isNotNull();
    }

    @Test
    @Order(2)
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    @DisplayName("E2E: Get payroll run by ID")
    void getPayrollRunById_Success() throws Exception {
        assertThat(createdPayrollRunId).isNotNull();

        mockMvc.perform(get(BASE_URL + "/runs/" + createdPayrollRunId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(createdPayrollRunId.toString()))
                .andExpect(jsonPath("$.status").value("DRAFT"));
    }

    // ==================== Payroll Run Update Tests ====================

    @Test
    @Order(3)
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    @DisplayName("E2E: Update payroll run")
    void updatePayrollRun_Success() throws Exception {
        assertThat(createdPayrollRunId).isNotNull();

        Map<String, Object> updateRequest = new HashMap<>();
        updateRequest.put("name", "Updated E2E Test Payroll Run");
        updateRequest.put("description", "Updated description");

        mockMvc.perform(put(BASE_URL + "/runs/" + createdPayrollRunId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated E2E Test Payroll Run"));
    }

    // ==================== Payroll Processing Tests ====================

    @Test
    @Order(4)
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    @DisplayName("E2E: Process payroll run")
    void processPayrollRun_Success() throws Exception {
        assertThat(createdPayrollRunId).isNotNull();

        mockMvc.perform(post(BASE_URL + "/runs/" + createdPayrollRunId + "/process"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PROCESSING"));
    }

    @Test
    @Order(5)
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    @DisplayName("E2E: Get payroll run status after processing")
    void getPayrollRunStatus_AfterProcessing() throws Exception {
        assertThat(createdPayrollRunId).isNotNull();

        mockMvc.perform(get(BASE_URL + "/runs/" + createdPayrollRunId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(createdPayrollRunId.toString()));
    }

    // ==================== Payroll Approval Tests ====================

    @Test
    @Order(6)
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    @DisplayName("E2E: Approve payroll run")
    void approvePayrollRun_Success() throws Exception {
        assertThat(createdPayrollRunId).isNotNull();

        // First ensure it's in a state that can be approved
        // Update status directly for testing
        Optional<PayrollRun> run = payrollRunRepository.findById(createdPayrollRunId);
        if (run.isPresent()) {
            PayrollRun payrollRun = run.get();
            payrollRun.setStatus(PayrollRun.PayrollStatus.PROCESSED);
            payrollRunRepository.save(payrollRun);
        }

        mockMvc.perform(post(BASE_URL + "/runs/" + createdPayrollRunId + "/approve"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    // ==================== Payroll Query Tests ====================

    @Test
    @Order(7)
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    @DisplayName("E2E: Get all payroll runs with pagination")
    void getAllPayrollRuns_WithPagination() throws Exception {
        mockMvc.perform(get(BASE_URL + "/runs")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.pageable").exists());
    }

    @Test
    @Order(8)
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    @DisplayName("E2E: Get payroll runs by year and month")
    void getPayrollRunsByYearAndMonth_Success() throws Exception {
        YearMonth currentMonth = YearMonth.now();

        mockMvc.perform(get(BASE_URL + "/runs")
                        .param("year", String.valueOf(currentMonth.getYear()))
                        .param("month", String.valueOf(currentMonth.getMonthValue())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    // ==================== Payslip Tests ====================

    @Test
    @Order(9)
    @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
    @DisplayName("E2E: Get my payslips")
    void getMyPayslips_Success() throws Exception {
        SecurityContext.setCurrentUser(TEST_USER_ID, testEmployeeId,
                new HashSet<>(Arrays.asList("EMPLOYEE")),
                new HashSet<>(Arrays.asList("HRMS:PAYROLL:VIEW_SELF")));

        mockMvc.perform(get(BASE_URL + "/payslips/my")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk());
    }

    // ==================== Service Layer Tests ====================

    @Test
    @Order(10)
    @DisplayName("E2E: PayrollRunService creates and processes run")
    void payrollRunService_CreateAndProcessFlow() {
        YearMonth testMonth = YearMonth.now().minusMonths(1);

        // Create payroll run via service
        PayrollRun payrollRun = PayrollRun.builder()
                .payPeriodYear(testMonth.getYear())
                .payPeriodMonth(testMonth.getMonthValue())
                .payrollDate(LocalDate.now())
                .status(PayrollRun.PayrollStatus.DRAFT)
                .build();
        payrollRun.setTenantId(TEST_TENANT_ID);

        PayrollRun created = payrollRunService.createPayrollRun(payrollRun);

        assertThat(created).isNotNull();
        assertThat(created.getId()).isNotNull();
        assertThat(created.getStatus()).isEqualTo(PayrollRun.PayrollStatus.DRAFT);

        // Process the run
        PayrollRun processed = payrollRunService.processPayrollRun(created.getId(), TEST_USER_ID);
        assertThat(processed.getStatus()).isIn(
                PayrollRun.PayrollStatus.PROCESSING,
                PayrollRun.PayrollStatus.PROCESSED
        );

        // Clean up
        payrollRunRepository.deleteById(created.getId());
    }

    // ==================== Validation Tests ====================

    @Test
    @Order(11)
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    @DisplayName("E2E: Create payroll run with invalid year fails")
    void createPayrollRun_InvalidYear_Fails() throws Exception {
        Map<String, Object> createRequest = new HashMap<>();
        createRequest.put("year", 1999); // Invalid year
        createRequest.put("month", 1);
        createRequest.put("name", "Invalid Year Test");

        mockMvc.perform(post(BASE_URL + "/runs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(12)
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    @DisplayName("E2E: Create payroll run with invalid month fails")
    void createPayrollRun_InvalidMonth_Fails() throws Exception {
        Map<String, Object> createRequest = new HashMap<>();
        createRequest.put("year", YearMonth.now().getYear());
        createRequest.put("month", 13); // Invalid month
        createRequest.put("name", "Invalid Month Test");

        mockMvc.perform(post(BASE_URL + "/runs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(13)
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    @DisplayName("E2E: Get non-existent payroll run returns 404")
    void getPayrollRun_NotFound() throws Exception {
        UUID nonExistentId = UUID.randomUUID();

        mockMvc.perform(get(BASE_URL + "/runs/" + nonExistentId))
                .andExpect(status().isNotFound());
    }

    @AfterAll
    void cleanUp() {
        // Clean up test payroll runs
        if (createdPayrollRunId != null) {
            payrollRunRepository.deleteById(createdPayrollRunId);
        }
        // Clean up test employee
        if (testEmployeeId != null) {
            employeeRepository.deleteById(testEmployeeId);
        }
    }
}
