package com.hrms.infrastructure.organization.repository;

import com.hrms.domain.organization.SuccessionPlan;
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
public interface SuccessionPlanRepository extends JpaRepository<SuccessionPlan, UUID> {

    Optional<SuccessionPlan> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<SuccessionPlan> findByPositionIdAndTenantIdAndStatus(UUID positionId, UUID tenantId, SuccessionPlan.PlanStatus status);

    Page<SuccessionPlan> findByTenantId(UUID tenantId, Pageable pageable);

    @Query("SELECT s FROM SuccessionPlan s WHERE s.tenantId = :tenantId AND s.status = 'ACTIVE'")
    List<SuccessionPlan> findActivePlans(@Param("tenantId") UUID tenantId);

    @Query("SELECT s FROM SuccessionPlan s WHERE s.tenantId = :tenantId AND s.riskLevel = :riskLevel")
    List<SuccessionPlan> findByRiskLevel(@Param("tenantId") UUID tenantId, @Param("riskLevel") SuccessionPlan.RiskLevel riskLevel);

    @Query("SELECT s FROM SuccessionPlan s WHERE s.tenantId = :tenantId AND s.riskLevel IN ('HIGH', 'CRITICAL') AND s.status = 'ACTIVE'")
    List<SuccessionPlan> findHighRiskPlans(@Param("tenantId") UUID tenantId);

    @Query("SELECT COUNT(s) FROM SuccessionPlan s WHERE s.tenantId = :tenantId AND s.status = 'ACTIVE'")
    long countActivePlans(@Param("tenantId") UUID tenantId);
}
