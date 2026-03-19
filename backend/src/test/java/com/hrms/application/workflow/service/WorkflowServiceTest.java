package com.hrms.application.workflow.service;

import com.hrms.api.workflow.dto.ApprovalActionRequest;
import com.hrms.api.workflow.dto.WorkflowExecutionRequest;
import com.hrms.api.workflow.dto.WorkflowExecutionResponse;
import com.hrms.application.audit.service.AuditLogService;
import com.hrms.application.event.DomainEventPublisher;
import com.hrms.application.workflow.callback.ApprovalCallbackHandler;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.event.workflow.ApprovalDecisionEvent;
import com.hrms.domain.workflow.*;
import com.hrms.infrastructure.employee.repository.DepartmentRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.leave.repository.LeaveRequestRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import com.hrms.infrastructure.workflow.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("WorkflowService Tests")
class WorkflowServiceTest {

    // ==================== Mocks ====================

    @Mock
    private WorkflowDefinitionRepository workflowDefinitionRepository;

    @Mock
    private ApprovalStepRepository approvalStepRepository;

    @Mock
    private WorkflowExecutionRepository workflowExecutionRepository;

    @Mock
    private StepExecutionRepository stepExecutionRepository;

    @Mock
    private ApprovalDelegateRepository approvalDelegateRepository;

    @Mock
    private WorkflowRuleRepository workflowRuleRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private DepartmentRepository departmentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private DomainEventPublisher domainEventPublisher;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private LeaveRequestRepository leaveRequestRepository;

    private WorkflowService workflowService;

    // ==================== Test Fixtures ====================

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440001");
    private static final UUID OTHER_USER_ID = UUID.fromString("770e8400-e29b-41d4-a716-446655440002");

    private MockedStatic<TenantContext> tenantContextMock;
    private MockedStatic<SecurityContext> securityContextMock;

    @BeforeEach
    void setUp() {
        tenantContextMock = mockStatic(TenantContext.class);
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(TENANT_ID);

        securityContextMock = mockStatic(SecurityContext.class);
        securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(USER_ID);

        workflowService = new WorkflowService(
                workflowDefinitionRepository,
                approvalStepRepository,
                workflowExecutionRepository,
                stepExecutionRepository,
                approvalDelegateRepository,
                workflowRuleRepository,
                employeeRepository,
                departmentRepository,
                userRepository,
                domainEventPublisher,
                auditLogService,
                leaveRequestRepository,
                Collections.emptyList());
    }

    @AfterEach
    void tearDown() {
        tenantContextMock.close();
        securityContextMock.close();
    }

    // ==================== getApprovalInbox Tests ====================

    @Nested
    @DisplayName("getApprovalInbox")
    class GetApprovalInboxTests {

        @Test
        @DisplayName("should return paginated inbox with default PENDING status filter")
        void shouldReturnPaginatedInboxWithPendingFilter() {
            Pageable pageable = PageRequest.of(0, 10);
            WorkflowExecution execution = createMockExecution();
            StepExecution step = createMockStepExecution(execution);

            Page<StepExecution> stepPage = new PageImpl<>(List.of(step), pageable, 1);
            when(stepExecutionRepository.findInboxForUser(
                    eq(TENANT_ID), eq(USER_ID), eq(StepExecution.StepStatus.PENDING),
                    isNull(), isNull(), isNull(), isNull(), eq(pageable)))
                    .thenReturn(stepPage);

            Page<WorkflowExecutionResponse> result = workflowService.getApprovalInbox(
                    null, null, null, null, null, pageable);

            assertThat(result).isNotNull();
            assertThat(result.getTotalElements()).isEqualTo(1);
            assertThat(result.getContent()).hasSize(1);
        }

        @Test
        @DisplayName("should pass null status when ALL is requested")
        void shouldPassNullStatusWhenAllRequested() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<StepExecution> emptyPage = new PageImpl<>(Collections.emptyList(), pageable, 0);
            when(stepExecutionRepository.findInboxForUser(
                    eq(TENANT_ID), eq(USER_ID), isNull(),
                    isNull(), isNull(), isNull(), isNull(), eq(pageable)))
                    .thenReturn(emptyPage);

