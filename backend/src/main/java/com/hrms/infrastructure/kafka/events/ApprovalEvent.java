package com.hrms.infrastructure.kafka.events;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.Map;
import java.util.UUID;

/**
 * Event published when an approval workflow step is completed (APPROVED or REJECTED).
 *
 * <p>Approvals span multiple domains: leave requests, expense claims, asset assignments,
 * wiki pages, and more. This event contains the minimal information needed for downstream
 * services to take action (e.g., deduct leave balance, update expense status).</p>
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ApprovalEvent extends BaseKafkaEvent {

    /**
     * Unique identifier for the approval instance (workflow execution).
     */
    @JsonProperty("approval_id")
    private UUID approvalId;

    /**
     * The approval task ID within the workflow step.
     */
    @JsonProperty("task_id")
    private UUID taskId;

    /**
     * Approval type enum: LEAVE, EXPENSE, ASSET, WIKI_PAGE, GENERAL
     */
    @JsonProperty("approval_type")
    private String approvalType;

    /**
     * Decision status: APPROVED or REJECTED
     */
    @JsonProperty("status")
    private String status; // APPROVED, REJECTED

    /**
     * User ID who made the approval decision.
     */
    @JsonProperty("approver_id")
    private UUID approverId;

    /**
     * User ID who requested the approval (the entity being approved).
     */
    @JsonProperty("requester_id")
    private UUID requesterId;

    /**
     * Comments or reason provided by the approver.
     */
    @JsonProperty("comments")
    private String comments;

    /**
     * Whether the entire workflow instance is now in a terminal state (completed or rejected).
     * If true, downstream services should commit their state changes.
     */
    @JsonProperty("is_terminal")
    private boolean isTerminal;

    /**
     * Domain-specific metadata relevant to the approval type.
     * For LEAVE: leaveRequestId, leaveType, days, leaveBalance
     * For EXPENSE: expenseClaimId, amount, category
     * For ASSET: assetId, assetType
     * For WIKI_PAGE: pageId, pageTitle
     */
    @JsonProperty("metadata")
    private Map<String, Object> metadata;
}
