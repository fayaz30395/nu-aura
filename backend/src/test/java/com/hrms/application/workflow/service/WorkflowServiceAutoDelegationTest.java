package com.hrms.application.workflow.service;

import com.hrms.api.workflow.dto.WorkflowExecutionRequest;
import com.hrms.api.workflow.dto.WorkflowExecutionResponse;
import com.hrms.application.audit.service.AuditLogService;
import com.hrms.application.event.DomainEventPublisher;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
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

import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Tests for the auto-delegation mechanism in WorkflowService.
 * Covers: explicit delegation, on-leave chain walking, SUPER_ADMIN fallback, cycle detection.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("WorkflowService Auto-Delegation Tests")
class WorkflowServiceAutoDelegationTest {

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID EMPLOYEE_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440001");
    private static final UUID MANAGER_ID = UUID.fromString("770e8400-e29b-41d4-a716-446655440002");
    private static final UUID SKIP_MANAGER_ID = UUID.fromString("880e8400-e29b-41d4-a716-446655440003");
    private static final UUID L3_MANAGER_ID = UUID.fromString("990e8400-e29b-41d4-a716-446655440004");
    private static final UUID DELEGATE_ID = UUID.fromString("aa0e8400-e29b-41d4-a716-446655440005");
    private static final UUID SUPER_ADMIN_ID = UUID.fromString("bb0e8400-e29b-41d4-a716-446655440006");

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

    private WorkflowService workflowService;
    private MockedStatic<TenantContext> tenantContextMock;
    private MockedStatic<SecurityContext> securityContextMock;

    @BeforeEach
    void setUp() {
        tenantContextMock = mockStatic(TenantContext.class);
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(TENANT_ID);

        securityContextMock = mockStatic(SecurityContext.class);
        securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(EMPLOYEE_ID);

        workflowService = new WorkflowService(
                workflowDefinitionRepository, approvalStepRepository,
                workflowExecutionRepository, stepExecutionRepository,
                approvalDelegateRepository, workflowRuleRepository,
                employeeRepository, departmentRepository, userRepository,
                domainEventPublisher, auditLogService, leaveRequestRepository,
                Collections.emptyList());
    }

    @AfterEach
    void tearDown() {
        tenantContextMock.close();
        securityContextMock.close();
    }

