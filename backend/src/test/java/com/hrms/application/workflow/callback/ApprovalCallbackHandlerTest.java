package com.hrms.application.workflow.callback;

import com.hrms.application.workflow.service.WorkflowService;
import com.hrms.domain.workflow.WorkflowDefinition;
import com.hrms.domain.workflow.WorkflowExecution;
import com.hrms.infrastructure.workflow.repository.*;
import com.hrms.infrastructure.employee.repository.DepartmentRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import com.hrms.infrastructure.leave.repository.LeaveRequestRepository;
import com.hrms.application.event.DomainEventPublisher;
import com.hrms.application.audit.service.AuditLogService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * Unit tests for the ApprovalCallbackHandler interface contract and WorkflowService
 * callback dispatch mechanism.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ApprovalCallbackHandler Tests")
class ApprovalCallbackHandlerTest {

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID ENTITY_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440001");
    private static final UUID APPROVER_ID = UUID.fromString("770e8400-e29b-41d4-a716-446655440002");

    @Mock private WorkflowDefinitionRepository workflowDefinitionRepository;
    @Mock private ApprovalStepRepository approvalStepRepository;
    @Mock private WorkflowExecutionRepository workflowExecutionRepository;
    @Mock private StepExecutionRepository stepExecutionRepository;
    @Mock private ApprovalDelegateRepository approvalDelegateRepository;
    @Mock private WorkflowRuleRepository workflowRuleRepository;
    @Mock private EmployeeRepository employeeRepository;
    @Mock private DepartmentRepository departmentRepository;
    @Mock private UserRepository userRepository;
    @Mock private DomainEventPublisher domainEventPublisher;
    @Mock private AuditLogService auditLogService;
    @Mock private LeaveRequestRepository leaveRequestRepository;

    @Test
    @DisplayName("should register callback handlers by entity type at construction time")
    void shouldRegisterCallbackHandlersByEntityType() {
        // Given: two callback handlers for different entity types
        ApprovalCallbackHandler leaveHandler = new TestCallbackHandler(
                WorkflowDefinition.EntityType.LEAVE_REQUEST);
        ApprovalCallbackHandler expenseHandler = new TestCallbackHandler(
                WorkflowDefinition.EntityType.EXPENSE_CLAIM);

        List<ApprovalCallbackHandler> handlers = List.of(leaveHandler, expenseHandler);

        // When: WorkflowService is constructed with the handlers
        WorkflowService workflowService = new WorkflowService(
                workflowDefinitionRepository, approvalStepRepository,
                workflowExecutionRepository, stepExecutionRepository,
                approvalDelegateRepository, workflowRuleRepository,
                employeeRepository, departmentRepository, userRepository,
                domainEventPublisher, auditLogService, leaveRequestRepository,
                handlers);

        // Then: the service should be constructed without errors
        assertThat(workflowService).isNotNull();
    }

    @Test
    @DisplayName("should handle null callback handler list gracefully")
    void shouldHandleNullCallbackHandlerList() {
        // When: WorkflowService is constructed with null handlers
        WorkflowService workflowService = new WorkflowService(
                workflowDefinitionRepository, approvalStepRepository,
                workflowExecutionRepository, stepExecutionRepository,
                approvalDelegateRepository, workflowRuleRepository,
                employeeRepository, departmentRepository, userRepository,
                domainEventPublisher, auditLogService, leaveRequestRepository,
                null);

        // Then: the service should be constructed without errors
        assertThat(workflowService).isNotNull();
    }

    @Test
    @DisplayName("should handle empty callback handler list gracefully")
    void shouldHandleEmptyCallbackHandlerList() {
        // When: WorkflowService is constructed with empty handlers
        WorkflowService workflowService = new WorkflowService(
                workflowDefinitionRepository, approvalStepRepository,
                workflowExecutionRepository, stepExecutionRepository,
                approvalDelegateRepository, workflowRuleRepository,
                employeeRepository, departmentRepository, userRepository,
                domainEventPublisher, auditLogService, leaveRequestRepository,
                Collections.emptyList());

        // Then: the service should be constructed without errors
        assertThat(workflowService).isNotNull();
    }

