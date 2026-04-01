package com.hrms.infrastructure.onboarding.repository;

import com.hrms.domain.onboarding.OnboardingTask;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OnboardingTaskRepository extends JpaRepository<OnboardingTask, UUID> {

    List<OnboardingTask> findByProcessIdAndTenantId(UUID processId, UUID tenantId);

    List<OnboardingTask> findByEmployeeIdAndTenantId(UUID employeeId, UUID tenantId);

    Optional<OnboardingTask> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<OnboardingTask> findByTenantId(UUID tenantId, Pageable pageable);

    List<OnboardingTask> findByTenantIdAndStatus(UUID tenantId, OnboardingTask.TaskStatus status);

    @Query("SELECT t FROM OnboardingTask t WHERE t.tenantId = :tenantId AND t.assignedTo = :assignedTo AND t.status != 'COMPLETED'")
    List<OnboardingTask> findPendingByAssignee(@Param("tenantId") UUID tenantId, @Param("assignedTo") UUID assignedTo);

    @Query("SELECT t FROM OnboardingTask t WHERE t.tenantId = :tenantId AND t.dueDate < :date AND t.status IN ('PENDING', 'IN_PROGRESS')")
    List<OnboardingTask> findOverdue(@Param("tenantId") UUID tenantId, @Param("date") LocalDate date);

    @Query("SELECT COUNT(t) FROM OnboardingTask t WHERE t.processId = :processId AND t.status = 'COMPLETED'")
    long countCompletedByProcess(@Param("processId") UUID processId);

    @Query("SELECT COUNT(t) FROM OnboardingTask t WHERE t.processId = :processId")
    long countByProcess(@Param("processId") UUID processId);
}
