package com.hrms.e2e;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.attendance.service.AttendanceRecordService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.attendance.AttendanceRecord;
import com.hrms.domain.attendance.AttendanceTimeEntry;
import com.hrms.domain.employee.Employee;
import com.hrms.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.hrms.infrastructure.attendance.repository.AttendanceTimeEntryRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
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

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AttendanceRecordService attendanceRecordService;

    @Autowired
    private AttendanceRecordRepository attendanceRecordRepository;

    @Autowired
    private AttendanceTimeEntryRepository timeEntryRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    private static final String BASE_URL = "/api/v1/attendance";
    private static final UUID TEST_USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440000");
    private static final UUID TEST_TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");

    private UUID testEmployeeId;
    private UUID attendanceRecordId;

    @BeforeAll
    void setUpTestData() {
        setupSecurityContext();

        // Create test employee
        Employee employee = Employee.builder()
                .employeeCode("ATT_EMP_" + System.currentTimeMillis())
                .firstName("Attendance")
                .lastName("TestEmployee")
                .personalEmail("attendance.test" + System.currentTimeMillis() + "@test.com")
                .status(Employee.EmployeeStatus.ACTIVE)
                .joiningDate(LocalDate.now().minusMonths(3))
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
        Set<String> roles = new HashSet<>(Arrays.asList("ADMIN", "EMPLOYEE"));
        Set<String> permissions = new HashSet<>();
        permissions.add(Permission.SYSTEM_ADMIN);
        permissions.add("HRMS:ATTENDANCE:MARK");
        permissions.add("HRMS:ATTENDANCE:VIEW_SELF");
        permissions.add("HRMS:ATTENDANCE:REGULARIZE");

        SecurityContext.setCurrentUser(TEST_USER_ID, testEmployeeId != null ? testEmployeeId : TEST_USER_ID, roles, permissions);
        SecurityContext.setCurrentTenantId(TEST_TENANT_ID);
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
                .andExpect(status().isOk())
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
        mockMvc.perform(get(BASE_URL + "/today/" + testEmployeeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.employeeId").value(testEmployeeId.toString()))
                .andExpect(jsonPath("$.checkInTime").exists())
                .andExpect(jsonPath("$.status").value("PRESENT"));
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
                .andExpect(jsonPath("$.totalWorkDuration").exists());
    }

    @Test
    @Order(4)
    @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
    @DisplayName("E2E: Get attendance record with work duration calculated")
    void getAttendanceRecord_WithWorkDuration() throws Exception {
        assertThat(attendanceRecordId).isNotNull();

        mockMvc.perform(get(BASE_URL + "/" + attendanceRecordId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.checkInTime").exists())
                .andExpect(jsonPath("$.checkOutTime").exists())
                .andExpect(jsonPath("$.totalWorkDuration").exists());
    }

    // ==================== Multi Check-In/Out Tests ====================

    @Test
    @Order(5)
    @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
    @DisplayName("E2E: Multiple check-in sessions (lunch break scenario)")
    void multipleCheckInSessions_LunchBreak() throws Exception {
        // Create a new employee for this test to avoid conflicts
        Employee breakEmployee = Employee.builder()
                .employeeCode("BREAK_EMP_" + System.currentTimeMillis())
                .firstName("Break")
                .lastName("TestEmployee")
                .personalEmail("break.test" + System.currentTimeMillis() + "@test.com")
                .status(Employee.EmployeeStatus.ACTIVE)
                .joiningDate(LocalDate.now().minusMonths(1))
                .build();
        breakEmployee.setTenantId(TEST_TENANT_ID);
        Employee savedBreakEmployee = employeeRepository.save(breakEmployee);
        UUID breakEmployeeId = savedBreakEmployee.getId();

        try {
            // First check-in (morning)
            Map<String, Object> morningCheckIn = new HashMap<>();
            morningCheckIn.put("employeeId", breakEmployeeId.toString());
            morningCheckIn.put("source", "WEB");

            mockMvc.perform(post(BASE_URL + "/check-in")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(morningCheckIn)))
                    .andExpect(status().isOk());

            // Check-out for lunch
            Map<String, Object> lunchCheckOut = new HashMap<>();
            lunchCheckOut.put("employeeId", breakEmployeeId.toString());
            lunchCheckOut.put("source", "WEB");

            mockMvc.perform(post(BASE_URL + "/check-out")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(lunchCheckOut)))
                    .andExpect(status().isOk());

            // Get time entries to verify
            mockMvc.perform(get(BASE_URL + "/time-entries/" + breakEmployeeId)
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
            employeeRepository.deleteById(breakEmployeeId);
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
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @Order(7)
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    @DisplayName("E2E: Get all attendance records for a date")
    void getAllAttendanceForDate_Success() throws Exception {
        mockMvc.perform(get(BASE_URL + "/date/" + LocalDate.now()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    // ==================== Service Layer Direct Tests ====================

    @Test
    @Order(8)
    @DisplayName("E2E: AttendanceRecordService check-in flow")
    void attendanceService_CheckInFlow() {
        // Create a unique employee for service test
        Employee serviceEmployee = Employee.builder()
                .employeeCode("SVC_EMP_" + System.currentTimeMillis())
                .firstName("Service")
                .lastName("TestEmployee")
                .personalEmail("service.test" + System.currentTimeMillis() + "@test.com")
                .status(Employee.EmployeeStatus.ACTIVE)
                .joiningDate(LocalDate.now().minusMonths(2))
                .build();
        serviceEmployee.setTenantId(TEST_TENANT_ID);
        Employee savedServiceEmployee = employeeRepository.save(serviceEmployee);
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
            employeeRepository.deleteById(serviceEmployeeId);
        }
    }

    // ==================== Regularization Tests ====================

    @Test
    @Order(9)
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    @DisplayName("E2E: Regularize attendance record")
    void regularizeAttendance_Success() throws Exception {
        // Create an attendance record for yesterday
        Employee regEmployee = Employee.builder()
                .employeeCode("REG_EMP_" + System.currentTimeMillis())
                .firstName("Regularize")
                .lastName("TestEmployee")
                .personalEmail("regularize.test" + System.currentTimeMillis() + "@test.com")
                .status(Employee.EmployeeStatus.ACTIVE)
                .joiningDate(LocalDate.now().minusMonths(1))
                .build();
        regEmployee.setTenantId(TEST_TENANT_ID);
        Employee savedRegEmployee = employeeRepository.save(regEmployee);
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

            // Request regularization
            Map<String, Object> regularizeRequest = new HashMap<>();
            regularizeRequest.put("checkInTime", LocalDateTime.of(LocalDate.now().minusDays(1), LocalTime.of(8, 30)).toString());
            regularizeRequest.put("checkOutTime", LocalDateTime.of(LocalDate.now().minusDays(1), LocalTime.of(17, 30)).toString());
            regularizeRequest.put("reason", "Forgot to check out - E2E test");

            mockMvc.perform(put(BASE_URL + "/" + savedRecord.getId() + "/regularize")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(regularizeRequest)))
                    .andExpect(status().isOk());

        } finally {
            // Clean up
            attendanceRecordRepository.deleteAll(
                    attendanceRecordRepository.findAll().stream()
                            .filter(ar -> ar.getEmployeeId().equals(regEmployeeId))
                            .toList()
            );
            employeeRepository.deleteById(regEmployeeId);
        }
    }

    // ==================== Validation Tests ====================

    @Test
    @Order(10)
    @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
    @DisplayName("E2E: Check-out without check-in fails")
    void checkOut_WithoutCheckIn_Fails() throws Exception {
        // Create a new employee who hasn't checked in
        Employee noCheckInEmployee = Employee.builder()
                .employeeCode("NOCI_EMP_" + System.currentTimeMillis())
                .firstName("NoCheckIn")
                .lastName("TestEmployee")
                .personalEmail("nocheckin.test" + System.currentTimeMillis() + "@test.com")
                .status(Employee.EmployeeStatus.ACTIVE)
                .joiningDate(LocalDate.now().minusMonths(1))
                .build();
        noCheckInEmployee.setTenantId(TEST_TENANT_ID);
        Employee savedNoCheckInEmployee = employeeRepository.save(noCheckInEmployee);

        try {
            Map<String, Object> checkOutRequest = new HashMap<>();
            checkOutRequest.put("employeeId", savedNoCheckInEmployee.getId().toString());
            checkOutRequest.put("source", "WEB");

            mockMvc.perform(post(BASE_URL + "/check-out")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(checkOutRequest)))
                    .andExpect(status().isBadRequest());

        } finally {
            employeeRepository.deleteById(savedNoCheckInEmployee.getId());
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
            employeeRepository.deleteById(testEmployeeId);
        }
    }
}
