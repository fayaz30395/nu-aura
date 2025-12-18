package com.hrms.infrastructure.benefits.repository;

import com.hrms.domain.benefits.BenefitPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BenefitPlanRepository extends JpaRepository<BenefitPlan, UUID>, JpaSpecificationExecutor<BenefitPlan> {

    Optional<BenefitPlan> findByIdAndTenantId(UUID id, UUID tenantId);

    List<BenefitPlan> findByTenantId(UUID tenantId);

    Optional<BenefitPlan> findByTenantIdAndPlanCode(UUID tenantId, String planCode);

    List<BenefitPlan> findByTenantIdAndBenefitType(UUID tenantId, BenefitPlan.BenefitType benefitType);

    List<BenefitPlan> findByTenantIdAndIsActive(UUID tenantId, Boolean isActive);

    boolean existsByTenantIdAndPlanCode(UUID tenantId, String planCode);
}
