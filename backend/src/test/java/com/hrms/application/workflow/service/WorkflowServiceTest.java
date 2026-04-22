package com.hrms.application.workflow.service;

import com.hrms.api.workflow.dto.ApprovalActionRequest;
import com.hrms.api.workflow.dto.WorkflowExecutionResponse;
import com.hrms.application.audit.service.AuditLogService;
import com.hrms.application.event.DomainEventPublisher;
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
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
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

@MockitoSettings(strictness = Strictness.LENIENT)
@ExtendWith(MockitoExtension.class)
@DisplayName("WorkflowService Tests")
class WorkflowServiceTest {

    // ==================== Mocks ====================

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440001");
    private static final UUID OTHER_USER_ID = UUID.fromString("770e8400-e29b-41d4-a716-446655440002");
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

    // ==================== Test Fixtures ====================
    @Mock
    private AuditLogService auditLogService;
    @Mock
    private LeaveRequestRepository leaveRequestRepository;
    private WorkflowService workflowService;
    private MockedStatic<TenantContext> tenantContextMock;
    private MockedStatic<SecurityContext> securityContextMock;

    @BeforeEach
    void setUp() {
        tenantContextMock = mockStatic(TenantContext.class);
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(TENANT_ID);
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(TENANT_ID);

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

    // ==================== getInboxCounts Tests ====================

    private StepExecution createMockStepExecution(WorkflowExecution execution) {
        StepExecution step = mock(StepExecution.class);
        when(step.getWorkflowExecution()).thenReturn(execution);
        when(step.getStatus()).thenReturn(StepExecution.StepStatus.PENDING);
        when(step.getAssignedToUserId()).thenReturn(USER_ID);
        return step;
    }

    // ==================== processApprovalAction Tests ====================

    /**
     * Creates a WorkflowExecution that passes all validation checks in processApprovalAction:
     * - Not completed
     * - canBeApproved = true
     * - Has a current step that is PENDING and assignable to USER_ID
     */
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
        lenient().when(execution.getStatus()).thenReturn(WorkflowExecution.ExecutionStatus.PENDING);
        lenient().when(execution.getRequesterId()).thenReturn(OTHER_USER_ID);
        lenient().when(execution.getTitle()).thenReturn("Test Execution");
        lenient().when(execution.getRequesterName()).thenReturn("Test User");
        lenient().when(execution.getReferenceNumber()).thenReturn("TEST-001");
        lenient().when(execution.getStepExecutions()).thenReturn(new ArrayList<>());

        return execution;
    }

    // ==================== Auto-Delegation Tests ====================

    @Nested
    @DisplayName("getApprovalInbox")
    class GetApprovalInboxTests {

        @Test
        @DisplayName("should return paginated inbox with default PENDING status filter")
        void shouldReturnPaginatedInboxWithPendingFilter() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            WorkflowExecution execution = createMockExecution();
            StepExecution step = createMockStepExecution(execution);

            Page<StepExecution> stepPage = new PageImpl<>(List.of(step), pageable, 1);
            when(stepExecutionRepository.findInboxForUser(
                    eq(TENANT_ID), eq(USER_ID), eq("PENDING"),
                    isNull(), isNull(), isNull(), isNull(), eq(pageable)))
                    .thenReturn(stepPage);

