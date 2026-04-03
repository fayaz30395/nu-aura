package com.hrms.domain.event.workflow;

import com.hrms.domain.event.DomainEvent;
import lombok.Getter;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Event raised when the workflow engine assigns an approval task to a user.
 * Consumed by NotificationEventListener to create an in-app notification
 * for the assigned approver.
 */
@Getter
public class ApprovalTaskAssignedEvent extends DomainEvent {

    private final UUID assignedToUserId;
    private final String entityType;
    private final String requesterName;
    private final UUID requesterId;

    public ApprovalTaskAssignedEvent(Object source, UUID tenantId, UUID stepExecutionId,
                                     UUID assignedToUserId, String entityType,
                                     String requesterName, UUID requesterId) {
        super(source, tenantId, stepExecutionId, "StepExecution");
        this.assignedToUserId = assignedToUserId;
        this.entityType = entityType;
        this.requesterName = requesterName;
        this.requesterId = requesterId;
    }

    public static ApprovalTaskAssignedEvent of(Object source, UUID tenantId, UUID stepExecutionId,
                                               UUID assignedToUserId, String entityType,
                                               String requesterName, UUID requesterId) {
        return new ApprovalTaskAssignedEvent(source, tenantId, stepExecutionId,
                assignedToUserId, entityType, requesterName, requesterId);
    }

    @Override
    public String getEventType() {
        return "APPROVAL_TASK_ASSIGNED";
    }

    @Override
    public Object getEventPayload() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("stepExecutionId", getAggregateId().toString());
        payload.put("assignedToUserId", assignedToUserId.toString());
        payload.put("entityType", entityType);
        payload.put("requesterName", requesterName);
        if (requesterId != null) {
            payload.put("requesterId", requesterId.toString());
        }
        return payload;
    }
}
