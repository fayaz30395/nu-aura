package com.hrms.api.attendance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.hrms.api.attendance.dto.RestrictedHolidayDTOs.*;
import com.hrms.application.attendance.service.RestrictedHolidayService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.attendance.RestrictedHoliday.HolidayCategory;
import com.hrms.domain.attendance.RestrictedHolidaySelection.SelectionStatus;
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
@DisplayName("RestrictedHolidayController Unit Tests")
class RestrictedHolidayControllerTest {

    @Mock
    private RestrictedHolidayService service;

    @InjectMocks
    private RestrictedHolidayController controller;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    private static final UUID HOLIDAY_ID = UUID.randomUUID();
    private static final UUID SELECTION_ID = UUID.randomUUID();
    private static final UUID EMPLOYEE_ID = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new com.hrms.common.exception.GlobalExceptionHandler(
                        new io.micrometer.core.instrument.simple.SimpleMeterRegistry()))
                .build();
        objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    // ─── Helper builders ──────────────────────────────────────────────────

    private HolidayResponse buildHolidayResponse() {
        return HolidayResponse.builder()
                .id(HOLIDAY_ID)
                .holidayName("Pongal")
                .holidayDate(LocalDate.of(2026, 1, 14))
                .description("Harvest festival")
                .category(HolidayCategory.RELIGIOUS)
                .year(2026)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .selectionCount(5L)
                .build();
    }

    private HolidayRequest buildHolidayRequest() {
        return HolidayRequest.builder()
                .holidayName("Pongal")
                .holidayDate(LocalDate.of(2026, 1, 14))
                .description("Harvest festival")
                .category(HolidayCategory.RELIGIOUS)
                .isActive(true)
                .build();
    }

    private SelectionResponse buildSelectionResponse(SelectionStatus status) {
        return SelectionResponse.builder()
                .id(SELECTION_ID)
                .employeeId(EMPLOYEE_ID)
                .restrictedHolidayId(HOLIDAY_ID)
                .holidayName("Pongal")
                .holidayDate(LocalDate.of(2026, 1, 14))
                .holidayCategory(HolidayCategory.RELIGIOUS)
                .status(status)
                .createdAt(LocalDateTime.now())
                .build();
    }

    // ─── Holiday CRUD Tests ───────────────────────────────────────────────

    @Nested
    @DisplayName("Holiday CRUD")
    class HolidayCrudTests {

        @Test
        @DisplayName("GET /api/v1/restricted-holidays returns paginated list")
        void listHolidays_returnsPage() throws Exception {
            HolidayResponse holidayResponse = buildHolidayResponse();
            Page<HolidayResponse> page = new PageImpl<>(List.of(holidayResponse),
                    PageRequest.of(0, 20), 1);

            when(service.getAllHolidays(isNull(), any())).thenReturn(page);

            mockMvc.perform(get("/api/v1/restricted-holidays")
                            .param("page", "0")
                            .param("size", "20")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].holidayName").value("Pongal"))
                    .andExpect(jsonPath("$.content[0].year").value(2026))
                    .andExpect(jsonPath("$.totalElements").value(1));

            verify(service).getAllHolidays(isNull(), any());
        }

        @Test
        @DisplayName("GET /api/v1/restricted-holidays with year filter passes year to service")
        void listHolidays_withYearFilter_passesYearToService() throws Exception {
            Page<HolidayResponse> page = new PageImpl<>(List.of(), PageRequest.of(0, 20), 0);
            when(service.getAllHolidays(eq(2026), any())).thenReturn(page);

            mockMvc.perform(get("/api/v1/restricted-holidays")
                            .param("year", "2026")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());

            verify(service).getAllHolidays(eq(2026), any());
        }

        @Test
        @DisplayName("GET /api/v1/restricted-holidays/available returns list of active holidays")
        void getAvailableHolidays_returnsActiveList() throws Exception {
            HolidayResponse response = buildHolidayResponse();
            when(service.getAvailableHolidays(anyInt())).thenReturn(List.of(response));

            mockMvc.perform(get("/api/v1/restricted-holidays/available")
                            .param("year", "2026")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].holidayName").value("Pongal"))
                    .andExpect(jsonPath("$[0].isActive").value(true));

            verify(service).getAvailableHolidays(2026);
        }

        @Test
        @DisplayName("GET /api/v1/restricted-holidays/{id} returns single holiday")
        void getHoliday_returnsHolidayById() throws Exception {
            when(service.getHolidayById(HOLIDAY_ID)).thenReturn(buildHolidayResponse());

            mockMvc.perform(get("/api/v1/restricted-holidays/{id}", HOLIDAY_ID)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(HOLIDAY_ID.toString()))
                    .andExpect(jsonPath("$.holidayName").value("Pongal"));

            verify(service).getHolidayById(HOLIDAY_ID);
        }

        @Test
        @DisplayName("POST /api/v1/restricted-holidays creates holiday and returns 201")
        void createHoliday_returns201() throws Exception {
            HolidayRequest request = buildHolidayRequest();
            when(service.createHoliday(any(HolidayRequest.class))).thenReturn(buildHolidayResponse());

            mockMvc.perform(post("/api/v1/restricted-holidays")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request))
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.holidayName").value("Pongal"))
                    .andExpect(jsonPath("$.category").value("RELIGIOUS"));

            verify(service).createHoliday(any(HolidayRequest.class));
        }

        @Test
        @DisplayName("PUT /api/v1/restricted-holidays/{id} updates holiday and returns 200")
        void updateHoliday_returns200() throws Exception {
            HolidayRequest request = buildHolidayRequest();
            request.setHolidayName("Pongal Updated");
            HolidayResponse updated = buildHolidayResponse();
            updated.setHolidayName("Pongal Updated");

            when(service.updateHoliday(eq(HOLIDAY_ID), any(HolidayRequest.class))).thenReturn(updated);

            mockMvc.perform(put("/api/v1/restricted-holidays/{id}", HOLIDAY_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request))
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.holidayName").value("Pongal Updated"));

            verify(service).updateHoliday(eq(HOLIDAY_ID), any(HolidayRequest.class));
        }

        @Test
        @DisplayName("DELETE /api/v1/restricted-holidays/{id} deletes holiday and returns 204")
        void deleteHoliday_returns204() throws Exception {
            doNothing().when(service).deleteHoliday(HOLIDAY_ID);

            mockMvc.perform(delete("/api/v1/restricted-holidays/{id}", HOLIDAY_ID))
                    .andExpect(status().isNoContent());

            verify(service).deleteHoliday(HOLIDAY_ID);
        }
    }

    // ─── Selection Tests ──────────────────────────────────────────────────

    @Nested
    @DisplayName("Selection Endpoints")
    class SelectionTests {

        @Test
        @DisplayName("POST /api/v1/restricted-holidays/{id}/select creates selection and returns 201")
        void selectHoliday_returns201() throws Exception {
            SelectionResponse response = buildSelectionResponse(SelectionStatus.PENDING);
            when(service.selectHoliday(HOLIDAY_ID)).thenReturn(response);

            mockMvc.perform(post("/api/v1/restricted-holidays/{holidayId}/select", HOLIDAY_ID)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.status").value("PENDING"))
                    .andExpect(jsonPath("$.holidayName").value("Pongal"));

            verify(service).selectHoliday(HOLIDAY_ID);
        }

        @Test
        @DisplayName("GET /api/v1/restricted-holidays/selections/me returns employee selections")
        void getMySelections_returnsSelections() throws Exception {
            when(service.getMySelections(2026))
                    .thenReturn(List.of(buildSelectionResponse(SelectionStatus.APPROVED)));

            mockMvc.perform(get("/api/v1/restricted-holidays/selections/me")
                            .param("year", "2026")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].status").value("APPROVED"));

            verify(service).getMySelections(2026);
        }

        @Test
        @DisplayName("GET /api/v1/restricted-holidays/summary/me returns employee summary")
        void getMySummary_returnsSummary() throws Exception {
            EmployeeSummaryResponse summary = EmployeeSummaryResponse.builder()
                    .year(2026)
                    .maxSelections(3)
                    .usedSelections(1L)
                    .remainingSelections(2L)
                    .requiresApproval(true)
                    .build();

            when(service.getEmployeeSummary(2026)).thenReturn(summary);

            mockMvc.perform(get("/api/v1/restricted-holidays/summary/me")
                            .param("year", "2026")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.maxSelections").value(3))
                    .andExpect(jsonPath("$.usedSelections").value(1))
                    .andExpect(jsonPath("$.remainingSelections").value(2));

            verify(service).getEmployeeSummary(2026);
        }

        @Test
        @DisplayName("POST /selections/{id}/cancel cancels pending selection")
        void cancelSelection_returns200() throws Exception {
            SelectionResponse cancelled = buildSelectionResponse(SelectionStatus.CANCELLED);
            when(service.cancelSelection(SELECTION_ID)).thenReturn(cancelled);

            mockMvc.perform(post("/api/v1/restricted-holidays/selections/{selectionId}/cancel",
                            SELECTION_ID)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("CANCELLED"));

            verify(service).cancelSelection(SELECTION_ID);
        }

        @Test
        @DisplayName("GET /selections returns paged selections filtered by status")
        void getSelectionsByStatus_returnsPaged() throws Exception {
            Page<SelectionResponse> page = new PageImpl<>(
                    List.of(buildSelectionResponse(SelectionStatus.PENDING)),
                    PageRequest.of(0, 20), 1);

            when(service.getSelectionsByStatus(eq(SelectionStatus.PENDING), any())).thenReturn(page);

            mockMvc.perform(get("/api/v1/restricted-holidays/selections")
                            .param("status", "PENDING")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].status").value("PENDING"));

            verify(service).getSelectionsByStatus(eq(SelectionStatus.PENDING), any());
        }

        @Test
        @DisplayName("GET /{holidayId}/selections returns selections for a specific holiday")
        void getSelectionsByHoliday_returnsPaged() throws Exception {
            Page<SelectionResponse> page = new PageImpl<>(
                    List.of(buildSelectionResponse(SelectionStatus.APPROVED)),
                    PageRequest.of(0, 20), 1);

            when(service.getSelectionsByHoliday(eq(HOLIDAY_ID), any())).thenReturn(page);

            mockMvc.perform(get("/api/v1/restricted-holidays/{holidayId}/selections", HOLIDAY_ID)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].status").value("APPROVED"));

            verify(service).getSelectionsByHoliday(eq(HOLIDAY_ID), any());
        }

        @Test
        @DisplayName("POST /selections/{id}/approve approves selection and returns 200")
        void approveSelection_returns200() throws Exception {
            SelectionResponse approved = buildSelectionResponse(SelectionStatus.APPROVED);
            when(service.approveSelection(SELECTION_ID)).thenReturn(approved);

            mockMvc.perform(post("/api/v1/restricted-holidays/selections/{selectionId}/approve",
                            SELECTION_ID)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("APPROVED"));

            verify(service).approveSelection(SELECTION_ID);
        }

        @Test
        @DisplayName("POST /selections/{id}/reject with reason rejects selection")
        void rejectSelection_withReason_returns200() throws Exception {
            SelectionActionRequest actionRequest = new SelectionActionRequest("Not eligible");
            SelectionResponse rejected = buildSelectionResponse(SelectionStatus.REJECTED);
            rejected.setRejectionReason("Not eligible");

            when(service.rejectSelection(SELECTION_ID, "Not eligible")).thenReturn(rejected);

            mockMvc.perform(post("/api/v1/restricted-holidays/selections/{selectionId}/reject",
                            SELECTION_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(actionRequest))
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("REJECTED"))
                    .andExpect(jsonPath("$.rejectionReason").value("Not eligible"));

            verify(service).rejectSelection(SELECTION_ID, "Not eligible");
        }

        @Test
        @DisplayName("POST /selections/{id}/reject without body passes null reason")
        void rejectSelection_withoutBody_passesNullReason() throws Exception {
            SelectionResponse rejected = buildSelectionResponse(SelectionStatus.REJECTED);
            when(service.rejectSelection(SELECTION_ID, null)).thenReturn(rejected);

            mockMvc.perform(post("/api/v1/restricted-holidays/selections/{selectionId}/reject",
                            SELECTION_ID)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());

            verify(service).rejectSelection(SELECTION_ID, null);
        }
    }

    // ─── Policy Tests ──────────────────────────────────────────────────────

    @Nested
    @DisplayName("Policy Endpoints")
    class PolicyTests {

        @Test
        @DisplayName("GET /policy returns policy for given year")
        void getPolicy_returnsPolicy() throws Exception {
            PolicyResponse policy = PolicyResponse.builder()
                    .id(UUID.randomUUID())
                    .maxSelectionsPerYear(3)
                    .requiresApproval(true)
                    .year(2026)
                    .isActive(true)
                    .minDaysBeforeSelection(7)
                    .build();

            when(service.getPolicy(2026)).thenReturn(policy);

            mockMvc.perform(get("/api/v1/restricted-holidays/policy")
                            .param("year", "2026")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.maxSelectionsPerYear").value(3))
                    .andExpect(jsonPath("$.requiresApproval").value(true))
                    .andExpect(jsonPath("$.year").value(2026));

            verify(service).getPolicy(2026);
        }

        @Test
        @DisplayName("PUT /policy saves policy and returns 200")
        void savePolicy_returns200() throws Exception {
            PolicyRequest request = PolicyRequest.builder()
                    .maxSelectionsPerYear(3)
                    .requiresApproval(true)
                    .year(2026)
                    .minDaysBeforeSelection(7)
                    .build();

            PolicyResponse saved = PolicyResponse.builder()
                    .id(UUID.randomUUID())
                    .maxSelectionsPerYear(3)
                    .requiresApproval(true)
                    .year(2026)
                    .isActive(true)
                    .build();

            when(service.savePolicy(any(PolicyRequest.class))).thenReturn(saved);

            mockMvc.perform(put("/api/v1/restricted-holidays/policy")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request))
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.maxSelectionsPerYear").value(3));

            verify(service).savePolicy(any(PolicyRequest.class));
        }
    }

    // ─── Permission Annotation Tests ──────────────────────────────────────

    @Nested
    @DisplayName("@RequiresPermission annotations")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("createHoliday requires LEAVE:MANAGE")
        void createHoliday_requiresLeaveManage() throws NoSuchMethodException {
            Method method = RestrictedHolidayController.class
                    .getMethod("createHoliday", HolidayRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(Arrays.asList(annotation.value()[0])).contains(Permission.LEAVE_MANAGE);
        }

        @Test
        @DisplayName("updateHoliday requires LEAVE:MANAGE")
        void updateHoliday_requiresLeaveManage() throws NoSuchMethodException {
            Method method = RestrictedHolidayController.class
                    .getMethod("updateHoliday", UUID.class, HolidayRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(Arrays.asList(annotation.value()[0])).contains(Permission.LEAVE_MANAGE);
        }

        @Test
        @DisplayName("deleteHoliday requires LEAVE:MANAGE")
        void deleteHoliday_requiresLeaveManage() throws NoSuchMethodException {
            Method method = RestrictedHolidayController.class
                    .getMethod("deleteHoliday", UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(Arrays.asList(annotation.value()[0])).contains(Permission.LEAVE_MANAGE);
        }

        @Test
        @DisplayName("approveSelection requires LEAVE:APPROVE")
        void approveSelection_requiresLeaveApprove() throws NoSuchMethodException {
            Method method = RestrictedHolidayController.class
                    .getMethod("approveSelection", UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(Arrays.asList(annotation.value()[0])).contains(Permission.LEAVE_APPROVE);
        }

        @Test
        @DisplayName("rejectSelection requires LEAVE:APPROVE and accepts @Valid SelectionActionRequest")
        void rejectSelection_requiresLeaveApproveAndHasValidAnnotation() throws NoSuchMethodException {
            Method method = RestrictedHolidayController.class
                    .getMethod("rejectSelection", UUID.class, SelectionActionRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(Arrays.asList(annotation.value()[0])).contains(Permission.LEAVE_APPROVE);

            // Verify @Valid is present on SelectionActionRequest parameter (index 1)
            java.lang.annotation.Annotation[] paramAnnotations =
                    method.getParameterAnnotations()[1];
            boolean hasValid = Arrays.stream(paramAnnotations)
                    .anyMatch(a -> a.annotationType().equals(jakarta.validation.Valid.class));
            assertThat(hasValid)
                    .as("@Valid must be present on SelectionActionRequest parameter")
                    .isTrue();
        }

        @Test
        @DisplayName("selectHoliday requires LEAVE:REQUEST")
        void selectHoliday_requiresLeaveRequest() throws NoSuchMethodException {
            Method method = RestrictedHolidayController.class
                    .getMethod("selectHoliday", UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(Arrays.asList(annotation.value()[0])).contains(Permission.LEAVE_REQUEST);
        }

        @Test
        @DisplayName("listHolidays requires LEAVE:VIEW_SELF")
        void listHolidays_requiresLeaveViewSelf() throws NoSuchMethodException {
            Method method = RestrictedHolidayController.class
                    .getMethod("listHolidays", Integer.class, int.class, int.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(Arrays.asList(annotation.value()[0])).contains(Permission.LEAVE_VIEW_SELF);
        }
    }

    // ─── Bulk / Error Scenario Tests ──────────────────────────────────────

    @Nested
    @DisplayName("Error and Edge Cases")
    class ErrorScenarioTests {

        @Test
        @DisplayName("getAvailableHolidays returns empty list when no active holidays")
        void getAvailableHolidays_emptyList() throws Exception {
            when(service.getAvailableHolidays(anyInt())).thenReturn(List.of());

            mockMvc.perform(get("/api/v1/restricted-holidays/available")
                            .param("year", "2026")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$.length()").value(0));
        }

        @Test
        @DisplayName("createHoliday propagates service exception")
        void createHoliday_serviceThrows_propagatesException() throws Exception {
            HolidayRequest request = buildHolidayRequest();
            when(service.createHoliday(any())).thenThrow(new IllegalArgumentException("Duplicate holiday date"));

            mockMvc.perform(post("/api/v1/restricted-holidays")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("selectHoliday propagates quota-exceeded exception")
        void selectHoliday_quotaExceeded_propagatesException() throws Exception {
            when(service.selectHoliday(HOLIDAY_ID))
                    .thenThrow(new IllegalStateException("Annual quota exceeded"));

            mockMvc.perform(post("/api/v1/restricted-holidays/{holidayId}/select", HOLIDAY_ID))
                    .andExpect(status().isBadRequest());
        }
    }
}
