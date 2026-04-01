package com.hrms.infrastructure.performance.repository;

import com.hrms.domain.performance.PerformanceImprovementPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PIPRepository extends JpaRepository<PerformanceImprovementPlan, UUID> {

    Optional<PerformanceImprovementPlan> findByIdAndTenantId(UUID id, UUID tenantId);

    List<PerformanceImprovementPlan> findByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId);

    List<PerformanceImprovementPlan> findByTenantIdAndManagerId(UUID tenantId, UUID managerId);

    List<PerformanceImprovementPlan> findByTenantId(UUID tenantId);
}
