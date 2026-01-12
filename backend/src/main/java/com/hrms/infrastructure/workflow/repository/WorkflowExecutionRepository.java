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

    Optional<WorkflowExecution> findByReferenceNumber(String referenceNumber);

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

    @Query("SELECT COUNT(e) FROM WorkflowExecution e WHERE e.tenantId = :tenantId AND e.entityType = :entityType AND e.status = :status")
    long countByEntityTypeAndStatus(@Param("tenantId") UUID tenantId, @Param("entityType") WorkflowDefinition.EntityType entityType, @Param("status") WorkflowExecution.ExecutionStatus status);

    @Query("SELECT e.entityType, COUNT(e) FROM WorkflowExecution e WHERE e.tenantId = :tenantId AND e.status IN ('PENDING', 'IN_PROGRESS') GROUP BY e.entityType")
    List<Object[]> getPendingCountByEntityType(@Param("tenantId") UUID tenantId);

    @Query("SELECT e FROM WorkflowExecution e WHERE e.tenantId = :tenantId AND e.submittedAt BETWEEN :startDate AND :endDate")
    List<WorkflowExecution> findByDateRange(@Param("tenantId") UUID tenantId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

    @Query(value = "SELECT AVG(EXTRACT(EPOCH FROM (completed_at - submitted_at))/3600) FROM workflow_executions WHERE tenant_id = :tenantId AND entity_type = :entityType AND status = 'APPROVED' AND completed_at IS NOT NULL", nativeQuery = true)
    Double getAverageApprovalTimeInHours(@Param("tenantId") UUID tenantId, @Param("entityType") String entityType);
}
