package com.hrms.application.event.listener;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.event.employee.*;
import com.hrms.domain.event.performance.PerformanceReviewCompletedEvent;
import com.hrms.domain.event.workflow.ApprovalDecisionEvent;
import com.hrms.domain.leave.LeaveRequest;
import com.hrms.domain.workflow.WorkflowExecution;
import com.hrms.infrastructure.expense.repository.ExpenseClaimRepository;
import com.hrms.infrastructure.kafka.producer.EventPublisher;
import com.hrms.infrastructure.leave.repository.LeaveRequestRepository;
import com.hrms.infrastructure.knowledge.repository.WikiPageRepository;
import com.hrms.infrastructure.workflow.repository.WorkflowExecutionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Bridge between the synchronous Spring in-process domain event bus
 * ({@link com.hrms.application.event.DomainEventPublisher}) and the asynchronous
 * Kafka message bus ({@link EventPublisher}).
 *
 * <h2>Why this bridge is needed</h2>
 * <p>
 * {@link com.hrms.application.event.DomainEventPublisher} publishes events via Spring's
 * {@link org.springframework.context.ApplicationEventPublisher}, which dispatches them
 * synchronously inside the originating transaction.  The Kafka {@link EventPublisher}
 * is a separate infrastructure component that is never called by any service — there is
 * no connection between the two.
 * </p>
 *
 * <h2>Design decisions</h2>
 * <ol>
 *   <li>All methods use {@code @TransactionalEventListener(phase = AFTER_COMMIT)}
 *       so that Kafka messages are only sent after the originating DB transaction
 *       commits successfully.  If the TX rolls back, no Kafka message is sent.</li>
 *   <li>Approval events are only forwarded to Kafka when the workflow is terminal
 *       ({@code instanceTerminal == true}).  Intermediate step approvals are handled
 *       by {@link ApprovalNotificationListener} (WebSocket + DB notifications) and
 *       do not require Kafka fan-out.</li>
 *   <li>Metadata enrichment: {@link ApprovalDecisionEvent} carries only workflow
 *       context (instanceId, module, actorUserId).  This bridge fetches the
 *       business entity (LeaveRequest, ExpenseClaim, etc.) to populate the metadata
 *       fields that {@link com.hrms.infrastructure.kafka.consumer.ApprovalEventConsumer}
 *       expects (leaveRequestId, leaveTypeId, days, employeeId, etc.).</li>
 *   <li>All failures are caught and logged.  The originating TX is already committed;
 *       Kafka publishing is best-effort.  If Kafka is unavailable, the application
 *       continues operating via application-layer state (leave balances, expense
 *       status) which are managed synchronously by the service layer.</li>
 *   <li>TenantContext is set and cleared explicitly since AFTER_COMMIT listeners
 *       execute in the same thread but after {@code TenantFilter} may have cleared it.</li>
 * </ol>
 *
 * @see EventPublisher
 * @see ApprovalNotificationListener
 * @see com.hrms.application.event.DomainEventPublisher
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class KafkaDomainEventBridge {

    private final EventPublisher eventPublisher;
    private final WorkflowExecutionRepository workflowExecutionRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final ExpenseClaimRepository expenseClaimRepository;
    private final WikiPageRepository wikiPageRepository;

    // =========================================================================
    // APPROVAL EVENTS
    // =========================================================================

    /**
     * Bridges {@link ApprovalDecisionEvent} → Kafka approvals topic.
     *
     * <p>Only fires for terminal workflow decisions (all steps complete).
     * Enriches the Kafka event with domain-specific metadata fetched
     * from the business entity referenced by {@code WorkflowExecution.entityId}.</p>
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onApprovalDecision(ApprovalDecisionEvent event) {
        if (!event.isInstanceTerminal()) {
            // Intermediate step — WebSocket/DB notification handled by ApprovalNotificationListener.
            // No Kafka fan-out needed until the full workflow is resolved.
            log.debug("Skipping Kafka bridge for non-terminal approval step: instanceId={}",
                    event.getInstanceId());
            return;
        }

        UUID tenantId = event.getTenantId();
        UUID instanceId = event.getInstanceId();
        String module = event.getModule(); // EntityType.name() — e.g. "LEAVE_REQUEST"

        try {
            TenantContext.setCurrentTenant(tenantId);

            // Fetch WorkflowExecution to get entityId and requesterId
            WorkflowExecution execution = workflowExecutionRepository.findById(instanceId)
                    .orElse(null);
            if (execution == null) {
                log.warn("KafkaDomainEventBridge: WorkflowExecution {} not found, cannot enrich Kafka event",
                        instanceId);
                return;
            }

            UUID entityId = execution.getEntityId();
            UUID requesterId = execution.getRequesterId();

            // Build approval-type-specific metadata map
            Map<String, Object> metadata = buildMetadata(module, entityId, tenantId);
            if (metadata == null) {
                // Entity not found; already logged inside buildMetadata
                return;
            }

            // Normalise module to the short form that ApprovalEventConsumer switches on:
            // "LEAVE_REQUEST" → "LEAVE", "EXPENSE_CLAIM" → "EXPENSE", etc.
            String approvalType = normaliseApprovalType(module);

            eventPublisher.publishApprovalEvent(
                    instanceId,
                    event.getTaskId(),
                    approvalType,
                    event.getAction(),           // "APPROVED" or "REJECTED"
                    tenantId,
                    event.getActorUserId(),
                    requesterId,
                    event.getComments(),
                    true,                        // always terminal here
                    metadata
            ).whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("KafkaDomainEventBridge: Failed to publish approval event for instance {}: {}",
                            instanceId, ex.getMessage(), ex);
                } else {
                    log.info("KafkaDomainEventBridge: Published {} approval event for instance {} (type={})",
                            event.getAction(), instanceId, approvalType);
                }
            });

        } catch (Exception e) { // Intentional broad catch — best-effort after-commit Kafka bridge
            log.error("KafkaDomainEventBridge: Unexpected error bridging ApprovalDecisionEvent " +
                    "for instance {}: {}", instanceId, e.getMessage(), e);
        } finally {
            TenantContext.clear();
        }
    }

    // =========================================================================
    // EMPLOYEE LIFECYCLE EVENTS
    // =========================================================================

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onEmployeeCreated(EmployeeCreatedEvent event) {
        publishEmployeeLifecycle(event, "HIRED");
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onEmployeeUpdated(EmployeeUpdatedEvent event) {
        publishEmployeeLifecycle(event, "UPDATED");
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onEmployeePromoted(EmployeePromotedEvent event) {
        publishEmployeeLifecycle(event, "PROMOTED");
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onEmployeeStatusChanged(EmployeeStatusChangedEvent event) {
        // Map the status transition to the closest lifecycle event type that the
        // EmployeeLifecycleConsumer understands.  Termination-family statuses
        // are mapped to "OFFBOARDED"; all others to "STATUS_CHANGED".
        String eventType = isTerminationStatus(event.getNewStatus()) ? "OFFBOARDED" : "STATUS_CHANGED";
        publishEmployeeLifecycle(event, eventType);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onEmployeeTerminated(EmployeeTerminatedEvent event) {
        publishEmployeeLifecycle(event, "OFFBOARDED");
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onEmployeeDepartmentChanged(EmployeeDepartmentChangedEvent event) {
        publishEmployeeLifecycle(event, "TRANSFERRED");
    }

    // =========================================================================
    // PERFORMANCE REVIEW EVENTS
    // =========================================================================

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPerformanceReviewCompleted(PerformanceReviewCompletedEvent event) {
        UUID tenantId = event.getTenantId();
        UUID employeeId = event.getEmployeeId();

        try {
            TenantContext.setCurrentTenant(tenantId);

            Map<String, Object> metadata = new HashMap<>();
            metadata.put("reviewId", event.getReviewId().toString());
            if (event.getReviewCycleId() != null) {
                metadata.put("reviewCycleId", event.getReviewCycleId().toString());
            }
            if (event.getOverallRating() != null) {
                metadata.put("overallRating", event.getOverallRating().toString());
            }
            if (event.getReviewerName() != null) {
                metadata.put("reviewerName", event.getReviewerName());
            }
            if (event.getCompletedAt() != null) {
                metadata.put("completedAt", event.getCompletedAt().toString());
            }

            eventPublisher.publishEmployeeLifecycleEvent(
                    employeeId,
                    "PERFORMANCE_REVIEW_COMPLETED",
                    null,
                    tenantId,
                    null,    // email not available at this level
                    event.getReviewerName(),
                    null,    // departmentId
                    null,    // managerId
                    null,    // jobTitle
                    null,    // employmentType
                    metadata,
                    false
            ).whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("KafkaDomainEventBridge: Failed to publish PERFORMANCE_REVIEW_COMPLETED " +
                            "event for employee {}: {}", employeeId, ex.getMessage(), ex);
                } else {
                    log.info("KafkaDomainEventBridge: Published PERFORMANCE_REVIEW_COMPLETED " +
                            "lifecycle event for employee {}", employeeId);
                }
            });

        } catch (Exception e) {
            log.error("KafkaDomainEventBridge: Error bridging PERFORMANCE_REVIEW_COMPLETED " +
                    "event for employee {}: {}", employeeId, e.getMessage(), e);
        } finally {
            TenantContext.clear();
        }
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    /**
     * Publishes an employee lifecycle event to Kafka.
     *
     * <p>Extracts the fields required by {@link EventPublisher#publishEmployeeLifecycleEvent}
     * from the domain {@link EmployeeEvent}.</p>
     */
    private void publishEmployeeLifecycle(EmployeeEvent event, String lifecycleType) {
        UUID tenantId = event.getTenantId();
        UUID employeeId = event.getAggregateId();

        try {
            TenantContext.setCurrentTenant(tenantId);

            // Build metadata from the domain event payload
            @SuppressWarnings("unchecked")
            Map<String, Object> metadata = (Map<String, Object>) event.getEventPayload();

            UUID departmentId = extractUuid(metadata, "departmentId");
            UUID managerId    = extractUuid(metadata, "managerId");

            eventPublisher.publishEmployeeLifecycleEvent(
                    employeeId,
                    lifecycleType,
                    null,                               // initiatedBy — not available at domain event level
                    tenantId,
                    event.getEmail(),
                    event.getEmployeeName(),
                    departmentId,
                    managerId,
                    (String) metadata.get("designation"),
                    (String) metadata.get("employmentType"),
                    metadata,
                    false
            ).whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("KafkaDomainEventBridge: Failed to publish {} lifecycle event for employee {}: {}",
                            lifecycleType, employeeId, ex.getMessage(), ex);
                } else {
                    log.debug("KafkaDomainEventBridge: Published {} lifecycle event for employee {}",
                            lifecycleType, employeeId);
                }
            });

        } catch (Exception e) { // Intentional broad catch — best-effort after-commit Kafka bridge
            log.error("KafkaDomainEventBridge: Error bridging {} event for employee {}: {}",
                    lifecycleType, employeeId, e.getMessage(), e);
        } finally {
            TenantContext.clear();
        }
    }

    /**
     * Builds the metadata map that {@link com.hrms.infrastructure.kafka.consumer.ApprovalEventConsumer}
     * expects for each approval type.
     *
     * @return enriched metadata map, or {@code null} if the entity cannot be found
     */
    private Map<String, Object> buildMetadata(String module, UUID entityId, UUID tenantId) {
        return switch (module.toUpperCase()) {
            case "LEAVE_REQUEST" -> buildLeaveMetadata(entityId, tenantId);
            case "EXPENSE_CLAIM" -> buildExpenseMetadata(entityId, tenantId);
            case "ASSET_REQUEST" -> buildAssetMetadata(entityId);
            case "WIKI_PAGE"     -> buildWikiMetadata(entityId, tenantId);
            default -> {
                log.warn("KafkaDomainEventBridge: Unknown approval module '{}', publishing with empty metadata", module);
                yield new HashMap<>();
            }
        };
    }

    private Map<String, Object> buildLeaveMetadata(UUID entityId, UUID tenantId) {
        LeaveRequest lr = leaveRequestRepository.findById(entityId).orElse(null);
        if (lr == null) {
            log.warn("KafkaDomainEventBridge: LeaveRequest {} not found for metadata enrichment", entityId);
            return null;
        }
        Map<String, Object> m = new HashMap<>();
        m.put("leaveRequestId", lr.getId().toString());
        m.put("employeeId",     lr.getEmployeeId().toString());
        m.put("leaveTypeId",    lr.getLeaveTypeId().toString());
        m.put("days",           lr.getTotalDays() != null ? lr.getTotalDays().intValue() : 0);
        m.put("leaveType",      lr.getLeaveTypeId().toString()); // consumer uses this as a label fallback
        m.put("startDate",      lr.getStartDate() != null ? lr.getStartDate().toString() : null);
        m.put("endDate",        lr.getEndDate()   != null ? lr.getEndDate().toString()   : null);
        return m;
    }

    private Map<String, Object> buildExpenseMetadata(UUID entityId, UUID tenantId) {
        var claim = expenseClaimRepository.findById(entityId).orElse(null);
        if (claim == null) {
            log.warn("KafkaDomainEventBridge: ExpenseClaim {} not found for metadata enrichment", entityId);
            return null;
        }
        Map<String, Object> m = new HashMap<>();
        m.put("expenseClaimId", claim.getId().toString());
        m.put("employeeId",     claim.getEmployeeId().toString());
        m.put("amount",         claim.getAmount() != null ? claim.getAmount().doubleValue() : 0.0);
        m.put("category",       claim.getCategory() != null ? claim.getCategory().name() : null);
        return m;
    }

    private Map<String, Object> buildAssetMetadata(UUID entityId) {
        // AssetRequest entities carry assetId + employeeId directly as entityId.
        // The AssetManagementService.assignAsset() takes (assetId, employeeId).
        // WorkflowExecution.entityId for asset requests refers to the asset assignment record.
        // We store entityId as assetId here; employeeId needs to come from the assignment.
        // Since we don't have a dedicated AssetAssignment domain entity accessible here,
        // we forward what we have and log a warning so the consumer can handle gracefully.
        log.debug("KafkaDomainEventBridge: Asset metadata enrichment limited — entityId={}", entityId);
        Map<String, Object> m = new HashMap<>();
        m.put("assetId", entityId.toString());
        // employeeId will be missing; ApprovalEventConsumer already guards against this
        return m;
    }

    private Map<String, Object> buildWikiMetadata(UUID entityId, UUID tenantId) {
        var page = wikiPageRepository.findById(entityId).orElse(null);
        if (page == null) {
            log.warn("KafkaDomainEventBridge: WikiPage {} not found for metadata enrichment", entityId);
            return null;
        }
        Map<String, Object> m = new HashMap<>();
        m.put("pageId",    page.getId().toString());
        m.put("pageTitle", page.getTitle());
        return m;
    }

    /**
     * Maps the {@code WorkflowDefinition.EntityType} name to the short approval-type string
     * that {@link com.hrms.infrastructure.kafka.consumer.ApprovalEventConsumer} switches on.
     */
    private String normaliseApprovalType(String module) {
        return switch (module.toUpperCase()) {
            case "LEAVE_REQUEST"    -> "LEAVE";
            case "EXPENSE_CLAIM"    -> "EXPENSE";
            case "ASSET_REQUEST"    -> "ASSET";
            case "WIKI_PAGE"        -> "WIKI_PAGE";
            case "TRAVEL_REQUEST"   -> "TRAVEL";
            case "RECRUITMENT_OFFER"-> "RECRUITMENT";
            default -> module; // pass through unknown types as-is
        };
    }

    private boolean isTerminationStatus(com.hrms.domain.employee.Employee.EmployeeStatus status) {
        if (status == null) return false;
        return switch (status) {
            case RESIGNED, TERMINATED -> true;
            default -> false;
        };
    }

    /**
     * Safely extracts a UUID from a {@code Map<String, Object>}.
     * Returns {@code null} if the key is absent or the value is not a valid UUID string.
     */
    private UUID extractUuid(Map<String, Object> map, String key) {
        Object val = map.get(key);
        if (val == null) return null;
        try {
            return UUID.fromString(val.toString());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
