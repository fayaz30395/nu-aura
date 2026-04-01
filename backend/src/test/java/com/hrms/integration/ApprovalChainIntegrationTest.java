package com.hrms.integration;

import com.hrms.api.workflow.dto.ApprovalActionRequest;
import com.hrms.api.workflow.dto.WorkflowExecutionRequest;
import com.hrms.api.workflow.dto.WorkflowExecutionResponse;
import com.hrms.application.audit.service.AuditLogService;
import com.hrms.application.event.DomainEventPublisher;
import com.hrms.application.leave.service.LeaveBalanceService;
import com.hrms.application.leave.service.LeaveRequestService;
import com.hrms.application.notification.service.WebSocketNotificationService;
import com.hrms.application.workflow.callback.ApprovalCallbackHandler;
import com.hrms.application.workflow.service.WorkflowService;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.expense.ExpenseClaim;
import com.hrms.domain.leave.LeaveRequest;
import com.hrms.domain.leave.LeaveType;
import com.hrms.domain.workflow.*;
import com.hrms.infrastructure.employee.repository.DepartmentRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.expense.repository.ExpenseClaimRepository;
import com.hrms.infrastructure.leave.repository.LeaveRequestRepository;
import com.hrms.infrastructure.leave.repository.LeaveTypeRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import com.hrms.infrastructure.workflow.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Integration test for the full approval chain:
 * 1. Employee submits leave -> Manager approves -> Status updated via callback
 * 2. Employee submits expense -> Manager approves -> Finance approves -> Status updated via callback
 *
 * This is a "fat unit test" that wires WorkflowService with real callback handlers
 * but mocks the persistence layer.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Approval Chain Integration Tests")
class ApprovalChainIntegrationTest {

    // ==================== Shared Fixtures ====================

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID EMPLOYEE_USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440001");
    private static final UUID MANAGER_ID = UUID.fromString("770e8400-e29b-41d4-a716-446655440002");
    private static final UUID FINANCE_HEAD_ID = UUID.fromString("880e8400-e29b-41d4-a716-446655440003");

    // Workflow infrastructure mocks
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

    // Module-specific mocks
    @Mock private LeaveBalanceService leaveBalanceService;
    @Mock private WebSocketNotificationService webSocketNotificationService;
    @Mock private LeaveTypeRepository leaveTypeRepository;
    @Mock private ExpenseClaimRepository expenseClaimRepository;

    private WorkflowService workflowService;

    private MockedStatic<TenantContext> tenantContextMock;
    private MockedStatic<SecurityContext> securityContextMock;

    @BeforeEach
    void setUp() {
        tenantContextMock = mockStatic(TenantContext.class);
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(TENANT_ID);
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(TENANT_ID);

        securityContextMock = mockStatic(SecurityContext.class);
    }

    @AfterEach
    void tearDown() {
        tenantContextMock.close();
        securityContextMock.close();
    }

    // ==================== Test: Leave Approval (1 step) ====================

