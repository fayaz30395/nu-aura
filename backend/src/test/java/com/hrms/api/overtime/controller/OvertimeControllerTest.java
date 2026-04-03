package com.hrms.api.overtime.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.hrms.api.overtime.dto.OvertimeApprovalRequest;
import com.hrms.api.overtime.dto.OvertimeRecordRequest;
import com.hrms.api.overtime.dto.OvertimeRecordResponse;
import com.hrms.application.overtime.service.OvertimeManagementService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.overtime.CompTimeBalance;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("OvertimeManagementController Unit Tests")
class OvertimeControllerTest {

    private static final UUID RECORD_ID = UUID.randomUUID();
    private static final UUID EMPLOYEE_ID = UUID.randomUUID();
    private static final UUID APPROVER_ID = UUID.randomUUID();
    @Mock
    private OvertimeManagementService overtimeManagementService;
    @InjectMocks
    private OvertimeManagementController controller;
    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    // ─── Helpers ────────────────────────────────────────────────────────

    private OvertimeRecordResponse buildOvertimeResponse(String status) {
        return OvertimeRecordResponse.builder()
                .id(RECORD_ID)
                .employeeId(EMPLOYEE_ID)
                .employeeName("Jane Doe")
                .overtimeDate(LocalDate.now().minusDays(1))
                .regularHours(new BigDecimal("8.0"))
                .actualHours(new BigDecimal("10.5"))
                .overtimeHours(new BigDecimal("2.5"))
                .overtimeType("WEEKDAY")
                .status(status)
                .autoCalculated(false)
                .createdAt(LocalDateTime.now())
                .build();
    }

    private OvertimeRecordRequest buildOvertimeRequest() {
        return OvertimeRecordRequest.builder()
                .employeeId(EMPLOYEE_ID)
                .overtimeDate(LocalDate.now().minusDays(1))
                .regularHours(new BigDecimal("8.0"))
                .actualHours(new BigDecimal("10.5"))
                .overtimeHours(new BigDecimal("2.5"))
                .overtimeType("WEEKDAY")
                .notes("Worked on sprint release")
                .isPreApproved(false)
                .build();
    }

    // ─── CRUD Tests ──────────────────────────────────────────────────────

    @Nested
    @DisplayName("Overtime Record CRUD")
    class OvertimeCrudTests {

        @Test
        @DisplayName("POST /api/v1/overtime creates overtime record and returns 201")
        void createOvertimeRecord_returns201() throws Exception {
            OvertimeRecordRequest request = buildOvertimeRequest();
            when(overtimeManagementService.createOvertimeRecord(any(OvertimeRecordRequest.class)))
                    .thenReturn(buildOvertimeResponse("PENDING"));

            mockMvc.perform(post("/api/v1/overtime")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request))
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.employeeId").value(EMPLOYEE_ID.toString()))
                    .andExpect(jsonPath("$.overtimeHours").value(2.5))
                    .andExpect(jsonPath("$.status").value("PENDING"));

            verify(overtimeManagementService).createOvertimeRecord(any(OvertimeRecordRequest.class));
        }

        @Test
        @DisplayName("GET /api/v1/overtime/{id} returns overtime record by ID")
        void getOvertimeRecordById_returns200() throws Exception {
            when(overtimeManagementService.getOvertimeRecordById(RECORD_ID))
                    .thenReturn(buildOvertimeResponse("PENDING"));

            mockMvc.perform(get("/api/v1/overtime/{recordId}", RECORD_ID)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(RECORD_ID.toString()))
                    .andExpect(jsonPath("$.employeeName").value("Jane Doe"));

            verify(overtimeManagementService).getOvertimeRecordById(RECORD_ID);
        }

        @Test
        @DisplayName("GET /employee/{id} returns paginated overtime records for employee")
        void getEmployeeOvertimeRecords_returnsPaged() throws Exception {
            Page<OvertimeRecordResponse> page = new PageImpl<>(
                    List.of(buildOvertimeResponse("APPROVED")),
                    PageRequest.of(0, 10), 1);

            when(overtimeManagementService.getEmployeeOvertimeRecords(eq(EMPLOYEE_ID), any()))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/overtime/employee/{employeeId}", EMPLOYEE_ID)
                            .param("page", "0")
                            .param("size", "10")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].status").value("APPROVED"))
                    .andExpect(jsonPath("$.totalElements").value(1));

