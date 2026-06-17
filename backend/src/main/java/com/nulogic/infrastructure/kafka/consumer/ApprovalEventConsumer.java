package com.nulogic.infrastructure.kafka.consumer;

import com.nulogic.application.asset.service.AssetManagementService;
import com.nulogic.application.expense.service.ExpenseClaimService;
import com.nulogic.application.integration.service.IntegrationEventRouter;
import com.nulogic.application.knowledge.service.WikiPageService;
import com.nulogic.application.leave.service.LeaveBalanceService;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.integration.IntegrationEvent;
import com.nulogic.infrastructure.kafka.IdempotencyService;
import com.nulogic.infrastructure.kafka.KafkaTopics;
import com.nulogic.infrastructure.kafka.events.ApprovalEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Kafka consumer for approval workflow events.
 *
 * <p>Listens to the nu-aura.approvals topic and handles approval/rejection decisions.
 * On APPROVED status, triggers domain-specific post-approval actions:
 * - LEAVE: Deduct leave balance
 * - EXPENSE: Update expense claim status, process payment
 * - ASSET: Update asset assignment status
 * - WIKI_PAGE: Publish/activate page
 * <p>
 * Ensures idempotent processing by tracking eventId to prevent duplicate processing.
 * </p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ApprovalEventConsumer {

    private final IdempotencyService idempotencyService;
    private final LeaveBalanceService leaveBalanceService;
    private final ExpenseClaimService expenseClaimService;
    private final AssetManagementService assetManagementService;
    private final WikiPageService wikiPageService;
    private final IntegrationEventRouter integrationEventRouter;

    /**
     * Called from both the Kafka listener and OutboxEventProcessor.
     * TenantContext must be set by the caller before invoking this method.
     */
    public void process(ApprovalEvent event) {
        String eventId = event.getEventId();
        String approvalType = event.getApprovalType();
        String status = event.getStatus();

        boolean claimed = false;
        try {
            if (!idempotencyService.tryProcess(eventId)) {
                log.debug("Event {} already processed, skipping", eventId);
                return;
            }
            claimed = true;

            log.info("Processing {} event: approvalId={}, status={}, tenantId={}",
                    approvalType, event.getApprovalId(), status, event.getTenantId());

            if ("APPROVED".equals(status)) {
                handleApproved(event);
            } else if ("REJECTED".equals(status)) {
                handleRejected(event);
            } else {
                log.warn("Unknown approval status: {}", status);
            }

            log.info("Successfully processed approval event: {}", eventId);

        } catch (Exception e) { // Intentional broad catch — per-message error boundary
            log.error("Error processing approval event {}: {}", eventId, e.getMessage(), e);
            if (claimed) {
                idempotencyService.release(eventId);
            }
            throw e;
        }
    }

    /**
     * Kafka listener — thin wrapper; delegates to process() then acknowledges.
     */
    @KafkaListener(
            topics = KafkaTopics.APPROVALS,
            groupId = KafkaTopics.GROUP_APPROVALS_CONSUMER,
            containerFactory = "approvalEventListenerContainerFactory"
    )
    public void handleApprovalEvent(
            @Payload ApprovalEvent event,
            Acknowledgment acknowledgment) {

        UUID tenantId = event.getTenantId();
        if (tenantId != null) {
            TenantContext.setCurrentTenant(tenantId);
        }
        try {
            process(event);
            acknowledgment.acknowledge();
        } finally {
            TenantContext.clear();
        }
    }

    /**
     * Handle APPROVED decisions.
     * Trigger domain-specific post-approval actions.
     */
    private void handleApproved(ApprovalEvent event) {
        String approvalType = event.getApprovalType();

        switch (approvalType) {
            case "LEAVE" -> handleLeaveApproved(event);
            case "EXPENSE" -> handleExpenseApproved(event);
            case "ASSET" -> handleAssetApproved(event);
            case "WIKI_PAGE" -> handleWikiPageApproved(event);
            default -> log.warn("Unknown approval type for approved decision: {}", approvalType);
        }
    }

    /**
     * Handle LEAVE approval.
     * Deduct balance from employee's leave account (if terminal).
     */
    private void handleLeaveApproved(ApprovalEvent event) {
        if (!event.isTerminal()) {
            log.debug("Leave approval is not terminal, skipping balance deduction");
            return;
        }

        Map<String, Object> metadata = event.getMetadata();
        if (metadata == null) {
            log.warn("No metadata found for leave approval");
            return;
        }

        UUID leaveRequestId = UUID.fromString((String) metadata.get("leaveRequestId"));
        String leaveType = (String) metadata.get("leaveType");
        Integer days = (Integer) metadata.get("days");
        UUID employeeId = UUID.fromString((String) metadata.get("employeeId"));

        try {
            log.info("Deducting {} days of {} leave for request {}", days, leaveType, leaveRequestId);

            // Deduct leave balance via LeaveBalanceService
            // Extract leave type ID from metadata if available; otherwise log a warning
            UUID leaveTypeId = null;
            if (metadata.containsKey("leaveTypeId")) {
                leaveTypeId = UUID.fromString((String) metadata.get("leaveTypeId"));
            } else {
                log.warn("leaveTypeId not found in metadata for leave request {}", leaveRequestId);
                return;
            }

            leaveBalanceService.deductLeave(employeeId, leaveTypeId, BigDecimal.valueOf(days));

            log.info("Successfully deducted leave balance for request {}", leaveRequestId);

            // Route to integration connectors
            try {
                Map<String, Object> integrationMetadata = new HashMap<>();
                integrationMetadata.put("leaveRequestId", leaveRequestId.toString());
                integrationMetadata.put("leaveType", leaveType);
                integrationMetadata.put("days", days);
                integrationMetadata.put("employeeId", employeeId.toString());
                if (metadata != null) {
                    integrationMetadata.putAll(metadata);
                }

                IntegrationEvent integrationEvent = new IntegrationEvent(
                        "LEAVE_APPROVED",
                        event.getTenantId(),
                        leaveRequestId,
                        "LeaveRequest",
                        integrationMetadata,
                        Instant.now()
                );
                integrationEventRouter.routeToConnectors(integrationEvent);
            } catch (Exception e) { // Intentional broad catch — per-message error boundary
                log.warn("Failed to route LEAVE_APPROVED integration event for request {}: {}", leaveRequestId, e.getMessage());
                // Don't fail the main consumer processing
            }

        } catch (RuntimeException e) {
            log.error("Failed to deduct leave balance for request {}: {}", leaveRequestId, e.getMessage(), e);
            throw new RuntimeException("Leave deduction failed", e);
        }
    }

    /**
     * Handle EXPENSE approval.
     * Update expense claim status and process payment.
     */
    private void handleExpenseApproved(ApprovalEvent event) {
        if (!event.isTerminal()) {
            log.debug("Expense approval is not terminal, skipping status update");
            return;
        }

        Map<String, Object> metadata = event.getMetadata();
        if (metadata == null) {
            log.warn("No metadata found for expense approval");
            return;
        }

        UUID expenseClaimId = UUID.fromString((String) metadata.get("expenseClaimId"));
        Double amount = (Double) metadata.get("amount");

        try {
            log.info("Marking expense claim {} as approved for payment: {}", expenseClaimId, amount);

            // Mark expense claim as approved via ExpenseClaimService
            expenseClaimService.approveExpenseClaim(expenseClaimId);

            log.info("Successfully updated expense claim status: {}", expenseClaimId);

            // Route to integration connectors
            try {
                Map<String, Object> integrationMetadata = new HashMap<>();
                integrationMetadata.put("expenseClaimId", expenseClaimId.toString());
                integrationMetadata.put("amount", amount);
                if (metadata != null) {
                    integrationMetadata.putAll(metadata);
                }

                IntegrationEvent integrationEvent = new IntegrationEvent(
                        "EXPENSE_APPROVED",
                        event.getTenantId(),
                        expenseClaimId,
                        "ExpenseClaim",
                        integrationMetadata,
                        Instant.now()
                );
                integrationEventRouter.routeToConnectors(integrationEvent);
            } catch (Exception e) { // Intentional broad catch — per-message error boundary
                log.warn("Failed to route EXPENSE_APPROVED integration event for claim {}: {}", expenseClaimId, e.getMessage());
                // Don't fail the main consumer processing
            }

        } catch (RuntimeException e) {
            log.error("Failed to update expense claim {}: {}", expenseClaimId, e.getMessage(), e);
            throw new RuntimeException("Expense approval failed", e);
        }
    }

    /**
     * Handle ASSET approval.
     * Update asset assignment status.
     */
    private void handleAssetApproved(ApprovalEvent event) {
        if (!event.isTerminal()) {
            log.debug("Asset approval is not terminal, skipping status update");
            return;
        }

        Map<String, Object> metadata = event.getMetadata();
        if (metadata == null) {
            log.warn("No metadata found for asset approval");
            return;
        }

        UUID assetId = UUID.fromString((String) metadata.get("assetId"));
        UUID employeeId = UUID.fromString((String) metadata.get("employeeId"));

        try {
            log.info("Activating asset assignment: asset={}, employee={}", assetId, employeeId);

            // Assign asset to employee via AssetManagementService
            assetManagementService.assignAsset(assetId, employeeId);

            log.info("Successfully activated asset assignment");

            // Route to integration connectors
            try {
                Map<String, Object> integrationMetadata = new HashMap<>();
                integrationMetadata.put("assetId", assetId.toString());
                integrationMetadata.put("employeeId", employeeId.toString());
                if (metadata != null) {
                    integrationMetadata.putAll(metadata);
                }

                IntegrationEvent integrationEvent = new IntegrationEvent(
                        "ASSET_APPROVED",
                        event.getTenantId(),
                        assetId,
                        "Asset",
                        integrationMetadata,
                        Instant.now()
                );
                integrationEventRouter.routeToConnectors(integrationEvent);
            } catch (Exception e) { // Intentional broad catch — per-message error boundary
                log.warn("Failed to route ASSET_APPROVED integration event for asset {}: {}", assetId, e.getMessage());
                // Don't fail the main consumer processing
            }

        } catch (RuntimeException e) {
            log.error("Failed to activate asset assignment: {}", e.getMessage(), e);
            throw new RuntimeException("Asset approval failed", e);
        }
    }

    /**
     * Handle WIKI_PAGE approval.
     * Publish/activate the wiki page.
     */
    private void handleWikiPageApproved(ApprovalEvent event) {
        if (!event.isTerminal()) {
            log.debug("Wiki page approval is not terminal, skipping publication");
            return;
        }

        Map<String, Object> metadata = event.getMetadata();
        if (metadata == null) {
            log.warn("No metadata found for wiki page approval");
            return;
        }

        UUID pageId = UUID.fromString((String) metadata.get("pageId"));
        String pageTitle = (String) metadata.get("pageTitle");

        try {
            log.info("Publishing wiki page: id={}, title={}", pageId, pageTitle);

            // Publish wiki page via WikiPageService
            wikiPageService.publishPage(pageId);

            log.info("Successfully published wiki page: {}", pageId);

            // Route to integration connectors
            try {
                Map<String, Object> integrationMetadata = new HashMap<>();
                integrationMetadata.put("pageId", pageId.toString());
                integrationMetadata.put("pageTitle", pageTitle);
                if (metadata != null) {
                    integrationMetadata.putAll(metadata);
                }

                IntegrationEvent integrationEvent = new IntegrationEvent(
                        "DOCUMENT_CREATED",
                        event.getTenantId(),
                        pageId,
                        "WikiPage",
                        integrationMetadata,
                        Instant.now()
                );
                integrationEventRouter.routeToConnectors(integrationEvent);
            } catch (Exception e) { // Intentional broad catch — per-message error boundary
                log.warn("Failed to route DOCUMENT_CREATED integration event for page {}: {}", pageId, e.getMessage());
                // Don't fail the main consumer processing
            }

        } catch (RuntimeException e) {
            log.error("Failed to publish wiki page {}: {}", pageId, e.getMessage(), e);
            throw new RuntimeException("Wiki page approval failed", e);
        }
    }

    /**
     * Handle REJECTED decisions.
     * Notify the requester; no state changes needed for rejection.
     */
    private void handleRejected(ApprovalEvent event) {
        String approvalType = event.getApprovalType();
        String comments = event.getComments();

        log.info("Approval rejected: type={}, reason={}", approvalType, comments);

        // Notification will be published separately by the approval workflow service
        // This consumer is just tracking the rejection for logging/audit purposes
    }
}
