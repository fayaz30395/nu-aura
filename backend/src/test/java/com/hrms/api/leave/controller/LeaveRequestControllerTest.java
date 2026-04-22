package com.hrms.api.leave.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.leave.dto.LeaveRequestRequest;
import com.hrms.application.employee.service.EmployeeService;
import com.hrms.application.leave.service.LeaveRequestService;
import com.hrms.common.security.DataScopeService;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.common.security.TenantFilter;
import com.hrms.domain.leave.LeaveRequest;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(LeaveRequestController.class)
@ContextConfiguration(classes = {LeaveRequestController.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("LeaveRequestController Unit Tests")
class LeaveRequestControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private LeaveRequestService leaveRequestService;

    @MockitoBean
    private EmployeeService employeeService;

    @MockitoBean
    private com.hrms.infrastructure.employee.repository.EmployeeRepository employeeRepository;

    @MockitoBean
    private DataScopeService dataScopeService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID leaveRequestId;
    private UUID employeeId;
    private LeaveRequest leaveRequest;

    @BeforeEach
    void setUp() {
        leaveRequestId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        leaveRequest = new LeaveRequest();
        leaveRequest.setId(leaveRequestId);
        leaveRequest.setEmployeeId(employeeId);
        leaveRequest.setStatus(LeaveRequest.LeaveRequestStatus.PENDING);
        leaveRequest.setStartDate(LocalDate.now().plusDays(1));
        leaveRequest.setEndDate(LocalDate.now().plusDays(3));
    }

    @Nested
    @DisplayName("Create Leave Request Tests")
    class CreateLeaveRequestTests {

        @Test
        @DisplayName("Should create leave request successfully")
        void shouldCreateLeaveRequestSuccessfully() throws Exception {
            LeaveRequestRequest request = new LeaveRequestRequest();
            request.setEmployeeId(employeeId);
            request.setLeaveTypeId(UUID.randomUUID());
            request.setStartDate(LocalDate.now().plusDays(1));
            request.setEndDate(LocalDate.now().plusDays(3));
            request.setReason("Annual vacation");

            when(leaveRequestService.createLeaveRequest(any(LeaveRequest.class)))
                    .thenReturn(leaveRequest);

            mockMvc.perform(post("/api/v1/leave-requests")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(leaveRequestId.toString()))
                    .andExpect(jsonPath("$.status").value("PENDING"));

            verify(leaveRequestService).createLeaveRequest(any(LeaveRequest.class));
        }
    }

    @Nested
    @DisplayName("Get Leave Request Tests")
    class GetLeaveRequestTests {

        @Test
        @DisplayName("Should get leave request by ID")
        void shouldGetLeaveRequestById() throws Exception {
            when(leaveRequestService.getLeaveRequestById(leaveRequestId))
                    .thenReturn(leaveRequest);

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class);
                 MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {

                sc.when(SecurityContext::isSuperAdmin).thenReturn(true);
                sc.when(() -> SecurityContext.getPermissionScope(anyString())).thenReturn(null);
                tc.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());

                mockMvc.perform(get("/api/v1/leave-requests/{id}", leaveRequestId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.id").value(leaveRequestId.toString()));

                verify(leaveRequestService).getLeaveRequestById(leaveRequestId);
            }
        }

        @Test
        @DisplayName("Should get all leave requests paginated")
        void shouldGetAllLeaveRequestsPaginated() throws Exception {
            Page<LeaveRequest> page = new PageImpl<>(List.of(leaveRequest),
                    PageRequest.of(0, 20), 1);

            when(dataScopeService.getScopeSpecification(anyString()))
                    .thenReturn((root, query, cb) -> cb.conjunction());
            when(leaveRequestService.getAllLeaveRequests(ArgumentMatchers.<Specification<LeaveRequest>>any(), any(Pageable.class)))
                    .thenReturn(page);

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class);
                 MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {

                sc.when(() -> SecurityContext.hasPermission(anyString())).thenReturn(true);
                tc.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());

                mockMvc.perform(get("/api/v1/leave-requests")
                                .param("page", "0")
                                .param("size", "20"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.content.length()").value(1));
            }
        }

        @Test
        @DisplayName("Should get leave requests by employee ID")
        void shouldGetLeaveRequestsByEmployeeId() throws Exception {
            Page<LeaveRequest> page = new PageImpl<>(List.of(leaveRequest),
                    PageRequest.of(0, 20), 1);

            when(leaveRequestService.getLeaveRequestsByEmployee(eq(employeeId), any(Pageable.class)))
                    .thenReturn(page);

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class);
                 MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {

                sc.when(SecurityContext::isSuperAdmin).thenReturn(true);
                sc.when(() -> SecurityContext.getPermissionScope(anyString())).thenReturn(null);
                tc.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());

                mockMvc.perform(get("/api/v1/leave-requests/employee/{employeeId}", employeeId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.content.length()").value(1));

                verify(leaveRequestService).getLeaveRequestsByEmployee(eq(employeeId), any(Pageable.class));
            }
        }
    }

    @Nested
    @DisplayName("Approve Leave Request Tests")
    class ApproveLeaveRequestTests {

        @Test
        @DisplayName("Should approve leave request successfully")
        void shouldApproveLeaveRequest() throws Exception {
            LeaveRequest approved = new LeaveRequest();
            approved.setId(leaveRequestId);
            approved.setStatus(LeaveRequest.LeaveRequestStatus.APPROVED);

            UUID approverId = UUID.randomUUID();
            when(leaveRequestService.approveLeaveRequest(eq(leaveRequestId), any(UUID.class)))
                    .thenReturn(approved);

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class);
                 MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {

                sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(approverId);
                tc.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());

                mockMvc.perform(post("/api/v1/leave-requests/{id}/approve", leaveRequestId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.status").value("APPROVED"));

                verify(leaveRequestService).approveLeaveRequest(eq(leaveRequestId), eq(approverId));
            }
        }
    }

    @Nested
    @DisplayName("Reject Leave Request Tests")
    class RejectLeaveRequestTests {

        @Test
        @DisplayName("Should reject leave request with reason")
        void shouldRejectLeaveRequestWithReason() throws Exception {
            LeaveRequest rejected = new LeaveRequest();
            rejected.setId(leaveRequestId);
            rejected.setStatus(LeaveRequest.LeaveRequestStatus.REJECTED);

            UUID approverId = UUID.randomUUID();
            when(leaveRequestService.rejectLeaveRequest(eq(leaveRequestId), any(UUID.class), anyString()))
                    .thenReturn(rejected);

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class);
                 MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {

                sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(approverId);
                tc.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());

                mockMvc.perform(post("/api/v1/leave-requests/{id}/reject", leaveRequestId)
                                .param("reason", "Insufficient coverage"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.status").value("REJECTED"));

                verify(leaveRequestService).rejectLeaveRequest(eq(leaveRequestId), eq(approverId), eq("Insufficient coverage"));
            }
        }

        @Test
        @DisplayName("Should return 400 when rejection reason is missing")
        void shouldReturn400WhenReasonMissing() throws Exception {
            mockMvc.perform(post("/api/v1/leave-requests/{id}/reject", leaveRequestId))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("Cancel Leave Request Tests")
    class CancelLeaveRequestTests {

        @Test
        @DisplayName("Should cancel leave request")
        void shouldCancelLeaveRequest() throws Exception {
            LeaveRequest cancelled = new LeaveRequest();
            cancelled.setId(leaveRequestId);
            cancelled.setStatus(LeaveRequest.LeaveRequestStatus.CANCELLED);

            when(leaveRequestService.cancelLeaveRequest(eq(leaveRequestId), anyString()))
                    .thenReturn(cancelled);

            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {
                tc.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());

                mockMvc.perform(post("/api/v1/leave-requests/{id}/cancel", leaveRequestId)
                                .param("reason", "Personal plans changed"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.status").value("CANCELLED"));

                verify(leaveRequestService).cancelLeaveRequest(eq(leaveRequestId), eq("Personal plans changed"));
            }
        }
    }

    @Nested
    @DisplayName("Update Leave Request Tests")
    class UpdateLeaveRequestTests {

        @Test
        @DisplayName("Should update leave request")
        void shouldUpdateLeaveRequest() throws Exception {
            LeaveRequestRequest request = new LeaveRequestRequest();
            request.setEmployeeId(employeeId);
            request.setLeaveTypeId(UUID.randomUUID());
            request.setStartDate(LocalDate.now().plusDays(2));
            request.setEndDate(LocalDate.now().plusDays(4));
            request.setReason("Updated vacation plans");

            LeaveRequest updated = new LeaveRequest();
            updated.setId(leaveRequestId);
            updated.setStatus(LeaveRequest.LeaveRequestStatus.PENDING);

            when(leaveRequestService.updateLeaveRequest(eq(leaveRequestId), any(LeaveRequest.class)))
                    .thenReturn(updated);

            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {
                tc.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());

                mockMvc.perform(put("/api/v1/leave-requests/{id}", leaveRequestId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                        .andExpect(status().isOk());

                verify(leaveRequestService).updateLeaveRequest(eq(leaveRequestId), any(LeaveRequest.class));
            }
        }
    }
}
