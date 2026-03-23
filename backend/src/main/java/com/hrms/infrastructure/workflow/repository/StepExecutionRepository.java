package com.hrms.infrastructure.workflow.repository;

import com.hrms.domain.workflow.StepExecution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StepExecutionRepository extends JpaRepository<StepExecution, UUID> {

    Optional<StepExecution> findByIdAndTenantId(UUID id, UUID tenantId);

    /**
     * @deprecated SEC-003: No tenantId filter. Use tenant-safe alternatives.
     * Steps are scoped via workflowExecutionId which itself is tenant-scoped,
     * but direct tenant filtering is safer for defense-in-depth.
     */
    @Deprecated
    List<StepExecution> findByWorkflowExecutionIdOrderByStepOrderAsc(UUID workflowExecutionId);

    /**
     * @deprecated SEC-003: No tenantId filter. Use {@link #findPendingStepsWithExecution(UUID)} instead.
     */
    @Deprecated
    @Query("SELECT s FROM StepExecution s WHERE s.workflowExecution.id = :executionId AND s.status = 'PENDING'")
    List<StepExecution> findPendingSteps(@Param("executionId") UUID executionId);

    @Query("SELECT s FROM StepExecution s WHERE s.tenantId = :tenantId AND s.assignedToUserId = :userId AND s.status = 'PENDING'")
    List<StepExecution> findPendingForUser(@Param("tenantId") UUID tenantId, @Param("userId") UUID userId);

    @Query("SELECT s FROM StepExecution s WHERE s.tenantId = :tenantId AND s.assignedToUserId = :userId AND s.status = 'PENDING' ORDER BY s.assignedAt ASC")
    List<StepExecution> findPendingForUserSortedByDate(@Param("tenantId") UUID tenantId, @Param("userId") UUID userId);

    @Query("SELECT s FROM StepExecution s WHERE s.tenantId = :tenantId AND s.status = 'PENDING' AND s.deadline < :now")
    List<StepExecution> findOverdueSteps(@Param("tenantId") UUID tenantId, @Param("now") LocalDateTime now);

    /**
     * @deprecated SEC-003: No tenantId filter. Steps should be queried with tenant context.
     */
    @Deprecated
    @Query("SELECT s FROM StepExecution s WHERE s.workflowExecution.id = :executionId AND s.stepOrder = :stepOrder")
    Optional<StepExecution> findByExecutionAndStepOrder(@Param("executionId") UUID executionId, @Param("stepOrder") int stepOrder);

    @Query("SELECT s FROM StepExecution s WHERE s.tenantId = :tenantId AND s.actionByUserId = :userId ORDER BY s.executedAt DESC")
    List<StepExecution> findActionsBy(@Param("tenantId") UUID tenantId, @Param("userId") UUID userId);

    @Query("SELECT COUNT(s) FROM StepExecution s WHERE s.tenantId = :tenantId AND s.assignedToUserId = :userId AND s.status = 'PENDING'")
    long countPendingForUser(@Param("tenantId") UUID tenantId, @Param("userId") UUID userId);

    /**
     * @deprecated SEC-003: No tenantId filter. The executionId is itself tenant-scoped,
     * but defense-in-depth recommends explicit tenant filtering.
     */
    @Deprecated
    @Query("SELECT COUNT(s) FROM StepExecution s WHERE s.workflowExecution.id = :executionId AND s.status = 'APPROVED'")
    long countApprovedSteps(@Param("executionId") UUID executionId);

    @Query("SELECT s FROM StepExecution s WHERE s.tenantId = :tenantId AND s.escalated = true AND s.status = 'PENDING'")
    List<StepExecution> findEscalatedPendingSteps(@Param("tenantId") UUID tenantId);

    long countByTenantIdAndStatus(UUID tenantId, StepExecution.StepStatus status);

    @Query("SELECT AVG(s.timeTakenHours) FROM StepExecution s WHERE s.tenantId = :tenantId AND s.status = 'APPROVED' AND s.timeTakenHours IS NOT NULL")
    Double getAverageApprovalTime(@Param("tenantId") UUID tenantId);

    @Query("SELECT s.actionByUserId, COUNT(s) FROM StepExecution s WHERE s.tenantId = :tenantId AND s.status = 'APPROVED' AND s.executedAt BETWEEN :startDate AND :endDate GROUP BY s.actionByUserId ORDER BY COUNT(s) DESC")
    List<Object[]> getTopApprovers(@Param("tenantId") UUID tenantId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

    // ==================== EXPLICIT FETCH QUERIES (REQUIRED FOR LAZY ASSOCIATIONS) ====================

    /**
     * Find step execution by ID with WorkflowExecution and ApprovalStep eagerly fetched.
     * Both associations are @ManyToOne(fetch = FetchType.LAZY), causing N+1 queries or LazyInitializationException
     * when accessed in detail views or approvals processing.
     */
    @Query("SELECT DISTINCT s FROM StepExecution s " +
           "LEFT JOIN FETCH s.workflowExecution " +
           "LEFT JOIN FETCH s.approvalStep " +
           "WHERE s.id = :stepId AND s.tenantId = :tenantId")
    Optional<StepExecution> findByIdWithAssociations(@Param("stepId") UUID stepId, @Param("tenantId") UUID tenantId);

    /**
     * Find step execution by ID with WorkflowExecution eagerly fetched.
     * Use when you need approval context but not the step definition details.
     */
    @Query("SELECT DISTINCT s FROM StepExecution s " +
           "LEFT JOIN FETCH s.workflowExecution " +
           "WHERE s.id = :stepId AND s.tenantId = :tenantId")
    Optional<StepExecution> findByIdWithExecution(@Param("stepId") UUID stepId, @Param("tenantId") UUID tenantId);

    /**
     * Find pending steps for execution with WorkflowExecution eagerly fetched.
     * Prevents N+1 queries when processing pending approvals.
     */
    @Query("SELECT DISTINCT s FROM StepExecution s " +
           "LEFT JOIN FETCH s.workflowExecution " +
           "WHERE s.workflowExecution.id = :executionId AND s.status = 'PENDING'")
    List<StepExecution> findPendingStepsWithExecution(@Param("executionId") UUID executionId);

    /**
     * Find pending steps for a user with WorkflowExecution eagerly fetched.
     * Used in approval inbox to prevent N+1 queries over potentially hundreds of pending approvals.
     */
    @Query("SELECT DISTINCT s FROM StepExecution s " +
           "LEFT JOIN FETCH s.workflowExecution " +
           "WHERE s.tenantId = :tenantId AND s.assignedToUserId = :userId AND s.status = 'PENDING'")
    List<StepExecution> findPendingForUserWithExecution(@Param("tenantId") UUID tenantId, @Param("userId") UUID userId);

    /**
     * Find pending steps for a user (sorted) with WorkflowExecution eagerly fetched.
     * Optimized for approval inbox listing with sort order.
     */
    @Query("SELECT DISTINCT s FROM StepExecution s " +
           "LEFT JOIN FETCH s.workflowExecution " +
           "WHERE s.tenantId = :tenantId AND s.assignedToUserId = :userId AND s.status = 'PENDING' " +
           "ORDER BY s.assignedAt ASC")
    List<StepExecution> findPendingForUserSortedByDateWithExecution(@Param("tenantId") UUID tenantId, @Param("userId") UUID userId);

    /**
     * Find overdue steps with WorkflowExecution eagerly fetched.
     * Used for escalation and SLA tracking.
     */
    @Query("SELECT DISTINCT s FROM StepExecution s " +
           "LEFT JOIN FETCH s.workflowExecution " +
           "WHERE s.tenantId = :tenantId AND s.status = 'PENDING' AND s.deadline < :now")
    List<StepExecution> findOverdueStepsWithExecution(@Param("tenantId") UUID tenantId, @Param("now") LocalDateTime now);

    /**
     * Find escalated pending steps with WorkflowExecution eagerly fetched.
     * Used for escalation processing.
     */
    @Query("SELECT DISTINCT s FROM StepExecution s " +
           "LEFT JOIN FETCH s.workflowExecution " +
           "WHERE s.tenantId = :tenantId AND s.escalated = true AND s.status = 'PENDING'")
    List<StepExecution> findEscalatedPendingStepsWithExecution(@Param("tenantId") UUID tenantId);

    // ==================== Approval Inbox Queries ====================

    /**
     * Paginated inbox query with server-side filters.
     * Returns step executions assigned to the user, joined with their workflow execution.
     *
     * BUG-017 FIX: Use JOIN (not JOIN FETCH) for pagination compatibility.
     * JOIN FETCH causes "cannot use FETCH with pagination" in Hibernate.
     * Plain JOIN works with pagination and is correct since workflowExecution is non-nullable.
     */
    @Query(value = "SELECT s.* FROM step_executions s " +
           "JOIN workflow_executions e ON e.id = s.workflow_execution_id " +
           "WHERE s.tenant_id = :tenantId " +
           "AND s.assigned_to_user_id = :userId " +
           "AND (CAST(:status AS VARCHAR) IS NULL OR s.status = :status) " +
           "AND (CAST(:entityType AS VARCHAR) IS NULL OR e.entity_type = :entityType) " +
           "AND (CAST(:fromDate AS TIMESTAMP) IS NULL OR e.submitted_at >= :fromDate) " +
           "AND (CAST(:toDate AS TIMESTAMP) IS NULL OR e.submitted_at <= :toDate) " +
           "AND (CAST(:search AS VARCHAR) IS NULL OR :search = '' " +
           "     OR LOWER(e.title) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(e.requester_name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(e.reference_number) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY s.assigned_at DESC",
           countQuery = "SELECT COUNT(s.id) FROM step_executions s " +
           "JOIN workflow_executions e ON e.id = s.workflow_execution_id " +
           "WHERE s.tenant_id = :tenantId " +
           "AND s.assigned_to_user_id = :userId " +
           "AND (CAST(:status AS VARCHAR) IS NULL OR s.status = :status) " +
           "AND (CAST(:entityType AS VARCHAR) IS NULL OR e.entity_type = :entityType) " +
           "AND (CAST(:fromDate AS TIMESTAMP) IS NULL OR e.submitted_at >= :fromDate) " +
           "AND (CAST(:toDate AS TIMESTAMP) IS NULL OR e.submitted_at <= :toDate) " +
           "AND (CAST(:search AS VARCHAR) IS NULL OR :search = '' " +
           "     OR LOWER(e.title) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(e.requester_name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(e.reference_number) LIKE LOWER(CONCAT('%', :search, '%')))",
           nativeQuery = true)
    Page<StepExecution> findInboxForUser(
            @Param("tenantId") UUID tenantId,
            @Param("userId") UUID userId,
            @Param("status") String status,
            @Param("entityType") String entityType,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate,
            @Param("search") String search,
            Pageable pageable);

    /**
     * Count steps acted upon (approved/rejected) by the user today.
     */
    @Query("SELECT s.action, COUNT(s) FROM StepExecution s " +
           "WHERE s.tenantId = :tenantId " +
           "AND s.actionByUserId = :userId " +
           "AND s.executedAt >= :startOfDay " +
           "AND s.action IN :actions " +
           "GROUP BY s.action")
    List<Object[]> countTodayActionsByUser(@Param("tenantId") UUID tenantId, @Param("userId") UUID userId, @Param("startOfDay") LocalDateTime startOfDay, @Param("actions") java.util.Collection<StepExecution.ApprovalAction> actions);

    /**
     * Find stale PENDING steps that are eligible for escalation.
     * A step is stale if it has been assigned for longer than 48 hours (the default timeout)
     * and hasn't already reached the max escalation limit.
     *
     * <p>The actual timeout for each workflow is determined in the service layer by checking
     * the ApprovalEscalationConfig.timeoutHours setting.</p>
     *
     * @param tenantId The tenant ID
     * @return List of stale step executions
     */
    @Query(value = "SELECT s.* FROM step_executions s " +
           "LEFT JOIN workflow_executions we ON s.workflow_execution_id = we.id " +
           "WHERE s.tenant_id = :tenantId " +
           "AND s.status = 'PENDING' " +
           "AND s.assigned_at < (CURRENT_TIMESTAMP - INTERVAL '48 hours')", nativeQuery = true)
    List<StepExecution> findStaleStepsForEscalation(@Param("tenantId") UUID tenantId);
}
