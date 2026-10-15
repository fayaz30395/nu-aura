package com.nulogic.infrastructure.psa.repository;

import com.nulogic.domain.psa.PSAInvoice;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PSAInvoiceRepository extends JpaRepository<PSAInvoice, UUID> {
    Optional<PSAInvoice> findByIdAndTenantId(UUID id, UUID tenantId);

    /** Row-locked load for status transitions/edits so concurrent callers serialize. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM PSAInvoice i WHERE i.id = :id AND i.tenantId = :tenantId")
    Optional<PSAInvoice> findByIdAndTenantIdForUpdate(@Param("id") UUID id, @Param("tenantId") UUID tenantId);

    List<PSAInvoice> findByTenantIdAndProjectId(UUID tenantId, UUID projectId);

    List<PSAInvoice> findByTenantIdAndClientId(UUID tenantId, UUID clientId);

    List<PSAInvoice> findByTenantIdAndStatus(UUID tenantId, PSAInvoice.InvoiceStatus status);

    Optional<PSAInvoice> findByInvoiceNumber(String invoiceNumber);
}
