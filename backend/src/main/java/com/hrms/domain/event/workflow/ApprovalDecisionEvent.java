package com.hrms.domain.event.workflow;

import com.hrms.domain.event.DomainEvent;
import com.hrms.domain.workflow.StepExecution;
import com.hrms.domain.workflow.WorkflowDefinition;
import com.hrms.domain.workflow.WorkflowExecution;
import lombok.Getter;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Event raised when an approval decision (APPROVE or REJECT) is made on a workflow step.
 *
 * <p>Downstream consumers (e.g., Leave Service, Expense Service) can listen for this
 * event to commit their domain-specific state changes when the workflow reaches a
 * terminal state.</p>
 */
@Getter
public class ApprovalDecisionEvent extends DomainEvent {

    private final String action; // APPROVED or REJECTED
    private final UUID instanceId;
    private final UUID taskId;
    private final String module;
    private final UUID actorUserId;
    private final String comments;
    private final boolean instanceTerminal; // true if the whole workflow is now complete

    public ApprovalDecisionEvent(
            Object source,
            UUID tenantId,
            WorkflowExecution execution,
            StepExecution step,
            String action,
            UUID actorUserId,
            String comments) {
        super(source, tenantId, execution.getId(), "WorkflowExecution");
        this.action = action;
        this.instanceId = execution.getId();
        this.taskId = step.getId();
        this.module = execution.getEntityType() != null ? execution.getEntityType().name() : "UNKNOWN";
        this.actorUserId = actorUserId;
        this.comments = comments;
        this.instanceTerminal = execution.isCompleted();
    }

    @Override
    public String getEventType() {
        return "APPROVAL_DECISION_" + action;
    }

    @Override
    public Object getEventPayload() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("tenantId", getTenantId().toString());
        payload.put("instanceId", instanceId.toString());
        payload.put("taskId", taskId.toString());
        payload.put("module", module);
        payload.put("action", action);
        payload.put("actorUserId", actorUserId.toString());
        payload.put("instanceTerminal", instanceTerminal);
        if (comments != null) {
            payload.put("comments", comments);
        }
        return payload;
    }

    public static ApprovalDecisionEvent of(
            Object source,
            UUID tenantId,
            WorkflowExecution execution,
            StepExecution step,
            String action,
            UUID actorUserId,
            String comments) {
        return new ApprovalDecisionEvent(source, tenantId, execution, step, action, actorUserId, comments);
    }
}
