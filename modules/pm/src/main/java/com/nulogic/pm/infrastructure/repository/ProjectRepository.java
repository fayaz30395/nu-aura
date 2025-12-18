package com.nulogic.pm.infrastructure.repository;

import com.nulogic.pm.domain.project.Project;
import com.nulogic.pm.domain.project.Project.ProjectStatus;
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
public interface ProjectRepository extends JpaRepository<Project, UUID> {

    Page<Project> findByTenantIdAndIsArchivedFalse(UUID tenantId, Pageable pageable);

    Page<Project> findByTenantIdAndStatusAndIsArchivedFalse(UUID tenantId, ProjectStatus status, Pageable pageable);

    Page<Project> findByTenantIdAndOwnerIdAndIsArchivedFalse(UUID tenantId, UUID ownerId, Pageable pageable);

    Optional<Project> findByTenantIdAndId(UUID tenantId, UUID id);

    Optional<Project> findByTenantIdAndProjectCode(UUID tenantId, String projectCode);

    boolean existsByTenantIdAndProjectCode(UUID tenantId, String projectCode);

    @Query("SELECT p FROM PmProject p WHERE p.tenantId = :tenantId AND p.isArchived = false " +
           "AND (:status IS NULL OR p.status = :status) " +
           "AND (:search IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(p.projectCode) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Project> findByTenantIdWithFilters(
            @Param("tenantId") UUID tenantId,
            @Param("status") ProjectStatus status,
            @Param("search") String search,
            Pageable pageable);

    @Query("SELECT COUNT(p) FROM PmProject p WHERE p.tenantId = :tenantId AND p.status = :status AND p.isArchived = false")
    long countByTenantIdAndStatus(@Param("tenantId") UUID tenantId, @Param("status") ProjectStatus status);

    List<Project> findByTenantIdAndStatusInAndIsArchivedFalse(UUID tenantId, List<ProjectStatus> statuses);

    @Query("SELECT p FROM PmProject p WHERE p.tenantId = :tenantId AND p.targetEndDate < CURRENT_DATE " +
           "AND p.status NOT IN ('COMPLETED', 'CANCELLED', 'ARCHIVED') AND p.isArchived = false")
    List<Project> findOverdueProjects(@Param("tenantId") UUID tenantId);
}
