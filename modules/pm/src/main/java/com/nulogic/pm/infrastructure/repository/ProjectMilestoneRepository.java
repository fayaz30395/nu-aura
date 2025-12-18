package com.nulogic.pm.infrastructure.repository;

import com.nulogic.pm.domain.project.ProjectMilestone;
import com.nulogic.pm.domain.project.ProjectMilestone.MilestoneStatus;
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
public interface ProjectMilestoneRepository extends JpaRepository<ProjectMilestone, UUID> {

    List<ProjectMilestone> findByTenantIdAndProjectIdOrderBySortOrderAsc(UUID tenantId, UUID projectId);

    Page<ProjectMilestone> findByTenantIdAndProjectId(UUID tenantId, UUID projectId, Pageable pageable);

    Optional<ProjectMilestone> findByTenantIdAndId(UUID tenantId, UUID id);

    List<ProjectMilestone> findByTenantIdAndProjectIdAndStatus(UUID tenantId, UUID projectId, MilestoneStatus status);

    @Query("SELECT COUNT(m) FROM PmProjectMilestone m WHERE m.tenantId = :tenantId AND m.projectId = :projectId AND m.status = :status")
    long countByProjectAndStatus(@Param("tenantId") UUID tenantId, @Param("projectId") UUID projectId, @Param("status") MilestoneStatus status);

    @Query("SELECT m FROM PmProjectMilestone m WHERE m.tenantId = :tenantId AND m.dueDate < CURRENT_DATE " +
           "AND m.status NOT IN ('COMPLETED', 'CANCELLED')")
    List<ProjectMilestone> findOverdueMilestones(@Param("tenantId") UUID tenantId);

    @Query("SELECT m FROM PmProjectMilestone m WHERE m.tenantId = :tenantId AND m.projectId = :projectId " +
           "AND m.dueDate < CURRENT_DATE AND m.status NOT IN ('COMPLETED', 'CANCELLED')")
    List<ProjectMilestone> findOverdueMilestonesByProject(@Param("tenantId") UUID tenantId, @Param("projectId") UUID projectId);

    @Query("SELECT MAX(m.sortOrder) FROM PmProjectMilestone m WHERE m.tenantId = :tenantId AND m.projectId = :projectId")
    Integer findMaxSortOrder(@Param("tenantId") UUID tenantId, @Param("projectId") UUID projectId);
}