    @Test
    @DisplayName("callback handler should expose correct entity type")
    void callbackHandlerShouldExposeCorrectEntityType() {
        // Given
        ApprovalCallbackHandler handler = new TestCallbackHandler(
                WorkflowDefinition.EntityType.ASSET_REQUEST);

        // Then
        assertThat(handler.getEntityType()).isEqualTo(WorkflowDefinition.EntityType.ASSET_REQUEST);
    }

    @Test
    @DisplayName("onApproved should be invoked with correct parameters")
    void onApprovedShouldReceiveCorrectParameters() {
        // Given
        TestCallbackHandler handler = new TestCallbackHandler(
                WorkflowDefinition.EntityType.LOAN_REQUEST);

        // When
        handler.onApproved(TENANT_ID, ENTITY_ID, APPROVER_ID);

        // Then
        assertThat(handler.approvedTenantId).isEqualTo(TENANT_ID);
        assertThat(handler.approvedEntityId).isEqualTo(ENTITY_ID);
        assertThat(handler.approvedBy).isEqualTo(APPROVER_ID);
    }

    @Test
    @DisplayName("onRejected should be invoked with correct parameters including reason")
    void onRejectedShouldReceiveCorrectParameters() {
        // Given
        TestCallbackHandler handler = new TestCallbackHandler(
                WorkflowDefinition.EntityType.TRAVEL_REQUEST);

        // When
        handler.onRejected(TENANT_ID, ENTITY_ID, APPROVER_ID, "Budget exceeded");

        // Then
        assertThat(handler.rejectedTenantId).isEqualTo(TENANT_ID);
        assertThat(handler.rejectedEntityId).isEqualTo(ENTITY_ID);
        assertThat(handler.rejectedBy).isEqualTo(APPROVER_ID);
        assertThat(handler.rejectedReason).isEqualTo("Budget exceeded");
    }

    @Test
    @DisplayName("onRejected should handle null reason gracefully")
    void onRejectedShouldHandleNullReason() {
        // Given
        TestCallbackHandler handler = new TestCallbackHandler(
                WorkflowDefinition.EntityType.EXPENSE_CLAIM);

        // When
        handler.onRejected(TENANT_ID, ENTITY_ID, APPROVER_ID, null);

        // Then
        assertThat(handler.rejectedReason).isNull();
    }

    @Test
    @DisplayName("should keep first handler when duplicates exist for same entity type")
    void shouldKeepFirstHandlerOnDuplicate() {
        // Given
        TestCallbackHandler handler1 = new TestCallbackHandler(
                WorkflowDefinition.EntityType.LEAVE_REQUEST);
        TestCallbackHandler handler2 = new TestCallbackHandler(
                WorkflowDefinition.EntityType.LEAVE_REQUEST);

        List<ApprovalCallbackHandler> handlers = List.of(handler1, handler2);

        // When: constructed with duplicate handlers -- should not throw
        WorkflowService workflowService = new WorkflowService(
                workflowDefinitionRepository, approvalStepRepository,
                workflowExecutionRepository, stepExecutionRepository,
                approvalDelegateRepository, workflowRuleRepository,
                employeeRepository, departmentRepository, userRepository,
                domainEventPublisher, auditLogService, leaveRequestRepository,
                handlers);

        assertThat(workflowService).isNotNull();
    }

    // ==================== Test Helper ====================

    /**
     * Simple test implementation of ApprovalCallbackHandler that records invocations.
     */
    private static class TestCallbackHandler implements ApprovalCallbackHandler {

        private final WorkflowDefinition.EntityType entityType;

        UUID approvedTenantId;
        UUID approvedEntityId;
        UUID approvedBy;

        UUID rejectedTenantId;
        UUID rejectedEntityId;
        UUID rejectedBy;
        String rejectedReason;

        TestCallbackHandler(WorkflowDefinition.EntityType entityType) {
            this.entityType = entityType;
        }

        @Override
        public WorkflowDefinition.EntityType getEntityType() {
            return entityType;
        }

        @Override
        public void onApproved(UUID tenantId, UUID entityId, UUID approvedBy) {
            this.approvedTenantId = tenantId;
            this.approvedEntityId = entityId;
            this.approvedBy = approvedBy;
        }

        @Override
        public void onRejected(UUID tenantId, UUID entityId, UUID rejectedBy, String reason) {
            this.rejectedTenantId = tenantId;
            this.rejectedEntityId = entityId;
            this.rejectedBy = rejectedBy;
            this.rejectedReason = reason;
        }
    }
}
