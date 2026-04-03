package com.hrms.infrastructure.benefits.repository;

import com.hrms.domain.benefits.BenefitPlanEnhanced;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BenefitPlanEnhancedRepository extends JpaRepository<BenefitPlanEnhanced, UUID> {

    Page<BenefitPlanEnhanced> findByTenantId(UUID tenantId, Pageable pageable);

    List<BenefitPlanEnhanced> findByTenantIdAndIsActiveTrue(UUID tenantId);

    Optional<BenefitPlanEnhanced> findByIdAndTenantId(UUID id, UUID tenantId);

    List<BenefitPlanEnhanced> findByTenantIdAndPlanType(UUID tenantId, BenefitPlanEnhanced.PlanType planType);

    List<BenefitPlanEnhanced> findByTenantIdAndCategory(UUID tenantId, BenefitPlanEnhanced.PlanCategory category);

    @Query("SELECT bp FROM BenefitPlanEnhanced bp WHERE bp.tenantId = :tenantId " +
            "AND bp.isActive = true " +
            "AND (bp.effectiveFrom IS NULL OR bp.effectiveFrom <= :date) " +
            "AND (bp.effectiveTo IS NULL OR bp.effectiveTo >= :date)")
    List<BenefitPlanEnhanced> findActivePlansForDate(
            @Param("tenantId") UUID tenantId,
            @Param("date") LocalDate date);

    @Query("SELECT bp FROM BenefitPlanEnhanced bp WHERE bp.tenantId = :tenantId " +
            "AND bp.isActive = true AND bp.dependentsCovered = true")
    List<BenefitPlanEnhanced> findPlansWithDependentCoverage(@Param("tenantId") UUID tenantId);

    @Query("SELECT bp FROM BenefitPlanEnhanced bp WHERE bp.tenantId = :tenantId " +
            "AND bp.isActive = true AND bp.isFlexible = true")
    List<BenefitPlanEnhanced> findFlexibleBenefitPlans(@Param("tenantId") UUID tenantId);

    @Query("SELECT bp FROM BenefitPlanEnhanced bp WHERE bp.tenantId = :tenantId " +
            "AND bp.isActive = true " +
            "AND (bp.eligibleGrades IS NULL OR bp.eligibleGrades LIKE %:grade%)")
    List<BenefitPlanEnhanced> findEligiblePlansForGrade(
            @Param("tenantId") UUID tenantId,
            @Param("grade") String grade);

    @Query("SELECT bp FROM BenefitPlanEnhanced bp WHERE bp.tenantId = :tenantId " +
            "AND bp.planType = :planType " +
            "AND bp.providerCode = :providerCode")
    List<BenefitPlanEnhanced> findByProviderAndType(
            @Param("tenantId") UUID tenantId,
            @Param("planType") BenefitPlanEnhanced.PlanType planType,
            @Param("providerCode") String providerCode);

    @Query("SELECT COUNT(bp) FROM BenefitPlanEnhanced bp WHERE bp.tenantId = :tenantId " +
            "AND bp.isActive = true")
    long countActivePlans(@Param("tenantId") UUID tenantId);

    @Query("SELECT bp.planType, COUNT(bp) FROM BenefitPlanEnhanced bp " +
            "WHERE bp.tenantId = :tenantId GROUP BY bp.planType")
    List<Object[]> countPlansByType(@Param("tenantId") UUID tenantId);
}