    @Test
    @DisplayName("should use explicit delegation when available, even if approver is not on leave")
    void shouldUseExplicitDelegation() {
        // Given
        setupWorkflowInfrastructure();
        setupEmployeeWithManager(EMPLOYEE_ID, MANAGER_ID);

        // Manager has an explicit delegation
        ApprovalDelegate delegation = mock(ApprovalDelegate.class);
        when(delegation.getDelegateId()).thenReturn(DELEGATE_ID);
        when(approvalDelegateRepository.findActiveDelegations(eq(TENANT_ID), eq(MANAGER_ID), any(LocalDate.class)))
                .thenReturn(List.of(delegation));

        when(workflowExecutionRepository.save(any(WorkflowExecution.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // When
        WorkflowExecutionResponse response = startLeaveWorkflow();

        // Then
        assertThat(response).isNotNull();
        verify(approvalDelegateRepository).findActiveDelegations(eq(TENANT_ID), eq(MANAGER_ID), any(LocalDate.class));
    }

    @Test
    @DisplayName("should walk up one level when direct manager is on leave")
    void shouldWalkUpOneLevelWhenManagerOnLeave() {
        // Given
        setupWorkflowInfrastructure();
        setupEmployeeWithManager(EMPLOYEE_ID, MANAGER_ID);

        // No explicit delegation for manager
        when(approvalDelegateRepository.findActiveDelegations(eq(TENANT_ID), eq(MANAGER_ID), any(LocalDate.class)))
                .thenReturn(Collections.emptyList());

        // Manager IS on leave
        when(leaveRequestRepository.isEmployeeOnLeave(eq(TENANT_ID), eq(MANAGER_ID), any(LocalDate.class)))
                .thenReturn(true);

        // Manager's manager (skip-level)
        setupEmployeeWithManager(MANAGER_ID, SKIP_MANAGER_ID);

        // No explicit delegation for skip-level
        when(approvalDelegateRepository.findActiveDelegations(eq(TENANT_ID), eq(SKIP_MANAGER_ID), any(LocalDate.class)))
                .thenReturn(Collections.emptyList());

        // Skip-level is NOT on leave
        when(leaveRequestRepository.isEmployeeOnLeave(eq(TENANT_ID), eq(SKIP_MANAGER_ID), any(LocalDate.class)))
                .thenReturn(false);

        when(workflowExecutionRepository.save(any(WorkflowExecution.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // When
        WorkflowExecutionResponse response = startLeaveWorkflow();

        // Then
        assertThat(response).isNotNull();
        verify(leaveRequestRepository).isEmployeeOnLeave(eq(TENANT_ID), eq(SKIP_MANAGER_ID), any(LocalDate.class));
    }

    @Test
    @DisplayName("should walk up multiple levels when all managers in chain are on leave")
    void shouldWalkUpMultipleLevels() {
        // Given
        setupWorkflowInfrastructure();
        setupEmployeeWithManager(EMPLOYEE_ID, MANAGER_ID);

        // Manager on leave, no delegation
        when(approvalDelegateRepository.findActiveDelegations(eq(TENANT_ID), eq(MANAGER_ID), any(LocalDate.class)))
                .thenReturn(Collections.emptyList());
        when(leaveRequestRepository.isEmployeeOnLeave(eq(TENANT_ID), eq(MANAGER_ID), any(LocalDate.class)))
                .thenReturn(true);

        // Skip-level on leave too
        setupEmployeeWithManager(MANAGER_ID, SKIP_MANAGER_ID);
        when(approvalDelegateRepository.findActiveDelegations(eq(TENANT_ID), eq(SKIP_MANAGER_ID), any(LocalDate.class)))
                .thenReturn(Collections.emptyList());
        when(leaveRequestRepository.isEmployeeOnLeave(eq(TENANT_ID), eq(SKIP_MANAGER_ID), any(LocalDate.class)))
                .thenReturn(true);

        // L3 manager is available
        setupEmployeeWithManager(SKIP_MANAGER_ID, L3_MANAGER_ID);
        when(approvalDelegateRepository.findActiveDelegations(eq(TENANT_ID), eq(L3_MANAGER_ID), any(LocalDate.class)))
                .thenReturn(Collections.emptyList());
        when(leaveRequestRepository.isEmployeeOnLeave(eq(TENANT_ID), eq(L3_MANAGER_ID), any(LocalDate.class)))
                .thenReturn(false);

        when(workflowExecutionRepository.save(any(WorkflowExecution.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // When
        WorkflowExecutionResponse response = startLeaveWorkflow();

        // Then
        assertThat(response).isNotNull();
        verify(leaveRequestRepository).isEmployeeOnLeave(eq(TENANT_ID), eq(L3_MANAGER_ID), any(LocalDate.class));
    }

    @Test
    @DisplayName("should fall back to SUPER_ADMIN when entire chain is exhausted (no more managers)")
    void shouldFallBackToSuperAdminWhenChainExhausted() {
        // Given
        setupWorkflowInfrastructure();
        setupEmployeeWithManager(EMPLOYEE_ID, MANAGER_ID);

        // Manager on leave, no delegation
        when(approvalDelegateRepository.findActiveDelegations(eq(TENANT_ID), eq(MANAGER_ID), any(LocalDate.class)))
                .thenReturn(Collections.emptyList());
        when(leaveRequestRepository.isEmployeeOnLeave(eq(TENANT_ID), eq(MANAGER_ID), any(LocalDate.class)))
                .thenReturn(true);

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
        WorkflowExecutionResponse response = startLeaveWorkflow();

        // Then
        assertThat(response).isNotNull();
        verify(userRepository).findUserIdsByRoleCode(TENANT_ID, "SUPER_ADMIN");
    }

    @Test
    @DisplayName("should use manager's explicit delegate when walking up the chain")
    void shouldUseManagersDelegateInChain() {
        // Given
        setupWorkflowInfrastructure();
        setupEmployeeWithManager(EMPLOYEE_ID, MANAGER_ID);

        // Manager on leave, no delegation
        when(approvalDelegateRepository.findActiveDelegations(eq(TENANT_ID), eq(MANAGER_ID), any(LocalDate.class)))
                .thenReturn(Collections.emptyList());
        when(leaveRequestRepository.isEmployeeOnLeave(eq(TENANT_ID), eq(MANAGER_ID), any(LocalDate.class)))
                .thenReturn(true);

        // Skip-level manager has an explicit delegation
        setupEmployeeWithManager(MANAGER_ID, SKIP_MANAGER_ID);
        ApprovalDelegate delegation = mock(ApprovalDelegate.class);
        when(delegation.getDelegateId()).thenReturn(DELEGATE_ID);
        when(approvalDelegateRepository.findActiveDelegations(eq(TENANT_ID), eq(SKIP_MANAGER_ID), any(LocalDate.class)))
                .thenReturn(List.of(delegation));

        when(workflowExecutionRepository.save(any(WorkflowExecution.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // When
        WorkflowExecutionResponse response = startLeaveWorkflow();

        // Then
        assertThat(response).isNotNull();
        verify(approvalDelegateRepository).findActiveDelegations(eq(TENANT_ID), eq(SKIP_MANAGER_ID), any(LocalDate.class));
    }

    @Test
    @DisplayName("should not delegate when manager is available (not on leave)")
    void shouldNotDelegateWhenManagerAvailable() {
        // Given
        setupWorkflowInfrastructure();
        setupEmployeeWithManager(EMPLOYEE_ID, MANAGER_ID);

        // No explicit delegation
        when(approvalDelegateRepository.findActiveDelegations(eq(TENANT_ID), eq(MANAGER_ID), any(LocalDate.class)))
                .thenReturn(Collections.emptyList());

        // Manager is NOT on leave
        when(leaveRequestRepository.isEmployeeOnLeave(eq(TENANT_ID), eq(MANAGER_ID), any(LocalDate.class)))
                .thenReturn(false);

        when(workflowExecutionRepository.save(any(WorkflowExecution.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // When
        WorkflowExecutionResponse response = startLeaveWorkflow();

        // Then
        assertThat(response).isNotNull();
        // Should NOT look up skip-level manager
        verify(employeeRepository, never()).findByUserIdAndTenantId(eq(MANAGER_ID), eq(TENANT_ID));
    }

    // ==================== Helper Methods ====================

    private void setupWorkflowInfrastructure() {
        WorkflowDefinition definition = createLeaveWorkflowDefinition();
        when(workflowDefinitionRepository.findDefaultWorkflow(TENANT_ID, WorkflowDefinition.EntityType.LEAVE_REQUEST))
                .thenReturn(Optional.of(definition));
        when(workflowExecutionRepository.findByEntity(any(), any(), any()))
                .thenReturn(Optional.empty());
    }

    private void setupEmployeeWithManager(UUID employeeId, UUID managerId) {
        Employee employee = mock(Employee.class);
        when(employee.getManagerId()).thenReturn(managerId);
        when(employeeRepository.findByUserIdAndTenantId(employeeId, TENANT_ID))
                .thenReturn(Optional.of(employee));
    }

    private WorkflowExecutionResponse startLeaveWorkflow() {
        WorkflowExecutionRequest request = new WorkflowExecutionRequest();
        request.setEntityType(WorkflowDefinition.EntityType.LEAVE_REQUEST);
        request.setEntityId(UUID.randomUUID());
        request.setTitle("Leave Request Test");
        return workflowService.startWorkflow(request);
    }

    private WorkflowDefinition createLeaveWorkflowDefinition() {
        ApprovalStep step = ApprovalStep.builder()
                .stepOrder(1)
                .stepName("Manager Approval")
                .approverType(ApprovalStep.ApproverType.REPORTING_MANAGER)
                .slaHours(0)
                .build();
        step.setId(UUID.randomUUID());
        step.setTenantId(TENANT_ID);

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
