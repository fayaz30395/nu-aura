package com.hrms.api.workflow.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.workflow.dto.*;
import com.hrms.application.workflow.service.WorkflowService;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.common.security.*;
import com.hrms.domain.workflow.StepExecution;
import com.hrms.domain.workflow.WorkflowDefinition;
import com.hrms.domain.workflow.WorkflowExecution;
import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests for approval-related endpoints in WorkflowController.
 * Covers approval listing, approve/reject actions, delegation, and permission verification.
 */
@WebMvcTest(WorkflowController.class)
@ContextConfiguration(classes = {WorkflowController.class, GlobalExceptionHandler.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ApprovalController Unit Tests (via WorkflowController)")
class ApprovalControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private WorkflowService workflowService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    @MockitoBean
    private MeterRegistry meterRegistry;

    private static final String BASE_URL = "/api/v1/workflow";

    private UUID executionId;
    private UUID userId;
    private WorkflowExecutionResponse pendingExecution;
    private WorkflowExecutionResponse approvedExecution;
    private WorkflowExecutionResponse rejectedExecution;

    @BeforeEach
    void setUp() {
        executionId = UUID.randomUUID();
        userId = UUID.randomUUID();

        pendingExecution = WorkflowExecutionResponse.builder()
                .id(executionId)
                .workflowName("Expense Approval")
                .entityType(WorkflowDefinition.EntityType.EXPENSE_CLAIM)
                .entityId(UUID.randomUUID())
                .referenceNumber("WF-2024-100")
                .requesterId(userId)
                .status(WorkflowExecution.ExecutionStatus.PENDING)
                .currentStepName("Manager Review")
                .build();

        approvedExecution = WorkflowExecutionResponse.builder()
                .id(executionId)
                .status(WorkflowExecution.ExecutionStatus.APPROVED)
                .referenceNumber("WF-2024-100")
                .build();

        rejectedExecution = WorkflowExecutionResponse.builder()
                .id(executionId)
                .status(WorkflowExecution.ExecutionStatus.REJECTED)
                .referenceNumber("WF-2024-100")
                .build();
    }

    // ===================== Approval Listing Tests =====================

    @Nested
    @DisplayName("GET /inbox — Approval inbox listing")
    class ApprovalListingTests {

        @Test
        @DisplayName("Should list pending approvals for current user")
        void shouldListPendingApprovals() throws Exception {
            Page<WorkflowExecutionResponse> page = new PageImpl<>(
                    List.of(pendingExecution), Pageable.ofSize(20), 1
            );

            when(workflowService.getApprovalInbox(
                    eq("PENDING"), isNull(), isNull(), isNull(), isNull(), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get(BASE_URL + "/inbox")
                            .param("status", "PENDING"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.content[0].status").value("PENDING"))
                    .andExpect(jsonPath("$.content[0].referenceNumber").value("WF-2024-100"));

            verify(workflowService).getApprovalInbox(
                    eq("PENDING"), isNull(), isNull(), isNull(), isNull(), any(Pageable.class));
        }

        @Test
        @DisplayName("Should list approvals with all filter parameters")
        void shouldListApprovalsWithAllFilters() throws Exception {
            Page<WorkflowExecutionResponse> page = new PageImpl<>(List.of(), Pageable.ofSize(10), 0);

            when(workflowService.getApprovalInbox(any(), any(), any(), any(), any(), any()))
                    .thenReturn(page);

            mockMvc.perform(get(BASE_URL + "/inbox")
                            .param("status", "APPROVED")
                            .param("module", "EXPENSE_CLAIM")
                            .param("fromDate", "2024-01-01")
                            .param("toDate", "2024-01-31")
                            .param("search", "John"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalElements").value(0));
        }

        @Test
        @DisplayName("Should return my pending approvals list")
        void shouldReturnMyPendingApprovalsList() throws Exception {
            when(workflowService.getMyPendingApprovals())
                    .thenReturn(List.of(pendingExecution));

            mockMvc.perform(get(BASE_URL + "/my-pending-approvals"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].status").value("PENDING"))
                    .andExpect(jsonPath("$[0].entityType").value("EXPENSE_CLAIM"));

            verify(workflowService).getMyPendingApprovals();
        }

        @Test
        @DisplayName("Should return pending approvals for specific user")
        void shouldReturnPendingApprovalsForSpecificUser() throws Exception {
            when(workflowService.getPendingApprovalsForUser(userId))
                    .thenReturn(List.of(pendingExecution));

            mockMvc.perform(get(BASE_URL + "/pending-approvals/user/{userId}", userId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].requesterId").value(userId.toString()));

            verify(workflowService).getPendingApprovalsForUser(userId);
        }

        @Test
        @DisplayName("Should return inbox counts by status")
        void shouldReturnInboxCounts() throws Exception {
            Map<String, Long> counts = new HashMap<>();
            counts.put("PENDING", 3L);
            counts.put("APPROVED", 15L);
            counts.put("REJECTED", 1L);

            when(workflowService.getInboxCounts()).thenReturn(counts);

            mockMvc.perform(get(BASE_URL + "/inbox/count"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.PENDING").value(3))
                    .andExpect(jsonPath("$.APPROVED").value(15))
                    .andExpect(jsonPath("$.REJECTED").value(1));

            verify(workflowService).getInboxCounts();
        }
    }

    // ===================== Approve Action Tests =====================

    @Nested
    @DisplayName("POST /executions/{id}/approve — Approve action")
    class ApproveActionTests {

        @Test
        @DisplayName("Should approve execution with comments")
        void shouldApproveExecutionWithComments() throws Exception {
            when(workflowService.processApprovalAction(eq(executionId), any(ApprovalActionRequest.class)))
                    .thenReturn(approvedExecution);

            Map<String, String> body = Map.of("comments", "Approved — within budget");

            mockMvc.perform(post(BASE_URL + "/executions/{id}/approve", executionId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("APPROVED"));

            verify(workflowService).processApprovalAction(
                    eq(executionId),
                    argThat(req -> req.getAction() == StepExecution.ApprovalAction.APPROVE
                            && "Approved — within budget".equals(req.getComments()))
            );
        }

        @Test
        @DisplayName("Should approve execution without body")
        void shouldApproveExecutionWithoutBody() throws Exception {
            when(workflowService.processApprovalAction(eq(executionId), any()))
                    .thenReturn(approvedExecution);

            mockMvc.perform(post(BASE_URL + "/executions/{id}/approve", executionId)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("APPROVED"));
        }

        @Test
        @DisplayName("Should use generic action endpoint for approval")
        void shouldUseGenericActionEndpointForApproval() throws Exception {
            ApprovalActionRequest request = new ApprovalActionRequest();
            request.setAction(StepExecution.ApprovalAction.APPROVE);
            request.setComments("All good");

            when(workflowService.processApprovalAction(eq(executionId), any(ApprovalActionRequest.class)))
                    .thenReturn(approvedExecution);

            mockMvc.perform(post(BASE_URL + "/executions/{id}/action", executionId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("APPROVED"));
        }
    }

    // ===================== Reject Action Tests =====================

    @Nested
    @DisplayName("POST /executions/{id}/reject — Reject action")
    class RejectActionTests {

        @Test
        @DisplayName("Should reject execution with reason")
        void shouldRejectExecutionWithReason() throws Exception {
            when(workflowService.processApprovalAction(eq(executionId), any(ApprovalActionRequest.class)))
                    .thenReturn(rejectedExecution);

            Map<String, String> body = Map.of("comments", "Over budget limit");

            mockMvc.perform(post(BASE_URL + "/executions/{id}/reject", executionId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("REJECTED"));

            verify(workflowService).processApprovalAction(
                    eq(executionId),
                    argThat(req -> req.getAction() == StepExecution.ApprovalAction.REJECT
                            && "Over budget limit".equals(req.getComments()))
            );
        }

        @Test
        @DisplayName("Should reject execution without body")
        void shouldRejectExecutionWithoutBody() throws Exception {
            when(workflowService.processApprovalAction(eq(executionId), any()))
                    .thenReturn(rejectedExecution);

            mockMvc.perform(post(BASE_URL + "/executions/{id}/reject", executionId)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());
        }
    }

    // ===================== Return for Modification Tests =====================

    @Nested
    @DisplayName("POST /executions/{id}/return — Return for modification")
    class ReturnForModificationTests {

        @Test
        @DisplayName("Should return execution for modification")
        void shouldReturnExecutionForModification() throws Exception {
            WorkflowExecutionResponse returnedExecution = WorkflowExecutionResponse.builder()
                    .id(executionId)
                    .status(WorkflowExecution.ExecutionStatus.PENDING)
                    .build();

            when(workflowService.processApprovalAction(eq(executionId), any()))
                    .thenReturn(returnedExecution);

            Map<String, String> body = Map.of("comments", "Please attach receipts");

            mockMvc.perform(post(BASE_URL + "/executions/{id}/return", executionId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isOk());

            verify(workflowService).processApprovalAction(
                    eq(executionId),
                    argThat(req -> req.getAction() == StepExecution.ApprovalAction.RETURN_FOR_MODIFICATION)
            );
        }
    }

    // ===================== Delegation Tests =====================

    @Nested
    @DisplayName("Delegation management")
    class DelegationTests {

        @Test
        @DisplayName("Should create delegation successfully")
        void shouldCreateDelegationSuccessfully() throws Exception {
            UUID delegateId = UUID.randomUUID();
            ApprovalDelegateRequest request = new ApprovalDelegateRequest();
            request.setDelegateId(delegateId);
            request.setStartDate(LocalDate.now());
            request.setEndDate(LocalDate.now().plusDays(5));
            request.setReason("Medical leave");

            ApprovalDelegateResponse response = ApprovalDelegateResponse.builder()
                    .id(UUID.randomUUID())
                    .delegateId(delegateId)
                    .delegatorId(userId)
                    .isActive(true)
                    .reason("Medical leave")
                    .build();

            when(workflowService.createDelegation(any(ApprovalDelegateRequest.class)))
                    .thenReturn(response);

            mockMvc.perform(post(BASE_URL + "/delegations")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.delegateId").value(delegateId.toString()))
                    .andExpect(jsonPath("$.isActive").value(true))
                    .andExpect(jsonPath("$.reason").value("Medical leave"));

            verify(workflowService).createDelegation(any(ApprovalDelegateRequest.class));
        }

        @Test
        @DisplayName("Should return 400 when delegation missing required fields")
        void shouldReturn400WhenMissingFields() throws Exception {
            ApprovalDelegateRequest request = new ApprovalDelegateRequest();
            // Missing delegateId, startDate, endDate

            mockMvc.perform(post(BASE_URL + "/delegations")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return my delegations")
        void shouldReturnMyDelegations() throws Exception {
            ApprovalDelegateResponse delegation = ApprovalDelegateResponse.builder()
                    .id(UUID.randomUUID())
                    .delegateId(UUID.randomUUID())
                    .isActive(true)
                    .build();

            when(workflowService.getMyDelegations()).thenReturn(List.of(delegation));

            mockMvc.perform(get(BASE_URL + "/delegations/my"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].isActive").value(true));

            verify(workflowService).getMyDelegations();
        }

        @Test
        @DisplayName("Should return delegations to me")
        void shouldReturnDelegationsToMe() throws Exception {
            ApprovalDelegateResponse delegation = ApprovalDelegateResponse.builder()
                    .id(UUID.randomUUID())
                    .delegatorId(userId)
                    .isActive(true)
                    .build();

            when(workflowService.getDelegationsToMe()).thenReturn(List.of(delegation));

            mockMvc.perform(get(BASE_URL + "/delegations/to-me"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)));

            verify(workflowService).getDelegationsToMe();
        }

        @Test
        @DisplayName("Should revoke delegation with reason")
        void shouldRevokeDelegationWithReason() throws Exception {
            UUID delegationId = UUID.randomUUID();
            doNothing().when(workflowService).revokeDelegation(any(UUID.class), anyString());

            Map<String, String> body = Map.of("reason", "Delegate no longer available");

            mockMvc.perform(post(BASE_URL + "/delegations/{id}/revoke", delegationId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isOk());

            verify(workflowService).revokeDelegation(
                    eq(delegationId), eq("Delegate no longer available"));
        }

        @Test
        @DisplayName("Should revoke delegation without body")
        void shouldRevokeDelegationWithoutBody() throws Exception {
            UUID delegationId = UUID.randomUUID();
            doNothing().when(workflowService).revokeDelegation(any(UUID.class), isNull());

            mockMvc.perform(post(BASE_URL + "/delegations/{id}/revoke", delegationId)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());

            verify(workflowService).revokeDelegation(eq(delegationId), isNull());
        }
    }

    // ===================== Edge Case Tests =====================

    @Nested
    @DisplayName("Edge cases and error scenarios")
    class EdgeCaseTests {

        @Test
        @DisplayName("Should return empty inbox when no approvals exist")
        void shouldReturnEmptyInboxWhenNoApprovalsExist() throws Exception {
            Page<WorkflowExecutionResponse> emptyPage = new PageImpl<>(
                    Collections.emptyList(), Pageable.ofSize(20), 0
            );

            when(workflowService.getApprovalInbox(any(), any(), any(), any(), any(), any()))
                    .thenReturn(emptyPage);

            mockMvc.perform(get(BASE_URL + "/inbox"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(0)))
                    .andExpect(jsonPath("$.totalElements").value(0));
        }

        @Test
        @DisplayName("Should handle multiple approvals in my pending list")
        void shouldHandleMultiplePendingApprovals() throws Exception {
            List<WorkflowExecutionResponse> executions = new ArrayList<>();
            for (int i = 0; i < 5; i++) {
                executions.add(WorkflowExecutionResponse.builder()
                        .id(UUID.randomUUID())
                        .status(WorkflowExecution.ExecutionStatus.PENDING)
                        .referenceNumber("WF-2024-" + (100 + i))
                        .build());
            }

            when(workflowService.getMyPendingApprovals()).thenReturn(executions);

            mockMvc.perform(get(BASE_URL + "/my-pending-approvals"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(5)));
        }
    }

    // ===================== Permission Annotation Tests =====================

    @Nested
    @DisplayName("Permission annotation verification")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("approveExecution should require WORKFLOW_EXECUTE permission")
        void approveExecutionShouldRequireExecutePermission() throws Exception {
            var method = WorkflowController.class.getMethod(
                    "approveExecution", UUID.class, Map.class);
            var annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "approveExecution must have @RequiresPermission");
            Assertions.assertTrue(
                    java.util.Arrays.asList(annotation.value()).contains(Permission.WORKFLOW_EXECUTE));
        }

        @Test
        @DisplayName("rejectExecution should require WORKFLOW_EXECUTE permission")
        void rejectExecutionShouldRequireExecutePermission() throws Exception {
            var method = WorkflowController.class.getMethod(
                    "rejectExecution", UUID.class, Map.class);
            var annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "rejectExecution must have @RequiresPermission");
            Assertions.assertTrue(
                    java.util.Arrays.asList(annotation.value()).contains(Permission.WORKFLOW_EXECUTE));
        }

        @Test
        @DisplayName("getApprovalInbox should require WORKFLOW_VIEW permission")
        void getApprovalInboxShouldRequireViewPermission() throws Exception {
            var method = WorkflowController.class.getMethod(
                    "getApprovalInbox", String.class, String.class,
                    java.time.LocalDate.class, java.time.LocalDate.class, String.class, Pageable.class);
            var annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation);
            Assertions.assertTrue(
                    java.util.Arrays.asList(annotation.value()).contains(Permission.WORKFLOW_VIEW));
        }

        @Test
        @DisplayName("createDelegation should require WORKFLOW_EXECUTE permission")
        void createDelegationShouldRequireExecutePermission() throws Exception {
            var method = WorkflowController.class.getMethod(
                    "createDelegation", ApprovalDelegateRequest.class);
            var annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation);
            Assertions.assertTrue(
                    java.util.Arrays.asList(annotation.value()).contains(Permission.WORKFLOW_EXECUTE));
        }
    }
}
