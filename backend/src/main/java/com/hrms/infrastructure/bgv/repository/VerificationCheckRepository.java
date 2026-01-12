package com.hrms.infrastructure.bgv.repository;

import com.hrms.domain.bgv.VerificationCheck;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VerificationCheckRepository extends JpaRepository<VerificationCheck, UUID> {

    List<VerificationCheck> findByBgvIdAndTenantId(UUID bgvId, UUID tenantId);

    Optional<VerificationCheck> findByIdAndTenantId(UUID id, UUID tenantId);

    List<VerificationCheck> findByTenantIdAndStatus(UUID tenantId, VerificationCheck.CheckStatus status);

    @Query("SELECT c FROM VerificationCheck c WHERE c.bgvId = :bgvId AND c.result IN ('DISCREPANCY_MINOR', 'DISCREPANCY_MAJOR')")
    List<VerificationCheck> findDiscrepanciesByBgv(@Param("bgvId") UUID bgvId);

    @Query("SELECT COUNT(c) FROM VerificationCheck c WHERE c.bgvId = :bgvId AND c.status = 'COMPLETED'")
    long countCompletedByBgv(@Param("bgvId") UUID bgvId);

    @Query("SELECT COUNT(c) FROM VerificationCheck c WHERE c.bgvId = :bgvId")
    long countByBgv(@Param("bgvId") UUID bgvId);

    @Query("SELECT c FROM VerificationCheck c WHERE c.bgvId = :bgvId AND c.isCritical = true AND c.status != 'COMPLETED'")
    List<VerificationCheck> findPendingCriticalChecks(@Param("bgvId") UUID bgvId);
}
