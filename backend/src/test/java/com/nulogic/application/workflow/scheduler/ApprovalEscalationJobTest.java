package com.nulogic.application.workflow.scheduler;

import com.nulogic.application.workflow.service.ApprovalEscalationService;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.workflow.ApprovalEscalationConfig;
import com.nulogic.domain.workflow.ApprovalStep;
import com.nulogic.domain.workflow.StepExecution;
import com.nulogic.domain.workflow.WorkflowDefinition;
import com.nulogic.domain.workflow.WorkflowExecution;
import com.nulogic.infrastructure.tenant.repository.TenantRepository;
import com.nulogic.infrastructure.workflow.repository.ApprovalEscalationConfigRepository;
import com.nulogic.infrastructure.workflow.repository.StepExecutionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Regression test for R4: ApprovalEscalationJob must not copy the stale,
 * already-past deadline onto the newly created escalated StepExecution —
 * doing so made the new PENDING step immediately re-eligible for escalation
 * on WorkflowEscalationScheduler's next tick (cascade bug).
 */
@MockitoSettings(strictness = Strictness.LENIENT)
@ExtendWith(MockitoExtension.class)
@DisplayName("ApprovalEscalationJob Tests")
class ApprovalEscalationJobTest {

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID APPROVER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440001");
    private static final UUID TARGET_ID = UUID.fromString("770e8400-e29b-41d4-a716-446655440002");
    private static final int SLA_HOURS = 24;

    @Mock
    private TenantRepository tenantRepository;
    @Mock
    private StepExecutionRepository stepExecutionRepository;
    @Mock
    private ApprovalEscalationConfigRepository escalationConfigRepository;
    @Mock
    private ApprovalEscalationService escalationService;
    @Mock
    private TenantTimeService tenantTimeService;

    private ApprovalEscalationJob job;
    private LocalDateTime now;
    private StepExecution staleStep;

    @BeforeEach
    void setUp() {
        job = new ApprovalEscalationJob(
                tenantRepository, stepExecutionRepository, escalationConfigRepository,
                escalationService, tenantTimeService);

        now = LocalDateTime.of(2026, 9, 22, 10, 0);
        when(tenantTimeService.now(TENANT_ID)).thenReturn(now);

        ApprovalStep approvalStep = ApprovalStep.builder()
                .id(UUID.randomUUID())
                .slaHours(SLA_HOURS)
                .build();

        WorkflowDefinition workflowDefinition = WorkflowDefinition.builder()
                .id(UUID.randomUUID())
                .build();

        WorkflowExecution workflowExecution = WorkflowExecution.builder()
                .id(UUID.randomUUID())
                .workflowDefinition(workflowDefinition)
                .build();

        // A step whose original deadline is already in the past — the exact
        // condition that triggers the cascade bug once escalated.
        staleStep = StepExecution.builder()
                .id(UUID.randomUUID())
                .workflowExecution(workflowExecution)
                .approvalStep(approvalStep)
                .stepOrder(1)
                .stepName("Manager Approval")
                .status(StepExecution.StepStatus.PENDING)
                .assignedToUserId(APPROVER_ID)
                .assignedAt(now.minusHours(49))
                .deadline(now.minusHours(1))
                .reminderCount(0)
                .build();

        ApprovalEscalationConfig config = ApprovalEscalationConfig.builder()
                .workflowDefinitionId(workflowDefinition.getId())
                .maxEscalations(2)
                .isActive(true)
                .build();

        when(escalationConfigRepository.findByWorkflowDefinitionIdAndTenantIdAndIsActiveTrue(
                workflowDefinition.getId(), TENANT_ID)).thenReturn(Optional.of(config));
        when(escalationService.resolveEscalationTarget(APPROVER_ID, config, TENANT_ID))
                .thenReturn(Optional.of(TARGET_ID));
        when(stepExecutionRepository.save(any(StepExecution.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    @DisplayName("escalated child step gets a fresh future deadline, not the stale original")
    void escalatedStepDoesNotInheritStaleDeadline() {
        boolean escalated = job.escalateStepIfEligible(staleStep, TENANT_ID);

        assertThat(escalated).isTrue();

        ArgumentCaptor<StepExecution> captor = ArgumentCaptor.forClass(StepExecution.class);
        verify(stepExecutionRepository, times(2)).save(captor.capture());

        StepExecution escalatedChild = captor.getAllValues().stream()
                .filter(s -> s.getStatus() == StepExecution.StepStatus.PENDING)
                .findFirst()
                .orElseThrow();

        // The bug: this used to equal staleStep.getDeadline() (now.minusHours(1)),
        // making the child immediately eligible for the next escalation pass.
        assertThat(escalatedChild.getDeadline()).isAfter(now);
        assertThat(escalatedChild.getDeadline()).isEqualTo(now.plusHours(SLA_HOURS));

        // The original step is marked ESCALATED, not re-touched with a new deadline.
        StepExecution originalAfterEscalation = captor.getAllValues().stream()
                .filter(s -> s.getStatus() == StepExecution.StepStatus.ESCALATED)
                .findFirst()
                .orElseThrow();
        assertThat(originalAfterEscalation.getDeadline()).isEqualTo(now.minusHours(1));
    }
}
