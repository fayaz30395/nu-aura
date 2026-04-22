package com.hrms.infrastructure.compliance.repository;

import com.hrms.domain.compliance.CompliancePolicy;
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
public interface CompliancePolicyRepository extends JpaRepository<CompliancePolicy, UUID> {

    Optional<CompliancePolicy> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<CompliancePolicy> findByCodeAndTenantId(String code, UUID tenantId);

    boolean existsByCodeAndTenantId(String code, UUID tenantId);

    Page<CompliancePolicy> findByTenantId(UUID tenantId, Pageable pageable);

    @Query("SELECT p FROM CompliancePolicy p WHERE p.tenantId = :tenantId AND p.status = 'PUBLISHED' " +
            "AND (p.effectiveDate IS NULL OR p.effectiveDate <= :today) " +
            "AND (p.expiryDate IS NULL OR p.expiryDate >= :today)")
    List<CompliancePolicy> findActivePolicies(@Param("tenantId") UUID tenantId, @Param("today") LocalDate today);

    @Query("SELECT p FROM CompliancePolicy p WHERE p.tenantId = :tenantId AND p.status = 'PUBLISHED' " +
            "AND (p.effectiveDate IS NULL OR p.effectiveDate <= :today) " +
            "AND (p.expiryDate IS NULL OR p.expiryDate >= :today)")
    Page<CompliancePolicy> findActivePolicies(@Param("tenantId") UUID tenantId, @Param("today") LocalDate today, Pageable pageable);

    @Query("SELECT p FROM CompliancePolicy p WHERE p.tenantId = :tenantId AND p.category = :category AND p.status = 'PUBLISHED'")
    List<CompliancePolicy> findByCategory(@Param("tenantId") UUID tenantId, @Param("category") CompliancePolicy.PolicyCategory category);

    @Query("SELECT p FROM CompliancePolicy p WHERE p.tenantId = :tenantId AND p.category = :category AND p.status = 'PUBLISHED'")
    Page<CompliancePolicy> findByCategory(@Param("tenantId") UUID tenantId, @Param("category") CompliancePolicy.PolicyCategory category, Pageable pageable);

    @Query("SELECT p FROM CompliancePolicy p WHERE p.tenantId = :tenantId AND p.requiresAcknowledgment = true AND p.status = 'PUBLISHED'")
    List<CompliancePolicy> findPoliciesRequiringAcknowledgment(@Param("tenantId") UUID tenantId);

    @Query("SELECT p FROM CompliancePolicy p WHERE p.tenantId = :tenantId AND p.expiryDate IS NOT NULL AND p.expiryDate <= :expiryDate")
    List<CompliancePolicy> findExpiringPolicies(@Param("tenantId") UUID tenantId, @Param("expiryDate") LocalDate expiryDate);
}
