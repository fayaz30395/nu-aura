package com.hrms.infrastructure.benefits.repository;

import com.hrms.domain.benefits.BenefitClaim;
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
public interface BenefitClaimRepository extends JpaRepository<BenefitClaim, UUID> {

    Page<BenefitClaim> findByTenantId(UUID tenantId, Pageable pageable);

    Optional<BenefitClaim> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<BenefitClaim> findByClaimNumberAndTenantId(String claimNumber, UUID tenantId);

    List<BenefitClaim> findByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId);

    Page<BenefitClaim> findByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId, Pageable pageable);

    List<BenefitClaim> findByTenantIdAndEmployeeIdAndStatus(
            UUID tenantId, UUID employeeId, BenefitClaim.ClaimStatus status);

    @Query("SELECT bc FROM BenefitClaim bc WHERE bc.tenantId = :tenantId " +
           "AND bc.status IN ('SUBMITTED', 'UNDER_REVIEW', 'ADDITIONAL_INFO_REQUIRED')")
    List<BenefitClaim> findPendingClaims(@Param("tenantId") UUID tenantId);

    @Query("SELECT bc FROM BenefitClaim bc WHERE bc.tenantId = :tenantId " +
           "AND bc.status = 'APPROVED' AND bc.paymentDate IS NULL")
    List<BenefitClaim> findApprovedClaimsPendingPayment(@Param("tenantId") UUID tenantId);

    @Query("SELECT bc FROM BenefitClaim bc WHERE bc.tenantId = :tenantId " +
           "AND bc.employeeId = :employeeId " +
           "AND bc.serviceDate BETWEEN :startDate AND :endDate")
    List<BenefitClaim> findClaimsByDateRange(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT bc FROM BenefitClaim bc WHERE bc.tenantId = :tenantId " +
           "AND bc.claimType = :claimType")
    Page<BenefitClaim> findByClaimType(
            @Param("tenantId") UUID tenantId,
            @Param("claimType") BenefitClaim.ClaimType claimType,
            Pageable pageable);

    @Query("SELECT SUM(bc.approvedAmount) FROM BenefitClaim bc " +
           "WHERE bc.tenantId = :tenantId AND bc.employeeId = :employeeId " +
           "AND bc.enrollment.id = :enrollmentId " +
           "AND bc.status IN ('APPROVED', 'PARTIALLY_APPROVED', 'PAYMENT_COMPLETED') " +
           "AND YEAR(bc.serviceDate) = :year")
    BigDecimal calculateTotalClaimsForYear(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("enrollmentId") UUID enrollmentId,
            @Param("year") int year);

    @Query("SELECT SUM(bc.approvedAmount) FROM BenefitClaim bc " +
           "WHERE bc.tenantId = :tenantId AND bc.employeeId = :employeeId " +
           "AND bc.claimType = :claimType " +
           "AND bc.status IN ('APPROVED', 'PARTIALLY_APPROVED', 'PAYMENT_COMPLETED') " +
           "AND bc.serviceDate BETWEEN :startDate AND :endDate")
    BigDecimal calculateClaimsAmountByType(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("claimType") BenefitClaim.ClaimType claimType,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT bc.status, COUNT(bc) FROM BenefitClaim bc " +
           "WHERE bc.tenantId = :tenantId GROUP BY bc.status")
    List<Object[]> countClaimsByStatus(@Param("tenantId") UUID tenantId);

    @Query("SELECT bc.claimType, SUM(bc.claimedAmount), SUM(bc.approvedAmount) " +
           "FROM BenefitClaim bc WHERE bc.tenantId = :tenantId " +
           "AND bc.status IN ('APPROVED', 'PARTIALLY_APPROVED', 'PAYMENT_COMPLETED') " +
           "GROUP BY bc.claimType")
    List<Object[]> getClaimsSummaryByType(@Param("tenantId") UUID tenantId);

    @Query("SELECT MONTH(bc.serviceDate), SUM(bc.approvedAmount) FROM BenefitClaim bc " +
           "WHERE bc.tenantId = :tenantId AND YEAR(bc.serviceDate) = :year " +
           "AND bc.status IN ('APPROVED', 'PARTIALLY_APPROVED', 'PAYMENT_COMPLETED') " +
           "GROUP BY MONTH(bc.serviceDate) ORDER BY MONTH(bc.serviceDate)")
    List<Object[]> getMonthlyClaimsTrend(
            @Param("tenantId") UUID tenantId,
            @Param("year") int year);

    @Query("SELECT bc FROM BenefitClaim bc WHERE bc.tenantId = :tenantId " +
           "AND bc.isAppealed = true AND bc.appealStatus IS NULL")
    List<BenefitClaim> findPendingAppeals(@Param("tenantId") UUID tenantId);
}
