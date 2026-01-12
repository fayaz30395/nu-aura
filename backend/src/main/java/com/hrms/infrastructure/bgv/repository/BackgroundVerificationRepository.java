package com.hrms.infrastructure.bgv.repository;

import com.hrms.domain.bgv.BackgroundVerification;
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
public interface BackgroundVerificationRepository extends JpaRepository<BackgroundVerification, UUID> {

    Optional<BackgroundVerification> findByEmployeeIdAndTenantId(UUID employeeId, UUID tenantId);

    Optional<BackgroundVerification> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<BackgroundVerification> findByTenantId(UUID tenantId, Pageable pageable);

    List<BackgroundVerification> findByTenantIdAndStatus(UUID tenantId, BackgroundVerification.VerificationStatus status);

    @Query("SELECT b FROM BackgroundVerification b WHERE b.tenantId = :tenantId AND b.status IN ('INITIATED', 'IN_PROGRESS', 'PENDING_DOCUMENTS')")
    List<BackgroundVerification> findInProgress(@Param("tenantId") UUID tenantId);

    @Query("SELECT b FROM BackgroundVerification b WHERE b.tenantId = :tenantId AND b.expectedCompletionDate < :date AND b.status NOT IN ('COMPLETED', 'CANCELLED')")
    List<BackgroundVerification> findOverdue(@Param("tenantId") UUID tenantId, @Param("date") LocalDate date);

    @Query("SELECT b FROM BackgroundVerification b WHERE b.tenantId = :tenantId AND b.overallResult = 'DISCREPANCY'")
    List<BackgroundVerification> findWithDiscrepancies(@Param("tenantId") UUID tenantId);

    @Query("SELECT COUNT(b) FROM BackgroundVerification b WHERE b.tenantId = :tenantId AND b.status = :status")
    long countByStatus(@Param("tenantId") UUID tenantId, @Param("status") BackgroundVerification.VerificationStatus status);
}
