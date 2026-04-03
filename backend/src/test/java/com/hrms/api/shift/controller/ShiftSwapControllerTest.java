package com.hrms.api.shift.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.hrms.application.shift.service.ShiftSwapService;
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
@DisplayName("ShiftSwapController Unit Tests")
class ShiftSwapControllerTest {

    private static final UUID REQUEST_ID = UUID.randomUUID();
    private static final UUID REQUESTER_ID = UUID.randomUUID();
    private static final UUID TARGET_ID = UUID.randomUUID();
    private static final UUID MANAGER_ID = UUID.randomUUID();
    private static final UUID REQUESTER_ASSIGNMENT_ID = UUID.randomUUID();
    private static final UUID TARGET_ASSIGNMENT_ID = UUID.randomUUID();
    @Mock
    private ShiftSwapService shiftSwapService;
    @InjectMocks
    private ShiftSwapController controller;
    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    // ─── Helper ─────────────────────────────────────────────────────────

    private ShiftSwapRequest buildSwapRequest(ShiftSwapRequest.SwapStatus status) {
        ShiftSwapRequest req = new ShiftSwapRequest();
        req.setId(REQUEST_ID);
        req.setRequesterEmployeeId(REQUESTER_ID);
        req.setTargetEmployeeId(TARGET_ID);
        req.setRequesterShiftDate(LocalDate.now());
        req.setSwapType(ShiftSwapRequest.SwapType.SWAP);
        req.setStatus(status);
        req.setRequestedAt(LocalDateTime.now());
        return req;
    }

    // ─── Submit Request ──────────────────────────────────────────────────

    @Nested
    @DisplayName("Submit Swap Request")
    class SubmitRequestTests {

        @Test
        @DisplayName("POST /api/v1/shift-swaps submits swap request and returns 201")
        void submitRequest_returns201() throws Exception {
            ShiftSwapController.SwapRequestDto dto = new ShiftSwapController.SwapRequestDto();
            dto.setRequesterEmployeeId(REQUESTER_ID);
            dto.setRequesterAssignmentId(REQUESTER_ASSIGNMENT_ID);
            dto.setRequesterShiftDate(LocalDate.now());
            dto.setTargetEmployeeId(TARGET_ID);
            dto.setTargetAssignmentId(TARGET_ASSIGNMENT_ID);
            dto.setTargetShiftDate(LocalDate.now().plusDays(1));
            dto.setSwapType("SWAP");
            dto.setReason("Personal commitment");

            ShiftSwapRequest result = buildSwapRequest(ShiftSwapRequest.SwapStatus.PENDING);

            when(shiftSwapService.submitSwapRequest(
                    eq(REQUESTER_ID),
                    eq(REQUESTER_ASSIGNMENT_ID),
                    any(LocalDate.class),
                    eq(TARGET_ID),
                    eq(TARGET_ASSIGNMENT_ID),
                    any(LocalDate.class),
                    eq(ShiftSwapRequest.SwapType.SWAP),
                    anyString()))
                    .thenReturn(result);

            mockMvc.perform(post("/api/v1/shift-swaps")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(dto))
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(REQUEST_ID.toString()))
                    .andExpect(jsonPath("$.requesterEmployeeId").value(REQUESTER_ID.toString()));