            // When
            Page<WorkflowExecutionResponse> result = workflowService.getApprovalInbox(
                    null, null, null, null, null, pageable);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getTotalElements()).isEqualTo(1);
            assertThat(result.getContent()).hasSize(1);
            verify(stepExecutionRepository).findInboxForUser(
                    TENANT_ID, USER_ID, "PENDING",
                    null, null, null, null, pageable);
        }

        @Test
        @DisplayName("should pass null status when ALL is requested")
        void shouldPassNullStatusWhenAllRequested() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            Page<StepExecution> emptyPage = new PageImpl<>(Collections.emptyList(), pageable, 0);
            when(stepExecutionRepository.findInboxForUser(
                    eq(TENANT_ID), eq(USER_ID), isNull(),
                    isNull(), isNull(), isNull(), isNull(), eq(pageable)))
                    .thenReturn(emptyPage);

            // When
            workflowService.getApprovalInbox("ALL", null, null, null, null, pageable);

            // Then
            verify(stepExecutionRepository).findInboxForUser(
                    TENANT_ID, USER_ID, null, null, null, null, null, pageable);
        }

        @Test
        @DisplayName("should filter by module when valid entity type is provided")
        void shouldFilterByModule() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            Page<StepExecution> emptyPage = new PageImpl<>(Collections.emptyList(), pageable, 0);
            when(stepExecutionRepository.findInboxForUser(
                    eq(TENANT_ID), eq(USER_ID), eq("PENDING"),
                    eq("LEAVE_REQUEST"), isNull(), isNull(), isNull(), eq(pageable)))
                    .thenReturn(emptyPage);

            // When
            workflowService.getApprovalInbox("PENDING", "LEAVE_REQUEST", null, null, null, pageable);

            // Then
            verify(stepExecutionRepository).findInboxForUser(
                    TENANT_ID, USER_ID, "PENDING",
                    "LEAVE_REQUEST", null, null, null, pageable);
        }

        @Test
        @DisplayName("should ignore invalid module value gracefully")
        void shouldIgnoreInvalidModule() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            Page<StepExecution> emptyPage = new PageImpl<>(Collections.emptyList(), pageable, 0);
            when(stepExecutionRepository.findInboxForUser(
                    eq(TENANT_ID), eq(USER_ID), eq("PENDING"),
                    isNull(), isNull(), isNull(), isNull(), eq(pageable)))
                    .thenReturn(emptyPage);

            // When
            workflowService.getApprovalInbox("PENDING", "INVALID_MODULE", null, null, null, pageable);

            // Then - should pass null entityType (invalid module ignored)
            verify(stepExecutionRepository).findInboxForUser(
                    TENANT_ID, USER_ID, "PENDING",
                    null, null, null, null, pageable);
        }

        @Test
        @DisplayName("should pass date range and search filters to repository")
        void shouldPassDateRangeAndSearchFilters() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            LocalDateTime fromDate = LocalDateTime.of(2026, 1, 1, 0, 0);
            LocalDateTime toDate = LocalDateTime.of(2026, 3, 10, 23, 59);
            String search = "John";

            Page<StepExecution> emptyPage = new PageImpl<>(Collections.emptyList(), pageable, 0);
            when(stepExecutionRepository.findInboxForUser(
                    eq(TENANT_ID), eq(USER_ID), eq("PENDING"),
                    isNull(), eq(fromDate), eq(toDate), eq("John"), eq(pageable)))
                    .thenReturn(emptyPage);

            // When
            workflowService.getApprovalInbox("PENDING", null, fromDate, toDate, search, pageable);

            // Then
            verify(stepExecutionRepository).findInboxForUser(
                    TENANT_ID, USER_ID, "PENDING",
                    null, fromDate, toDate, "John", pageable);
        }

        @Test
        @DisplayName("should normalize blank search to null")
        void shouldNormalizeBlankSearch() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            Page<StepExecution> emptyPage = new PageImpl<>(Collections.emptyList(), pageable, 0);
            when(stepExecutionRepository.findInboxForUser(
                    eq(TENANT_ID), eq(USER_ID), eq("PENDING"),
                    isNull(), isNull(), isNull(), isNull(), eq(pageable)))
                    .thenReturn(emptyPage);

            // When
            workflowService.getApprovalInbox("PENDING", null, null, null, "   ", pageable);

            // Then
            verify(stepExecutionRepository).findInboxForUser(
                    TENANT_ID, USER_ID, "PENDING",
                    null, null, null, null, pageable);
        }

        @Test
        @DisplayName("should handle pagination correctly with multiple pages")
        void shouldHandlePagination() {
            // Given
            Pageable pageable = PageRequest.of(1, 5); // Page 2, 5 items
            WorkflowExecution execution = createMockExecution();
            StepExecution step = createMockStepExecution(execution);

            Page<StepExecution> stepPage = new PageImpl<>(List.of(step), pageable, 12); // 12 total
            when(stepExecutionRepository.findInboxForUser(
                    eq(TENANT_ID), eq(USER_ID), eq("PENDING"),
                    isNull(), isNull(), isNull(), isNull(), eq(pageable)))
                    .thenReturn(stepPage);

            // When
            Page<WorkflowExecutionResponse> result = workflowService.getApprovalInbox(
                    "PENDING", null, null, null, null, pageable);

            // Then
            assertThat(result.getTotalElements()).isEqualTo(12);
            assertThat(result.getNumber()).isEqualTo(1); // second page
            assertThat(result.getTotalPages()).isEqualTo(3); // 12/5 = 3 pages
        }

        @Test
        @DisplayName("should use current tenant and user for isolation")
        void shouldUseTenantAndUserIsolation() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            Page<StepExecution> emptyPage = new PageImpl<>(Collections.emptyList(), pageable, 0);
            when(stepExecutionRepository.findInboxForUser(
                    any(), any(), any(), any(), any(), any(), any(), any()))
                    .thenReturn(emptyPage);

            // When
            workflowService.getApprovalInbox(null, null, null, null, null, pageable);

            // Then - verify it used the mocked tenant and user context
            verify(stepExecutionRepository).findInboxForUser(
                    eq(TENANT_ID), eq(USER_ID),
                    any(), any(), any(), any(), any(), any());
        }
    }

    // ==================== Helper Methods ====================

    @Nested
    @DisplayName("getInboxCounts")
    class GetInboxCountsTests {

        @Test
        @DisplayName("should return pending, approvedToday and rejectedToday counts")
        void shouldReturnAllCounts() {
            // Given
            when(stepExecutionRepository.countPendingForUser(TENANT_ID, USER_ID)).thenReturn(5L);

            List<Object[]> todayActions = List.of(
                    new Object[]{StepExecution.ApprovalAction.APPROVE, 3L},
                    new Object[]{StepExecution.ApprovalAction.REJECT, 1L}
            );
            when(stepExecutionRepository.countTodayActionsByUser(eq(TENANT_ID), eq(USER_ID), any(LocalDateTime.class), anyCollection()))
                    .thenReturn(todayActions);

            // When
            Map<String, Long> counts = workflowService.getInboxCounts();

            // Then
            assertThat(counts).containsEntry("pending", 5L);
            assertThat(counts).containsEntry("approvedToday", 3L);
            assertThat(counts).containsEntry("rejectedToday", 1L);
        }

        @Test
        @DisplayName("should return zeros when no actions today")
        void shouldReturnZerosWhenNoActions() {
            // Given
            when(stepExecutionRepository.countPendingForUser(TENANT_ID, USER_ID)).thenReturn(0L);
            when(stepExecutionRepository.countTodayActionsByUser(eq(TENANT_ID), eq(USER_ID), any(LocalDateTime.class), anyCollection()))
                    .thenReturn(Collections.emptyList());

            // When
            Map<String, Long> counts = workflowService.getInboxCounts();

            // Then
            assertThat(counts).containsEntry("pending", 0L);
            assertThat(counts).containsEntry("approvedToday", 0L);
            assertThat(counts).containsEntry("rejectedToday", 0L);
        }

        @Test
        @DisplayName("should use tenant and user context for isolation")
        void shouldUseTenantAndUserContext() {
            // Given
            when(stepExecutionRepository.countPendingForUser(any(), any())).thenReturn(0L);
            when(stepExecutionRepository.countTodayActionsByUser(any(), any(), any(), any()))
                    .thenReturn(Collections.emptyList());

            // When
            workflowService.getInboxCounts();

            // Then
            verify(stepExecutionRepository).countPendingForUser(TENANT_ID, USER_ID);
            verify(stepExecutionRepository).countTodayActionsByUser(eq(TENANT_ID), eq(USER_ID), any(), any());
        }
    }

    @Nested
    @DisplayName("processApprovalAction")
    class ProcessApprovalActionTests {

        @Test
        @DisplayName("should approve step successfully and publish event")
        void shouldApproveSuccessfully() {
            // Given
            UUID executionId = UUID.randomUUID();
            WorkflowExecution execution = createApprovableExecution(executionId);
            execution.getCurrentStepExecution();

            when(workflowExecutionRepository.findByIdAndTenantId(executionId, TENANT_ID))
                    .thenReturn(Optional.of(execution));
            lenient().when(employeeRepository.findByIdAndTenantId(USER_ID, TENANT_ID))
                    .thenReturn(Optional.empty());
            when(workflowExecutionRepository.save(any(WorkflowExecution.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            ApprovalActionRequest request = new ApprovalActionRequest();
            request.setAction(StepExecution.ApprovalAction.APPROVE);
            request.setComments("Looks good");

            // When
            WorkflowExecutionResponse response = workflowService.processApprovalAction(executionId, request);

            // Then
            assertThat(response).isNotNull();
            verify(workflowExecutionRepository).save(any(WorkflowExecution.class));
            verify(domainEventPublisher).publish(any(ApprovalDecisionEvent.class));
        }

        @Test
        @DisplayName("should reject step successfully and publish event")
        void shouldRejectSuccessfully() {
            // Given
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

            // When
            WorkflowExecutionResponse response = workflowService.processApprovalAction(executionId, request);

            // Then
            assertThat(response).isNotNull();
            verify(workflowExecutionRepository).save(any(WorkflowExecution.class));
            verify(domainEventPublisher).publish(any(ApprovalDecisionEvent.class));
        }

        @Test
        @DisplayName("should throw 409 when workflow is already completed (idempotency)")
        void shouldThrow409WhenWorkflowCompleted() {
            // Given
            UUID executionId = UUID.randomUUID();
            WorkflowExecution execution = mock(WorkflowExecution.class);
            when(execution.isCompleted()).thenReturn(true);
            when(execution.getStatus()).thenReturn(WorkflowExecution.ExecutionStatus.APPROVED);

            when(workflowExecutionRepository.findByIdAndTenantId(executionId, TENANT_ID))
                    .thenReturn(Optional.of(execution));

            ApprovalActionRequest request = new ApprovalActionRequest();
            request.setAction(StepExecution.ApprovalAction.APPROVE);

            // When/Then
            assertThatThrownBy(() -> workflowService.processApprovalAction(executionId, request))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("already been processed");

            verify(workflowExecutionRepository, never()).save(any());
            verify(domainEventPublisher, never()).publish(any());
        }

        @Test
        @DisplayName("should throw 409 when step is already acted upon (idempotency)")
        void shouldThrow409WhenStepAlreadyActed() {
            // Given
            UUID executionId = UUID.randomUUID();
            WorkflowExecution execution = mock(WorkflowExecution.class);
            StepExecution step = mock(StepExecution.class);

            when(execution.isCompleted()).thenReturn(false);
            when(execution.canBeApproved()).thenReturn(true);
            when(execution.getCurrentStepExecution()).thenReturn(step);
            when(step.getStatus()).thenReturn(StepExecution.StepStatus.APPROVED);

            when(workflowExecutionRepository.findByIdAndTenantId(executionId, TENANT_ID))
                    .thenReturn(Optional.of(execution));

            ApprovalActionRequest request = new ApprovalActionRequest();
            request.setAction(StepExecution.ApprovalAction.APPROVE);

            // When/Then
            assertThatThrownBy(() -> workflowService.processApprovalAction(executionId, request))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("already been acted upon");

            verify(workflowExecutionRepository, never()).save(any());
        }

        @Test
        @DisplayName("should throw when user is not authorized to act on step")
        void shouldThrowWhenUnauthorizedUser() {
            // Given
            UUID executionId = UUID.randomUUID();
            WorkflowExecution execution = mock(WorkflowExecution.class);
            StepExecution step = mock(StepExecution.class);

            when(execution.isCompleted()).thenReturn(false);
            when(execution.canBeApproved()).thenReturn(true);
            when(execution.getCurrentStepExecution()).thenReturn(step);
            when(step.getStatus()).thenReturn(StepExecution.StepStatus.PENDING);
            when(step.canBeActedUponBy(USER_ID)).thenReturn(false);

            when(workflowExecutionRepository.findByIdAndTenantId(executionId, TENANT_ID))
                    .thenReturn(Optional.of(execution));

            ApprovalActionRequest request = new ApprovalActionRequest();
            request.setAction(StepExecution.ApprovalAction.APPROVE);

            // When/Then
            assertThatThrownBy(() -> workflowService.processApprovalAction(executionId, request))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("not authorized");

            verify(workflowExecutionRepository, never()).save(any());
        }

        @Test
        @DisplayName("should throw when execution not found (404)")
        void shouldThrowWhenExecutionNotFound() {
            // Given
            UUID executionId = UUID.randomUUID();
            when(workflowExecutionRepository.findByIdAndTenantId(executionId, TENANT_ID))
                    .thenReturn(Optional.empty());

            ApprovalActionRequest request = new ApprovalActionRequest();
            request.setAction(StepExecution.ApprovalAction.APPROVE);

            // When/Then
            assertThatThrownBy(() -> workflowService.processApprovalAction(executionId, request))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("not found");
        }

        @Test
        @DisplayName("should throw when workflow cannot be approved in current state")
        void shouldThrowWhenCannotBeApproved() {
            // Given
            UUID executionId = UUID.randomUUID();
            WorkflowExecution execution = mock(WorkflowExecution.class);
            when(execution.isCompleted()).thenReturn(false);
            when(execution.canBeApproved()).thenReturn(false);
            when(execution.getStatus()).thenReturn(WorkflowExecution.ExecutionStatus.CANCELLED);

            when(workflowExecutionRepository.findByIdAndTenantId(executionId, TENANT_ID))
                    .thenReturn(Optional.of(execution));

            ApprovalActionRequest request = new ApprovalActionRequest();
            request.setAction(StepExecution.ApprovalAction.APPROVE);

            // When/Then
            assertThatThrownBy(() -> workflowService.processApprovalAction(executionId, request))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("cannot be approved");
        }

        @Test
        @DisplayName("should not publish domain event for non-approve/reject actions")
        void shouldNotPublishEventForHoldAction() {
            // Given
            UUID executionId = UUID.randomUUID();
            WorkflowExecution execution = createApprovableExecution(executionId);

            when(workflowExecutionRepository.findByIdAndTenantId(executionId, TENANT_ID))
                    .thenReturn(Optional.of(execution));
            lenient().when(employeeRepository.findByIdAndTenantId(USER_ID, TENANT_ID))
                    .thenReturn(Optional.empty());
            when(workflowExecutionRepository.save(any(WorkflowExecution.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            ApprovalActionRequest request = new ApprovalActionRequest();
            request.setAction(StepExecution.ApprovalAction.HOLD);

            // When
            workflowService.processApprovalAction(executionId, request);

            // Then - no event should be published for HOLD
            verify(domainEventPublisher, never()).publish(any());
        }
    }

    @Nested
    @DisplayName("Auto-Delegation (approver on leave)")
    class AutoDelegationTests {

        private static final UUID MANAGER_ID = UUID.fromString("880e8400-e29b-41d4-a716-446655440003");
        private static final UUID SKIP_MANAGER_ID = UUID.fromString("990e8400-e29b-41d4-a716-446655440004");
        private static final UUID SUPER_ADMIN_ID = UUID.fromString("aa0e8400-e29b-41d4-a716-446655440005");

        @Test
        @DisplayName("should start workflow with reporting manager when manager is NOT on leave")
        void shouldUseManagerWhenAvailable() {
            // Given
            UUID entityId = UUID.randomUUID();
            WorkflowDefinition definition = createWorkflowDefinitionWithReportingManager();

            when(workflowDefinitionRepository.findDefaultWorkflow(TENANT_ID, WorkflowDefinition.EntityType.LEAVE_REQUEST))
                    .thenReturn(Optional.of(definition));
            when(workflowExecutionRepository.findByEntity(any(), any(), any()))
                    .thenReturn(Optional.empty());

            // Employee has a manager
            Employee employee = mock(Employee.class);
            when(employee.getManagerId()).thenReturn(MANAGER_ID);
            when(employeeRepository.findByUserIdAndTenantId(USER_ID, TENANT_ID))
                    .thenReturn(Optional.of(employee));

            // Manager is NOT on leave
            when(leaveRequestRepository.isEmployeeOnLeave(eq(TENANT_ID), eq(MANAGER_ID), any(LocalDate.class)))
                    .thenReturn(false);

            // No explicit delegation
            when(approvalDelegateRepository.findActiveDelegations(eq(TENANT_ID), eq(MANAGER_ID), any(LocalDate.class)))
                    .thenReturn(Collections.emptyList());

            when(workflowExecutionRepository.save(any(WorkflowExecution.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            var request = new com.hrms.api.workflow.dto.WorkflowExecutionRequest();
            request.setEntityType(WorkflowDefinition.EntityType.LEAVE_REQUEST);
            request.setEntityId(entityId);
            request.setTitle("Leave Request");

            workflowService.startWorkflow(request);

            // Then - verify save was called (approver = MANAGER_ID)
            verify(workflowExecutionRepository, atLeastOnce()).save(any(WorkflowExecution.class));
        }

        @Test
        @DisplayName("should auto-delegate to skip-level manager when direct manager is on leave")
        void shouldAutoDelegateWhenManagerOnLeave() {
            // Given
            UUID entityId = UUID.randomUUID();
            WorkflowDefinition definition = createWorkflowDefinitionWithReportingManager();

            when(workflowDefinitionRepository.findDefaultWorkflow(TENANT_ID, WorkflowDefinition.EntityType.LEAVE_REQUEST))
                    .thenReturn(Optional.of(definition));
            when(workflowExecutionRepository.findByEntity(any(), any(), any()))
                    .thenReturn(Optional.empty());

            // Employee has a manager
            Employee employee = mock(Employee.class);
            when(employee.getManagerId()).thenReturn(MANAGER_ID);
            when(employeeRepository.findByUserIdAndTenantId(USER_ID, TENANT_ID))
                    .thenReturn(Optional.of(employee));

            // Manager IS on leave
            when(leaveRequestRepository.isEmployeeOnLeave(eq(TENANT_ID), eq(MANAGER_ID), any(LocalDate.class)))
                    .thenReturn(true);
            // No explicit delegation for manager
            when(approvalDelegateRepository.findActiveDelegations(eq(TENANT_ID), eq(MANAGER_ID), any(LocalDate.class)))
                    .thenReturn(Collections.emptyList());

            // Skip-level manager found via reporting chain
            Employee managerEmployee = mock(Employee.class);
            when(managerEmployee.getManagerId()).thenReturn(SKIP_MANAGER_ID);
            when(employeeRepository.findByUserIdAndTenantId(MANAGER_ID, TENANT_ID))
                    .thenReturn(Optional.of(managerEmployee));

            // Skip-level manager is NOT on leave
            when(leaveRequestRepository.isEmployeeOnLeave(eq(TENANT_ID), eq(SKIP_MANAGER_ID), any(LocalDate.class)))
                    .thenReturn(false);
            // No explicit delegation for skip-level manager
            when(approvalDelegateRepository.findActiveDelegations(eq(TENANT_ID), eq(SKIP_MANAGER_ID), any(LocalDate.class)))
                    .thenReturn(Collections.emptyList());

            when(workflowExecutionRepository.save(any(WorkflowExecution.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            var request = new com.hrms.api.workflow.dto.WorkflowExecutionRequest();
            request.setEntityType(WorkflowDefinition.EntityType.LEAVE_REQUEST);
            request.setEntityId(entityId);
            request.setTitle("Leave Request");

            workflowService.startWorkflow(request);

            // Then
            verify(workflowExecutionRepository, atLeastOnce()).save(any(WorkflowExecution.class));
            // Verify skip-level manager was checked for leave status
            verify(leaveRequestRepository).isEmployeeOnLeave(eq(TENANT_ID), eq(SKIP_MANAGER_ID), any(LocalDate.class));
        }

        @Test
        @DisplayName("should fall back to SUPER_ADMIN when entire reporting chain is on leave")
        void shouldFallBackToSuperAdminWhenChainExhausted() {
            // Given
            UUID entityId = UUID.randomUUID();
            WorkflowDefinition definition = createWorkflowDefinitionWithReportingManager();

            when(workflowDefinitionRepository.findDefaultWorkflow(TENANT_ID, WorkflowDefinition.EntityType.LEAVE_REQUEST))
                    .thenReturn(Optional.of(definition));
            when(workflowExecutionRepository.findByEntity(any(), any(), any()))
                    .thenReturn(Optional.empty());

            // Employee has a manager
            Employee employee = mock(Employee.class);
            when(employee.getManagerId()).thenReturn(MANAGER_ID);
            when(employeeRepository.findByUserIdAndTenantId(USER_ID, TENANT_ID))
                    .thenReturn(Optional.of(employee));

            // Manager IS on leave, no explicit delegation
            when(leaveRequestRepository.isEmployeeOnLeave(eq(TENANT_ID), eq(MANAGER_ID), any(LocalDate.class)))
                    .thenReturn(true);
            when(approvalDelegateRepository.findActiveDelegations(eq(TENANT_ID), eq(MANAGER_ID), any(LocalDate.class)))
                    .thenReturn(Collections.emptyList());

            // Manager has no manager (chain ends)
            Employee managerEmployee = mock(Employee.class);
            when(managerEmployee.getManagerId()).thenReturn(null);
            when(employeeRepository.findByUserIdAndTenantId(MANAGER_ID, TENANT_ID))
                    .thenReturn(Optional.of(managerEmployee));

            // SUPER_ADMIN fallback
            when(userRepository.findUserIdsByRoleCode(TENANT_ID, "SUPER_ADMIN"))
                    .thenReturn(List.of(SUPER_ADMIN_ID));

            when(workflowExecutionRepository.save(any(WorkflowExecution.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            var request = new com.hrms.api.workflow.dto.WorkflowExecutionRequest();
            request.setEntityType(WorkflowDefinition.EntityType.LEAVE_REQUEST);
            request.setEntityId(entityId);
            request.setTitle("Leave Request");

            workflowService.startWorkflow(request);

            // Then
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
}
