package com.nulogic.pm.infrastructure.repository;

import com.nulogic.pm.domain.project.ProjectTask;
import com.nulogic.pm.domain.project.ProjectTask.TaskStatus;
import com.nulogic.pm.domain.project.ProjectTask.TaskPriority;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProjectTaskRepository extends JpaRepository<ProjectTask, UUID> {

    Page<ProjectTask> findByTenantIdAndProjectId(UUID tenantId, UUID projectId, Pageable pageable);

    Page<ProjectTask> findByTenantIdAndProjectIdAndStatus(UUID tenantId, UUID projectId, TaskStatus status, Pageable pageable);

    Page<ProjectTask> findByTenantIdAndAssigneeId(UUID tenantId, UUID assigneeId, Pageable pageable);

    Optional<ProjectTask> findByTenantIdAndId(UUID tenantId, UUID id);

    Optional<ProjectTask> findByTenantIdAndTaskCode(UUID tenantId, String taskCode);

    boolean existsByTenantIdAndTaskCode(UUID tenantId, String taskCode);

    List<ProjectTask> findByTenantIdAndProjectIdAndParentTaskIdIsNull(UUID tenantId, UUID projectId);

    List<ProjectTask> findByTenantIdAndParentTaskId(UUID tenantId, UUID parentTaskId);

    List<ProjectTask> findByTenantIdAndMilestoneId(UUID tenantId, UUID milestoneId);

    @Query("SELECT t FROM PmTask t WHERE t.tenantId = :tenantId AND t.projectId = :projectId " +
           "AND (:status IS NULL OR t.status = :status) " +
           "AND (:priority IS NULL OR t.priority = :priority) " +
           "AND (:assigneeId IS NULL OR t.assigneeId = :assigneeId) " +
           "AND (:search IS NULL OR LOWER(t.title) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(t.taskCode) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<ProjectTask> findByProjectWithFilters(
            @Param("tenantId") UUID tenantId,
            @Param("projectId") UUID projectId,
            @Param("status") TaskStatus status,
            @Param("priority") TaskPriority priority,
            @Param("assigneeId") UUID assigneeId,
            @Param("search") String search,
            Pageable pageable);

    @Query("SELECT COUNT(t) FROM PmTask t WHERE t.tenantId = :tenantId AND t.projectId = :projectId AND t.status = :status")
    long countByProjectAndStatus(@Param("tenantId") UUID tenantId, @Param("projectId") UUID projectId, @Param("status") TaskStatus status);

    @Query("SELECT COUNT(t) FROM PmTask t WHERE t.tenantId = :tenantId AND t.projectId = :projectId")
    long countByProject(@Param("tenantId") UUID tenantId, @Param("projectId") UUID projectId);

    @Query("SELECT t FROM PmTask t WHERE t.tenantId = :tenantId AND t.dueDate < CURRENT_DATE " +
           "AND t.status NOT IN ('DONE', 'CANCELLED')")
    List<ProjectTask> findOverdueTasks(@Param("tenantId") UUID tenantId);

    @Query("SELECT t FROM PmTask t WHERE t.tenantId = :tenantId AND t.projectId = :projectId " +
           "AND t.dueDate < CURRENT_DATE AND t.status NOT IN ('DONE', 'CANCELLED')")
    List<ProjectTask> findOverdueTasksByProject(@Param("tenantId") UUID tenantId, @Param("projectId") UUID projectId);

    @Query("SELECT MAX(CAST(SUBSTRING(t.taskCode, LENGTH(:prefix) + 1) AS integer)) FROM PmTask t " +
           "WHERE t.tenantId = :tenantId AND t.taskCode LIKE CONCAT(:prefix, '%')")
    Integer findMaxTaskNumber(@Param("tenantId") UUID tenantId, @Param("prefix") String prefix);
}
