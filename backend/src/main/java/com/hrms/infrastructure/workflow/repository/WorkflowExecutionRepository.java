package com.hrms.infrastructure.workflow.repository;

import com.hrms.domain.workflow.WorkflowDefinition;
import com.hrms.domain.workflow.WorkflowExecution;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkflowExecutionRepository extends JpaRepository<WorkflowExecution, UUID> {

    Optional<WorkflowExecution> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<WorkflowExecution> findByReferenceNumberAndTenantId(String referenceNumber, UUID tenantId);

    Page<WorkflowExecution> findByTenantId(UUID tenantId, Pageable pageable);

    List<WorkflowExecution> findByTenantIdAndRequesterId(UUID tenantId, UUID requesterId);

    List<WorkflowExecution> findByTenantIdAndStatus(UUID tenantId, WorkflowExecution.ExecutionStatus status);

    @Query("SELECT e FROM WorkflowExecution e WHERE e.tenantId = :tenantId AND e.entityType = :entityType AND e.entityId = :entityId")
    Optional<WorkflowExecution> findByEntity(@Param("tenantId") UUID tenantId, @Param("entityType") WorkflowDefinition.EntityType entityType, @Param("entityId") UUID entityId);

    @Query("SELECT e FROM WorkflowExecution e WHERE e.tenantId = :tenantId AND e.status IN ('PENDING', 'IN_PROGRESS')")
    List<WorkflowExecution> findActiveExecutions(@Param("tenantId") UUID tenantId);

    @Query("SELECT e FROM WorkflowExecution e WHERE e.tenantId = :tenantId AND e.status IN ('PENDING', 'IN_PROGRESS') AND e.deadline < :now")
    List<WorkflowExecution> findOverdueExecutions(@Param("tenantId") UUID tenantId, @Param("now") LocalDateTime now);

    @Query("SELECT e FROM WorkflowExecution e WHERE e.tenantId = :tenantId AND e.status = 'PENDING' AND e.escalationDueAt < :now")
    List<WorkflowExecution> findDueForEscalation(@Param("tenantId") UUID tenantId, @Param("now") LocalDateTime now);

    @Query("SELECT e FROM WorkflowExecution e WHERE e.tenantId = :tenantId AND e.departmentId = :departmentId AND e.status IN ('PENDING', 'IN_PROGRESS')")
    List<WorkflowExecution> findPendingByDepartment(@Param("tenantId") UUID tenantId, @Param("departmentId") UUID departmentId);

    @Query("SELECT e FROM WorkflowExecution e WHERE e.tenantId = :tenantId AND e.priority = :priority AND e.status IN ('PENDING', 'IN_PROGRESS')")
    List<WorkflowExecution> findByPriority(@Param("tenantId") UUID tenantId, @Param("priority") WorkflowExecution.Priority priority);

    @Query("SELECT COUNT(e) FROM WorkflowExecution e WHERE e.tenantId = :tenantId AND e.status = :status")
    long countByStatus(@Param("tenantId") UUID tenantId, @Param("status") WorkflowExecution.ExecutionStatus status);

    /**
     * Count executions for a specific workflow definition filtered by status.
     * Used by workflow versioning to check only executions tied to the definition being edited (DEF-45).
     */
    @Query("SELECT COUNT(e) FROM WorkflowExecution e WHERE e.workflowDefinition.id = :defId AND e.tenantId = :tenantId AND e.status IN :statuses")
    long countByWorkflowDefinitionIdAndStatusIn(@Param("defId") UUID defId, @Param("tenantId") UUID tenantId, @Param("statuses") List<WorkflowExecution.ExecutionStatus> statuses);

    /**
     * Count all pending/in-progress approvals across ALL tenants.
     * Used by SuperAdmin system overview. Single query replaces N+2 queries per tenant (N+1 fix).
     */
    @Query("SELECT COUNT(e) FROM WorkflowExecution e WHERE e.status IN ('PENDING', 'IN_PROGRESS')")
    long countAllPendingCrossTenant();

    @Query("SELECT COUNT(e) FROM WorkflowExecution e WHERE e.tenantId = :tenantId AND e.entityType = :entityType AND e.status = :status")
    long countByEntityTypeAndStatus(@Param("tenantId") UUID tenantId, @Param("entityType") WorkflowDefinition.EntityType entityType, @Param("status") WorkflowExecution.ExecutionStatus status);

    @Query("SELECT e.entityType, COUNT(e) FROM WorkflowExecution e WHERE e.tenantId = :tenantId AND e.status IN ('PENDING', 'IN_PROGRESS') GROUP BY e.entityType")
    List<Object[]> getPendingCountByEntityType(@Param("tenantId") UUID tenantId);

    @Query("SELECT e FROM WorkflowExecution e WHERE e.tenantId = :tenantId AND e.submittedAt BETWEEN :startDate AND :endDate")
    List<WorkflowExecution> findByDateRange(@Param("tenantId") UUID tenantId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

    @Query(value = "SELECT AVG(EXTRACT(EPOCH FROM (completed_at - submitted_at))/3600) FROM workflow_executions WHERE tenant_id = :tenantId AND entity_type = :entityType AND status = 'APPROVED' AND completed_at IS NOT NULL", nativeQuery = true)
    Double getAverageApprovalTimeInHours(@Param("tenantId") UUID tenantId, @Param("entityType") String entityType);

    // ==================== EXPLICIT FETCH QUERIES (REQUIRED FOR LAZY ASSOCIATIONS) ====================

    /**
     * Find workflow execution by ID with WorkflowDefinition eagerly fetched.
     * WorkflowExecution.workflowDefinition is @ManyToOne(fetch = FetchType.LAZY), so direct access
     * will cause LazyInitializationException or N+1 queries when accessed in list views.
     * Use this when loading workflow execution details.
     */
    @Query("SELECT DISTINCT e FROM WorkflowExecution e " +
           "LEFT JOIN FETCH e.workflowDefinition " +
           "WHERE e.id = :executionId AND e.tenantId = :tenantId")
    Optional<WorkflowExecution> findByIdWithDefinition(@Param("executionId") UUID executionId, @Param("tenantId") UUID tenantId);

    /**
     * Find workflow execution by ID with WorkflowDefinition and StepExecutions eagerly fetched.
     * Use when loading a workflow for approval processing with full step details.
     */
    @Query("SELECT DISTINCT e FROM WorkflowExecution e " +
           "LEFT JOIN FETCH e.workflowDefinition " +
           "LEFT JOIN FETCH e.stepExecutions " +
           "WHERE e.id = :executionId AND e.tenantId = :tenantId " +
           "ORDER BY e.id, e.stepExecutions ASC")
    Optional<WorkflowExecution> findByIdWithDefinitionAndSteps(@Param("executionId") UUID executionId, @Param("tenantId") UUID tenantId);

    /**
     * Find active workflow executions with WorkflowDefinition eagerly fetched.
     * Prevents N+1 queries when iterating over active approvals.
     */
    @Query("SELECT DISTINCT e FROM WorkflowExecution e " +
           "LEFT JOIN FETCH e.workflowDefinition " +
           "WHERE e.tenantId = :tenantId AND e.status IN ('PENDING', 'IN_PROGRESS')")
    List<WorkflowExecution> findActiveExecutionsWithDefinition(@Param("tenantId") UUID tenantId);

    /**
     * Find overdue workflow executions with WorkflowDefinition eagerly fetched.
     * Used for escalation processing.
     */
    @Query("SELECT DISTINCT e FROM WorkflowExecution e " +
           "LEFT JOIN FETCH e.workflowDefinition " +
           "WHERE e.tenantId = :tenantId AND e.status IN ('PENDING', 'IN_PROGRESS') AND e.deadline < :now")
    List<WorkflowExecution> findOverdueExecutionsWithDefinition(@Param("tenantId") UUID tenantId, @Param("now") LocalDateTime now);

    /**
     * Find workflow executions due for escalation with WorkflowDefinition eagerly fetched.
     */
    @Query("SELECT DISTINCT e FROM WorkflowExecution e " +
           "LEFT JOIN FETCH e.workflowDefinition " +
           "WHERE e.tenantId = :tenantId AND e.status = 'PENDING' AND e.escalationDueAt < :now")
    List<WorkflowExecution> findDueForEscalationWithDefinition(@Param("tenantId") UUID tenantId, @Param("now") LocalDateTime now);
}
