package com.hrms.e2e;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.leave.service.LeaveBalanceService;
import com.hrms.application.leave.service.LeaveRequestService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.leave.LeaveBalance;
import com.hrms.domain.leave.LeaveRequest;
import com.hrms.domain.leave.LeaveType;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.leave.repository.LeaveBalanceRepository;
import com.hrms.infrastructure.leave.repository.LeaveRequestRepository;
import com.hrms.infrastructure.leave.repository.LeaveTypeRepository;
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
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * End-to-End tests for Leave Request functionality.
 * Tests the complete leave workflow from request to approval/rejection.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class LeaveRequestE2ETest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private LeaveRequestService leaveRequestService;

    @Autowired
    private LeaveBalanceService leaveBalanceService;

    @Autowired
    private LeaveRequestRepository leaveRequestRepository;

    @Autowired
    private LeaveTypeRepository leaveTypeRepository;

    @Autowired
    private LeaveBalanceRepository leaveBalanceRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    private static final String BASE_URL = "/api/v1/leave-requests";
    private static final UUID TEST_USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440000");
    private static final UUID TEST_EMPLOYEE_ID = UUID.fromString("111e8400-e29b-41d4-a716-446655440099");
    private static final UUID TEST_MANAGER_ID = UUID.fromString("222e8400-e29b-41d4-a716-446655440099");
    private static final UUID TEST_TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");

    private UUID testLeaveTypeId;
    private UUID testEmployeeId;
    private UUID createdLeaveRequestId;

    @BeforeAll
    void setUpTestData() {
        setupSecurityContext();

        // Create test leave type
        LeaveType leaveType = LeaveType.builder()
                .leaveName("Annual Leave Test")
                .leaveCode("AL_TEST_" + System.currentTimeMillis())
                .description("Test annual leave")
                .annualQuota(BigDecimal.valueOf(20))
                .maxCarryForwardDays(BigDecimal.valueOf(5))
                .isPaid(true)
                .isActive(true)
                .build();
        leaveType.setTenantId(TEST_TENANT_ID);
        LeaveType savedLeaveType = leaveTypeRepository.save(leaveType);
        testLeaveTypeId = savedLeaveType.getId();

        // Create test employee
        Employee employee = Employee.builder()
                .employeeCode("EMP_TEST_" + System.currentTimeMillis())
                .firstName("Test")
                .lastName("Employee")
                .personalEmail("test.employee" + System.currentTimeMillis() + "@test.com")
                .status(Employee.EmployeeStatus.ACTIVE)
                .joiningDate(LocalDate.now().minusMonths(6))
                .managerId(TEST_MANAGER_ID)
                .build();
        employee.setTenantId(TEST_TENANT_ID);
        Employee savedEmployee = employeeRepository.save(employee);
        testEmployeeId = savedEmployee.getId();

        // Create leave balance for the employee
        LeaveBalance balance = LeaveBalance.builder()
                .employeeId(testEmployeeId)
                .leaveTypeId(testLeaveTypeId)
                .year(LocalDate.now().getYear())
                .openingBalance(BigDecimal.valueOf(20))
                .accrued(BigDecimal.ZERO)
                .used(BigDecimal.ZERO)
                .pending(BigDecimal.ZERO)
                .carriedForward(BigDecimal.ZERO)
                .available(BigDecimal.valueOf(20))
                .build();
        balance.setTenantId(TEST_TENANT_ID);
        leaveBalanceRepository.save(balance);
    }

    @BeforeEach
    void setUp() {
        setupSecurityContext();
    }

    private void setupSecurityContext() {
        Set<String> roles = new HashSet<>(Arrays.asList("ADMIN", "HR", "EMPLOYEE"));
        Set<String> permissions = new HashSet<>();
        permissions.add(Permission.SYSTEM_ADMIN);
        permissions.add("HRMS:LEAVE:REQUEST");
        permissions.add("HRMS:LEAVE:VIEW_SELF");
        permissions.add("HRMS:LEAVE:CANCEL");
        permissions.add("HRMS:LEAVE:APPROVE");

        SecurityContext.setCurrentUser(TEST_USER_ID, testEmployeeId != null ? testEmployeeId : TEST_EMPLOYEE_ID, roles, permissions);
        SecurityContext.setCurrentTenantId(TEST_TENANT_ID);
    }

    // ==================== Leave Request Creation Tests ====================

    @Test
    @Order(1)
    @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
    @DisplayName("E2E: Create leave request successfully")
    void createLeaveRequest_Success() throws Exception {
        LocalDate startDate = LocalDate.now().plusDays(7);
        LocalDate endDate = startDate.plusDays(2);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("employeeId", testEmployeeId.toString());
        requestBody.put("leaveTypeId", testLeaveTypeId.toString());
        requestBody.put("startDate", startDate.toString());
        requestBody.put("endDate", endDate.toString());
        requestBody.put("totalDays", 3);
        requestBody.put("reason", "Family vacation - E2E test");
        requestBody.put("isHalfDay", false);

        MvcResult result = mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.requestNumber").exists())
                .andReturn();

        // Store ID for subsequent tests
        String responseBody = result.getResponse().getContentAsString();
        createdLeaveRequestId = UUID.fromString(
                objectMapper.readTree(responseBody).get("id").asText()
        );

        assertThat(createdLeaveRequestId).isNotNull();
    }

    @Test
    @Order(2)
    @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
    @DisplayName("E2E: Get created leave request by ID")
    void getLeaveRequestById_Success() throws Exception {
        assertThat(createdLeaveRequestId).isNotNull();

        mockMvc.perform(get(BASE_URL + "/" + createdLeaveRequestId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(createdLeaveRequestId.toString()))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.reason").value("Family vacation - E2E test"));
    }

    @Test
    @Order(3)
    @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
    @DisplayName("E2E: Get my leave requests")
    void getMyLeaveRequests_Success() throws Exception {
        SecurityContext.setCurrentUser(TEST_USER_ID, testEmployeeId,
                new HashSet<>(Arrays.asList("EMPLOYEE")),
                new HashSet<>(Arrays.asList("HRMS:LEAVE:VIEW_SELF")));

        mockMvc.perform(get(BASE_URL + "/my-requests")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    // ==================== Leave Request Update Tests ====================

    @Test
    @Order(4)
    @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
    @DisplayName("E2E: Update pending leave request")
    void updateLeaveRequest_Success() throws Exception {
        assertThat(createdLeaveRequestId).isNotNull();

        LocalDate newStartDate = LocalDate.now().plusDays(14);
        LocalDate newEndDate = newStartDate.plusDays(1);

        Map<String, Object> updateBody = new HashMap<>();
        updateBody.put("leaveTypeId", testLeaveTypeId.toString());
        updateBody.put("startDate", newStartDate.toString());
        updateBody.put("endDate", newEndDate.toString());
        updateBody.put("totalDays", 2);
        updateBody.put("reason", "Updated reason - E2E test");
        updateBody.put("isHalfDay", false);

        mockMvc.perform(put(BASE_URL + "/" + createdLeaveRequestId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reason").value("Updated reason - E2E test"))
                .andExpect(jsonPath("$.totalDays").value(2));
    }

    // ==================== Leave Request Approval Tests ====================

    @Test
    @Order(5)
    @WithMockUser(username = "manager@test.com", roles = {"MANAGER", "ADMIN"})
    @DisplayName("E2E: Approve leave request")
    void approveLeaveRequest_Success() throws Exception {
        assertThat(createdLeaveRequestId).isNotNull();

        // Set up manager context
        setupSecurityContext();

        mockMvc.perform(put(BASE_URL + "/" + createdLeaveRequestId + "/approve"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.approvedBy").exists());

        // Verify the leave request status in database
        Optional<LeaveRequest> request = leaveRequestRepository.findById(createdLeaveRequestId);
        assertThat(request).isPresent();
        assertThat(request.get().getStatus()).isEqualTo(LeaveRequest.LeaveRequestStatus.APPROVED);
    }

    // ==================== Leave Request Rejection Tests ====================

    @Test
    @Order(6)
    @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
    @DisplayName("E2E: Create and reject leave request")
    void createAndRejectLeaveRequest_Success() throws Exception {
        // Create a new leave request
        LocalDate startDate = LocalDate.now().plusDays(21);
        LocalDate endDate = startDate.plusDays(1);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("employeeId", testEmployeeId.toString());
        requestBody.put("leaveTypeId", testLeaveTypeId.toString());
        requestBody.put("startDate", startDate.toString());
        requestBody.put("endDate", endDate.toString());
        requestBody.put("totalDays", 2);
        requestBody.put("reason", "Request to be rejected - E2E test");
        requestBody.put("isHalfDay", false);

        MvcResult createResult = mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isCreated())
                .andReturn();

        UUID newRequestId = UUID.fromString(
                objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asText()
        );

        // Reject the leave request
        Map<String, String> rejectBody = new HashMap<>();
        rejectBody.put("reason", "Project deadline - cannot approve");

        mockMvc.perform(put(BASE_URL + "/" + newRequestId + "/reject")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(rejectBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.rejectionReason").value("Project deadline - cannot approve"));
    }

    // ==================== Leave Request Cancellation Tests ====================

    @Test
    @Order(7)
    @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
    @DisplayName("E2E: Create and cancel leave request")
    void createAndCancelLeaveRequest_Success() throws Exception {
        // Create a new leave request
        LocalDate startDate = LocalDate.now().plusDays(28);
        LocalDate endDate = startDate;

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("employeeId", testEmployeeId.toString());
        requestBody.put("leaveTypeId", testLeaveTypeId.toString());
        requestBody.put("startDate", startDate.toString());
        requestBody.put("endDate", endDate.toString());
        requestBody.put("totalDays", 1);
        requestBody.put("reason", "Request to be cancelled - E2E test");
        requestBody.put("isHalfDay", false);

        MvcResult createResult = mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isCreated())
                .andReturn();

        UUID newRequestId = UUID.fromString(
                objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asText()
        );

        // Cancel the leave request
        Map<String, String> cancelBody = new HashMap<>();
        cancelBody.put("reason", "Plans changed");

        mockMvc.perform(put(BASE_URL + "/" + newRequestId + "/cancel")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cancelBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    // ==================== Leave Request Query Tests ====================

    @Test
    @Order(8)
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    @DisplayName("E2E: Get leave requests by status")
    void getLeaveRequestsByStatus_Success() throws Exception {
        mockMvc.perform(get(BASE_URL + "/status/APPROVED")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    @Order(9)
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    @DisplayName("E2E: Get all leave requests with pagination")
    void getAllLeaveRequests_WithPagination() throws Exception {
        mockMvc.perform(get(BASE_URL)
                        .param("page", "0")
                        .param("size", "5")
                        .param("sort", "createdAt,desc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.pageable").exists())
                .andExpect(jsonPath("$.totalElements").exists());
    }

    // ==================== Service Layer Tests ====================

    @Test
    @Order(10)
    @DisplayName("E2E: LeaveRequestService direct create and approve flow")
    void leaveRequestService_CreateAndApproveFlow() {
        // Create request via service
        LeaveRequest request = LeaveRequest.builder()
                .employeeId(testEmployeeId)
                .leaveTypeId(testLeaveTypeId)
                .startDate(LocalDate.now().plusDays(35))
                .endDate(LocalDate.now().plusDays(36))
                .totalDays(BigDecimal.valueOf(2))
                .reason("Service layer test")
                .status(LeaveRequest.LeaveRequestStatus.PENDING)
                .isHalfDay(false)
                .build();
        request.setTenantId(TEST_TENANT_ID);

        LeaveRequest created = leaveRequestService.createLeaveRequest(request);
        assertThat(created.getId()).isNotNull();
        assertThat(created.getRequestNumber()).isNotNull();
        assertThat(created.getStatus()).isEqualTo(LeaveRequest.LeaveRequestStatus.PENDING);

        // Approve via service
        LeaveRequest approved = leaveRequestService.approveLeaveRequest(created.getId(), TEST_USER_ID);
        assertThat(approved.getStatus()).isEqualTo(LeaveRequest.LeaveRequestStatus.APPROVED);
        assertThat(approved.getApprovedBy()).isEqualTo(TEST_USER_ID);
    }

    // ==================== Validation Tests ====================

    @Test
    @Order(11)
    @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
    @DisplayName("E2E: Create leave request with invalid dates fails")
    void createLeaveRequest_InvalidDates_Fails() throws Exception {
        // End date before start date
        LocalDate startDate = LocalDate.now().plusDays(10);
        LocalDate endDate = startDate.minusDays(1);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("employeeId", testEmployeeId.toString());
        requestBody.put("leaveTypeId", testLeaveTypeId.toString());
        requestBody.put("startDate", startDate.toString());
        requestBody.put("endDate", endDate.toString());
        requestBody.put("totalDays", 1);
        requestBody.put("reason", "Invalid date test");
        requestBody.put("isHalfDay", false);

        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(12)
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    @DisplayName("E2E: Get non-existent leave request returns 404")
    void getLeaveRequest_NotFound() throws Exception {
        UUID nonExistentId = UUID.randomUUID();

        mockMvc.perform(get(BASE_URL + "/" + nonExistentId))
                .andExpect(status().isNotFound());
    }

    @AfterAll
    void cleanUp() {
        // Clean up test data
        if (testLeaveTypeId != null) {
            leaveRequestRepository.deleteAll(
                    leaveRequestRepository.findAll().stream()
                            .filter(lr -> lr.getLeaveTypeId().equals(testLeaveTypeId))
                            .toList()
            );
            leaveBalanceRepository.deleteAll(
                    leaveBalanceRepository.findAll().stream()
                            .filter(lb -> lb.getLeaveTypeId().equals(testLeaveTypeId))
                            .toList()
            );
            leaveTypeRepository.deleteById(testLeaveTypeId);
        }
        if (testEmployeeId != null) {
            employeeRepository.deleteById(testEmployeeId);
        }
    }
}
