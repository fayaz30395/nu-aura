package com.hrms.infrastructure.project.repository;

import com.hrms.domain.project.Project;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface HrmsProjectRepository extends JpaRepository<Project, UUID> {

    Optional<Project> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<Project> findByProjectCodeAndTenantId(String projectCode, UUID tenantId);

    boolean existsByProjectCodeAndTenantId(String projectCode, UUID tenantId);

    Page<Project> findAllByTenantId(UUID tenantId, Pageable pageable);

    Page<Project> findAllByTenantIdAndStatus(UUID tenantId, Project.ProjectStatus status, Pageable pageable);

    Page<Project> findAllByTenantIdAndPriority(UUID tenantId, Project.Priority priority, Pageable pageable);

    Page<Project> findAllByTenantIdAndStatusAndPriority(UUID tenantId, Project.ProjectStatus status,
            Project.Priority priority, Pageable pageable);

    Page<Project> findAllByTenantIdAndProjectManagerId(UUID tenantId, UUID projectManagerId, Pageable pageable);

    @Query("SELECT p FROM HrmsProject p WHERE p.tenantId = :tenantId AND " +
            "(LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(p.projectCode) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(p.clientName) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Project> searchProjects(@Param("tenantId") UUID tenantId, @Param("search") String search, Pageable pageable);
}