            verify(overtimeManagementService).getEmployeeOvertimeRecords(eq(EMPLOYEE_ID), any());
        }

        @Test
        @DisplayName("GET /pending returns pending overtime records paginated")
        void getPendingOvertimeRecords_returnsPaged() throws Exception {
            Page<OvertimeRecordResponse> page = new PageImpl<>(
                    List.of(buildOvertimeResponse("PENDING")),
                    PageRequest.of(0, 10), 1);

            when(overtimeManagementService.getPendingOvertimeRecords(any())).thenReturn(page);

            mockMvc.perform(get("/api/v1/overtime/pending")
                            .param("page", "0")
                            .param("size", "10")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].status").value("PENDING"));

            verify(overtimeManagementService).getPendingOvertimeRecords(any());
        }

        @Test
        @DisplayName("GET /api/v1/overtime returns all overtime records paginated")
        void getAllOvertimeRecords_returnsPaged() throws Exception {
            Page<OvertimeRecordResponse> page = new PageImpl<>(
                    List.of(buildOvertimeResponse("APPROVED")),
                    PageRequest.of(0, 10), 1);

            when(overtimeManagementService.getAllOvertimeRecords(any())).thenReturn(page);

            mockMvc.perform(get("/api/v1/overtime")
                            .param("page", "0")
                            .param("size", "10")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalElements").value(1));

            verify(overtimeManagementService).getAllOvertimeRecords(any());
        }

        @Test
        @DisplayName("DELETE /{id} deletes overtime record and returns 204")
        void deleteOvertimeRecord_returns204() throws Exception {
            doNothing().when(overtimeManagementService).deleteOvertimeRecord(RECORD_ID);

            mockMvc.perform(delete("/api/v1/overtime/{recordId}", RECORD_ID))
                    .andExpect(status().isNoContent());

            verify(overtimeManagementService).deleteOvertimeRecord(RECORD_ID);
        }
    }

    // ─── Approval Tests ───────────────────────────────────────────────────

    @Nested
    @DisplayName("Approval Endpoints")
    class ApprovalTests {

        @Test
        @DisplayName("POST /{id}/approve with APPROVE action returns 200 with approved record")
        void approveOvertime_returns200() throws Exception {
            OvertimeApprovalRequest request = OvertimeApprovalRequest.builder()
                    .action("APPROVE")
                    .build();

            when(overtimeManagementService.approveOrRejectOvertime(
                    eq(RECORD_ID), eq(APPROVER_ID), any(OvertimeApprovalRequest.class)))
                    .thenReturn(buildOvertimeResponse("APPROVED"));

            mockMvc.perform(post("/api/v1/overtime/{recordId}/approve", RECORD_ID)
                            .param("approverId", APPROVER_ID.toString())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request))
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("APPROVED"));

            verify(overtimeManagementService).approveOrRejectOvertime(
                    eq(RECORD_ID), eq(APPROVER_ID), any(OvertimeApprovalRequest.class));
        }

        @Test
        @DisplayName("POST /{id}/approve with REJECT action returns 200 with rejected record")
        void rejectOvertime_returns200() throws Exception {
            OvertimeApprovalRequest request = OvertimeApprovalRequest.builder()
                    .action("REJECT")
                    .rejectionReason("Overtime not authorised")
                    .build();

            when(overtimeManagementService.approveOrRejectOvertime(
                    eq(RECORD_ID), eq(APPROVER_ID), any(OvertimeApprovalRequest.class)))
                    .thenReturn(buildOvertimeResponse("REJECTED"));

            mockMvc.perform(post("/api/v1/overtime/{recordId}/approve", RECORD_ID)
                            .param("approverId", APPROVER_ID.toString())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request))
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("REJECTED"));
        }
    }

    // ─── Comp Time Tests ──────────────────────────────────────────────────

    @Nested
    @DisplayName("Comp Time Endpoints")
    class CompTimeTests {

        @Test
        @DisplayName("GET /comp-time/balance/{id} returns balance map")
        void getCompTimeBalance_returnsMap() throws Exception {
            CompTimeBalance balance = new CompTimeBalance();
            balance.setEmployeeId(EMPLOYEE_ID);
            balance.setFiscalYear(2026);
            balance.setCurrentBalance(new BigDecimal("8.0"));
            balance.setTotalAccrued(new BigDecimal("16.0"));
            balance.setTotalUsed(new BigDecimal("8.0"));
            balance.setTotalExpired(BigDecimal.ZERO);

            when(overtimeManagementService.getCompTimeBalance(EMPLOYEE_ID)).thenReturn(balance);
            when(overtimeManagementService.getTotalCompTimeBalance(EMPLOYEE_ID))
                    .thenReturn(new BigDecimal("8.0"));

            mockMvc.perform(get("/api/v1/overtime/comp-time/balance/{employeeId}", EMPLOYEE_ID)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.employeeId").value(EMPLOYEE_ID.toString()))
                    .andExpect(jsonPath("$.totalBalance").value(8.0))
                    .andExpect(jsonPath("$.fiscalYear").value(2026));

            verify(overtimeManagementService).getCompTimeBalance(EMPLOYEE_ID);
            verify(overtimeManagementService).getTotalCompTimeBalance(EMPLOYEE_ID);
        }

        @Test
        @DisplayName("GET /comp-time/balance/{id} returns map without balance details when null")
        void getCompTimeBalance_nullBalance_returnsMinimalMap() throws Exception {
            when(overtimeManagementService.getCompTimeBalance(EMPLOYEE_ID)).thenReturn(null);
            when(overtimeManagementService.getTotalCompTimeBalance(EMPLOYEE_ID))
                    .thenReturn(BigDecimal.ZERO);

            mockMvc.perform(get("/api/v1/overtime/comp-time/balance/{employeeId}", EMPLOYEE_ID)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalBalance").value(0))
                    .andExpect(jsonPath("$.employeeId").value(EMPLOYEE_ID.toString()));
        }

        @Test
        @DisplayName("POST /comp-time/accrue accrues comp time and returns 200")
        void accrueCompTime_returns200() throws Exception {
            doNothing().when(overtimeManagementService)
                    .accrueCompTime(eq(EMPLOYEE_ID), any(BigDecimal.class), isNull(), any(LocalDate.class));

            mockMvc.perform(post("/api/v1/overtime/comp-time/accrue")
                            .param("employeeId", EMPLOYEE_ID.toString())
                            .param("hours", "2.5")
                            .param("overtimeDate", LocalDate.now().toString()))
                    .andExpect(status().isOk());

            verify(overtimeManagementService).accrueCompTime(
                    eq(EMPLOYEE_ID), any(BigDecimal.class), isNull(), any(LocalDate.class));
        }

        @Test
        @DisplayName("POST /comp-time/use deducts comp time and returns 200")
        void useCompTime_returns200() throws Exception {
            UUID leaveRequestId = UUID.randomUUID();
            doNothing().when(overtimeManagementService)
                    .useCompTime(eq(EMPLOYEE_ID), any(BigDecimal.class),
                            eq(leaveRequestId), any(LocalDate.class));

            mockMvc.perform(post("/api/v1/overtime/comp-time/use")
                            .param("employeeId", EMPLOYEE_ID.toString())
                            .param("hours", "4.0")
                            .param("leaveRequestId", leaveRequestId.toString())
                            .param("usageDate", LocalDate.now().toString()))
                    .andExpect(status().isOk());

            verify(overtimeManagementService).useCompTime(
                    eq(EMPLOYEE_ID), any(BigDecimal.class),
                    eq(leaveRequestId), any(LocalDate.class));
        }

        @Test
        @DisplayName("GET /comp-time/history/{id} returns transaction history for date range")
        void getCompTimeHistory_returnsList() throws Exception {
            LocalDate start = LocalDate.now().minusMonths(1);
            LocalDate end = LocalDate.now();

            when(overtimeManagementService.getCompTimeHistory(EMPLOYEE_ID, start, end))
                    .thenReturn(List.of());

            mockMvc.perform(get("/api/v1/overtime/comp-time/history/{employeeId}", EMPLOYEE_ID)
                            .param("startDate", start.toString())
                            .param("endDate", end.toString())
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray());

            verify(overtimeManagementService).getCompTimeHistory(EMPLOYEE_ID, start, end);
        }
    }

    // ─── Permission Annotation Tests ──────────────────────────────────────

    @Nested
    @DisplayName("@RequiresPermission annotations")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("createOvertimeRecord requires ATTENDANCE:MARK")
        void createOvertimeRecord_requiresAttendanceMark() throws NoSuchMethodException {
            Method method = OvertimeManagementController.class
                    .getMethod("createOvertimeRecord", OvertimeRecordRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(Arrays.asList(annotation.value()[0])).contains(Permission.ATTENDANCE_MARK);
        }

        @Test
        @DisplayName("approveOrRejectOvertime requires ATTENDANCE:APPROVE")
        void approveOrRejectOvertime_requiresAttendanceApprove() throws NoSuchMethodException {
            Method method = OvertimeManagementController.class
                    .getMethod("approveOrRejectOvertime", UUID.class, UUID.class, OvertimeApprovalRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(Arrays.asList(annotation.value()[0])).contains(Permission.ATTENDANCE_APPROVE);
        }

        @Test
        @DisplayName("getOvertimeRecordById requires ATTENDANCE:VIEW_ALL or ATTENDANCE:VIEW_TEAM")
        void getOvertimeRecordById_requiresViewPermission() throws NoSuchMethodException {
            Method method = OvertimeManagementController.class
                    .getMethod("getOvertimeRecordById", UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            List<String> perms = Arrays.asList(annotation.value()[0]);
            assertThat(perms).containsAnyOf(
                    Permission.ATTENDANCE_VIEW_ALL,
                    Permission.ATTENDANCE_VIEW_TEAM);
        }

        @Test
        @DisplayName("deleteOvertimeRecord requires ATTENDANCE:APPROVE")
        void deleteOvertimeRecord_requiresAttendanceApprove() throws NoSuchMethodException {
            Method method = OvertimeManagementController.class
                    .getMethod("deleteOvertimeRecord", UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(Arrays.asList(annotation.value()[0])).contains(Permission.ATTENDANCE_APPROVE);
        }

        @Test
        @DisplayName("accrueCompTime requires ATTENDANCE:APPROVE")
        void accrueCompTime_requiresAttendanceApprove() throws NoSuchMethodException {
            Method method = OvertimeManagementController.class
                    .getMethod("accrueCompTime", UUID.class, BigDecimal.class, UUID.class, LocalDate.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(Arrays.asList(annotation.value()[0])).contains(Permission.ATTENDANCE_APPROVE);
        }
    }
}
