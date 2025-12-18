package com.hrms.infrastructure.project.repository;

import com.hrms.domain.project.ProjectEmployee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProjectEmployeeRepository extends JpaRepository<ProjectEmployee, UUID> {

    List<ProjectEmployee> findAllByProjectIdAndTenantId(UUID projectId, UUID tenantId);

    List<ProjectEmployee> findAllByEmployeeIdAndTenantId(UUID employeeId, UUID tenantId);

    List<ProjectEmployee> findAllByProjectIdAndTenantIdAndIsActive(UUID projectId, UUID tenantId, Boolean isActive);

    List<ProjectEmployee> findAllByEmployeeIdAndTenantIdAndIsActive(UUID employeeId, UUID tenantId, Boolean isActive);

    Optional<ProjectEmployee> findByProjectIdAndEmployeeIdAndTenantId(UUID projectId, UUID employeeId, UUID tenantId);

    boolean existsByProjectIdAndEmployeeIdAndTenantId(UUID projectId, UUID employeeId, UUID tenantId);

    @Query("SELECT pe FROM HrmsProjectEmployee pe WHERE pe.tenantId = :tenantId AND pe.isActive = true")
    List<ProjectEmployee> findAllActiveAssignments(@Param("tenantId") UUID tenantId);
}
