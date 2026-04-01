package com.hrms.infrastructure.project.repository;

import com.hrms.domain.project.ProjectMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface HrmsProjectMemberRepository extends JpaRepository<ProjectMember, UUID>, JpaSpecificationExecutor<ProjectMember> {

    Optional<ProjectMember> findByIdAndTenantId(UUID id, UUID tenantId);

    List<ProjectMember> findByTenantIdAndProjectId(UUID tenantId, UUID projectId);

    List<ProjectMember> findByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId);

    List<ProjectMember> findByTenantIdAndProjectIdAndIsActive(UUID tenantId, UUID projectId, Boolean isActive);

    List<ProjectMember> findByTenantIdAndEmployeeIdAndIsActive(UUID tenantId, UUID employeeId, Boolean isActive);

    Optional<ProjectMember> findByTenantIdAndProjectIdAndEmployeeId(UUID tenantId, UUID projectId, UUID employeeId);

    List<ProjectMember> findByTenantIdAndCanApproveTime(UUID tenantId, Boolean canApproveTime);

    List<ProjectMember> findByTenantIdAndEmployeeIdInAndIsActive(UUID tenantId, List<UUID> employeeIds, Boolean isActive);
}