    @Test
    @DisplayName("Leave: employee submits -> manager approves -> status updated to APPROVED")
    void leaveApprovalChain() {
        // --- Setup: LeaveRequestService as callback handler ---
        LeaveRequestService leaveService = new LeaveRequestService(
                leaveRequestRepository, leaveBalanceService, webSocketNotificationService,
                employeeRepository, leaveTypeRepository, domainEventPublisher, null, auditLogService);

        List<ApprovalCallbackHandler> handlers = List.of(leaveService);

        workflowService = new WorkflowService(
                workflowDefinitionRepository, approvalStepRepository,
                workflowExecutionRepository, stepExecutionRepository,
                approvalDelegateRepository, workflowRuleRepository,
                employeeRepository, departmentRepository, userRepository,
                domainEventPublisher, auditLogService, leaveRequestRepository,
                handlers);

        // --- Setup: Workflow definition with 1 step (REPORTING_MANAGER) ---
        WorkflowDefinition definition = createLeaveWorkflowDefinition();

        when(workflowDefinitionRepository.findDefaultWorkflow(TENANT_ID, WorkflowDefinition.EntityType.LEAVE_REQUEST))
                .thenReturn(Optional.of(definition));
        when(workflowExecutionRepository.findByEntity(any(), any(), any()))
                .thenReturn(Optional.empty());

        // Employee -> Manager mapping
        Employee employee = mock(Employee.class);
        when(employee.getManagerId()).thenReturn(MANAGER_ID);
        when(employeeRepository.findByUserIdAndTenantId(EMPLOYEE_USER_ID, TENANT_ID))
                .thenReturn(Optional.of(employee));

        // No delegation, not on leave
        when(approvalDelegateRepository.findActiveDelegations(eq(TENANT_ID), eq(MANAGER_ID), any(LocalDate.class)))
                .thenReturn(Collections.emptyList());
        when(leaveRequestRepository.isEmployeeOnLeave(eq(TENANT_ID), eq(MANAGER_ID), any(LocalDate.class)))
                .thenReturn(false);

        // Capture saved executions
        List<WorkflowExecution> savedExecutions = new ArrayList<>();
        when(workflowExecutionRepository.save(any(WorkflowExecution.class)))
                .thenAnswer(inv -> {
                    WorkflowExecution exec = inv.getArgument(0);
                    if (exec.getId() == null) exec.setId(UUID.randomUUID());
                    savedExecutions.add(exec);
                    return exec;
                });

        // --- Step 1: Employee submits leave (start workflow) ---
        securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(EMPLOYEE_USER_ID);

        UUID leaveId = UUID.randomUUID();
        WorkflowExecutionRequest request = new WorkflowExecutionRequest();
        request.setEntityType(WorkflowDefinition.EntityType.LEAVE_REQUEST);
        request.setEntityId(leaveId);
        request.setTitle("Leave Request: Test");

        WorkflowExecutionResponse startResponse = workflowService.startWorkflow(request);

        assertThat(startResponse).isNotNull();
        assertThat(savedExecutions).isNotEmpty();

        WorkflowExecution execution = savedExecutions.get(savedExecutions.size() - 1);

        // --- Step 2: Manager approves ---
        securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(MANAGER_ID);

        // Setup the leave request entity that will be found by the callback
        LeaveRequest leaveRequest = LeaveRequest.builder()
                .employeeId(EMPLOYEE_USER_ID)
                .leaveTypeId(UUID.randomUUID())
                .requestNumber("LR-TEST")
                .startDate(LocalDate.now().plusDays(1))
                .endDate(LocalDate.now().plusDays(3))
                .totalDays(BigDecimal.valueOf(3))
                .isHalfDay(false)
                .reason("Vacation")
                .status(LeaveRequest.LeaveRequestStatus.PENDING)
                .build();
        leaveRequest.setId(leaveId);
        leaveRequest.setTenantId(TENANT_ID);

        when(leaveRequestRepository.findById(leaveId))
                .thenReturn(Optional.of(leaveRequest));
        when(leaveRequestRepository.save(any(LeaveRequest.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        when(workflowExecutionRepository.findByIdAndTenantId(execution.getId(), TENANT_ID))
                .thenReturn(Optional.of(execution));

        ApprovalActionRequest approveRequest = new ApprovalActionRequest();
        approveRequest.setAction(StepExecution.ApprovalAction.APPROVE);
        approveRequest.setComments("Approved");

        workflowService.processApprovalAction(execution.getId(), approveRequest);

        // --- Verify: Leave request status changed to APPROVED via callback ---
        assertThat(leaveRequest.getStatus()).isEqualTo(LeaveRequest.LeaveRequestStatus.APPROVED);
        assertThat(leaveRequest.getApprovedBy()).isEqualTo(MANAGER_ID);

        // Verify leave balance was deducted
        verify(leaveBalanceService).deductLeave(eq(EMPLOYEE_USER_ID), any(UUID.class), eq(BigDecimal.valueOf(3)));
    }

    // ==================== Test: Expense Approval (2 steps) ====================

    @Test
    @DisplayName("Expense: employee submits -> manager approves -> finance approves -> status updated to APPROVED")
    void expenseApprovalChainTwoSteps() {
        // --- Setup: Use a simple inline callback handler for expense ---
        ExpenseClaim[] capturedClaim = new ExpenseClaim[1];

        ApprovalCallbackHandler expenseHandler = new ApprovalCallbackHandler() {
            @Override
            public WorkflowDefinition.EntityType getEntityType() {
                return WorkflowDefinition.EntityType.EXPENSE_CLAIM;
            }

            @Override
            public void onApproved(UUID tenantId, UUID entityId, UUID approvedBy) {
                ExpenseClaim claim = expenseClaimRepository.findByIdAndTenantId(entityId, tenantId).orElse(null);
                if (claim != null) {
                    claim.approve(approvedBy);
                    expenseClaimRepository.save(claim);
                    capturedClaim[0] = claim;
                }
            }

            @Override
            public void onRejected(UUID tenantId, UUID entityId, UUID rejectedBy, String reason) {
                ExpenseClaim claim = expenseClaimRepository.findByIdAndTenantId(entityId, tenantId).orElse(null);
                if (claim != null) {
                    claim.reject(rejectedBy, reason);
                    expenseClaimRepository.save(claim);
                }
            }
        };

        workflowService = new WorkflowService(
                workflowDefinitionRepository, approvalStepRepository,
                workflowExecutionRepository, stepExecutionRepository,
                approvalDelegateRepository, workflowRuleRepository,
                employeeRepository, departmentRepository, userRepository,
                domainEventPublisher, auditLogService, leaveRequestRepository,
                List.of(expenseHandler));

        // --- Setup: 2-step workflow (Manager -> Finance) ---
        WorkflowDefinition definition = createExpenseWorkflowDefinition();

        when(workflowDefinitionRepository.findDefaultWorkflow(TENANT_ID, WorkflowDefinition.EntityType.EXPENSE_CLAIM))
                .thenReturn(Optional.of(definition));
        when(workflowExecutionRepository.findByEntity(any(), any(), any()))
                .thenReturn(Optional.empty());

        // Employee -> Manager
        Employee employee = mock(Employee.class);
        when(employee.getManagerId()).thenReturn(MANAGER_ID);
        when(employeeRepository.findByUserIdAndTenantId(EMPLOYEE_USER_ID, TENANT_ID))
                .thenReturn(Optional.of(employee));

        // Finance Head resolved by role code
        when(userRepository.findUserIdsByRoleCode(TENANT_ID, "FINANCE_MANAGER"))
                .thenReturn(List.of(FINANCE_HEAD_ID));

        // No delegations, not on leave
        when(approvalDelegateRepository.findActiveDelegations(any(), any(), any(LocalDate.class)))
                .thenReturn(Collections.emptyList());
        when(leaveRequestRepository.isEmployeeOnLeave(any(), any(), any(LocalDate.class)))
                .thenReturn(false);

        List<WorkflowExecution> savedExecutions = new ArrayList<>();
        when(workflowExecutionRepository.save(any(WorkflowExecution.class)))
                .thenAnswer(inv -> {
                    WorkflowExecution exec = inv.getArgument(0);
                    if (exec.getId() == null) exec.setId(UUID.randomUUID());
                    savedExecutions.add(exec);
                    return exec;
                });

        // --- Step 1: Employee submits expense claim ---
        securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(EMPLOYEE_USER_ID);

        UUID claimId = UUID.randomUUID();
        WorkflowExecutionRequest request = new WorkflowExecutionRequest();
        request.setEntityType(WorkflowDefinition.EntityType.EXPENSE_CLAIM);
        request.setEntityId(claimId);
        request.setTitle("Expense Approval: Test");
        request.setAmount(BigDecimal.valueOf(500));

        workflowService.startWorkflow(request);

        WorkflowExecution execution = savedExecutions.get(savedExecutions.size() - 1);
        assertThat(execution.getStatus()).isEqualTo(WorkflowExecution.ExecutionStatus.PENDING);

        // --- Step 2: Manager approves (step 1 of 2) ---
        securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(MANAGER_ID);
        when(workflowExecutionRepository.findByIdAndTenantId(execution.getId(), TENANT_ID))
                .thenReturn(Optional.of(execution));

        ApprovalActionRequest approveRequest = new ApprovalActionRequest();
        approveRequest.setAction(StepExecution.ApprovalAction.APPROVE);
        approveRequest.setComments("Manager approved");

        workflowService.processApprovalAction(execution.getId(), approveRequest);

        // After step 1 approval, should be IN_PROGRESS (waiting for finance)
        assertThat(execution.getStatus()).isEqualTo(WorkflowExecution.ExecutionStatus.IN_PROGRESS);

        // --- Step 3: Finance head approves (step 2 of 2) ---
        securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(FINANCE_HEAD_ID);

        // Setup the expense claim entity for the callback
        ExpenseClaim claim = ExpenseClaim.builder()
                .employeeId(EMPLOYEE_USER_ID)
                .claimNumber("EXP-TEST")
                .claimDate(LocalDate.now())
                .amount(BigDecimal.valueOf(500))
                .status(ExpenseClaim.ExpenseStatus.SUBMITTED)
                .build();
        claim.setId(claimId);
        claim.setTenantId(TENANT_ID);

        when(expenseClaimRepository.findByIdAndTenantId(claimId, TENANT_ID))
                .thenReturn(Optional.of(claim));
        when(expenseClaimRepository.save(any(ExpenseClaim.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ApprovalActionRequest financeApproveRequest = new ApprovalActionRequest();
        financeApproveRequest.setAction(StepExecution.ApprovalAction.APPROVE);
        financeApproveRequest.setComments("Finance approved");

        workflowService.processApprovalAction(execution.getId(), financeApproveRequest);

        // --- Verify: Workflow fully approved, expense claim status = APPROVED ---
        assertThat(execution.getStatus()).isEqualTo(WorkflowExecution.ExecutionStatus.APPROVED);
        assertThat(claim.getStatus()).isEqualTo(ExpenseClaim.ExpenseStatus.APPROVED);
        assertThat(claim.getApprovedBy()).isEqualTo(FINANCE_HEAD_ID);
    }

    // ==================== Helper: Create Workflow Definitions ====================

    private WorkflowDefinition createLeaveWorkflowDefinition() {
        ApprovalStep step1 = ApprovalStep.builder()
                .stepOrder(1)
                .stepName("Manager Approval")
                .approverType(ApprovalStep.ApproverType.REPORTING_MANAGER)
                .slaHours(0)
                .build();
        step1.setId(UUID.randomUUID());
        step1.setTenantId(TENANT_ID);

        WorkflowDefinition definition = WorkflowDefinition.builder()
                .name("Default Leave Approval")
                .entityType(WorkflowDefinition.EntityType.LEAVE_REQUEST)
                .workflowType(WorkflowDefinition.WorkflowType.SEQUENTIAL)
                .workflowVersion(1)
                .isActive(true)
                .isDefault(true)
                .steps(new ArrayList<>(List.of(step1)))
                .defaultSlaHours(0)
                .build();
        definition.setId(UUID.randomUUID());
        definition.setTenantId(TENANT_ID);

        step1.setWorkflowDefinition(definition);
        return definition;
    }

    private WorkflowDefinition createExpenseWorkflowDefinition() {
        ApprovalStep step1 = ApprovalStep.builder()
                .stepOrder(1)
                .stepName("Manager Approval")
                .approverType(ApprovalStep.ApproverType.REPORTING_MANAGER)
                .slaHours(0)
                .build();
        step1.setId(UUID.randomUUID());
        step1.setTenantId(TENANT_ID);

        ApprovalStep step2 = ApprovalStep.builder()
                .stepOrder(2)
                .stepName("Finance Head Approval")
                .approverType(ApprovalStep.ApproverType.FINANCE_MANAGER)
                .slaHours(0)
                .build();
        step2.setId(UUID.randomUUID());
        step2.setTenantId(TENANT_ID);

        WorkflowDefinition definition = WorkflowDefinition.builder()
                .name("Default Expense Approval")
                .entityType(WorkflowDefinition.EntityType.EXPENSE_CLAIM)
                .workflowType(WorkflowDefinition.WorkflowType.SEQUENTIAL)
                .workflowVersion(1)
                .isActive(true)
                .isDefault(true)
                .steps(new ArrayList<>(List.of(step1, step2)))
                .defaultSlaHours(0)
                .build();
        definition.setId(UUID.randomUUID());
        definition.setTenantId(TENANT_ID);

        step1.setWorkflowDefinition(definition);
        step2.setWorkflowDefinition(definition);
        return definition;
    }
}
