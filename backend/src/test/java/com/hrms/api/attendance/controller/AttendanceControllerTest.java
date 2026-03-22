package com.hrms.api.attendance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.attendance.dto.*;
import com.hrms.application.attendance.service.AttendanceImportService;
import com.hrms.application.attendance.service.AttendanceRecordService;
import com.hrms.application.employee.service.EmployeeService;
import com.hrms.common.security.DataScopeService;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.TenantFilter;
import com.hrms.domain.attendance.AttendanceRecord;
import com.hrms.domain.attendance.AttendanceTimeEntry;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AttendanceController.class)
@ContextConfiguration(classes = {AttendanceController.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("AttendanceController Unit Tests")
class AttendanceControllerTest {

    @MockBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AttendanceRecordService attendanceService;

    @MockBean
    private AttendanceImportService attendanceImportService;

    @MockBean
    private DataScopeService dataScopeService;

    @MockBean
    private EmployeeService employeeService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private TenantFilter tenantFilter;

    private UUID attendanceId;
    private UUID employeeId;
    private AttendanceRecord attendanceRecord;
    private AttendanceResponse attendanceResponse;

    @BeforeEach
    void setUp() {
        attendanceId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        attendanceRecord = new AttendanceRecord();
        attendanceRecord.setId(attendanceId);
        attendanceRecord.setEmployeeId(employeeId);
        attendanceRecord.setAttendanceDate(LocalDate.now());
        attendanceRecord.setCheckInTime(LocalDateTime.now().minusHours(8));
        attendanceRecord.setCheckOutTime(LocalDateTime.now());
        attendanceRecord.setStatus(AttendanceRecord.AttendanceStatus.PRESENT);

        attendanceResponse = new AttendanceResponse();
        attendanceResponse.setId(attendanceId);
        attendanceResponse.setEmployeeId(employeeId);
        attendanceResponse.setAttendanceDate(LocalDate.now());
        attendanceResponse.setCheckInTime(attendanceRecord.getCheckInTime());
        attendanceResponse.setCheckOutTime(attendanceRecord.getCheckOutTime());
        attendanceResponse.setStatus("PRESENT");
    }

    @Nested
    @DisplayName("Check-In Tests")
    class CheckInTests {

        @Test
        @DisplayName("Should check in successfully")
        void shouldCheckInSuccessfully() throws Exception {
            CheckInRequest request = new CheckInRequest();
            request.setEmployeeId(employeeId);
            request.setCheckInTime(LocalDateTime.now());
            request.setSource("MOBILE");
            request.setAttendanceDate(LocalDate.now());

            when(attendanceService.checkIn(
                    eq(employeeId),
                    any(LocalDateTime.class),
                    anyString(),
                    anyString(),
                    anyString(),
                    any(LocalDate.class)))
                    .thenReturn(attendanceRecord);

            mockMvc.perform(post("/api/v1/attendance/check-in")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.employeeId").value(employeeId.toString()))
                    .andExpect(jsonPath("$.status").value("PRESENT"));

            verify(attendanceService).checkIn(
                    eq(employeeId),
                    any(LocalDateTime.class),
                    anyString(),
                    anyString(),
                    anyString(),
                    any(LocalDate.class));
        }

        @Test
        @DisplayName("Should return 400 for missing required fields in check-in")
        void shouldReturn400ForMissingFields() throws Exception {
            CheckInRequest invalidRequest = new CheckInRequest();
            // Missing employeeId and other required fields

            mockMvc.perform(post("/api/v1/attendance/check-in")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalidRequest)))
                    .andExpect(status().isBadRequest());

            verify(attendanceService, never()).checkIn(any(), any(), any(), any(), any(), any());
        }

        @Test
        @DisplayName("Should prevent duplicate check-in on same day")
        void shouldPreventDuplicateCheckIn() throws Exception {
            CheckInRequest request = new CheckInRequest();
            request.setEmployeeId(employeeId);
            request.setCheckInTime(LocalDateTime.now());
            request.setSource("MOBILE");
            request.setAttendanceDate(LocalDate.now());

            when(attendanceService.checkIn(
                    eq(employeeId),
                    any(LocalDateTime.class),
                    anyString(),
                    anyString(),
                    anyString(),
                    any(LocalDate.class)))
                    .thenThrow(new IllegalArgumentException("Employee already checked in today"));

            mockMvc.perform(post("/api/v1/attendance/check-in")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("Check-Out Tests")
    class CheckOutTests {

        @Test
        @DisplayName("Should check out successfully")
        void shouldCheckOutSuccessfully() throws Exception {
            CheckOutRequest request = new CheckOutRequest();
            request.setEmployeeId(employeeId);
            request.setCheckOutTime(LocalDateTime.now());
            request.setSource("MOBILE");
            request.setAttendanceDate(LocalDate.now());

            when(attendanceService.checkOut(
                    eq(employeeId),
                    any(LocalDateTime.class),
                    anyString(),
                    anyString(),
                    anyString(),
                    any(LocalDate.class)))
                    .thenReturn(attendanceRecord);

            mockMvc.perform(post("/api/v1/attendance/check-out")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.employeeId").value(employeeId.toString()));

            verify(attendanceService).checkOut(
                    eq(employeeId),
                    any(LocalDateTime.class),
                    anyString(),
                    anyString(),
                    anyString(),
                    any(LocalDate.class));
        }

        @Test
        @DisplayName("Should return 400 when checking out without check-in")
        void shouldReturn400WhenCheckingOutWithoutCheckIn() throws Exception {
            CheckOutRequest request = new CheckOutRequest();
            request.setEmployeeId(employeeId);
            request.setCheckOutTime(LocalDateTime.now());
            request.setSource("MOBILE");
            request.setAttendanceDate(LocalDate.now());

            when(attendanceService.checkOut(
                    eq(employeeId),
                    any(LocalDateTime.class),
                    anyString(),
                    anyString(),
                    anyString(),
                    any(LocalDate.class)))
                    .thenThrow(new IllegalArgumentException("Employee has not checked in today"));

            mockMvc.perform(post("/api/v1/attendance/check-out")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("Get Attendance Tests")
    class GetAttendanceTests {

        @Test
        @DisplayName("Should get attendance by employee ID with pagination")
        void shouldGetAttendanceByEmployee() throws Exception {
            List<AttendanceRecord> records = new ArrayList<>();
            records.add(attendanceRecord);

            Page<AttendanceRecord> page = new PageImpl<>(records, PageRequest.of(0, 20), 1);
            when(attendanceService.getAttendanceByEmployee(eq(employeeId), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/attendance/employee/{employeeId}", employeeId)
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(attendanceService).getAttendanceByEmployee(eq(employeeId), any(Pageable.class));
        }

        @Test
        @DisplayName("Should get attendance by date range")
        void shouldGetAttendanceByDateRange() throws Exception {
            List<AttendanceRecord> records = new ArrayList<>();
            records.add(attendanceRecord);

            when(attendanceService.getAttendanceByDateRange(
                    eq(employeeId),
                    any(LocalDate.class),
                    any(LocalDate.class)))
                    .thenReturn(records);

            mockMvc.perform(get("/api/v1/attendance/employee/{employeeId}/range", employeeId)
                            .param("startDate", "2024-03-01")
                            .param("endDate", "2024-03-31"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$.length()").value(1));

            verify(attendanceService).getAttendanceByDateRange(
                    eq(employeeId),
                    any(LocalDate.class),
                    any(LocalDate.class));
        }

        @Test
        @DisplayName("Should get all attendance records")
        void shouldGetAllAttendance() throws Exception {
            List<AttendanceRecord> records = new ArrayList<>();
            records.add(attendanceRecord);

            Page<AttendanceRecord> page = new PageImpl<>(records, PageRequest.of(0, 20), 1);
            when(attendanceService.getAllAttendance(any(), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/attendance/all")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(attendanceService).getAllAttendance(any(), any(Pageable.class));
        }

        @Test
        @DisplayName("Should get attendance by specific date")
        void shouldGetAttendanceByDate() throws Exception {
            List<AttendanceRecord> records = new ArrayList<>();
            records.add(attendanceRecord);

            Page<AttendanceRecord> page = new PageImpl<>(records, PageRequest.of(0, 20), 1);
            when(attendanceService.getAttendanceByDate(
                    any(LocalDate.class),
                    any(),
                    any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/attendance/date/2024-03-15")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));
        }
    }

    @Nested
    @DisplayName("My Attendance Tests")
    class MyAttendanceTests {

        @Test
        @DisplayName("Should get my attendance records")
        void shouldGetMyAttendance() throws Exception {
            List<AttendanceRecord> records = new ArrayList<>();
            records.add(attendanceRecord);

            when(attendanceService.getAttendanceByDateRange(
                    any(UUID.class),
                    any(LocalDate.class),
                    any(LocalDate.class)))
                    .thenReturn(records);

            mockMvc.perform(get("/api/v1/attendance/my-attendance")
                            .param("startDate", "2024-03-01")
                            .param("endDate", "2024-03-31"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$.length()").value(1));
        }
    }

    @Nested
    @DisplayName("Multi Check-In/Out Tests")
    class MultiCheckInOutTests {

        @Test
        @DisplayName("Should perform multi check-in for break tracking")
        void shouldMultiCheckIn() throws Exception {
            MultiCheckInRequest request = new MultiCheckInRequest();
            request.setEmployeeId(employeeId);
            request.setCheckInTime(LocalDateTime.now());
            request.setEntryType("BREAK_END");
            request.setSource("MOBILE");

            AttendanceTimeEntry entry = new AttendanceTimeEntry();
            entry.setId(UUID.randomUUID());
            entry.setCheckInTime(LocalDateTime.now());

            when(attendanceService.multiCheckIn(
                    eq(employeeId),
                    any(LocalDateTime.class),
                    anyString(),
                    anyString(),
                    anyString(),
                    anyString(),
                    anyString()))
                    .thenReturn(entry);

            mockMvc.perform(post("/api/v1/attendance/multi-check-in")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());

            verify(attendanceService).multiCheckIn(
                    eq(employeeId),
                    any(LocalDateTime.class),
                    anyString(),
                    anyString(),
                    anyString(),
                    anyString(),
                    anyString());
        }

        @Test
        @DisplayName("Should perform multi check-out for break tracking")
        void shouldMultiCheckOut() throws Exception {
            MultiCheckOutRequest request = new MultiCheckOutRequest();
            request.setEmployeeId(employeeId);
            request.setTimeEntryId(UUID.randomUUID());
            request.setCheckOutTime(LocalDateTime.now());
            request.setSource("MOBILE");

            AttendanceTimeEntry entry = new AttendanceTimeEntry();
            entry.setId(request.getTimeEntryId());
            entry.setCheckOutTime(LocalDateTime.now());

            when(attendanceService.multiCheckOut(
                    eq(employeeId),
                    any(UUID.class),
                    any(LocalDateTime.class),
                    anyString(),
                    anyString(),
                    anyString()))
                    .thenReturn(entry);

            mockMvc.perform(post("/api/v1/attendance/multi-check-out")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk());
        }
    }

    @Nested
    @DisplayName("Regularization Tests")
    class RegularizationTests {

        @Test
        @DisplayName("Should request attendance regularization")
        void shouldRequestRegularization() throws Exception {
            when(attendanceService.getAttendanceRecordById(eq(attendanceId)))
                    .thenReturn(attendanceRecord);
            when(attendanceService.requestRegularization(eq(attendanceId), anyString()))
                    .thenReturn(attendanceRecord);

            mockMvc.perform(post("/api/v1/attendance/{id}/request-regularization", attendanceId)
                            .param("reason", "System error prevented check-out"))
                    .andExpect(status().isOk());

            verify(attendanceService).requestRegularization(eq(attendanceId), anyString());
        }

        @Test
        @DisplayName("Should approve attendance regularization")
        void shouldApproveRegularization() throws Exception {
            when(attendanceService.getAttendanceRecordById(eq(attendanceId)))
                    .thenReturn(attendanceRecord);
            when(attendanceService.approveRegularization(eq(attendanceId), any(UUID.class)))
                    .thenReturn(attendanceRecord);

            mockMvc.perform(post("/api/v1/attendance/{id}/approve-regularization", attendanceId))
                    .andExpect(status().isOk());

            verify(attendanceService).approveRegularization(eq(attendanceId), any(UUID.class));
        }

        @Test
        @DisplayName("Should get pending regularizations")
        void shouldGetPendingRegularizations() throws Exception {
            List<AttendanceRecord> records = new ArrayList<>();
            records.add(attendanceRecord);

            Page<AttendanceRecord> page = new PageImpl<>(records, PageRequest.of(0, 20), 1);
            when(attendanceService.getPendingRegularizations(any(), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/attendance/pending-regularizations")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(attendanceService).getPendingRegularizations(any(), any(Pageable.class));
        }
    }

    @Nested
    @DisplayName("Bulk Operations Tests")
    class BulkOperationsTests {

        @Test
        @DisplayName("Should perform bulk check-in")
        void shouldBulkCheckIn() throws Exception {
            BulkCheckInRequest request = new BulkCheckInRequest();
            request.setEmployeeIds(new ArrayList<>() {{
                add(employeeId);
            }});
            request.setCheckInTime(LocalDateTime.now());
            request.setSource("BIOMETRIC");

            AttendanceRecordService.BulkResult result = new AttendanceRecordService.BulkResult(
                    new ArrayList<>() {{ add(attendanceRecord); }},
                    new ArrayList<>()
            );

            when(attendanceService.bulkCheckIn(
                    anyList(),
                    any(LocalDateTime.class),
                    anyString(),
                    anyString(),
                    anyString()))
                    .thenReturn(result);

            mockMvc.perform(post("/api/v1/attendance/bulk-check-in")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());

            verify(attendanceService).bulkCheckIn(
                    anyList(),
                    any(LocalDateTime.class),
                    anyString(),
                    anyString(),
                    anyString());
        }

        @Test
        @DisplayName("Should perform bulk check-out")
        void shouldBulkCheckOut() throws Exception {
            BulkCheckOutRequest request = new BulkCheckOutRequest();
            request.setEmployeeIds(new ArrayList<>() {{
                add(employeeId);
            }});
            request.setCheckOutTime(LocalDateTime.now());
            request.setSource("BIOMETRIC");

            AttendanceRecordService.BulkResult result = new AttendanceRecordService.BulkResult(
                    new ArrayList<>() {{ add(attendanceRecord); }},
                    new ArrayList<>()
            );

            when(attendanceService.bulkCheckOut(
                    anyList(),
                    any(LocalDateTime.class),
                    anyString(),
                    anyString(),
                    anyString()))
                    .thenReturn(result);

            mockMvc.perform(post("/api/v1/attendance/bulk-check-out")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk());

            verify(attendanceService).bulkCheckOut(
                    anyList(),
                    any(LocalDateTime.class),
                    anyString(),
                    anyString(),
                    anyString());
        }
    }

    @Nested
    @DisplayName("Import Tests")
    class ImportTests {

        @Test
        @DisplayName("Should download import template")
        void shouldDownloadImportTemplate() throws Exception {
            byte[] template = "Excel template".getBytes();
            when(attendanceImportService.generateTemplate())
                    .thenReturn(template);

            mockMvc.perform(get("/api/v1/attendance/import/template"))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Type",
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .andExpect(header().exists("Content-Disposition"));

            verify(attendanceImportService).generateTemplate();
        }
    }
}
