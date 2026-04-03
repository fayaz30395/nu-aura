package com.hrms.api.attendance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.hrms.application.attendance.service.CompOffService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.attendance.CompOffRequest;
import com.hrms.domain.attendance.CompOffRequest.CompOffStatus;
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
@DisplayName("CompOffController Unit Tests")
class CompOffControllerTest {

    private static final UUID REQUEST_ID = UUID.randomUUID();
    private static final UUID EMPLOYEE_ID = UUID.randomUUID();
    private static final UUID REVIEWER_ID = UUID.randomUUID();
    @Mock
    private CompOffService compOffService;
    @InjectMocks
    private CompOffController controller;
    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new com.hrms.common.exception.GlobalExceptionHandler(
                        new io.micrometer.core.instrument.simple.SimpleMeterRegistry()))
                .build();
        objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    // ─── Helper builders ──────────────────────────────────────────────────

    private CompOffRequest buildCompOffRequest(CompOffStatus status) {
        CompOffRequest request = new CompOffRequest();
        request.setId(REQUEST_ID);
        request.setEmployeeId(EMPLOYEE_ID);
        request.setAttendanceDate(LocalDate.now().minusDays(1));
        request.setStatus(status);
        request.setReason("Worked on weekend release");
        request.setCreatedAt(LocalDateTime.now());
        return request;
    }

    private CompOffController.CompOffRequestDto buildCompOffRequestDto() {
        CompOffController.CompOffRequestDto dto = new CompOffController.CompOffRequestDto();
        dto.setEmployeeId(EMPLOYEE_ID);
        dto.setAttendanceDate(LocalDate.now().minusDays(1));
        dto.setReason("Worked on weekend release");
        return dto;
    }

    private CompOffController.ReviewDto buildReviewDto() {
        CompOffController.ReviewDto dto = new CompOffController.ReviewDto();
        dto.setReviewerId(REVIEWER_ID);
        dto.setNote("Approved as per project requirements");
        return dto;
    }

    // ─── Request Creation ─────────────────────────────────────────────────

    @Nested
    @DisplayName("Comp-Off Request Creation")
    class RequestCreationTests {

        @Test
        @DisplayName("POST /api/v1/comp-off/request creates comp-off request and returns 201")
        void requestCompOff_returns201() throws Exception {
            CompOffController.CompOffRequestDto dto = buildCompOffRequestDto();
            CompOffRequest created = buildCompOffRequest(CompOffStatus.PENDING);

            when(compOffService.requestCompOff(
                    eq(EMPLOYEE_ID),
                    any(LocalDate.class),
                    anyString()))
                    .thenReturn(created);

            mockMvc.perform(post("/api/v1/comp-off/request")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(dto))
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.employeeId").value(EMPLOYEE_ID.toString()))
                    .andExpect(jsonPath("$.status").value("PENDING"));

            verify(compOffService).requestCompOff(
                    eq(EMPLOYEE_ID),
                    any(LocalDate.class),
                    anyString());
        }

        @Test
        @DisplayName("POST /request propagates service exception on duplicate")
        void requestCompOff_duplicateDate_propagatesException() throws Exception {
            CompOffController.CompOffRequestDto dto = buildCompOffRequestDto();

            when(compOffService.requestCompOff(any(), any(), any()))
                    .thenThrow(new IllegalStateException("Comp-off request already exists for this date"));

            mockMvc.perform(post("/api/v1/comp-off/request")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(dto)))
                    .andExpect(status().isBadRequest());
        }
    }

    // ─── Listing Tests ────────────────────────────────────────────────────

    @Nested
    @DisplayName("Listing Endpoints")
    class ListingTests {

        @Test
        @DisplayName("GET /employee/{id} returns paginated comp-off history")
        void getEmployeeHistory_returnsPaged() throws Exception {
            Page<CompOffRequest> page = new PageImpl<>(
                    List.of(buildCompOffRequest(CompOffStatus.APPROVED)),
                    PageRequest.of(0, 20), 1);

            when(compOffService.getEmployeeCompOffHistory(eq(EMPLOYEE_ID), any()))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/comp-off/employee/{employeeId}", EMPLOYEE_ID)
                            .param("page", "0")
                            .param("size", "20")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].employeeId").value(EMPLOYEE_ID.toString()))
                    .andExpect(jsonPath("$.content[0].status").value("APPROVED"))
                    .andExpect(jsonPath("$.totalElements").value(1));

            verify(compOffService).getEmployeeCompOffHistory(eq(EMPLOYEE_ID), any());
        }

        @Test
        @DisplayName("GET /my-pending/{id} returns pending requests for employee")
        void getMyPending_returnsList() throws Exception {
            when(compOffService.getMyPendingRequests(EMPLOYEE_ID))
                    .thenReturn(List.of(
                            buildCompOffRequest(CompOffStatus.PENDING)));

            mockMvc.perform(get("/api/v1/comp-off/my-pending/{employeeId}", EMPLOYEE_ID)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$[0].status").value("PENDING"));

            verify(compOffService).getMyPendingRequests(EMPLOYEE_ID);
        }

        @Test
        @DisplayName("GET /my-pending/{id} returns empty list when none pending")
        void getMyPending_emptyList() throws Exception {
            when(compOffService.getMyPendingRequests(EMPLOYEE_ID)).thenReturn(List.of());

            mockMvc.perform(get("/api/v1/comp-off/my-pending/{employeeId}", EMPLOYEE_ID)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(0));
        }

        @Test
        @DisplayName("GET /pending returns all pending comp-off requests paginated")
        void getPendingRequests_returnsPaged() throws Exception {
            Page<CompOffRequest> page = new PageImpl<>(
                    List.of(buildCompOffRequest(CompOffStatus.PENDING)),
                    PageRequest.of(0, 20), 1);

            when(compOffService.getPendingRequests(any())).thenReturn(page);

            mockMvc.perform(get("/api/v1/comp-off/pending")
                            .param("page", "0")
                            .param("size", "20")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].status").value("PENDING"))
                    .andExpect(jsonPath("$.totalElements").value(1));

            verify(compOffService).getPendingRequests(any());
        }
    }

    // ─── Approval / Rejection Tests ────────────────────────────────────────

    @Nested
    @DisplayName("Approval and Rejection")
    class ApprovalRejectionTests {

        @Test
        @DisplayName("POST /{id}/approve approves request and returns 200")
        void approve_returns200() throws Exception {
            CompOffController.ReviewDto dto = buildReviewDto();
            CompOffRequest approved = buildCompOffRequest(CompOffStatus.APPROVED);
            approved.setReviewNote("Approved as per project requirements");

            when(compOffService.approveCompOff(
                    eq(REQUEST_ID),
                    eq(REVIEWER_ID),
                    eq("Approved as per project requirements")))
                    .thenReturn(approved);

            mockMvc.perform(post("/api/v1/comp-off/{requestId}/approve", REQUEST_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(dto))
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("APPROVED"));

            verify(compOffService).approveCompOff(
                    eq(REQUEST_ID),
                    eq(REVIEWER_ID),
                    eq("Approved as per project requirements"));
        }

        @Test
        @DisplayName("POST /{id}/reject rejects request and returns 200")
        void reject_returns200() throws Exception {
            CompOffController.ReviewDto dto = new CompOffController.ReviewDto();
            dto.setReviewerId(REVIEWER_ID);
            dto.setNote("Overtime below threshold");

            CompOffRequest rejected = buildCompOffRequest(CompOffStatus.REJECTED);
            rejected.setReviewNote("Overtime below threshold");

            when(compOffService.rejectCompOff(
                    eq(REQUEST_ID),
                    eq(REVIEWER_ID),
                    eq("Overtime below threshold")))
                    .thenReturn(rejected);

            mockMvc.perform(post("/api/v1/comp-off/{requestId}/reject", REQUEST_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(dto))
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("REJECTED"));

            verify(compOffService).rejectCompOff(
                    eq(REQUEST_ID),
                    eq(REVIEWER_ID),
                    eq("Overtime below threshold"));
        }

        @Test
        @DisplayName("POST /{id}/approve propagates exception when request not in PENDING state")
        void approve_notPendingState_propagatesException() throws Exception {
            CompOffController.ReviewDto dto = buildReviewDto();

            when(compOffService.approveCompOff(any(), any(), any()))
                    .thenThrow(new IllegalStateException("Request is not in PENDING state"));

            mockMvc.perform(post("/api/v1/comp-off/{requestId}/approve", REQUEST_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(dto)))
                    .andExpect(status().isBadRequest());
        }
    }

    // ─── Permission Annotation Tests ──────────────────────────────────────

    @Nested
    @DisplayName("@RequiresPermission annotations")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("requestCompOff requires ATTENDANCE:REGULARIZE")
        void requestCompOff_requiresAttendanceRegularize() throws NoSuchMethodException {
            Method method = CompOffController.class
                    .getMethod("requestCompOff", CompOffController.CompOffRequestDto.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(Arrays.asList(annotation.value()[0])).contains(Permission.ATTENDANCE_REGULARIZE);
        }

        @Test
        @DisplayName("getEmployeeHistory requires ATTENDANCE:VIEW_ALL or ATTENDANCE:VIEW_TEAM")
        void getEmployeeHistory_requiresViewPermission() throws NoSuchMethodException {
            Method method = CompOffController.class
                    .getMethod("getEmployeeHistory", UUID.class, int.class, int.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            List<String> perms = Arrays.asList(annotation.value()[0]);
            assertThat(perms).containsAnyOf(
                    Permission.ATTENDANCE_VIEW_ALL,
                    Permission.ATTENDANCE_VIEW_TEAM);
        }

        @Test
        @DisplayName("approve requires ATTENDANCE:APPROVE")
        void approve_requiresAttendanceApprove() throws NoSuchMethodException {
            Method method = CompOffController.class
                    .getMethod("approve", UUID.class, CompOffController.ReviewDto.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(Arrays.asList(annotation.value()[0])).contains(Permission.ATTENDANCE_APPROVE);
        }

        @Test
        @DisplayName("reject requires ATTENDANCE:APPROVE")
        void reject_requiresAttendanceApprove() throws NoSuchMethodException {
            Method method = CompOffController.class
                    .getMethod("reject", UUID.class, CompOffController.ReviewDto.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(Arrays.asList(annotation.value()[0])).contains(Permission.ATTENDANCE_APPROVE);
        }

        @Test
        @DisplayName("getPendingRequests requires ATTENDANCE:APPROVE")
        void getPendingRequests_requiresAttendanceApprove() throws NoSuchMethodException {
            Method method = CompOffController.class
                    .getMethod("getPendingRequests", int.class, int.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(Arrays.asList(annotation.value()[0])).contains(Permission.ATTENDANCE_APPROVE);
        }
    }
}
