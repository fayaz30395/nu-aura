package com.hrms.infrastructure.benefits.repository;

import com.hrms.domain.benefits.BenefitEnrollment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BenefitEnrollmentRepository extends JpaRepository<BenefitEnrollment, UUID> {

    Page<BenefitEnrollment> findByTenantId(UUID tenantId, Pageable pageable);

    Optional<BenefitEnrollment> findByIdAndTenantId(UUID id, UUID tenantId);

    List<BenefitEnrollment> findByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId);

    List<BenefitEnrollment> findByTenantIdAndEmployeeIdAndStatus(
            UUID tenantId, UUID employeeId, BenefitEnrollment.EnrollmentStatus status);

    @Query("SELECT be FROM BenefitEnrollment be WHERE be.tenantId = :tenantId " +
           "AND be.employeeId = :employeeId " +
           "AND be.status IN ('ACTIVE', 'APPROVED', 'COBRA_CONTINUATION')")
    List<BenefitEnrollment> findActiveEnrollmentsForEmployee(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId);

    @Query("SELECT be FROM BenefitEnrollment be WHERE be.tenantId = :tenantId " +
           "AND be.benefitPlan.id = :planId " +
           "AND be.status IN ('ACTIVE', 'APPROVED')")
    List<BenefitEnrollment> findActiveEnrollmentsForPlan(
            @Param("tenantId") UUID tenantId,
            @Param("planId") UUID planId);

    @Query("SELECT be FROM BenefitEnrollment be WHERE be.tenantId = :tenantId " +
           "AND be.status = 'PENDING'")
    List<BenefitEnrollment> findPendingEnrollments(@Param("tenantId") UUID tenantId);

    @Query("SELECT be FROM BenefitEnrollment be WHERE be.tenantId = :tenantId " +
           "AND be.effectiveDate = :date AND be.status = 'APPROVED'")
    List<BenefitEnrollment> findEnrollmentsEffectiveOn(
            @Param("tenantId") UUID tenantId,
            @Param("date") LocalDate date);

    @Query("SELECT be FROM BenefitEnrollment be WHERE be.tenantId = :tenantId " +
           "AND be.cobraActive = true AND be.cobraEndDate <= :date")
    List<BenefitEnrollment> findExpiringCobraEnrollments(
            @Param("tenantId") UUID tenantId,
            @Param("date") LocalDate date);

    @Query("SELECT be FROM BenefitEnrollment be WHERE be.tenantId = :tenantId " +
           "AND be.employeeId = :employeeId AND be.benefitPlan.id = :planId " +
           "AND be.status NOT IN ('TERMINATED', 'REJECTED', 'WAIVED')")
    Optional<BenefitEnrollment> findExistingEnrollment(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("planId") UUID planId);

    @Query("SELECT SUM(be.employeeContribution) FROM BenefitEnrollment be " +
           "WHERE be.tenantId = :tenantId AND be.employeeId = :employeeId " +
           "AND be.status = 'ACTIVE'")
    BigDecimal calculateTotalEmployeeContribution(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId);

    @Query("SELECT SUM(be.employerContribution) FROM BenefitEnrollment be " +
           "WHERE be.tenantId = :tenantId AND be.employeeId = :employeeId " +
           "AND be.status = 'ACTIVE'")
    BigDecimal calculateTotalEmployerContribution(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId);

    @Query("SELECT COUNT(be) FROM BenefitEnrollment be " +
           "WHERE be.tenantId = :tenantId AND be.benefitPlan.id = :planId " +
           "AND be.status = 'ACTIVE'")
    long countActiveEnrollmentsForPlan(
            @Param("tenantId") UUID tenantId,
            @Param("planId") UUID planId);

    @Query("SELECT be.status, COUNT(be) FROM BenefitEnrollment be " +
           "WHERE be.tenantId = :tenantId GROUP BY be.status")
    List<Object[]> countEnrollmentsByStatus(@Param("tenantId") UUID tenantId);

    @Query("SELECT be.benefitPlan.planType, COUNT(be) FROM BenefitEnrollment be " +
           "WHERE be.tenantId = :tenantId AND be.status = 'ACTIVE' " +
           "GROUP BY be.benefitPlan.planType")
    List<Object[]> countActiveEnrollmentsByPlanType(@Param("tenantId") UUID tenantId);
}