            workflowService.getApprovalInbox("ALL", null, null, null, null, pageable);

            verify(stepExecutionRepository).findInboxForUser(
                    TENANT_ID, USER_ID, null, null, null, null, null, pageable);
        }

        @Test
        @DisplayName("should filter by module when valid entity type is provided")
        void shouldFilterByModule() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<StepExecution> emptyPage = new PageImpl<>(Collections.emptyList(), pageable, 0);
            when(stepExecutionRepository.findInboxForUser(
                    eq(TENANT_ID), eq(USER_ID), eq(StepExecution.StepStatus.PENDING),
                    eq(WorkflowDefinition.EntityType.LEAVE_REQUEST), isNull(), isNull(), isNull(), eq(pageable)))
                    .thenReturn(emptyPage);

            workflowService.getApprovalInbox("PENDING", "LEAVE_REQUEST", null, null, null, pageable);

            verify(stepExecutionRepository).findInboxForUser(
                    TENANT_ID, USER_ID, StepExecution.StepStatus.PENDING,
                    WorkflowDefinition.EntityType.LEAVE_REQUEST, null, null, null, pageable);
        }
    }

    // ==================== getInboxCounts Tests ====================

    @Nested
    @DisplayName("getInboxCounts")
    class GetInboxCountsTests {

        @Test
        @DisplayName("should return pending, approvedToday and rejectedToday counts")
        void shouldReturnAllCounts() {
            when(stepExecutionRepository.countPendingForUser(TENANT_ID, USER_ID)).thenReturn(5L);

            List<Object[]> todayActions = List.of(
                    new Object[]{StepExecution.ApprovalAction.APPROVE, 3L},
                    new Object[]{StepExecution.ApprovalAction.REJECT, 1L}
            );
            when(stepExecutionRepository.countTodayActionsByUser(eq(TENANT_ID), eq(USER_ID), any(LocalDateTime.class), anyCollection()))
                    .thenReturn(todayActions);

            Map<String, Long> counts = workflowService.getInboxCounts();

            assertThat(counts).containsEntry("pending", 5L);
            assertThat(counts).containsEntry("approvedToday", 3L);
            assertThat(counts).containsEntry("rejectedToday", 1L);
        }

        @Test
        @DisplayName("should return zeros when no actions today")
        void shouldReturnZerosWhenNoActions() {
            when(stepExecutionRepository.countPendingForUser(TENANT_ID, USER_ID)).thenReturn(0L);
            when(stepExecutionRepository.countTodayActionsByUser(eq(TENANT_ID), eq(USER_ID), any(LocalDateTime.class), anyCollection()))
                    .thenReturn(Collections.emptyList());

            Map<String, Long> counts = workflowService.getInboxCounts();

            assertThat(counts).containsEntry("pending", 0L);
            assertThat(counts).containsEntry("approvedToday", 0L);
            assertThat(counts).containsEntry("rejectedToday", 0L);
        }
    }

    // ==================== processApprovalAction Tests ====================

    @Nested
    @DisplayName("processApprovalAction")
    class ProcessApprovalActionTests {

        @Test
        @DisplayName("should approve step successfully and publish event")
        void shouldApproveSuccessfully() {
            UUID executionId = UUID.randomUUID();
            WorkflowExecution execution = createApprovableExecution(executionId);

            when(workflowExecutionRepository.findByIdAndTenantId(executionId, TENANT_ID))
                    .thenReturn(Optional.of(execution));
            lenient().when(employeeRepository.findByIdAndTenantId(USER_ID, TENANT_ID))
                    .thenReturn(Optional.empty());
            when(workflowExecutionRepository.save(any(WorkflowExecution.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            ApprovalActionRequest request = new ApprovalActionRequest();
            request.setAction(StepExecution.ApprovalAction.APPROVE);
            request.setComments("Looks good");

            WorkflowExecutionResponse response = workflowService.processApprovalAction(executionId, request);

            assertThat(response).isNotNull();
            verify(workflowExecutionRepository).save(any(WorkflowExecution.class));
            verify(domainEventPublisher).publish(any(ApprovalDecisionEvent.class));
        }

        @Test
        @DisplayName("should reject step successfully and publish event")
        void shouldRejectSuccessfully() {
            UUID executionId = UUID.randomUUID();
            WorkflowExecution execution = createApprovableExecution(executionId);

            when(workflowExecutionRepository.findByIdAndTenantId(executionId, TENANT_ID))
                    .thenReturn(Optional.of(execution));
            lenient().when(employeeRepository.findByIdAndTenantId(USER_ID, TENANT_ID))
                    .thenReturn(Optional.empty());
            when(workflowExecutionRepository.save(any(WorkflowExecution.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            ApprovalActionRequest request = new ApprovalActionRequest();
            request.setAction(StepExecution.ApprovalAction.REJECT);
            request.setComments("Not approved");

            WorkflowExecutionResponse response = workflowService.processApprovalAction(executionId, request);

            assertThat(response).isNotNull();
            verify(workflowExecutionRepository).save(any(WorkflowExecution.class));
            verify(domainEventPublisher).publish(any(ApprovalDecisionEvent.class));
        }

        @Test
        @DisplayName("should throw 409 when workflow is already completed (idempotency)")
        void shouldThrow409WhenWorkflowCompleted() {
            UUID executionId = UUID.randomUUID();
            WorkflowExecution execution = mock(WorkflowExecution.class);
            when(execution.isCompleted()).thenReturn(true);
            when(execution.getStatus()).thenReturn(WorkflowExecution.ExecutionStatus.APPROVED);

            when(workflowExecutionRepository.findByIdAndTenantId(executionId, TENANT_ID))
                    .thenReturn(Optional.of(execution));

            ApprovalActionRequest request = new ApprovalActionRequest();
            request.setAction(StepExecution.ApprovalAction.APPROVE);

            assertThatThrownBy(() -> workflowService.processApprovalAction(executionId, request))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("already been processed");
        }

        @Test
        @DisplayName("should throw when execution not found (404)")
        void shouldThrowWhenExecutionNotFound() {
            UUID executionId = UUID.randomUUID();
            when(workflowExecutionRepository.findByIdAndTenantId(executionId, TENANT_ID))
                    .thenReturn(Optional.empty());

            ApprovalActionRequest request = new ApprovalActionRequest();
            request.setAction(StepExecution.ApprovalAction.APPROVE);

            assertThatThrownBy(() -> workflowService.processApprovalAction(executionId, request))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("not found");
        }
    }

    // ==================== Auto-Delegation Tests ====================

    @Nested
    @DisplayName("Auto-Delegation (approver on leave)")
    class AutoDelegationTests {

        private static final UUID MANAGER_ID = UUID.fromString("880e8400-e29b-41d4-a716-446655440003");
        private static final UUID SKIP_MANAGER_ID = UUID.fromString("990e8400-e29b-41d4-a716-446655440004");
        private static final UUID SUPER_ADMIN_ID = UUID.fromString("aa0e8400-e29b-41d4-a716-446655440005");

        @Test
        @DisplayName("should start workflow with reporting manager when manager is NOT on leave")
        void shouldUseManagerWhenAvailable() {
            UUID entityId = UUID.randomUUID();
            WorkflowDefinition definition = createWorkflowDefinitionWithReportingManager();

            when(workflowDefinitionRepository.findDefaultWorkflow(TENANT_ID, WorkflowDefinition.EntityType.LEAVE_REQUEST))
                    .thenReturn(Optional.of(definition));
            when(workflowExecutionRepository.findByEntity(any(), any(), any()))
                    .thenReturn(Optional.empty());

            Employee employee = mock(Employee.class);
            when(employee.getManagerId()).thenReturn(MANAGER_ID);
            when(employeeRepository.findByUserIdAndTenantId(USER_ID, TENANT_ID))
                    .thenReturn(Optional.of(employee));

            when(leaveRequestRepository.isEmployeeOnLeave(eq(TENANT_ID), eq(MANAGER_ID), any(LocalDate.class)))
                    .thenReturn(false);
            when(approvalDelegateRepository.findActiveDelegations(eq(TENANT_ID), eq(MANAGER_ID), any(LocalDate.class)))
                    .thenReturn(Collections.emptyList());
            when(workflowExecutionRepository.save(any(WorkflowExecution.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            WorkflowExecutionRequest request = new WorkflowExecutionRequest();
            request.setEntityType(WorkflowDefinition.EntityType.LEAVE_REQUEST);
            request.setEntityId(entityId);
            request.setTitle("Leave Request");

            workflowService.startWorkflow(request);

            verify(workflowExecutionRepository, atLeastOnce()).save(any(WorkflowExecution.class));
        }

        @Test
        @DisplayName("should auto-delegate to skip-level manager when direct manager is on leave")
        void shouldAutoDelegateWhenManagerOnLeave() {
            UUID entityId = UUID.randomUUID();
            WorkflowDefinition definition = createWorkflowDefinitionWithReportingManager();

            when(workflowDefinitionRepository.findDefaultWorkflow(TENANT_ID, WorkflowDefinition.EntityType.LEAVE_REQUEST))
                    .thenReturn(Optional.of(definition));
            when(workflowExecutionRepository.findByEntity(any(), any(), any()))
                    .thenReturn(Optional.empty());

            Employee employee = mock(Employee.class);
            when(employee.getManagerId()).thenReturn(MANAGER_ID);
            when(employeeRepository.findByUserIdAndTenantId(USER_ID, TENANT_ID))
                    .thenReturn(Optional.of(employee));

            when(leaveRequestRepository.isEmployeeOnLeave(eq(TENANT_ID), eq(MANAGER_ID), any(LocalDate.class)))
                    .thenReturn(true);
            when(approvalDelegateRepository.findActiveDelegations(eq(TENANT_ID), eq(MANAGER_ID), any(LocalDate.class)))
                    .thenReturn(Collections.emptyList());

            Employee managerEmployee = mock(Employee.class);
            when(managerEmployee.getManagerId()).thenReturn(SKIP_MANAGER_ID);
            when(employeeRepository.findByUserIdAndTenantId(MANAGER_ID, TENANT_ID))
                    .thenReturn(Optional.of(managerEmployee));

            when(leaveRequestRepository.isEmployeeOnLeave(eq(TENANT_ID), eq(SKIP_MANAGER_ID), any(LocalDate.class)))
                    .thenReturn(false);
            when(approvalDelegateRepository.findActiveDelegations(eq(TENANT_ID), eq(SKIP_MANAGER_ID), any(LocalDate.class)))
                    .thenReturn(Collections.emptyList());

            when(workflowExecutionRepository.save(any(WorkflowExecution.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            WorkflowExecutionRequest request = new WorkflowExecutionRequest();
            request.setEntityType(WorkflowDefinition.EntityType.LEAVE_REQUEST);
            request.setEntityId(entityId);
            request.setTitle("Leave Request");

            workflowService.startWorkflow(request);

            verify(leaveRequestRepository).isEmployeeOnLeave(eq(TENANT_ID), eq(SKIP_MANAGER_ID), any(LocalDate.class));
            verify(workflowExecutionRepository, atLeastOnce()).save(any(WorkflowExecution.class));
        }

        @Test
        @DisplayName("should fall back to SUPER_ADMIN when entire reporting chain is on leave")
        void shouldFallBackToSuperAdminWhenChainExhausted() {
            UUID entityId = UUID.randomUUID();
            WorkflowDefinition definition = createWorkflowDefinitionWithReportingManager();

            when(workflowDefinitionRepository.findDefaultWorkflow(TENANT_ID, WorkflowDefinition.EntityType.LEAVE_REQUEST))
                    .thenReturn(Optional.of(definition));
            when(workflowExecutionRepository.findByEntity(any(), any(), any()))
                    .thenReturn(Optional.empty());

            Employee employee = mock(Employee.class);
            when(employee.getManagerId()).thenReturn(MANAGER_ID);
            when(employeeRepository.findByUserIdAndTenantId(USER_ID, TENANT_ID))
                    .thenReturn(Optional.of(employee));

            when(leaveRequestRepository.isEmployeeOnLeave(eq(TENANT_ID), eq(MANAGER_ID), any(LocalDate.class)))
                    .thenReturn(true);
            when(approvalDelegateRepository.findActiveDelegations(eq(TENANT_ID), eq(MANAGER_ID), any(LocalDate.class)))
                    .thenReturn(Collections.emptyList());

            Employee managerEmployee = mock(Employee.class);
            when(managerEmployee.getManagerId()).thenReturn(null);
            when(employeeRepository.findByUserIdAndTenantId(MANAGER_ID, TENANT_ID))
                    .thenReturn(Optional.of(managerEmployee));

            when(userRepository.findUserIdsByRoleCode(TENANT_ID, "SUPER_ADMIN"))
                    .thenReturn(List.of(SUPER_ADMIN_ID));

            when(workflowExecutionRepository.save(any(WorkflowExecution.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            WorkflowExecutionRequest request = new WorkflowExecutionRequest();
            request.setEntityType(WorkflowDefinition.EntityType.LEAVE_REQUEST);
            request.setEntityId(entityId);
            request.setTitle("Leave Request");

            workflowService.startWorkflow(request);

            verify(userRepository).findUserIdsByRoleCode(TENANT_ID, "SUPER_ADMIN");
            verify(workflowExecutionRepository, atLeastOnce()).save(any(WorkflowExecution.class));
        }

        private WorkflowDefinition createWorkflowDefinitionWithReportingManager() {
            ApprovalStep step = ApprovalStep.builder()
                    .stepOrder(1)
                    .stepName("Manager Approval")
                    .approverType(ApprovalStep.ApproverType.REPORTING_MANAGER)
                    .slaHours(0)
                    .build();
            step.setId(UUID.randomUUID());

            WorkflowDefinition definition = WorkflowDefinition.builder()
                    .name("Default Leave Approval")
                    .entityType(WorkflowDefinition.EntityType.LEAVE_REQUEST)
                    .workflowType(WorkflowDefinition.WorkflowType.SEQUENTIAL)
                    .workflowVersion(1)
                    .isActive(true)
                    .isDefault(true)
                    .steps(new ArrayList<>(List.of(step)))
                    .defaultSlaHours(0)
                    .build();
            definition.setId(UUID.randomUUID());
            definition.setTenantId(TENANT_ID);

            step.setWorkflowDefinition(definition);
            return definition;
        }
    }

    // ==================== Callback Handler Tests ====================

    @Nested
    @DisplayName("Approval Callback Handler")
    class CallbackHandlerTests {

        @Test
        @DisplayName("should invoke onApproved callback when workflow is fully approved")
        void shouldInvokeOnApprovedCallback() {
            ApprovalCallbackHandler handler = mock(ApprovalCallbackHandler.class);
            when(handler.getEntityType()).thenReturn(WorkflowDefinition.EntityType.LEAVE_REQUEST);

            WorkflowService serviceWithCallback = new WorkflowService(
                    workflowDefinitionRepository, approvalStepRepository,
                    workflowExecutionRepository, stepExecutionRepository,
                    approvalDelegateRepository, workflowRuleRepository,
                    employeeRepository, departmentRepository, userRepository,
                    domainEventPublisher, auditLogService, leaveRequestRepository,
                    List.of(handler));

            UUID executionId = UUID.randomUUID();
            WorkflowExecution execution = createApprovableExecution(executionId);
            // After approval, mock isCompleted to return true
            when(execution.isCompleted()).thenReturn(false).thenReturn(true);
            when(execution.getStatus())
                    .thenReturn(WorkflowExecution.ExecutionStatus.PENDING)
                    .thenReturn(WorkflowExecution.ExecutionStatus.APPROVED);

            when(workflowExecutionRepository.findByIdAndTenantId(executionId, TENANT_ID))
                    .thenReturn(Optional.of(execution));
            lenient().when(employeeRepository.findByIdAndTenantId(USER_ID, TENANT_ID))
                    .thenReturn(Optional.empty());
            when(workflowExecutionRepository.save(any(WorkflowExecution.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            ApprovalActionRequest request = new ApprovalActionRequest();
            request.setAction(StepExecution.ApprovalAction.APPROVE);

            serviceWithCallback.processApprovalAction(executionId, request);

            verify(handler).onApproved(eq(TENANT_ID), any(UUID.class), eq(USER_ID));
        }

        @Test
        @DisplayName("should invoke onRejected callback when workflow is rejected")
        void shouldInvokeOnRejectedCallback() {
            ApprovalCallbackHandler handler = mock(ApprovalCallbackHandler.class);
            when(handler.getEntityType()).thenReturn(WorkflowDefinition.EntityType.LEAVE_REQUEST);

            WorkflowService serviceWithCallback = new WorkflowService(
                    workflowDefinitionRepository, approvalStepRepository,
                    workflowExecutionRepository, stepExecutionRepository,
                    approvalDelegateRepository, workflowRuleRepository,
                    employeeRepository, departmentRepository, userRepository,
                    domainEventPublisher, auditLogService, leaveRequestRepository,
                    List.of(handler));

            UUID executionId = UUID.randomUUID();
            WorkflowExecution execution = createApprovableExecution(executionId);
            // After rejection, mock isCompleted to return true
            when(execution.isCompleted()).thenReturn(false).thenReturn(true);
            when(execution.getStatus())
                    .thenReturn(WorkflowExecution.ExecutionStatus.PENDING)
                    .thenReturn(WorkflowExecution.ExecutionStatus.REJECTED);

            when(workflowExecutionRepository.findByIdAndTenantId(executionId, TENANT_ID))
                    .thenReturn(Optional.of(execution));
            lenient().when(employeeRepository.findByIdAndTenantId(USER_ID, TENANT_ID))
                    .thenReturn(Optional.empty());
            when(workflowExecutionRepository.save(any(WorkflowExecution.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            ApprovalActionRequest request = new ApprovalActionRequest();
            request.setAction(StepExecution.ApprovalAction.REJECT);
            request.setComments("Budget exceeded");

            serviceWithCallback.processApprovalAction(executionId, request);

            verify(handler).onRejected(eq(TENANT_ID), any(UUID.class), eq(USER_ID), eq("Budget exceeded"));
        }

        @Test
        @DisplayName("should not fail if callback throws exception")
        void shouldNotFailIfCallbackThrows() {
            ApprovalCallbackHandler handler = mock(ApprovalCallbackHandler.class);
            when(handler.getEntityType()).thenReturn(WorkflowDefinition.EntityType.LEAVE_REQUEST);
            doThrow(new RuntimeException("callback error")).when(handler)
                    .onApproved(any(), any(), any());

            WorkflowService serviceWithCallback = new WorkflowService(
                    workflowDefinitionRepository, approvalStepRepository,
                    workflowExecutionRepository, stepExecutionRepository,
                    approvalDelegateRepository, workflowRuleRepository,
                    employeeRepository, departmentRepository, userRepository,
                    domainEventPublisher, auditLogService, leaveRequestRepository,
                    List.of(handler));

            UUID executionId = UUID.randomUUID();
            WorkflowExecution execution = createApprovableExecution(executionId);
            when(execution.isCompleted()).thenReturn(false).thenReturn(true);
            when(execution.getStatus())
                    .thenReturn(WorkflowExecution.ExecutionStatus.PENDING)
                    .thenReturn(WorkflowExecution.ExecutionStatus.APPROVED);

            when(workflowExecutionRepository.findByIdAndTenantId(executionId, TENANT_ID))
                    .thenReturn(Optional.of(execution));
            lenient().when(employeeRepository.findByIdAndTenantId(USER_ID, TENANT_ID))
                    .thenReturn(Optional.empty());
            when(workflowExecutionRepository.save(any(WorkflowExecution.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            ApprovalActionRequest request = new ApprovalActionRequest();
            request.setAction(StepExecution.ApprovalAction.APPROVE);

            // Should NOT throw despite callback failure
            WorkflowExecutionResponse response = serviceWithCallback.processApprovalAction(executionId, request);
            assertThat(response).isNotNull();
        }
    }

    // ==================== Helper Methods ====================

    private WorkflowExecution createMockExecution() {
        WorkflowExecution execution = mock(WorkflowExecution.class);
        when(execution.getId()).thenReturn(UUID.randomUUID());
        when(execution.getTenantId()).thenReturn(TENANT_ID);
        when(execution.getStatus()).thenReturn(WorkflowExecution.ExecutionStatus.PENDING);
        when(execution.getEntityType()).thenReturn(WorkflowDefinition.EntityType.LEAVE_REQUEST);
        when(execution.getTitle()).thenReturn("Leave Request - John Doe");
        when(execution.getRequesterName()).thenReturn("John Doe");
        when(execution.getReferenceNumber()).thenReturn("LR-2026-001");
        when(execution.getRequesterId()).thenReturn(OTHER_USER_ID);
        when(execution.getWorkflowDefinition()).thenReturn(mock(WorkflowDefinition.class));
        lenient().when(execution.getStepExecutions()).thenReturn(new ArrayList<>());
        return execution;
    }

    private StepExecution createMockStepExecution(WorkflowExecution execution) {
        StepExecution step = mock(StepExecution.class);
        when(step.getWorkflowExecution()).thenReturn(execution);
        when(step.getStatus()).thenReturn(StepExecution.StepStatus.PENDING);
        when(step.getAssignedToUserId()).thenReturn(USER_ID);
        return step;
    }

    private WorkflowExecution createApprovableExecution(UUID executionId) {
        ApprovalStep approvalStep = mock(ApprovalStep.class);
        lenient().when(approvalStep.isDelegationAllowed()).thenReturn(false);
        lenient().when(approvalStep.getStepOrder()).thenReturn(1);
        lenient().when(approvalStep.getStepName()).thenReturn("Manager Approval");

        WorkflowDefinition definition = mock(WorkflowDefinition.class);
        lenient().when(definition.getNextStep(anyInt())).thenReturn(null);
        lenient().when(definition.isLastStep(anyInt())).thenReturn(true);

        StepExecution step = mock(StepExecution.class);
        when(step.getStatus()).thenReturn(StepExecution.StepStatus.PENDING);
        when(step.canBeActedUponBy(USER_ID)).thenReturn(true);
        when(step.getApprovalStep()).thenReturn(approvalStep);
        lenient().when(step.getStepOrder()).thenReturn(1);
        lenient().when(step.getId()).thenReturn(UUID.randomUUID());

        WorkflowExecution execution = mock(WorkflowExecution.class);
        when(execution.getId()).thenReturn(executionId);
        when(execution.isCompleted()).thenReturn(false);
        when(execution.canBeApproved()).thenReturn(true);
        when(execution.getCurrentStepExecution()).thenReturn(step);
        when(execution.getWorkflowDefinition()).thenReturn(definition);
        lenient().when(execution.getTenantId()).thenReturn(TENANT_ID);
        lenient().when(execution.getEntityType()).thenReturn(WorkflowDefinition.EntityType.LEAVE_REQUEST);
        lenient().when(execution.getEntityId()).thenReturn(UUID.randomUUID());
        lenient().when(execution.getStatus()).thenReturn(WorkflowExecution.ExecutionStatus.PENDING);
        lenient().when(execution.getRequesterId()).thenReturn(OTHER_USER_ID);
        lenient().when(execution.getTitle()).thenReturn("Test Execution");
        lenient().when(execution.getRequesterName()).thenReturn("Test User");
        lenient().when(execution.getReferenceNumber()).thenReturn("TEST-001");
        lenient().when(execution.getStepExecutions()).thenReturn(new ArrayList<>());

        return execution;
    }
}
