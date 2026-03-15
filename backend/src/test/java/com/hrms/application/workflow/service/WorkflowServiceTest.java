package com.hrms.application.workflow.service;

import com.hrms.api.workflow.dto.ApprovalActionRequest;
import com.hrms.api.workflow.dto.WorkflowExecutionResponse;
import com.hrms.application.event.DomainEventPublisher;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.event.workflow.ApprovalDecisionEvent;
import com.hrms.domain.workflow.*;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import com.hrms.infrastructure.workflow.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
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
    private UserRepository userRepository;

    @Mock
    private DomainEventPublisher domainEventPublisher;

    @InjectMocks
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
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            WorkflowExecution execution = createMockExecution();
            StepExecution step = createMockStepExecution(execution);

            Page<StepExecution> stepPage = new PageImpl<>(List.of(step), pageable, 1);
            when(stepExecutionRepository.findInboxForUser(
                    eq(TENANT_ID), eq(USER_ID), eq(StepExecution.StepStatus.PENDING),
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
                    TENANT_ID, USER_ID, StepExecution.StepStatus.PENDING,
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
                    eq(TENANT_ID), eq(USER_ID), eq(StepExecution.StepStatus.PENDING),
                    eq(WorkflowDefinition.EntityType.LEAVE_REQUEST), isNull(), isNull(), isNull(), eq(pageable)))
                    .thenReturn(emptyPage);

            // When
            workflowService.getApprovalInbox("PENDING", "LEAVE_REQUEST", null, null, null, pageable);

            // Then
            verify(stepExecutionRepository).findInboxForUser(
                    TENANT_ID, USER_ID, StepExecution.StepStatus.PENDING,
                    WorkflowDefinition.EntityType.LEAVE_REQUEST, null, null, null, pageable);
        }

        @Test
        @DisplayName("should ignore invalid module value gracefully")
        void shouldIgnoreInvalidModule() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            Page<StepExecution> emptyPage = new PageImpl<>(Collections.emptyList(), pageable, 0);
            when(stepExecutionRepository.findInboxForUser(
                    eq(TENANT_ID), eq(USER_ID), eq(StepExecution.StepStatus.PENDING),
                    isNull(), isNull(), isNull(), isNull(), eq(pageable)))
                    .thenReturn(emptyPage);

            // When
            workflowService.getApprovalInbox("PENDING", "INVALID_MODULE", null, null, null, pageable);

            // Then - should pass null entityType (invalid module ignored)
            verify(stepExecutionRepository).findInboxForUser(
                    TENANT_ID, USER_ID, StepExecution.StepStatus.PENDING,
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
                    eq(TENANT_ID), eq(USER_ID), eq(StepExecution.StepStatus.PENDING),
                    isNull(), eq(fromDate), eq(toDate), eq("John"), eq(pageable)))
                    .thenReturn(emptyPage);

            // When
            workflowService.getApprovalInbox("PENDING", null, fromDate, toDate, search, pageable);

            // Then
            verify(stepExecutionRepository).findInboxForUser(
                    TENANT_ID, USER_ID, StepExecution.StepStatus.PENDING,
                    null, fromDate, toDate, "John", pageable);
        }

        @Test
        @DisplayName("should normalize blank search to null")
        void shouldNormalizeBlankSearch() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            Page<StepExecution> emptyPage = new PageImpl<>(Collections.emptyList(), pageable, 0);
            when(stepExecutionRepository.findInboxForUser(
                    eq(TENANT_ID), eq(USER_ID), eq(StepExecution.StepStatus.PENDING),
                    isNull(), isNull(), isNull(), isNull(), eq(pageable)))
                    .thenReturn(emptyPage);

            // When
            workflowService.getApprovalInbox("PENDING", null, null, null, "   ", pageable);

            // Then
            verify(stepExecutionRepository).findInboxForUser(
                    TENANT_ID, USER_ID, StepExecution.StepStatus.PENDING,
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
                    eq(TENANT_ID), eq(USER_ID), eq(StepExecution.StepStatus.PENDING),
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

    // ==================== getInboxCounts Tests ====================

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

    // ==================== processApprovalAction Tests ====================

    @Nested
    @DisplayName("processApprovalAction")
    class ProcessApprovalActionTests {

        @Test
        @DisplayName("should approve step successfully and publish event")
        void shouldApproveSuccessfully() {
            // Given
            UUID executionId = UUID.randomUUID();
            WorkflowExecution execution = createApprovableExecution(executionId);
            StepExecution currentStep = execution.getCurrentStepExecution();

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
}
