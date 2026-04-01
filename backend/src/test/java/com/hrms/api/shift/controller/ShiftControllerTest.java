package com.hrms.api.shift.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.hrms.api.shift.dto.*;
import com.hrms.application.shift.service.ShiftManagementService;
import com.hrms.application.shift.service.ShiftPatternService;
import com.hrms.application.shift.service.ShiftScheduleService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.shift.ShiftSwapRequest;
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
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ShiftManagementController Unit Tests")
class ShiftControllerTest {

    @Mock
    private ShiftManagementService shiftManagementService;

    @Mock
    private ShiftPatternService shiftPatternService;

    @Mock
    private ShiftScheduleService shiftScheduleService;

    @InjectMocks
    private ShiftManagementController controller;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    private static final UUID SHIFT_ID = UUID.randomUUID();
    private static final UUID EMPLOYEE_ID = UUID.randomUUID();
    private static final UUID PATTERN_ID = UUID.randomUUID();
    private static final UUID ASSIGNMENT_ID = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    // ─── Helpers ────────────────────────────────────────────────────────

    private ShiftResponse buildShiftResponse() {
        return ShiftResponse.builder()
                .id(SHIFT_ID)
                .shiftCode("MORN")
                .shiftName("Morning Shift")
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(18, 0))
                .gracePeriodInMinutes(10)
                .isNightShift(false)
                .isActive(true)
                .fullDayHours(new BigDecimal("8.0"))
                .netWorkingHours(new BigDecimal("8.0"))
                .createdAt(LocalDateTime.now())
                .build();
    }

    private ShiftRequest buildShiftRequest() {
        return ShiftRequest.builder()
                .shiftCode("MORN")
                .shiftName("Morning Shift")
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(18, 0))
                .gracePeriodInMinutes(10)
                .isNightShift(false)
                .isActive(true)
                .fullDayHours(new BigDecimal("8.0"))
                .build();
    }

    private ShiftPatternResponse buildPatternResponse() {
        return ShiftPatternResponse.builder()
                .id(PATTERN_ID)
                .name("Standard 5-Day")
                .isActive(true)
                .build();
    }

    private ShiftAssignmentResponse buildAssignmentResponse() {
        return ShiftAssignmentResponse.builder()
                .id(ASSIGNMENT_ID)
                .employeeId(EMPLOYEE_ID)
                .shiftId(SHIFT_ID)
                .assignmentDate(LocalDate.now())
                .build();
    }

    // ─── Shift CRUD ──────────────────────────────────────────────────────

    @Nested
    @DisplayName("Shift CRUD")
    class ShiftCrudTests {

        @Test
        @DisplayName("POST /api/v1/shifts creates shift and returns 201")
        void createShift_returns201() throws Exception {
            ShiftRequest request = buildShiftRequest();
            when(shiftManagementService.createShift(any(ShiftRequest.class)))
                    .thenReturn(buildShiftResponse());

            mockMvc.perform(post("/api/v1/shifts")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request))
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.shiftCode").value("MORN"))
                    .andExpect(jsonPath("$.shiftName").value("Morning Shift"))
                    .andExpect(jsonPath("$.isActive").value(true));

            verify(shiftManagementService).createShift(any(ShiftRequest.class));
        }

        @Test
        @DisplayName("PUT /api/v1/shifts/{id} updates shift and returns 200")
        void updateShift_returns200() throws Exception {
            ShiftRequest request = buildShiftRequest();
            request.setShiftName("Morning Shift Updated");
            ShiftResponse updated = buildShiftResponse();
            updated.setShiftName("Morning Shift Updated");

            when(shiftManagementService.updateShift(eq(SHIFT_ID), any(ShiftRequest.class)))
                    .thenReturn(updated);

            mockMvc.perform(put("/api/v1/shifts/{shiftId}", SHIFT_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request))
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.shiftName").value("Morning Shift Updated"));

            verify(shiftManagementService).updateShift(eq(SHIFT_ID), any(ShiftRequest.class));
        }

        @Test
        @DisplayName("GET /api/v1/shifts/{id} returns shift by ID")
        void getShiftById_returns200() throws Exception {
            when(shiftManagementService.getShiftById(SHIFT_ID)).thenReturn(buildShiftResponse());

            mockMvc.perform(get("/api/v1/shifts/{shiftId}", SHIFT_ID)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(SHIFT_ID.toString()))
                    .andExpect(jsonPath("$.shiftCode").value("MORN"));

            verify(shiftManagementService).getShiftById(SHIFT_ID);
        }

        @Test
        @DisplayName("GET /api/v1/shifts returns paginated shifts")
        void getAllShifts_returnsPaged() throws Exception {
            Page<ShiftResponse> page = new PageImpl<>(
                    List.of(buildShiftResponse()), PageRequest.of(0, 10), 1);

            when(shiftManagementService.getAllShifts(any())).thenReturn(page);

            mockMvc.perform(get("/api/v1/shifts")
                            .param("page", "0")
                            .param("size", "10")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].shiftCode").value("MORN"))
                    .andExpect(jsonPath("$.totalElements").value(1));

            verify(shiftManagementService).getAllShifts(any());
        }

        @Test
        @DisplayName("GET /api/v1/shifts/active returns only active shifts")
        void getActiveShifts_returnsList() throws Exception {
            when(shiftManagementService.getActiveShifts())
                    .thenReturn(List.of(buildShiftResponse()));

            mockMvc.perform(get("/api/v1/shifts/active")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].isActive").value(true));

            verify(shiftManagementService).getActiveShifts();
        }

        @Test
        @DisplayName("DELETE /api/v1/shifts/{id} deletes shift and returns 204")
        void deleteShift_returns204() throws Exception {
            doNothing().when(shiftManagementService).deleteShift(SHIFT_ID);

            mockMvc.perform(delete("/api/v1/shifts/{shiftId}", SHIFT_ID))
                    .andExpect(status().isNoContent());

            verify(shiftManagementService).deleteShift(SHIFT_ID);
        }

        @Test
        @DisplayName("PATCH /api/v1/shifts/{id}/activate activates shift")
        void activateShift_returns200() throws Exception {
            ShiftResponse activated = buildShiftResponse();
            activated.setIsActive(true);
            when(shiftManagementService.activateShift(SHIFT_ID)).thenReturn(activated);

            mockMvc.perform(patch("/api/v1/shifts/{shiftId}/activate", SHIFT_ID)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.isActive").value(true));

            verify(shiftManagementService).activateShift(SHIFT_ID);
        }

        @Test
        @DisplayName("PATCH /api/v1/shifts/{id}/deactivate deactivates shift")
        void deactivateShift_returns200() throws Exception {
            ShiftResponse deactivated = buildShiftResponse();
            deactivated.setIsActive(false);
            when(shiftManagementService.deactivateShift(SHIFT_ID)).thenReturn(deactivated);

            mockMvc.perform(patch("/api/v1/shifts/{shiftId}/deactivate", SHIFT_ID)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.isActive").value(false));

            verify(shiftManagementService).deactivateShift(SHIFT_ID);
        }
    }

    // ─── Assignment Tests ────────────────────────────────────────────────

    @Nested
    @DisplayName("Shift Assignment Endpoints")
    class ShiftAssignmentTests {

        @Test
        @DisplayName("POST /assignments assigns shift to employee and returns 201")
        void assignShift_returns201() throws Exception {
            ShiftAssignmentRequest request = ShiftAssignmentRequest.builder()
                    .employeeId(EMPLOYEE_ID)
                    .shiftId(SHIFT_ID)
                    .assignmentDate(LocalDate.now())
                    .effectiveFrom(LocalDate.now())
                    .assignmentType("PERMANENT")
                    .isRecurring(true)
                    .build();

            when(shiftManagementService.assignShiftToEmployee(any(ShiftAssignmentRequest.class)))
                    .thenReturn(buildAssignmentResponse());

            mockMvc.perform(post("/api/v1/shifts/assignments")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request))
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.employeeId").value(EMPLOYEE_ID.toString()))
                    .andExpect(jsonPath("$.shiftId").value(SHIFT_ID.toString()));

            verify(shiftManagementService).assignShiftToEmployee(any(ShiftAssignmentRequest.class));
        }

        @Test
        @DisplayName("GET /assignments/employee/{id} returns employee assignments paginated")
        void getEmployeeAssignments_returnsPaged() throws Exception {
            Page<ShiftAssignmentResponse> page = new PageImpl<>(
                    List.of(buildAssignmentResponse()), PageRequest.of(0, 10), 1);

            when(shiftManagementService.getEmployeeAssignments(eq(EMPLOYEE_ID), any()))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/shifts/assignments/employee/{employeeId}", EMPLOYEE_ID)
                            .param("page", "0")
                            .param("size", "10")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].employeeId").value(EMPLOYEE_ID.toString()));

            verify(shiftManagementService).getEmployeeAssignments(eq(EMPLOYEE_ID), any());
        }

        @Test
        @DisplayName("GET /assignments/date/{date} returns assignments for that date")
        void getAssignmentsForDate_returnsList() throws Exception {
            LocalDate today = LocalDate.now();
            when(shiftManagementService.getAssignmentsForDate(today))
                    .thenReturn(List.of(buildAssignmentResponse()));

            mockMvc.perform(get("/api/v1/shifts/assignments/date/{date}", today.toString())
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].shiftId").value(SHIFT_ID.toString()));

            verify(shiftManagementService).getAssignmentsForDate(today);
        }

        @Test
        @DisplayName("DELETE /assignments/{id} cancels assignment and returns 204")
        void cancelAssignment_returns204() throws Exception {
            doNothing().when(shiftManagementService).cancelAssignment(ASSIGNMENT_ID);

            mockMvc.perform(delete("/api/v1/shifts/assignments/{assignmentId}", ASSIGNMENT_ID))
                    .andExpect(status().isNoContent());

            verify(shiftManagementService).cancelAssignment(ASSIGNMENT_ID);
        }
    }

    // ─── Pattern Tests ───────────────────────────────────────────────────

    @Nested
    @DisplayName("Shift Pattern Endpoints")
    class ShiftPatternTests {

        private ShiftPatternRequest buildPatternRequest() {
            return ShiftPatternRequest.builder()
                    .name("Standard 5-Day")
                    .rotationType("FIXED")
                    .pattern("DDDDDOO")
                    .cycleDays(7)
                    .build();
        }

        @Test
        @DisplayName("POST /patterns creates pattern and returns 201")
        void createPattern_returns201() throws Exception {
            ShiftPatternRequest request = buildPatternRequest();
            when(shiftPatternService.createPattern(any(ShiftPatternRequest.class)))
                    .thenReturn(buildPatternResponse());

            mockMvc.perform(post("/api/v1/shifts/patterns")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request))
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.name").value("Standard 5-Day"));

            verify(shiftPatternService).createPattern(any(ShiftPatternRequest.class));
        }

        @Test
        @DisplayName("PUT /patterns/{id} updates pattern and returns 200")
        void updatePattern_returns200() throws Exception {
            ShiftPatternRequest request = buildPatternRequest();
            when(shiftPatternService.updatePattern(eq(PATTERN_ID), any(ShiftPatternRequest.class)))
                    .thenReturn(buildPatternResponse());

            mockMvc.perform(put("/api/v1/shifts/patterns/{patternId}", PATTERN_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request))
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(PATTERN_ID.toString()));

            verify(shiftPatternService).updatePattern(eq(PATTERN_ID), any(ShiftPatternRequest.class));
        }

        @Test
        @DisplayName("GET /patterns/{id} returns pattern by ID")
        void getPatternById_returns200() throws Exception {
            when(shiftPatternService.getPatternById(PATTERN_ID)).thenReturn(buildPatternResponse());

            mockMvc.perform(get("/api/v1/shifts/patterns/{patternId}", PATTERN_ID)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(PATTERN_ID.toString()));

            verify(shiftPatternService).getPatternById(PATTERN_ID);
        }

        @Test
        @DisplayName("GET /patterns returns all patterns paginated")
        void getAllPatterns_returnsPaged() throws Exception {
            Page<ShiftPatternResponse> page = new PageImpl<>(
                    List.of(buildPatternResponse()), PageRequest.of(0, 10), 1);

            when(shiftPatternService.getAllPatterns(any())).thenReturn(page);

            mockMvc.perform(get("/api/v1/shifts/patterns")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].name").value("Standard 5-Day"));

            verify(shiftPatternService).getAllPatterns(any());
        }

        @Test
        @DisplayName("GET /patterns/active returns active patterns")
        void getActivePatterns_returnsList() throws Exception {
            when(shiftPatternService.getActivePatterns())
                    .thenReturn(List.of(buildPatternResponse()));

            mockMvc.perform(get("/api/v1/shifts/patterns/active")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].isActive").value(true));

            verify(shiftPatternService).getActivePatterns();
        }

        @Test
        @DisplayName("DELETE /patterns/{id} deletes pattern and returns 204")
        void deletePattern_returns204() throws Exception {
            doNothing().when(shiftPatternService).deletePattern(PATTERN_ID);

            mockMvc.perform(delete("/api/v1/shifts/patterns/{patternId}", PATTERN_ID))
                    .andExpect(status().isNoContent());

            verify(shiftPatternService).deletePattern(PATTERN_ID);
        }
    }

    // ─── Schedule Tests ──────────────────────────────────────────────────

    @Nested
    @DisplayName("Schedule Endpoints")
    class ScheduleTests {

        @Test
        @DisplayName("POST /generate-schedule creates schedule entries")
        void generateSchedule_returns201() throws Exception {
            GenerateScheduleRequest request = GenerateScheduleRequest.builder()
                    .shiftPatternId(PATTERN_ID)
                    .startDate(LocalDate.now())
                    .endDate(LocalDate.now().plusDays(6))
                    .build();

            ScheduleEntryResponse entry = ScheduleEntryResponse.builder()
                    .employeeId(EMPLOYEE_ID)
                    .shiftId(SHIFT_ID)
                    .date(LocalDate.now())
                    .build();

            when(shiftScheduleService.generateSchedule(any(GenerateScheduleRequest.class)))
                    .thenReturn(List.of(entry));

            mockMvc.perform(post("/api/v1/shifts/generate-schedule")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request))
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$[0].employeeId").value(EMPLOYEE_ID.toString()));

            verify(shiftScheduleService).generateSchedule(any(GenerateScheduleRequest.class));
        }

        @Test
        @DisplayName("GET /schedule returns employee schedule for date range")
        void getEmployeeSchedule_returnsList() throws Exception {
            LocalDate start = LocalDate.now();
            LocalDate end = start.plusDays(6);

            ScheduleEntryResponse entry = ScheduleEntryResponse.builder()
                    .employeeId(EMPLOYEE_ID)
                    .date(start)
                    .build();

            when(shiftScheduleService.getEmployeeSchedule(EMPLOYEE_ID, start, end))
                    .thenReturn(List.of(entry));

            mockMvc.perform(get("/api/v1/shifts/schedule")
                            .param("employeeId", EMPLOYEE_ID.toString())
                            .param("startDate", start.toString())
                            .param("endDate", end.toString())
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].employeeId").value(EMPLOYEE_ID.toString()));

            verify(shiftScheduleService).getEmployeeSchedule(EMPLOYEE_ID, start, end);
        }

        @Test
        @DisplayName("GET /team-schedule returns team schedule for manager")
        void getTeamSchedule_returnsList() throws Exception {
            UUID managerId = UUID.randomUUID();
            LocalDate start = LocalDate.now();
            LocalDate end = start.plusDays(6);

            when(shiftScheduleService.getTeamSchedule(managerId, start, end))
                    .thenReturn(List.of());

            mockMvc.perform(get("/api/v1/shifts/team-schedule")
                            .param("managerId", managerId.toString())
                            .param("startDate", start.toString())
                            .param("endDate", end.toString())
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray());

            verify(shiftScheduleService).getTeamSchedule(managerId, start, end);
        }

        @Test
        @DisplayName("GET /validate-rules returns violations list for employee+shift+date")
        void validateShiftRules_returnsList() throws Exception {
            LocalDate date = LocalDate.now();
            when(shiftScheduleService.validateShiftRules(EMPLOYEE_ID, SHIFT_ID, date))
                    .thenReturn(List.of());

            mockMvc.perform(get("/api/v1/shifts/validate-rules")
                            .param("employeeId", EMPLOYEE_ID.toString())
                            .param("shiftId", SHIFT_ID.toString())
                            .param("date", date.toString())
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray());

            verify(shiftScheduleService).validateShiftRules(EMPLOYEE_ID, SHIFT_ID, date);
        }
    }

    // ─── Permission Annotation Tests ──────────────────────────────────────

    @Nested
    @DisplayName("@RequiresPermission annotations")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("createShift requires ATTENDANCE:APPROVE")
        void createShift_requiresAttendanceApprove() throws NoSuchMethodException {
            Method method = ShiftManagementController.class
                    .getMethod("createShift", ShiftRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(Arrays.asList(annotation.value()[0])).contains(Permission.ATTENDANCE_APPROVE);
        }

        @Test
        @DisplayName("getAllShifts requires ATTENDANCE:VIEW_ALL or ATTENDANCE:VIEW_TEAM")
        void getAllShifts_requiresViewPermission() throws NoSuchMethodException {
            Method method = ShiftManagementController.class
                    .getMethod("getAllShifts", int.class, int.class, String.class, String.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            List<String> perms = Arrays.asList(annotation.value()[0]);
            assertThat(perms).containsAnyOf(
                    Permission.ATTENDANCE_VIEW_ALL,
                    Permission.ATTENDANCE_VIEW_TEAM);
        }

        @Test
        @DisplayName("assignShift requires ATTENDANCE:APPROVE")
        void assignShift_requiresAttendanceApprove() throws NoSuchMethodException {
            Method method = ShiftManagementController.class
                    .getMethod("assignShift", ShiftAssignmentRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(Arrays.asList(annotation.value()[0])).contains(Permission.ATTENDANCE_APPROVE);
        }

        @Test
        @DisplayName("createPattern requires SHIFT:MANAGE")
        void createPattern_requiresShiftManage() throws NoSuchMethodException {
            Method method = ShiftManagementController.class
                    .getMethod("createPattern", ShiftPatternRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(Arrays.asList(annotation.value()[0])).contains(Permission.SHIFT_MANAGE);
        }

        @Test
        @DisplayName("validateShiftRules requires SHIFT:ASSIGN")
        void validateShiftRules_requiresShiftAssign() throws NoSuchMethodException {
            Method method = ShiftManagementController.class
                    .getMethod("validateShiftRules", UUID.class, UUID.class, LocalDate.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(Arrays.asList(annotation.value()[0])).contains(Permission.SHIFT_ASSIGN);
        }
    }
}
