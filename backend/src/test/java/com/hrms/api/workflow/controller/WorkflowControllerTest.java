package com.hrms.api.workflow.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.workflow.dto.*;
import com.hrms.application.workflow.service.WorkflowService;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.common.security.*;
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

import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(WorkflowController.class)
@ContextConfiguration(classes = {WorkflowController.class, GlobalExceptionHandler.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("WorkflowController Unit Tests")
class WorkflowControllerTest {

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

    private UUID definitionId;
    private UUID executionId;
    private WorkflowDefinitionResponse definitionResponse;
    private WorkflowExecutionResponse executionResponse;

    @BeforeEach
    void setUp() {
        definitionId = UUID.randomUUID();
        executionId = UUID.randomUUID();

        definitionResponse = WorkflowDefinitionResponse.builder()
                .id(definitionId)
                .name("Leave Approval Workflow")
                .entityType(WorkflowDefinition.EntityType.LEAVE_REQUEST)
                .workflowType(WorkflowDefinition.WorkflowType.SEQUENTIAL)
                .isActive(true)
                .totalSteps(2)
                .build();

        executionResponse = WorkflowExecutionResponse.builder()
                .id(executionId)
                .workflowDefinitionId(definitionId)
                .workflowName("Leave Approval Workflow")
                .entityType(WorkflowDefinition.EntityType.LEAVE_REQUEST)
                .entityId(UUID.randomUUID())
                .referenceNumber("WF-2024-001")
                .status(WorkflowExecution.ExecutionStatus.PENDING)
                .build();
    }

    // ===================== Workflow Definition Tests =====================

    @Nested
    @DisplayName("POST /definitions — Create workflow definition")
    class CreateWorkflowDefinitionTests {

        @Test
        @DisplayName("Should create workflow definition successfully")
        void shouldCreateWorkflowDefinitionSuccessfully() throws Exception {
            WorkflowDefinitionRequest request = new WorkflowDefinitionRequest();
            request.setName("Leave Approval Workflow");
            request.setEntityType(WorkflowDefinition.EntityType.LEAVE_REQUEST);
            request.setWorkflowType(WorkflowDefinition.WorkflowType.SEQUENTIAL);

            when(workflowService.createWorkflowDefinition(any(WorkflowDefinitionRequest.class)))
                    .thenReturn(definitionResponse);

            mockMvc.perform(post(BASE_URL + "/definitions")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(definitionId.toString()))
                    .andExpect(jsonPath("$.name").value("Leave Approval Workflow"))
                    .andExpect(jsonPath("$.entityType").value("LEAVE_REQUEST"));

            verify(workflowService).createWorkflowDefinition(any(WorkflowDefinitionRequest.class));
        }

        @Test
        @DisplayName("Should return 400 when required fields are missing")
        void shouldReturn400WhenRequiredFieldsMissing() throws Exception {
            WorkflowDefinitionRequest request = new WorkflowDefinitionRequest();
            // Missing name, entityType, workflowType

            mockMvc.perform(post(BASE_URL + "/definitions")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("GET /definitions/{id} — Get workflow definition")
    class GetWorkflowDefinitionTests {

        @Test
        @DisplayName("Should return workflow definition by ID")
        void shouldReturnWorkflowDefinitionById() throws Exception {
            when(workflowService.getWorkflowDefinition(definitionId))
                    .thenReturn(definitionResponse);

            mockMvc.perform(get(BASE_URL + "/definitions/{id}", definitionId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(definitionId.toString()))
                    .andExpect(jsonPath("$.name").value("Leave Approval Workflow"));

            verify(workflowService).getWorkflowDefinition(definitionId);
        }
    }

    @Nested
    @DisplayName("GET /definitions — Get all workflow definitions")
    class GetAllWorkflowDefinitionsTests {

        @Test
        @DisplayName("Should return paginated workflow definitions")
        void shouldReturnPaginatedWorkflowDefinitions() throws Exception {
            Page<WorkflowDefinitionResponse> page = new PageImpl<>(
                    List.of(definitionResponse), Pageable.ofSize(20), 1
            );
            when(workflowService.getAllWorkflowDefinitions(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get(BASE_URL + "/definitions")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.totalElements").value(1));

            verify(workflowService).getAllWorkflowDefinitions(any(Pageable.class));
        }
    }

    @Nested
    @DisplayName("GET /definitions/entity-type/{entityType}")
    class GetWorkflowsByEntityTypeTests {

        @Test
        @DisplayName("Should return workflows by entity type")
        void shouldReturnWorkflowsByEntityType() throws Exception {
            when(workflowService.getWorkflowsByEntityType(WorkflowDefinition.EntityType.LEAVE_REQUEST))
                    .thenReturn(List.of(definitionResponse));

            mockMvc.perform(get(BASE_URL + "/definitions/entity-type/LEAVE_REQUEST"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$[0].entityType").value("LEAVE_REQUEST"));

            verify(workflowService).getWorkflowsByEntityType(WorkflowDefinition.EntityType.LEAVE_REQUEST);
        }
    }

    @Nested
    @DisplayName("PUT /definitions/{id} — Update workflow definition")
    class UpdateWorkflowDefinitionTests {

        @Test
        @DisplayName("Should update workflow definition successfully")
        void shouldUpdateWorkflowDefinitionSuccessfully() throws Exception {
            WorkflowDefinitionRequest request = new WorkflowDefinitionRequest();
            request.setName("Updated Leave Workflow");
            request.setEntityType(WorkflowDefinition.EntityType.LEAVE_REQUEST);
            request.setWorkflowType(WorkflowDefinition.WorkflowType.SEQUENTIAL);

            WorkflowDefinitionResponse updated = WorkflowDefinitionResponse.builder()
                    .id(definitionId)
                    .name("Updated Leave Workflow")
                    .entityType(WorkflowDefinition.EntityType.LEAVE_REQUEST)
                    .build();

            when(workflowService.updateWorkflowDefinition(eq(definitionId), any()))
                    .thenReturn(updated);

            mockMvc.perform(put(BASE_URL + "/definitions/{id}", definitionId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.name").value("Updated Leave Workflow"));

            verify(workflowService).updateWorkflowDefinition(eq(definitionId), any());
        }
    }

    @Nested
    @DisplayName("DELETE /definitions/{id} — Deactivate workflow definition")
    class DeactivateWorkflowDefinitionTests {

        @Test
        @DisplayName("Should deactivate workflow definition successfully")
        void shouldDeactivateWorkflowDefinitionSuccessfully() throws Exception {
            doNothing().when(workflowService).deactivateWorkflowDefinition(definitionId);

            mockMvc.perform(delete(BASE_URL + "/definitions/{id}", definitionId))
                    .andExpect(status().isOk());

            verify(workflowService).deactivateWorkflowDefinition(definitionId);
        }
    }

    // ===================== Workflow Execution Tests =====================

    @Nested
    @DisplayName("POST /executions — Start workflow")
    class StartWorkflowTests {

        @Test
        @DisplayName("Should start workflow execution successfully")
        void shouldStartWorkflowSuccessfully() throws Exception {
            WorkflowExecutionRequest request = new WorkflowExecutionRequest();
            request.setEntityType(WorkflowDefinition.EntityType.LEAVE_REQUEST);
            request.setEntityId(UUID.randomUUID());
            request.setTitle("Leave Request - John Doe");

            when(workflowService.startWorkflow(any(WorkflowExecutionRequest.class)))
                    .thenReturn(executionResponse);

            mockMvc.perform(post(BASE_URL + "/executions")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(executionId.toString()))
                    .andExpect(jsonPath("$.referenceNumber").value("WF-2024-001"))
                    .andExpect(jsonPath("$.status").value("PENDING"));

            verify(workflowService).startWorkflow(any(WorkflowExecutionRequest.class));
        }
    }

    @Nested
    @DisplayName("GET /executions/{id} — Get workflow execution")
    class GetWorkflowExecutionTests {

        @Test
        @DisplayName("Should return workflow execution by ID")
        void shouldReturnWorkflowExecutionById() throws Exception {
            when(workflowService.getWorkflowExecution(executionId)).thenReturn(executionResponse);

            mockMvc.perform(get(BASE_URL + "/executions/{id}", executionId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(executionId.toString()))
                    .andExpect(jsonPath("$.referenceNumber").value("WF-2024-001"));

            verify(workflowService).getWorkflowExecution(executionId);
        }
    }

    @Nested
    @DisplayName("GET /executions/reference/{referenceNumber}")
    class GetWorkflowByReferenceTests {

        @Test
        @DisplayName("Should return workflow execution by reference number")
        void shouldReturnWorkflowByReferenceNumber() throws Exception {
            when(workflowService.getWorkflowByReferenceNumber("WF-2024-001"))
                    .thenReturn(executionResponse);

            mockMvc.perform(get(BASE_URL + "/executions/reference/WF-2024-001"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.referenceNumber").value("WF-2024-001"));

            verify(workflowService).getWorkflowByReferenceNumber("WF-2024-001");
        }
    }

    @Nested
    @DisplayName("POST /executions/{id}/approve — Approve execution")
    class ApproveExecutionTests {

        @Test
        @DisplayName("Should approve workflow execution successfully")
        void shouldApproveWorkflowExecutionSuccessfully() throws Exception {
            WorkflowExecutionResponse approved = WorkflowExecutionResponse.builder()
                    .id(executionId)
                    .status(WorkflowExecution.ExecutionStatus.APPROVED)
                    .build();

            when(workflowService.processApprovalAction(eq(executionId), any(ApprovalActionRequest.class)))
                    .thenReturn(approved);

            Map<String, String> body = new HashMap<>();
            body.put("comments", "Looks good, approved.");

            mockMvc.perform(post(BASE_URL + "/executions/{id}/approve", executionId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("APPROVED"));

            verify(workflowService).processApprovalAction(eq(executionId), any(ApprovalActionRequest.class));
        }

        @Test
        @DisplayName("Should approve workflow execution without comments")
        void shouldApproveWithoutComments() throws Exception {
            when(workflowService.processApprovalAction(eq(executionId), any()))
                    .thenReturn(executionResponse);

            mockMvc.perform(post(BASE_URL + "/executions/{id}/approve", executionId)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());
        }
    }

    @Nested
    @DisplayName("POST /executions/{id}/reject — Reject execution")
    class RejectExecutionTests {

        @Test
        @DisplayName("Should reject workflow execution successfully")
        void shouldRejectWorkflowExecutionSuccessfully() throws Exception {
            WorkflowExecutionResponse rejected = WorkflowExecutionResponse.builder()
                    .id(executionId)
                    .status(WorkflowExecution.ExecutionStatus.REJECTED)
                    .build();

            when(workflowService.processApprovalAction(eq(executionId), any(ApprovalActionRequest.class)))
                    .thenReturn(rejected);

            Map<String, String> body = Map.of("comments", "Not enough budget.");

            mockMvc.perform(post(BASE_URL + "/executions/{id}/reject", executionId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("REJECTED"));
        }
    }

    @Nested
    @DisplayName("POST /executions/{id}/cancel — Cancel workflow")
    class CancelWorkflowTests {

        @Test
        @DisplayName("Should cancel workflow successfully")
        void shouldCancelWorkflowSuccessfully() throws Exception {
            doNothing().when(workflowService).cancelWorkflow(eq(executionId), anyString());

            Map<String, String> body = Map.of("reason", "Changed my mind");

            mockMvc.perform(post(BASE_URL + "/executions/{id}/cancel", executionId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isOk());

            verify(workflowService).cancelWorkflow(eq(executionId), eq("Changed my mind"));
        }
    }

    @Nested
    @DisplayName("GET /my-pending-approvals")
    class GetMyPendingApprovalsTests {

        @Test
        @DisplayName("Should return current user pending approvals")
        void shouldReturnMyPendingApprovals() throws Exception {
            when(workflowService.getMyPendingApprovals()).thenReturn(List.of(executionResponse));

            mockMvc.perform(get(BASE_URL + "/my-pending-approvals"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$[0].status").value("PENDING"));

            verify(workflowService).getMyPendingApprovals();
        }

        @Test
        @DisplayName("Should return empty list when no pending approvals")
        void shouldReturnEmptyListWhenNoPendingApprovals() throws Exception {
            when(workflowService.getMyPendingApprovals()).thenReturn(Collections.emptyList());

            mockMvc.perform(get(BASE_URL + "/my-pending-approvals"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$", hasSize(0)));
        }
    }

    @Nested
    @DisplayName("GET /my-requests")
    class GetMyRequestsTests {

        @Test
        @DisplayName("Should return current user requests")
        void shouldReturnMyRequests() throws Exception {
            when(workflowService.getMyRequests()).thenReturn(List.of(executionResponse));

            mockMvc.perform(get(BASE_URL + "/my-requests"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$", hasSize(1)));

            verify(workflowService).getMyRequests();
        }
    }

    // ===================== Delegation Tests =====================

    @Nested
    @DisplayName("POST /delegations — Create delegation")
    class CreateDelegationTests {

        @Test
        @DisplayName("Should create delegation successfully")
        void shouldCreateDelegationSuccessfully() throws Exception {
            UUID delegateId = UUID.randomUUID();
            ApprovalDelegateRequest request = new ApprovalDelegateRequest();
            request.setDelegateId(delegateId);
            request.setStartDate(java.time.LocalDate.now());
            request.setEndDate(java.time.LocalDate.now().plusDays(7));
            request.setReason("On vacation");

            ApprovalDelegateResponse response = ApprovalDelegateResponse.builder()
                    .id(UUID.randomUUID())
                    .delegateId(delegateId)
                    .isActive(true)
                    .build();

            when(workflowService.createDelegation(any(ApprovalDelegateRequest.class)))
                    .thenReturn(response);

            mockMvc.perform(post(BASE_URL + "/delegations")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.delegateId").value(delegateId.toString()))
                    .andExpect(jsonPath("$.isActive").value(true));

            verify(workflowService).createDelegation(any(ApprovalDelegateRequest.class));
        }

        @Test
        @DisplayName("Should return 400 when delegation request is missing required fields")
        void shouldReturn400WhenDelegationMissingRequiredFields() throws Exception {
            ApprovalDelegateRequest request = new ApprovalDelegateRequest();
            // Missing delegateId, startDate, endDate

            mockMvc.perform(post(BASE_URL + "/delegations")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("GET /delegations/my")
    class GetMyDelegationsTests {

        @Test
        @DisplayName("Should return my delegations")
        void shouldReturnMyDelegations() throws Exception {
            ApprovalDelegateResponse delegation = ApprovalDelegateResponse.builder()
                    .id(UUID.randomUUID())
                    .isActive(true)
                    .build();

            when(workflowService.getMyDelegations()).thenReturn(List.of(delegation));

            mockMvc.perform(get(BASE_URL + "/delegations/my"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$[0].isActive").value(true));

            verify(workflowService).getMyDelegations();
        }
    }

    @Nested
    @DisplayName("POST /delegations/{id}/revoke — Revoke delegation")
    class RevokeDelegationTests {

        @Test
        @DisplayName("Should revoke delegation successfully")
        void shouldRevokeDelegationSuccessfully() throws Exception {
            UUID delegationId = UUID.randomUUID();
            doNothing().when(workflowService).revokeDelegation(eq(delegationId), anyString());

            Map<String, String> body = Map.of("reason", "Early return from vacation");

            mockMvc.perform(post(BASE_URL + "/delegations/{id}/revoke", delegationId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isOk());

            verify(workflowService).revokeDelegation(eq(delegationId), eq("Early return from vacation"));
        }
    }

    // ===================== Inbox & Dashboard Tests =====================

    @Nested
    @DisplayName("GET /inbox — Get approval inbox")
    class GetApprovalInboxTests {

        @Test
        @DisplayName("Should return paginated approval inbox with default status")
        void shouldReturnApprovalInboxWithDefaultStatus() throws Exception {
            Page<WorkflowExecutionResponse> page = new PageImpl<>(
                    List.of(executionResponse), Pageable.ofSize(20), 1
            );

            when(workflowService.getApprovalInbox(
                    anyString(), any(), any(), any(), any(), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get(BASE_URL + "/inbox"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)));

            verify(workflowService).getApprovalInbox(
                    eq("PENDING"), isNull(), isNull(), isNull(), isNull(), any(Pageable.class));
        }

        @Test
        @DisplayName("Should filter inbox by module and date range")
        void shouldFilterInboxByModuleAndDateRange() throws Exception {
            Page<WorkflowExecutionResponse> page = new PageImpl<>(List.of(), Pageable.ofSize(20), 0);

            when(workflowService.getApprovalInbox(any(), any(), any(), any(), any(), any()))
                    .thenReturn(page);

            mockMvc.perform(get(BASE_URL + "/inbox")
                            .param("status", "APPROVED")
                            .param("module", "LEAVE")
                            .param("fromDate", "2024-01-01")
                            .param("toDate", "2024-01-31"))
                    .andExpect(status().isOk());
        }
    }

    @Nested
    @DisplayName("GET /inbox/count — Get inbox counts")
    class GetInboxCountsTests {

        @Test
        @DisplayName("Should return inbox counts by status")
        void shouldReturnInboxCounts() throws Exception {
            Map<String, Long> counts = new HashMap<>();
            counts.put("PENDING", 5L);
            counts.put("APPROVED", 10L);
            counts.put("REJECTED", 2L);

            when(workflowService.getInboxCounts()).thenReturn(counts);

            mockMvc.perform(get(BASE_URL + "/inbox/count"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.PENDING").value(5))
                    .andExpect(jsonPath("$.APPROVED").value(10));

            verify(workflowService).getInboxCounts();
        }
    }

    @Nested
    @DisplayName("GET /dashboard — Workflow dashboard")
    class GetWorkflowDashboardTests {

        @Test
        @DisplayName("Should return workflow dashboard data")
        void shouldReturnWorkflowDashboard() throws Exception {
            Map<String, Object> dashboard = new HashMap<>();
            dashboard.put("totalPending", 8);
            dashboard.put("totalApproved", 42);
            dashboard.put("avgSlaHours", 4.5);

            when(workflowService.getWorkflowDashboard()).thenReturn(dashboard);

            mockMvc.perform(get(BASE_URL + "/dashboard"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalPending").value(8))
                    .andExpect(jsonPath("$.totalApproved").value(42));

            verify(workflowService).getWorkflowDashboard();
        }
    }

    // ===================== Permission Annotation Tests =====================

    @Nested
    @DisplayName("Permission annotation verification")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("createWorkflowDefinition should require WORKFLOW:MANAGE")
        void createDefinitionShouldRequireManage() throws Exception {
            var method = WorkflowController.class.getMethod(
                    "createWorkflowDefinition", WorkflowDefinitionRequest.class);
            var annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation);
            Assertions.assertTrue(
                    java.util.Arrays.asList(annotation.value()).contains("WORKFLOW:MANAGE"));
        }

        @Test
        @DisplayName("getWorkflowDefinition should require WORKFLOW:VIEW")
        void getDefinitionShouldRequireView() throws Exception {
            var method = WorkflowController.class.getMethod("getWorkflowDefinition", UUID.class);
            var annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation);
            Assertions.assertTrue(
                    java.util.Arrays.asList(annotation.value()).contains("WORKFLOW:VIEW"));
        }

        @Test
        @DisplayName("startWorkflow should require WORKFLOW_EXECUTE permission")
        void startWorkflowShouldRequireExecute() throws Exception {
            var method = WorkflowController.class.getMethod(
                    "startWorkflow", WorkflowExecutionRequest.class);
            var annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation);
            Assertions.assertTrue(
                    java.util.Arrays.asList(annotation.value()).contains(Permission.WORKFLOW_EXECUTE));
        }
    }
}
