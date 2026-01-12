package com.hrms.infrastructure.referral.repository;

import com.hrms.domain.referral.EmployeeReferral;
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
public interface EmployeeReferralRepository extends JpaRepository<EmployeeReferral, UUID> {

    List<EmployeeReferral> findByReferrerIdAndTenantId(UUID referrerId, UUID tenantId);

    Optional<EmployeeReferral> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<EmployeeReferral> findByReferralCodeAndTenantId(String referralCode, UUID tenantId);

    Page<EmployeeReferral> findByTenantId(UUID tenantId, Pageable pageable);

    List<EmployeeReferral> findByTenantIdAndStatus(UUID tenantId, EmployeeReferral.ReferralStatus status);

    @Query("SELECT r FROM EmployeeReferral r WHERE r.tenantId = :tenantId AND r.candidateEmail = :email")
    Optional<EmployeeReferral> findByCandidateEmail(@Param("tenantId") UUID tenantId, @Param("email") String email);

    @Query("SELECT r FROM EmployeeReferral r WHERE r.tenantId = :tenantId AND r.status IN ('SUBMITTED', 'SCREENING', 'INTERVIEW_SCHEDULED')")
    List<EmployeeReferral> findActiveReferrals(@Param("tenantId") UUID tenantId);

    @Query("SELECT r FROM EmployeeReferral r WHERE r.tenantId = :tenantId AND r.bonusStatus = 'ELIGIBLE'")
    List<EmployeeReferral> findEligibleForBonus(@Param("tenantId") UUID tenantId);

    @Query("SELECT r FROM EmployeeReferral r WHERE r.tenantId = :tenantId AND r.status = 'JOINED' AND r.bonusEligibleDate <= :date AND r.bonusStatus = 'PENDING_ELIGIBILITY'")
    List<EmployeeReferral> findBonusEligibilityDue(@Param("tenantId") UUID tenantId, @Param("date") LocalDate date);

    @Query("SELECT COUNT(r) FROM EmployeeReferral r WHERE r.tenantId = :tenantId AND r.referrerId = :referrerId AND MONTH(r.submittedDate) = :month AND YEAR(r.submittedDate) = :year")
    long countReferralsByReferrerInMonth(@Param("tenantId") UUID tenantId, @Param("referrerId") UUID referrerId, @Param("month") int month, @Param("year") int year);

    @Query("SELECT COUNT(r) FROM EmployeeReferral r WHERE r.tenantId = :tenantId AND r.status = :status")
    long countByStatus(@Param("tenantId") UUID tenantId, @Param("status") EmployeeReferral.ReferralStatus status);

    @Query("SELECT r.referrerId, COUNT(r) FROM EmployeeReferral r WHERE r.tenantId = :tenantId AND r.status = 'JOINED' GROUP BY r.referrerId ORDER BY COUNT(r) DESC")
    List<Object[]> getTopReferrers(@Param("tenantId") UUID tenantId, Pageable pageable);
}
