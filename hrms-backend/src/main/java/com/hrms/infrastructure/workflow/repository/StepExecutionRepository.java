package com.hrms.infrastructure.workflow.repository;

import com.hrms.domain.workflow.StepExecution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StepExecutionRepository extends JpaRepository<StepExecution, UUID> {

    Optional<StepExecution> findByIdAndTenantId(UUID id, UUID tenantId);

    List<StepExecution> findByWorkflowExecutionIdOrderByStepOrderAsc(UUID workflowExecutionId);

    @Query("SELECT s FROM StepExecution s WHERE s.workflowExecution.id = :executionId AND s.status = 'PENDING'")
    List<StepExecution> findPendingSteps(@Param("executionId") UUID executionId);

    @Query("SELECT s FROM StepExecution s WHERE s.tenantId = :tenantId AND s.assignedToUserId = :userId AND s.status = 'PENDING'")
    List<StepExecution> findPendingForUser(@Param("tenantId") UUID tenantId, @Param("userId") UUID userId);

    @Query("SELECT s FROM StepExecution s WHERE s.tenantId = :tenantId AND s.assignedToUserId = :userId AND s.status = 'PENDING' ORDER BY s.assignedAt ASC")
    List<StepExecution> findPendingForUserSortedByDate(@Param("tenantId") UUID tenantId, @Param("userId") UUID userId);

    @Query("SELECT s FROM StepExecution s WHERE s.tenantId = :tenantId AND s.status = 'PENDING' AND s.deadline < :now")
    List<StepExecution> findOverdueSteps(@Param("tenantId") UUID tenantId, @Param("now") LocalDateTime now);

    @Query("SELECT s FROM StepExecution s WHERE s.workflowExecution.id = :executionId AND s.stepOrder = :stepOrder")
    Optional<StepExecution> findByExecutionAndStepOrder(@Param("executionId") UUID executionId, @Param("stepOrder") int stepOrder);

    @Query("SELECT s FROM StepExecution s WHERE s.tenantId = :tenantId AND s.actionByUserId = :userId ORDER BY s.executedAt DESC")
    List<StepExecution> findActionsBy(@Param("tenantId") UUID tenantId, @Param("userId") UUID userId);

    @Query("SELECT COUNT(s) FROM StepExecution s WHERE s.tenantId = :tenantId AND s.assignedToUserId = :userId AND s.status = 'PENDING'")
    long countPendingForUser(@Param("tenantId") UUID tenantId, @Param("userId") UUID userId);

    @Query("SELECT COUNT(s) FROM StepExecution s WHERE s.workflowExecution.id = :executionId AND s.status = 'APPROVED'")
    long countApprovedSteps(@Param("executionId") UUID executionId);

    @Query("SELECT s FROM StepExecution s WHERE s.tenantId = :tenantId AND s.escalated = true AND s.status = 'PENDING'")
    List<StepExecution> findEscalatedPendingSteps(@Param("tenantId") UUID tenantId);

    @Query("SELECT AVG(s.timeTakenHours) FROM StepExecution s WHERE s.tenantId = :tenantId AND s.status = 'APPROVED' AND s.timeTakenHours IS NOT NULL")
    Double getAverageApprovalTime(@Param("tenantId") UUID tenantId);

    @Query("SELECT s.actionByUserId, COUNT(s) FROM StepExecution s WHERE s.tenantId = :tenantId AND s.status = 'APPROVED' AND s.executedAt BETWEEN :startDate AND :endDate GROUP BY s.actionByUserId ORDER BY COUNT(s) DESC")
    List<Object[]> getTopApprovers(@Param("tenantId") UUID tenantId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
}
