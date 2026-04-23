package com.hrms.e2e;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.attendance.service.AttendanceRecordService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.attendance.AttendanceRecord;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.user.User;
import com.hrms.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

import com.hrms.domain.user.RoleScope;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * End-to-End tests for Attendance functionality.
 * Tests the complete attendance workflow including check-in, check-out, and time entries.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class AttendanceE2ETest {

    private static final String BASE_URL = "/api/v1/attendance";
    private static final UUID TEST_USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440000");
    private static final UUID TEST_TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private AttendanceRecordService attendanceRecordService;
    @Autowired
    private AttendanceRecordRepository attendanceRecordRepository;
    @Autowired
    private EmployeeRepository employeeRepository;
    @Autowired
    private UserRepository userRepository;
    private UUID testEmployeeId;
    private UUID testUserId;
    private UUID attendanceRecordId;

    @BeforeAll
    void setUpTestData() {
        setupSecurityContext();

        // Create test user first (required for Employee)
        String uniqueSuffix = String.valueOf(System.currentTimeMillis());
        User testUser = User.builder()
                .email("attendance.test" + uniqueSuffix + "@test.com")
                .passwordHash("$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG")
                .firstName("Attendance")
                .lastName("TestEmployee")
                .status(User.UserStatus.ACTIVE)
                .build();
        testUser.setTenantId(TEST_TENANT_ID);
        User savedUser = userRepository.save(testUser);
        testUserId = savedUser.getId();

        // Create test employee linked to user
        Employee employee = Employee.builder()
                .employeeCode("ATT_EMP_" + uniqueSuffix)
                .firstName("Attendance")
                .lastName("TestEmployee")
                .personalEmail("attendance.test" + uniqueSuffix + "@test.com")
                .status(Employee.EmployeeStatus.ACTIVE)
                .employmentType(Employee.EmploymentType.FULL_TIME)
                .joiningDate(LocalDate.now().minusMonths(3))
                .user(savedUser)
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
        setupSecurityContext(testEmployeeId != null ? testEmployeeId : TEST_USER_ID);
    }

    private void setupSecurityContext(UUID currentEmployeeId) {
        Set<String> roles = new HashSet<>(Arrays.asList("ADMIN", "EMPLOYEE"));
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.SYSTEM_ADMIN, RoleScope.ALL);
        permissions.put("HRMS:ATTENDANCE:MARK", RoleScope.ALL);
        permissions.put("HRMS:ATTENDANCE:VIEW_SELF", RoleScope.ALL);
        permissions.put("HRMS:ATTENDANCE:REGULARIZE", RoleScope.ALL);

        SecurityContext.setCurrentUser(TEST_USER_ID, currentEmployeeId, roles, permissions);
        TenantContext.setCurrentTenant(TEST_TENANT_ID);
        TenantContext.setCurrentTenant(TEST_TENANT_ID);
    }

    /**
     * Helper method to create a test employee with associated user
     */
    private Employee createTestEmployee(String prefix) {
        String uniqueSuffix = prefix + "_" + System.currentTimeMillis();

        // Create user first
        User user = User.builder()
                .email(uniqueSuffix.toLowerCase() + "@test.com")
                .passwordHash("$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG")
                .firstName(prefix)
                .lastName("TestEmployee")
                .status(User.UserStatus.ACTIVE)
                .build();
        user.setTenantId(TEST_TENANT_ID);
        User savedUser = userRepository.save(user);

        // Create employee linked to user
        Employee employee = Employee.builder()
                .employeeCode(uniqueSuffix)
                .firstName(prefix)
                .lastName("TestEmployee")
                .personalEmail(uniqueSuffix.toLowerCase() + "@test.com")
                .status(Employee.EmployeeStatus.ACTIVE)
                .employmentType(Employee.EmploymentType.FULL_TIME)
                .joiningDate(LocalDate.now().minusMonths(1))
                .user(savedUser)
                .build();
        employee.setTenantId(TEST_TENANT_ID);
        return employeeRepository.save(employee);
    }

    /**
     * Helper method to delete a test employee and their associated user
     */
    private void deleteTestEmployee(UUID employeeId) {
        employeeRepository.findById(employeeId).ifPresent(employee -> {
            UUID userId = employee.getUser() != null ? employee.getUser().getId() : null;
            employeeRepository.deleteById(employeeId);
            if (userId != null) {
                userRepository.deleteById(userId);
            }
        });
    }

    // ==================== Check-In Tests ====================

    @Test
    @Order(1)
    @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
    @DisplayName("E2E: Employee check-in successfully")
    void checkIn_Success() throws Exception {
        Map<String, Object> checkInRequest = new HashMap<>();
        checkInRequest.put("employeeId", testEmployeeId.toString());
        checkInRequest.put("source", "WEB");
        checkInRequest.put("location", "Office - HQ");
        checkInRequest.put("ip", "192.168.1.100");

        MvcResult result = mockMvc.perform(post(BASE_URL + "/check-in")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(checkInRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.employeeId").value(testEmployeeId.toString()))
                .andExpect(jsonPath("$.checkInTime").exists())
                .andExpect(jsonPath("$.status").value("PRESENT"))
                .andReturn();

        String responseBody = result.getResponse().getContentAsString();
        attendanceRecordId = UUID.fromString(
                objectMapper.readTree(responseBody).get("id").asText()
        );

        assertThat(attendanceRecordId).isNotNull();
    }

    @Test
    @Order(2)
    @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
    @DisplayName("E2E: Get today's attendance after check-in")
    void getTodayAttendance_AfterCheckIn() throws Exception {
        LocalDate today = LocalDate.now();
        mockMvc.perform(get(BASE_URL + "/my-attendance")
                        .param("startDate", today.toString())
                        .param("endDate", today.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[0].employeeId").value(testEmployeeId.toString()))
                .andExpect(jsonPath("$.content[0].checkInTime").exists())
                .andExpect(jsonPath("$.content[0].status").value("PRESENT"));
    }

    // ==================== Check-Out Tests ====================

    @Test
    @Order(3)
    @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
    @DisplayName("E2E: Employee check-out successfully")
    void checkOut_Success() throws Exception {
        Map<String, Object> checkOutRequest = new HashMap<>();
        checkOutRequest.put("employeeId", testEmployeeId.toString());
        checkOutRequest.put("source", "WEB");
        checkOutRequest.put("location", "Office - HQ");
        checkOutRequest.put("ip", "192.168.1.100");

        mockMvc.perform(post(BASE_URL + "/check-out")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(checkOutRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.employeeId").value(testEmployeeId.toString()))
                .andExpect(jsonPath("$.checkOutTime").exists())
                .andExpect(jsonPath("$.workDurationMinutes").exists());
    }

    @Test
    @Order(4)
    @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
    @DisplayName("E2E: Get attendance record with work duration calculated")
    void getAttendanceRecord_WithWorkDuration() throws Exception {
        assertThat(attendanceRecordId).isNotNull();

        // Use my-attendance endpoint to get today's records
        LocalDate today = LocalDate.now();
        mockMvc.perform(get(BASE_URL + "/my-attendance")
                        .param("startDate", today.toString())
                        .param("endDate", today.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].checkInTime").exists())
                .andExpect(jsonPath("$.content[0].checkOutTime").exists())
                .andExpect(jsonPath("$.content[0].workDurationMinutes").exists());
    }

    // ==================== Multi Check-In/Out Tests ====================

    @Test
    @Order(5)
    @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
    @DisplayName("E2E: Multiple check-in sessions (lunch break scenario)")
    void multipleCheckInSessions_LunchBreak() throws Exception {
        // Create a new employee for this test to avoid conflicts
        Employee savedBreakEmployee = createTestEmployee("BREAK_EMP");
        UUID breakEmployeeId = savedBreakEmployee.getId();

        try {
            // First check-in (morning)
            Map<String, Object> morningCheckIn = new HashMap<>();
            morningCheckIn.put("employeeId", breakEmployeeId.toString());
            morningCheckIn.put("source", "WEB");

            mockMvc.perform(post(BASE_URL + "/check-in")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(morningCheckIn)))
                    .andExpect(status().isCreated());

            // Check-out for lunch
            Map<String, Object> lunchCheckOut = new HashMap<>();
            lunchCheckOut.put("employeeId", breakEmployeeId.toString());
            lunchCheckOut.put("source", "WEB");

            mockMvc.perform(post(BASE_URL + "/check-out")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(lunchCheckOut)))
                    .andExpect(status().isOk());

            // Get time entries to verify
            mockMvc.perform(get(BASE_URL + "/employee/" + breakEmployeeId + "/time-entries")
                            .param("date", LocalDate.now().toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray());

        } finally {
            // Clean up
            attendanceRecordRepository.deleteAll(
                    attendanceRecordRepository.findAll().stream()
                            .filter(ar -> ar.getEmployeeId().equals(breakEmployeeId))
                            .toList()
            );
            deleteTestEmployee(breakEmployeeId);
        }
    }

    // ==================== Date Range Query Tests ====================

    @Test
    @Order(6)
    @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
    @DisplayName("E2E: Get attendance records by date range")
    void getAttendanceByDateRange_Success() throws Exception {
        LocalDate today = LocalDate.now();
        LocalDate weekAgo = today.minusDays(7);

        mockMvc.perform(get(BASE_URL + "/employee/" + testEmployeeId)
                        .param("startDate", weekAgo.toString())
                        .param("endDate", today.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    @Order(7)
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    @DisplayName("E2E: Get all attendance records for employee (paginated)")
    void getAllAttendanceForEmployee_Success() throws Exception {
        mockMvc.perform(get(BASE_URL + "/employee/" + testEmployeeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    // ==================== Service Layer Direct Tests ====================

    @Test
    @Order(8)
    @DisplayName("E2E: AttendanceRecordService check-in flow")
    void attendanceService_CheckInFlow() {
        // Create a unique employee for service test
        Employee savedServiceEmployee = createTestEmployee("SVC_EMP");
        UUID serviceEmployeeId = savedServiceEmployee.getId();

        try {
            LocalDateTime checkInTime = LocalDateTime.now();

            AttendanceRecord record = attendanceRecordService.checkIn(
                    serviceEmployeeId,
                    checkInTime,
                    "WEB",
                    "Office",
                    "127.0.0.1"
            );

            assertThat(record).isNotNull();
            assertThat(record.getId()).isNotNull();
            assertThat(record.getEmployeeId()).isEqualTo(serviceEmployeeId);
            assertThat(record.getCheckInTime()).isNotNull();
            assertThat(record.getStatus()).isEqualTo(AttendanceRecord.AttendanceStatus.PRESENT);

            // Verify check-out
            LocalDateTime checkOutTime = checkInTime.plusHours(8);
            AttendanceRecord checkedOut = attendanceRecordService.checkOut(
                    serviceEmployeeId,
                    checkOutTime,
                    "WEB",
                    "Office",
                    "127.0.0.1"
            );

            assertThat(checkedOut.getCheckOutTime()).isNotNull();
            assertThat(checkedOut.getWorkDurationMinutes()).isNotNull();

        } finally {
            // Clean up
            attendanceRecordRepository.deleteAll(
                    attendanceRecordRepository.findAll().stream()
                            .filter(ar -> ar.getEmployeeId().equals(serviceEmployeeId))
                            .toList()
            );
            deleteTestEmployee(serviceEmployeeId);
        }
    }

    // ==================== Regularization Tests ====================

    @Test
    @Order(9)
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    @DisplayName("E2E: Regularize attendance record")
    void regularizeAttendance_Success() throws Exception {
        // Create an attendance record for yesterday
        Employee savedRegEmployee = createTestEmployee("REG_EMP");
        UUID regEmployeeId = savedRegEmployee.getId();

        try {
            // Create attendance record directly in DB for yesterday
            AttendanceRecord yesterdayRecord = AttendanceRecord.builder()
                    .employeeId(regEmployeeId)
                    .attendanceDate(LocalDate.now().minusDays(1))
                    .checkInTime(LocalDateTime.of(LocalDate.now().minusDays(1), LocalTime.of(9, 0)))
                    .status(AttendanceRecord.AttendanceStatus.PRESENT)
                    .build();
            yesterdayRecord.setTenantId(TEST_TENANT_ID);
            AttendanceRecord savedRecord = attendanceRecordRepository.save(yesterdayRecord);

            // Request regularization - uses POST with query param
            mockMvc.perform(post(BASE_URL + "/" + savedRecord.getId() + "/request-regularization")
                            .param("reason", "Forgot to check out - E2E test"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.regularizationRequested").value(true));

        } finally {
            // Clean up
            attendanceRecordRepository.deleteAll(
                    attendanceRecordRepository.findAll().stream()
                            .filter(ar -> ar.getEmployeeId().equals(regEmployeeId))
                            .toList()
            );
            deleteTestEmployee(regEmployeeId);
        }
    }

    // ==================== Timezone / AttendanceDate Tests ====================

    @Test
    @Order(10)
    @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
    @DisplayName("E2E: Check-in with explicit attendanceDate")
    void checkIn_WithAttendanceDate_Success() throws Exception {
        Employee tzEmployee = createTestEmployee("TZ_EMP");
        UUID tzEmployeeId = tzEmployee.getId();

        try {
            LocalDate today = LocalDate.now();
            Map<String, Object> checkInRequest = new HashMap<>();
            checkInRequest.put("employeeId", tzEmployeeId.toString());
            checkInRequest.put("source", "WEB");
            checkInRequest.put("attendanceDate", today.toString());
            checkInRequest.put("checkInTime", LocalDateTime.now().toString());

            mockMvc.perform(post(BASE_URL + "/check-in")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(checkInRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.employeeId").value(tzEmployeeId.toString()))
                    .andExpect(jsonPath("$.attendanceDate").value(today.toString()));

        } finally {
            attendanceRecordRepository.deleteAll(
                    attendanceRecordRepository.findAll().stream()
                            .filter(ar -> ar.getEmployeeId().equals(tzEmployeeId))
                            .toList()
            );
            deleteTestEmployee(tzEmployeeId);
        }
    }

    @Test
    @Order(11)
    @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
    @DisplayName("E2E: Check-in and Check-out with attendanceDate creates correct time entries")
    void checkInCheckOut_WithAttendanceDate_CreatesTimeEntries() throws Exception {
        Employee cycleEmployee = createTestEmployee("CYCLE_EMP");
        UUID cycleEmployeeId = cycleEmployee.getId();

        try {
            LocalDate today = LocalDate.now();

            // Check-in
            Map<String, Object> checkInRequest = new HashMap<>();
            checkInRequest.put("employeeId", cycleEmployeeId.toString());
            checkInRequest.put("source", "WEB");
            checkInRequest.put("attendanceDate", today.toString());

            mockMvc.perform(post(BASE_URL + "/check-in")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(checkInRequest)))
                    .andExpect(status().isCreated());

            // Check-out
            Map<String, Object> checkOutRequest = new HashMap<>();
            checkOutRequest.put("employeeId", cycleEmployeeId.toString());
            checkOutRequest.put("source", "WEB");
            checkOutRequest.put("attendanceDate", today.toString());

            mockMvc.perform(post(BASE_URL + "/check-out")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(checkOutRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.checkOutTime").exists())
                    .andExpect(jsonPath("$.workDurationMinutes").exists());

            // Verify time entries
            mockMvc.perform(get(BASE_URL + "/employee/" + cycleEmployeeId + "/time-entries")
                            .param("date", today.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$[0].checkInTime").exists())
                    .andExpect(jsonPath("$[0].checkOutTime").exists())
                    .andExpect(jsonPath("$[0].open").value(false));

        } finally {
            attendanceRecordRepository.deleteAll(
                    attendanceRecordRepository.findAll().stream()
                            .filter(ar -> ar.getEmployeeId().equals(cycleEmployeeId))
                            .toList()
            );
            deleteTestEmployee(cycleEmployeeId);
        }
    }

    @Test
    @Order(12)
    @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
    @DisplayName("E2E: Multiple check-in/check-out cycles in same day")
    void multipleCheckInCheckOutCycles_SameDay() throws Exception {
        Employee multiEmployee = createTestEmployee("MULTI_EMP");
        UUID multiEmployeeId = multiEmployee.getId();

        try {
            LocalDate today = LocalDate.now();

            // First cycle - morning session
            Map<String, Object> request1 = new HashMap<>();
            request1.put("employeeId", multiEmployeeId.toString());
            request1.put("source", "WEB");
            request1.put("attendanceDate", today.toString());

            mockMvc.perform(post(BASE_URL + "/check-in")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request1)))
                    .andExpect(status().isCreated());

            mockMvc.perform(post(BASE_URL + "/check-out")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request1)))
                    .andExpect(status().isOk());

            // Second cycle - afternoon session
            // Note: business logic may enforce one attendance record per day (409 if already checked in+out)
            MvcResult secondCheckIn = mockMvc.perform(post(BASE_URL + "/check-in")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request1)))
                    .andExpect(result -> {
                        int status = result.getResponse().getStatus();
                        assertThat(status).isIn(201, 409); // 409 if single-record policy enforced
                    })
                    .andReturn();

            // Only try checkout if second check-in succeeded
            if (secondCheckIn.getResponse().getStatus() == 201) {
                mockMvc.perform(post(BASE_URL + "/check-out")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request1)))
                        .andExpect(status().isOk());
            }

            // Verify attendance records exist
            MvcResult result = mockMvc.perform(get(BASE_URL + "/employee/" + multiEmployeeId + "/time-entries")
                            .param("date", today.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andReturn();

            String responseBody = result.getResponse().getContentAsString();
            int entryCount = objectMapper.readTree(responseBody).size();
            assertThat(entryCount).isGreaterThanOrEqualTo(1); // At least 1 cycle completed

        } finally {
            attendanceRecordRepository.deleteAll(
                    attendanceRecordRepository.findAll().stream()
                            .filter(ar -> ar.getEmployeeId().equals(multiEmployeeId))
                            .toList()
            );
            deleteTestEmployee(multiEmployeeId);
        }
    }

    @Test
    @Order(13)
    @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
    @DisplayName("E2E: Check-out closes open time entry")
    void checkOut_ClosesOpenTimeEntry() throws Exception {
        Employee closeEmployee = createTestEmployee("CLOSE_EMP");
        UUID closeEmployeeId = closeEmployee.getId();

        try {
            LocalDate today = LocalDate.now();

            // Check-in
            Map<String, Object> request = new HashMap<>();
            request.put("employeeId", closeEmployeeId.toString());
            request.put("source", "WEB");
            request.put("attendanceDate", today.toString());

            mockMvc.perform(post(BASE_URL + "/check-in")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());

            // Verify open time entry exists
            MvcResult beforeResult = mockMvc.perform(get(BASE_URL + "/employee/" + closeEmployeeId + "/time-entries")
                            .param("date", today.toString()))
                    .andExpect(status().isOk())
                    .andReturn();

            String beforeBody = beforeResult.getResponse().getContentAsString();
            boolean hasOpenEntry = objectMapper.readTree(beforeBody).get(0).get("open").asBoolean();
            assertThat(hasOpenEntry).isTrue();

            // Check-out
            mockMvc.perform(post(BASE_URL + "/check-out")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk());

            // Verify time entry is now closed
            MvcResult afterResult = mockMvc.perform(get(BASE_URL + "/employee/" + closeEmployeeId + "/time-entries")
                            .param("date", today.toString()))
                    .andExpect(status().isOk())
                    .andReturn();

            String afterBody = afterResult.getResponse().getContentAsString();
            boolean isClosed = !objectMapper.readTree(afterBody).get(0).get("open").asBoolean();
            assertThat(isClosed).isTrue();

        } finally {
            attendanceRecordRepository.deleteAll(
                    attendanceRecordRepository.findAll().stream()
                            .filter(ar -> ar.getEmployeeId().equals(closeEmployeeId))
                            .toList()
            );
            deleteTestEmployee(closeEmployeeId);
        }
    }

    @Test
    @Order(14)
    @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
    @DisplayName("E2E: Get my-time-entries endpoint")
    void getMyTimeEntries_Success() throws Exception {
        Employee myTimeEmployee = createTestEmployee("MYTIME_EMP");
        UUID myTimeEmployeeId = myTimeEmployee.getId();

        try {
            LocalDate today = LocalDate.now();

            // Create check-in
            Map<String, Object> request = new HashMap<>();
            request.put("employeeId", myTimeEmployeeId.toString());
            request.put("source", "WEB");
            request.put("attendanceDate", today.toString());

            mockMvc.perform(post(BASE_URL + "/check-in")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());

            // Get my time entries
            setupSecurityContext(myTimeEmployeeId);
            mockMvc.perform(get(BASE_URL + "/my-time-entries")
                            .param("date", today.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$[0].checkInTime").exists())
                    .andExpect(jsonPath("$[0].open").value(true));

        } finally {
            attendanceRecordRepository.deleteAll(
                    attendanceRecordRepository.findAll().stream()
                            .filter(ar -> ar.getEmployeeId().equals(myTimeEmployeeId))
                            .toList()
            );
            deleteTestEmployee(myTimeEmployeeId);
        }
    }

    // ==================== Validation Tests ====================

    @Test
    @Order(20)
    @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
    @DisplayName("E2E: Check-out without check-in fails")
    void checkOut_WithoutCheckIn_Fails() throws Exception {
        // Create a new employee who hasn't checked in
        Employee savedNoCheckInEmployee = createTestEmployee("NOCI_EMP");

        try {
            Map<String, Object> checkOutRequest = new HashMap<>();
            checkOutRequest.put("employeeId", savedNoCheckInEmployee.getId().toString());
            checkOutRequest.put("source", "WEB");

            mockMvc.perform(post(BASE_URL + "/check-out")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(checkOutRequest)))
                    .andExpect(status().isBadRequest());

        } finally {
            deleteTestEmployee(savedNoCheckInEmployee.getId());
        }
    }

    @AfterAll
    void cleanUp() {
        // Clean up test employee and their records
        if (testEmployeeId != null) {
            attendanceRecordRepository.deleteAll(
                    attendanceRecordRepository.findAll().stream()
                            .filter(ar -> ar.getEmployeeId().equals(testEmployeeId))
                            .toList()
            );
            deleteTestEmployee(testEmployeeId);
        }
        // Also clean up the user created in setUpTestData
        if (testUserId != null) {
            userRepository.deleteById(testUserId);
        }
    }
}
