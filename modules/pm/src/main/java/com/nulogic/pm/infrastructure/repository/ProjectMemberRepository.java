package com.nulogic.pm.infrastructure.repository;

import com.nulogic.pm.domain.project.ProjectMember;
import com.nulogic.pm.domain.project.ProjectMember.ProjectRole;
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
public interface ProjectMemberRepository extends JpaRepository<ProjectMember, UUID> {

    List<ProjectMember> findByTenantIdAndProjectIdAndIsActiveTrue(UUID tenantId, UUID projectId);

    Page<ProjectMember> findByTenantIdAndProjectId(UUID tenantId, UUID projectId, Pageable pageable);

    Optional<ProjectMember> findByTenantIdAndId(UUID tenantId, UUID id);

    Optional<ProjectMember> findByTenantIdAndProjectIdAndUserId(UUID tenantId, UUID projectId, UUID userId);

    boolean existsByTenantIdAndProjectIdAndUserId(UUID tenantId, UUID projectId, UUID userId);

    List<ProjectMember> findByTenantIdAndUserIdAndIsActiveTrue(UUID tenantId, UUID userId);

    List<ProjectMember> findByTenantIdAndProjectIdAndRole(UUID tenantId, UUID projectId, ProjectRole role);

    @Query("SELECT m FROM PmProjectMember m WHERE m.tenantId = :tenantId AND m.projectId = :projectId " +
           "AND m.isActive = true " +
           "AND (:role IS NULL OR m.role = :role) " +
           "AND (:search IS NULL OR LOWER(m.userName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(m.email) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<ProjectMember> findByProjectWithFilters(
            @Param("tenantId") UUID tenantId,
            @Param("projectId") UUID projectId,
            @Param("role") ProjectRole role,
            @Param("search") String search,
            Pageable pageable);

    @Query("SELECT COUNT(m) FROM PmProjectMember m WHERE m.tenantId = :tenantId AND m.projectId = :projectId AND m.isActive = true")
    long countActiveMembers(@Param("tenantId") UUID tenantId, @Param("projectId") UUID projectId);

    @Query("SELECT DISTINCT m.projectId FROM PmProjectMember m WHERE m.tenantId = :tenantId AND m.userId = :userId AND m.isActive = true")
    List<UUID> findProjectIdsByUser(@Param("tenantId") UUID tenantId, @Param("userId") UUID userId);
}
