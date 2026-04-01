package com.hrms.domain.document;

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
public interface DocumentExpiryTrackingRepository extends JpaRepository<DocumentExpiryTracking, UUID> {

    Optional<DocumentExpiryTracking> findByDocumentId(UUID documentId);

    Optional<DocumentExpiryTracking> findByTenantIdAndDocumentId(UUID tenantId, UUID documentId);

    List<DocumentExpiryTracking> findByTenantIdAndExpiryDateBefore(UUID tenantId, LocalDate date);

    List<DocumentExpiryTracking> findByTenantIdAndExpiryDateBetween(UUID tenantId, LocalDate startDate, LocalDate endDate);

    Page<DocumentExpiryTracking> findByTenantId(UUID tenantId, Pageable pageable);

    Page<DocumentExpiryTracking> findByTenantIdAndIsNotifiedFalse(UUID tenantId, Pageable pageable);

    @Query("SELECT det FROM DocumentExpiryTracking det WHERE det.tenantId = :tenantId AND " +
           "det.expiryDate <= :expiryDate AND det.isNotified = false")
    List<DocumentExpiryTracking> findExpiringDocuments(
            @Param("tenantId") UUID tenantId,
            @Param("expiryDate") LocalDate expiryDate);

    @Query("SELECT det FROM DocumentExpiryTracking det WHERE det.tenantId = :tenantId AND " +
           "det.expiryDate < CURRENT_DATE")
    List<DocumentExpiryTracking> findExpiredDocuments(@Param("tenantId") UUID tenantId);
}