            verify(shiftSwapService).submitSwapRequest(
                    eq(REQUESTER_ID),
                    eq(REQUESTER_ASSIGNMENT_ID),
                    any(LocalDate.class),
                    eq(TARGET_ID),
                    eq(TARGET_ASSIGNMENT_ID),
                    any(LocalDate.class),
                    eq(ShiftSwapRequest.SwapType.SWAP),
                    anyString());
        }
    }

    // ─── Employee Response Actions ────────────────────────────────────────

    @Nested
    @DisplayName("Employee Response Actions")
    class EmployeeResponseTests {

        @Test
        @DisplayName("POST /{id}/accept — target employee accepts request")
        void acceptRequest_returns200() throws Exception {
            ShiftSwapController.TargetResponseDto dto = new ShiftSwapController.TargetResponseDto();
            dto.setEmployeeId(TARGET_ID);

            ShiftSwapRequest accepted = buildSwapRequest(ShiftSwapRequest.SwapStatus.TARGET_ACCEPTED);
            when(shiftSwapService.acceptByTarget(REQUEST_ID, TARGET_ID)).thenReturn(accepted);

            mockMvc.perform(post("/api/v1/shift-swaps/{requestId}/accept", REQUEST_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(dto))
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(REQUEST_ID.toString()));

            verify(shiftSwapService).acceptByTarget(REQUEST_ID, TARGET_ID);
        }

        @Test
        @DisplayName("POST /{id}/decline — target employee declines request")
        void declineRequest_returns200() throws Exception {
            ShiftSwapController.TargetResponseDto dto = new ShiftSwapController.TargetResponseDto();
            dto.setEmployeeId(TARGET_ID);

            ShiftSwapRequest declined = buildSwapRequest(ShiftSwapRequest.SwapStatus.TARGET_DECLINED);
            when(shiftSwapService.declineByTarget(REQUEST_ID, TARGET_ID)).thenReturn(declined);

            mockMvc.perform(post("/api/v1/shift-swaps/{requestId}/decline", REQUEST_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(dto))
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());

            verify(shiftSwapService).declineByTarget(REQUEST_ID, TARGET_ID);
        }

        @Test
        @DisplayName("POST /{id}/cancel — requester cancels own request")
        void cancelRequest_returns200() throws Exception {
            ShiftSwapController.TargetResponseDto dto = new ShiftSwapController.TargetResponseDto();
            dto.setEmployeeId(REQUESTER_ID);

            ShiftSwapRequest cancelled = buildSwapRequest(ShiftSwapRequest.SwapStatus.CANCELLED);
            when(shiftSwapService.cancelRequest(REQUEST_ID, REQUESTER_ID)).thenReturn(cancelled);

            mockMvc.perform(post("/api/v1/shift-swaps/{requestId}/cancel", REQUEST_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(dto))
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());

            verify(shiftSwapService).cancelRequest(REQUEST_ID, REQUESTER_ID);
        }

        @Test
        @DisplayName("GET /my-requests/{employeeId} returns requester's requests paginated")
        void getMyRequests_returnsPaged() throws Exception {
            Page<ShiftSwapRequest> page = new PageImpl<>(
                    List.of(buildSwapRequest(ShiftSwapRequest.SwapStatus.PENDING)),
                    PageRequest.of(0, 20), 1);

            when(shiftSwapService.getMyRequests(eq(REQUESTER_ID), any())).thenReturn(page);

            mockMvc.perform(get("/api/v1/shift-swaps/my-requests/{employeeId}", REQUESTER_ID)
                            .param("page", "0")
                            .param("size", "20")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].requesterEmployeeId").value(REQUESTER_ID.toString()));

            verify(shiftSwapService).getMyRequests(eq(REQUESTER_ID), any());
        }

        @Test
        @DisplayName("GET /incoming/{employeeId} returns incoming requests for target employee")
        void getIncomingRequests_returnsList() throws Exception {
            when(shiftSwapService.getIncomingRequests(TARGET_ID))
                    .thenReturn(List.of(buildSwapRequest(ShiftSwapRequest.SwapStatus.PENDING)));

            mockMvc.perform(get("/api/v1/shift-swaps/incoming/{employeeId}", TARGET_ID)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].targetEmployeeId").value(TARGET_ID.toString()));

            verify(shiftSwapService).getIncomingRequests(TARGET_ID);
        }
    }

    // ─── Manager Actions ──────────────────────────────────────────────────

    @Nested
    @DisplayName("Manager Approval Actions")
    class ManagerActionTests {

        @Test
        @DisplayName("GET /pending-approval returns requests awaiting manager approval")
        void getPendingApproval_returnsList() throws Exception {
            when(shiftSwapService.getRequestsPendingApproval())
                    .thenReturn(List.of(buildSwapRequest(ShiftSwapRequest.SwapStatus.TARGET_ACCEPTED)));

            mockMvc.perform(get("/api/v1/shift-swaps/pending-approval")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$.length()").value(1));

            verify(shiftSwapService).getRequestsPendingApproval();
        }

        @Test
        @DisplayName("GET / returns all requests paginated")
        void getAllRequests_returnsPaged() throws Exception {
            Page<ShiftSwapRequest> page = new PageImpl<>(
                    List.of(buildSwapRequest(ShiftSwapRequest.SwapStatus.APPROVED)),
                    PageRequest.of(0, 20), 1);

            when(shiftSwapService.getAllRequests(any())).thenReturn(page);

            mockMvc.perform(get("/api/v1/shift-swaps")
                            .param("page", "0")
                            .param("size", "20")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalElements").value(1));

            verify(shiftSwapService).getAllRequests(any());
        }

        @Test
        @DisplayName("POST /{id}/approve — manager approves swap request")
        void approve_returns200() throws Exception {
            ShiftSwapController.ManagerActionDto dto = new ShiftSwapController.ManagerActionDto();
            dto.setManagerId(MANAGER_ID);
            dto.setReason(null);

            ShiftSwapRequest approved = buildSwapRequest(ShiftSwapRequest.SwapStatus.APPROVED);
            when(shiftSwapService.approveByManager(REQUEST_ID, MANAGER_ID)).thenReturn(approved);

            mockMvc.perform(post("/api/v1/shift-swaps/{requestId}/approve", REQUEST_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(dto))
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(REQUEST_ID.toString()));

            verify(shiftSwapService).approveByManager(REQUEST_ID, MANAGER_ID);
        }

        @Test
        @DisplayName("POST /{id}/reject — manager rejects swap request with reason")
        void reject_returns200() throws Exception {
            ShiftSwapController.ManagerActionDto dto = new ShiftSwapController.ManagerActionDto();
            dto.setManagerId(MANAGER_ID);
            dto.setReason("Operational requirements");

            ShiftSwapRequest rejected = buildSwapRequest(ShiftSwapRequest.SwapStatus.REJECTED);
            when(shiftSwapService.rejectByManager(REQUEST_ID, MANAGER_ID, "Operational requirements"))
                    .thenReturn(rejected);

            mockMvc.perform(post("/api/v1/shift-swaps/{requestId}/reject", REQUEST_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(dto))
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());

            verify(shiftSwapService).rejectByManager(REQUEST_ID, MANAGER_ID, "Operational requirements");
        }
    }

    // ─── Permission Annotation Tests ──────────────────────────────────────

    @Nested
    @DisplayName("@RequiresPermission annotations")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("submitRequest requires ATTENDANCE:REGULARIZE")
        void submitRequest_requiresAttendanceRegularize() throws NoSuchMethodException {
            Method method = ShiftSwapController.class
                    .getMethod("submitRequest", ShiftSwapController.SwapRequestDto.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(Arrays.asList(annotation.value()[0])).contains(Permission.ATTENDANCE_REGULARIZE);
        }

        @Test
        @DisplayName("acceptRequest requires ATTENDANCE:REGULARIZE")
        void acceptRequest_requiresAttendanceRegularize() throws NoSuchMethodException {
            Method method = ShiftSwapController.class
                    .getMethod("acceptRequest", UUID.class, ShiftSwapController.TargetResponseDto.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(Arrays.asList(annotation.value()[0])).contains(Permission.ATTENDANCE_REGULARIZE);
        }

        @Test
        @DisplayName("approve requires ATTENDANCE:APPROVE")
        void approve_requiresAttendanceApprove() throws NoSuchMethodException {
            Method method = ShiftSwapController.class
                    .getMethod("approve", UUID.class, ShiftSwapController.ManagerActionDto.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(Arrays.asList(annotation.value()[0])).contains(Permission.ATTENDANCE_APPROVE);
        }

        @Test
        @DisplayName("reject requires ATTENDANCE:APPROVE")
        void reject_requiresAttendanceApprove() throws NoSuchMethodException {
            Method method = ShiftSwapController.class
                    .getMethod("reject", UUID.class, ShiftSwapController.ManagerActionDto.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(Arrays.asList(annotation.value()[0])).contains(Permission.ATTENDANCE_APPROVE);
        }

        @Test
        @DisplayName("getAllRequests requires ATTENDANCE:VIEW_ALL")
        void getAllRequests_requiresAttendanceViewAll() throws NoSuchMethodException {
            Method method = ShiftSwapController.class
                    .getMethod("getAllRequests", int.class, int.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(Arrays.asList(annotation.value()[0])).contains(Permission.ATTENDANCE_VIEW_ALL);
        }
    }
}
