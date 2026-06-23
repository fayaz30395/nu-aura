package com.nulogic.infrastructure.kafka.consumer;

import com.nulogic.application.asset.service.AssetManagementService;
import com.nulogic.application.expense.service.ExpenseClaimService;
import com.nulogic.application.integration.service.IntegrationEventRouter;
import com.nulogic.application.knowledge.service.WikiPageService;
import com.nulogic.application.leave.service.LeaveBalanceService;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.integration.IntegrationEvent;
import com.nulogic.infrastructure.kafka.IdempotencyService;
import com.nulogic.infrastructure.kafka.events.ApprovalEvent;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Pure Mockito unit tests for {@link ApprovalEventConsumer#process(ApprovalEvent)}.
 *
 * <p>Branches covered:
 * <ul>
 *   <li>idempotency duplicate skip</li>
 *   <li>status switch: APPROVED, REJECTED, unknown (no-op)</li>
 *   <li>approvalType switch under APPROVED: LEAVE, EXPENSE, ASSET, WIKI_PAGE, unknown</li>
 *   <li>terminal-vs-non-terminal guard, null-metadata guard, missing leaveTypeId guard</li>
 *   <li>collaborator failure → idempotency release + re-throw</li>
 *   <li>integration routing best-effort swallow</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
class ApprovalEventConsumerTest {

    @Mock
    private IdempotencyService idempotencyService;
    @Mock
    private LeaveBalanceService leaveBalanceService;
    @Mock
    private ExpenseClaimService expenseClaimService;
    @Mock
    private AssetManagementService assetManagementService;
    @Mock
    private WikiPageService wikiPageService;
    @Mock
    private IntegrationEventRouter integrationEventRouter;

    @InjectMocks
    private ApprovalEventConsumer consumer;

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    private ApprovalEvent event(String approvalType, String status, boolean terminal, Map<String, Object> metadata) {
        ApprovalEvent e = new ApprovalEvent();
        e.setEventId(UUID.randomUUID().toString());
        e.setTenantId(UUID.randomUUID());
        e.setApprovalId(UUID.randomUUID());
        e.setApprovalType(approvalType);
        e.setStatus(status);
        e.setTerminal(terminal);
        e.setComments("looks good");
        e.setMetadata(metadata);
        return e;
    }

    // ---------- idempotency / status ----------

    @Test
    @DisplayName("process skips when event already processed")
    void process_duplicate_skips() {
        ApprovalEvent e = event("LEAVE", "APPROVED", true, new HashMap<>());
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(false);

        consumer.process(e);

        verifyNoInteractions(leaveBalanceService, expenseClaimService,
                assetManagementService, wikiPageService, integrationEventRouter);
        verify(idempotencyService, never()).release(any());
    }

    @Test
    @DisplayName("REJECTED status is a logging no-op with no state changes")
    void process_rejected_noOp() {
        ApprovalEvent e = event("LEAVE", "REJECTED", true, null);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);

        consumer.process(e);

        verifyNoInteractions(leaveBalanceService, expenseClaimService,
                assetManagementService, wikiPageService, integrationEventRouter);
        verify(idempotencyService, never()).release(any());
    }

    @Test
    @DisplayName("unknown status is ignored without dispatching domain handlers")
    void process_unknownStatus_ignored() {
        ApprovalEvent e = event("LEAVE", "PENDING", true, null);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);

        consumer.process(e);

        verifyNoInteractions(leaveBalanceService, integrationEventRouter);
    }

    @Test
    @DisplayName("APPROVED with unknown approval type is ignored")
    void process_approvedUnknownType_ignored() {
        ApprovalEvent e = event("MYSTERY", "APPROVED", true, new HashMap<>());
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);

        consumer.process(e);

        verifyNoInteractions(leaveBalanceService, expenseClaimService,
                assetManagementService, wikiPageService, integrationEventRouter);
    }

    // ---------- LEAVE ----------

    @Test
    @DisplayName("LEAVE approved & terminal deducts balance and routes integration event")
    void leave_approvedTerminal_deductsAndRoutes() {
        UUID employeeId = UUID.randomUUID();
        UUID leaveTypeId = UUID.randomUUID();
        Map<String, Object> md = new HashMap<>();
        md.put("leaveRequestId", UUID.randomUUID().toString());
        md.put("leaveType", "ANNUAL");
        md.put("days", 3);
        md.put("employeeId", employeeId.toString());
        md.put("leaveTypeId", leaveTypeId.toString());
        ApprovalEvent e = event("LEAVE", "APPROVED", true, md);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);

        consumer.process(e);

        verify(leaveBalanceService).deductLeave(eq(employeeId), eq(leaveTypeId), eq(BigDecimal.valueOf(3)));
        ArgumentCaptor<IntegrationEvent> captor = ArgumentCaptor.forClass(IntegrationEvent.class);
        verify(integrationEventRouter).routeToConnectors(captor.capture());
        assertThat(captor.getValue().eventType()).isEqualTo("LEAVE_APPROVED");
        assertThat(captor.getValue().entityType()).isEqualTo("LeaveRequest");
        verify(idempotencyService, never()).release(any());
    }

    @Test
    @DisplayName("LEAVE approved but non-terminal skips balance deduction")
    void leave_nonTerminal_skips() {
        ApprovalEvent e = event("LEAVE", "APPROVED", false, new HashMap<>());
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);

        consumer.process(e);

        verifyNoInteractions(leaveBalanceService, integrationEventRouter);
    }

    @Test
    @DisplayName("LEAVE approved terminal with null metadata skips deduction")
    void leave_nullMetadata_skips() {
        ApprovalEvent e = event("LEAVE", "APPROVED", true, null);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);

        consumer.process(e);

        verifyNoInteractions(leaveBalanceService, integrationEventRouter);
    }

    @Test
    @DisplayName("LEAVE approved terminal missing leaveTypeId returns before deducting")
    void leave_missingLeaveTypeId_skips() {
        Map<String, Object> md = new HashMap<>();
        md.put("leaveRequestId", UUID.randomUUID().toString());
        md.put("leaveType", "ANNUAL");
        md.put("days", 2);
        md.put("employeeId", UUID.randomUUID().toString());
        // no leaveTypeId
        ApprovalEvent e = event("LEAVE", "APPROVED", true, md);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);

        consumer.process(e);

        verifyNoInteractions(leaveBalanceService, integrationEventRouter);
    }

    @Test
    @DisplayName("LEAVE deduction failure releases idempotency claim and re-throws")
    void leave_deductFailure_releasesAndThrows() {
        UUID employeeId = UUID.randomUUID();
        UUID leaveTypeId = UUID.randomUUID();
        Map<String, Object> md = new HashMap<>();
        md.put("leaveRequestId", UUID.randomUUID().toString());
        md.put("leaveType", "ANNUAL");
        md.put("days", 1);
        md.put("employeeId", employeeId.toString());
        md.put("leaveTypeId", leaveTypeId.toString());
        ApprovalEvent e = event("LEAVE", "APPROVED", true, md);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        when(leaveBalanceService.deductLeave(any(), any(), any()))
                .thenThrow(new RuntimeException("insufficient balance"));

        assertThatThrownBy(() -> consumer.process(e)).isInstanceOf(RuntimeException.class);

        verify(idempotencyService).release(e.getEventId());
        verify(integrationEventRouter, never()).routeToConnectors(any());
    }

    @Test
    @DisplayName("LEAVE integration routing failure is swallowed after successful deduction")
    void leave_routingFailure_swallowed() {
        UUID employeeId = UUID.randomUUID();
        UUID leaveTypeId = UUID.randomUUID();
        Map<String, Object> md = new HashMap<>();
        md.put("leaveRequestId", UUID.randomUUID().toString());
        md.put("leaveType", "ANNUAL");
        md.put("days", 1);
        md.put("employeeId", employeeId.toString());
        md.put("leaveTypeId", leaveTypeId.toString());
        ApprovalEvent e = event("LEAVE", "APPROVED", true, md);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        org.mockito.Mockito.doThrow(new RuntimeException("router down"))
                .when(integrationEventRouter).routeToConnectors(any());

        consumer.process(e);

        verify(leaveBalanceService).deductLeave(any(), any(), any());
        verify(idempotencyService, never()).release(any());
    }

    // ---------- EXPENSE ----------

    @Test
    @DisplayName("EXPENSE approved terminal approves the claim and routes")
    void expense_approvedTerminal_approvesAndRoutes() {
        UUID claimId = UUID.randomUUID();
        Map<String, Object> md = new HashMap<>();
        md.put("expenseClaimId", claimId.toString());
        md.put("amount", 250.0);
        ApprovalEvent e = event("EXPENSE", "APPROVED", true, md);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);

        consumer.process(e);

        verify(expenseClaimService).approveExpenseClaim(claimId);
        ArgumentCaptor<IntegrationEvent> captor = ArgumentCaptor.forClass(IntegrationEvent.class);
        verify(integrationEventRouter).routeToConnectors(captor.capture());
        assertThat(captor.getValue().eventType()).isEqualTo("EXPENSE_APPROVED");
    }

    @Test
    @DisplayName("EXPENSE non-terminal skips status update")
    void expense_nonTerminal_skips() {
        ApprovalEvent e = event("EXPENSE", "APPROVED", false, new HashMap<>());
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);

        consumer.process(e);

        verifyNoInteractions(expenseClaimService, integrationEventRouter);
    }

    @Test
    @DisplayName("EXPENSE null metadata skips status update")
    void expense_nullMetadata_skips() {
        ApprovalEvent e = event("EXPENSE", "APPROVED", true, null);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);

        consumer.process(e);

        verifyNoInteractions(expenseClaimService, integrationEventRouter);
    }

    @Test
    @DisplayName("EXPENSE approval failure releases claim and re-throws")
    void expense_failure_releasesAndThrows() {
        UUID claimId = UUID.randomUUID();
        Map<String, Object> md = new HashMap<>();
        md.put("expenseClaimId", claimId.toString());
        md.put("amount", 99.0);
        ApprovalEvent e = event("EXPENSE", "APPROVED", true, md);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        when(expenseClaimService.approveExpenseClaim(claimId))
                .thenThrow(new RuntimeException("claim locked"));

        assertThatThrownBy(() -> consumer.process(e)).isInstanceOf(RuntimeException.class);

        verify(idempotencyService).release(e.getEventId());
    }

    // ---------- ASSET ----------

    @Test
    @DisplayName("ASSET approved terminal assigns asset and routes")
    void asset_approvedTerminal_assignsAndRoutes() {
        UUID assetId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();
        Map<String, Object> md = new HashMap<>();
        md.put("assetId", assetId.toString());
        md.put("employeeId", employeeId.toString());
        ApprovalEvent e = event("ASSET", "APPROVED", true, md);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);

        consumer.process(e);

        verify(assetManagementService).assignAsset(assetId, employeeId);
        ArgumentCaptor<IntegrationEvent> captor = ArgumentCaptor.forClass(IntegrationEvent.class);
        verify(integrationEventRouter).routeToConnectors(captor.capture());
        assertThat(captor.getValue().eventType()).isEqualTo("ASSET_APPROVED");
    }

    @Test
    @DisplayName("ASSET non-terminal skips assignment")
    void asset_nonTerminal_skips() {
        ApprovalEvent e = event("ASSET", "APPROVED", false, new HashMap<>());
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);

        consumer.process(e);

        verifyNoInteractions(assetManagementService, integrationEventRouter);
    }

    @Test
    @DisplayName("ASSET assignment failure releases claim and re-throws")
    void asset_failure_releasesAndThrows() {
        UUID assetId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();
        Map<String, Object> md = new HashMap<>();
        md.put("assetId", assetId.toString());
        md.put("employeeId", employeeId.toString());
        ApprovalEvent e = event("ASSET", "APPROVED", true, md);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        when(assetManagementService.assignAsset(assetId, employeeId))
                .thenThrow(new RuntimeException("already assigned"));

        assertThatThrownBy(() -> consumer.process(e)).isInstanceOf(RuntimeException.class);

        verify(idempotencyService).release(e.getEventId());
    }

    // ---------- WIKI_PAGE ----------

    @Test
    @DisplayName("WIKI_PAGE approved terminal publishes page and routes")
    void wiki_approvedTerminal_publishesAndRoutes() {
        UUID pageId = UUID.randomUUID();
        Map<String, Object> md = new HashMap<>();
        md.put("pageId", pageId.toString());
        md.put("pageTitle", "Handbook");
        ApprovalEvent e = event("WIKI_PAGE", "APPROVED", true, md);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);

        consumer.process(e);

        verify(wikiPageService).publishPage(pageId);
        ArgumentCaptor<IntegrationEvent> captor = ArgumentCaptor.forClass(IntegrationEvent.class);
        verify(integrationEventRouter).routeToConnectors(captor.capture());
        assertThat(captor.getValue().eventType()).isEqualTo("DOCUMENT_CREATED");
        assertThat(captor.getValue().entityType()).isEqualTo("WikiPage");
    }

    @Test
    @DisplayName("WIKI_PAGE non-terminal skips publication")
    void wiki_nonTerminal_skips() {
        ApprovalEvent e = event("WIKI_PAGE", "APPROVED", false, new HashMap<>());
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);

        consumer.process(e);

        verifyNoInteractions(wikiPageService, integrationEventRouter);
    }

    @Test
    @DisplayName("WIKI_PAGE publish failure releases claim and re-throws")
    void wiki_failure_releasesAndThrows() {
        UUID pageId = UUID.randomUUID();
        Map<String, Object> md = new HashMap<>();
        md.put("pageId", pageId.toString());
        md.put("pageTitle", "Handbook");
        ApprovalEvent e = event("WIKI_PAGE", "APPROVED", true, md);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        when(wikiPageService.publishPage(pageId))
                .thenThrow(new RuntimeException("publish failed"));

        assertThatThrownBy(() -> consumer.process(e)).isInstanceOf(RuntimeException.class);

        verify(idempotencyService).release(e.getEventId());
    }
}
