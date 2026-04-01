package com.hrms.infrastructure.referral.repository;

import com.hrms.domain.referral.ReferralPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReferralPolicyRepository extends JpaRepository<ReferralPolicy, UUID> {

    Optional<ReferralPolicy> findByIdAndTenantId(UUID id, UUID tenantId);

    List<ReferralPolicy> findByTenantIdAndIsActiveTrue(UUID tenantId);

    @Query("SELECT p FROM ReferralPolicy p WHERE p.tenantId = :tenantId AND p.isActive = true AND (p.effectiveFrom IS NULL OR p.effectiveFrom <= :date) AND (p.effectiveTo IS NULL OR p.effectiveTo >= :date)")
    List<ReferralPolicy> findActivePolices(@Param("tenantId") UUID tenantId, @Param("date") LocalDate date);

    @Query("SELECT p FROM ReferralPolicy p WHERE p.tenantId = :tenantId AND p.isActive = true AND p.applicableFor = 'ALL'")
    Optional<ReferralPolicy> findDefaultPolicy(@Param("tenantId") UUID tenantId);

    @Query("SELECT p FROM ReferralPolicy p WHERE p.tenantId = :tenantId AND p.isActive = true AND p.departmentId = :departmentId")
    Optional<ReferralPolicy> findByDepartment(@Param("tenantId") UUID tenantId, @Param("departmentId") UUID departmentId);
}
