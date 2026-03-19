package com.hrms.application.workflow.callback;

import com.hrms.domain.workflow.WorkflowDefinition;

import java.util.UUID;

/**
 * Callback interface for modules to react to approval workflow terminal states.
 * <p>
 * Each module (Leave, Expense, Asset, etc.) implements this interface to receive
 * notifications when its entity's workflow reaches APPROVED or REJECTED status.
 * The WorkflowService discovers all implementations via Spring DI and dispatches
 * callbacks based on {@link #getEntityType()}.
 */
public interface ApprovalCallbackHandler {

    /**
     * Returns the entity type this handler is responsible for.
     * Used by WorkflowService to route callbacks to the correct module.
     */
    WorkflowDefinition.EntityType getEntityType();

    /**
     * Called when the workflow for an entity is fully approved (all steps passed).
     *
     * @param tenantId   the tenant owning the entity
     * @param entityId   the ID of the approved entity (e.g., LeaveRequest ID)
     * @param approvedBy the user who approved the final step
     */
    void onApproved(UUID tenantId, UUID entityId, UUID approvedBy);

    /**
     * Called when the workflow for an entity is rejected at any step.
     *
     * @param tenantId   the tenant owning the entity
     * @param entityId   the ID of the rejected entity
     * @param rejectedBy the user who rejected the step
     * @param reason     the rejection reason (may be null)
     */
    void onRejected(UUID tenantId, UUID entityId, UUID rejectedBy, String reason);
}
