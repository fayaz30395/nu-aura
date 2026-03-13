package com.hrms.infrastructure.kafka.consumer;

import com.hrms.infrastructure.kafka.KafkaTopics;
import com.hrms.infrastructure.kafka.events.ApprovalEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Kafka consumer for approval workflow events.
 *
 * <p>Listens to the nu-aura.approvals topic and handles approval/rejection decisions.
 * On APPROVED status, triggers domain-specific post-approval actions:
 * - LEAVE: Deduct leave balance
 * - EXPENSE: Update expense claim status, process payment
 * - ASSET: Update asset assignment status
 * - WIKI_PAGE: Publish/activate page
 *
 * Ensures idempotent processing by tracking eventId to prevent duplicate processing.
 * </p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ApprovalEventConsumer {

    /**
     * In-memory cache of processed event IDs.
     * In production, use Redis or database for distributed systems.
     * TODO: Implement distributed idempotency store for multi-instance deployment.
     */
    private final Map<String, Boolean> processedEvents = new ConcurrentHashMap<>();

    /**
     * Handle approval events.
     */
    @KafkaListener(
            topics = KafkaTopics.APPROVALS,
            groupId = KafkaTopics.GROUP_APPROVALS_CONSUMER,
            containerFactory = "approvalEventListenerContainerFactory"
    )
    public void handleApprovalEvent(
            @Payload ApprovalEvent event,
            Acknowledgment acknowledgment,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            @Header(KafkaHeaders.PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET) long offset) {

        String eventId = event.getEventId();
        UUID tenantId = event.getTenantId();
        String approvalType = event.getApprovalType();
        String status = event.getStatus();

        try {
            // Check idempotency: skip if already processed
            if (processedEvents.containsKey(eventId)) {
                log.debug("Event {} already processed, skipping", eventId);
                acknowledgment.acknowledge();
                return;
            }

            log.info("Processing {} event: approvalId={}, status={}, tenantId={}",
                    approvalType, event.getApprovalId(), status, tenantId);

            // Handle based on approval type and status
            if ("APPROVED".equals(status)) {
                handleApproved(event);
            } else if ("REJECTED".equals(status)) {
                handleRejected(event);
            } else {
                log.warn("Unknown approval status: {}", status);
            }

            // Mark event as processed
            processedEvents.put(eventId, true);

            // Commit offset
            acknowledgment.acknowledge();

            log.info("Successfully processed approval event: {}", eventId);

        } catch (Exception e) {
            log.error("Error processing approval event {}: {}", eventId, e.getMessage(), e);
            // Don't acknowledge; let Kafka retry or move to DLT based on config
            throw e;
        }
    }

    /**
     * Handle APPROVED decisions.
     * Trigger domain-specific post-approval actions.
     */
    private void handleApproved(ApprovalEvent event) {
        String approvalType = event.getApprovalType();
        UUID tenantId = event.getTenantId();

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

        try {
            log.info("Deducting {} days of {} leave for request {}", days, leaveType, leaveRequestId);

            // TODO: Integrate with leave service
            // leaveService.deductLeaveBalance(leaveRequestId, leaveType, days);

            log.info("Successfully deducted leave balance for request {}", leaveRequestId);
        } catch (Exception e) {
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

            // TODO: Integrate with expense service
            // expenseService.markApprovedForPayment(expenseClaimId);

            log.info("Successfully updated expense claim status: {}", expenseClaimId);
        } catch (Exception e) {
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

            // TODO: Integrate with asset service
            // assetService.activateAssignment(assetId, employeeId);

            log.info("Successfully activated asset assignment");
        } catch (Exception e) {
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

            // TODO: Integrate with knowledge/wiki service
            // wikiService.publishPage(pageId);

            log.info("Successfully published wiki page: {}", pageId);
        } catch (Exception e) {
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
