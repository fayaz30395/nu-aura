package com.hrms.infrastructure.psa.repository;
import com.hrms.domain.psa.PSAInvoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface PSAInvoiceRepository extends JpaRepository<PSAInvoice, UUID> {
    List<PSAInvoice> findByTenantIdAndProjectId(UUID tenantId, UUID projectId);
    List<PSAInvoice> findByTenantIdAndClientId(UUID tenantId, UUID clientId);
    List<PSAInvoice> findByTenantIdAndStatus(UUID tenantId, PSAInvoice.InvoiceStatus status);
    Optional<PSAInvoice> findByInvoiceNumber(String invoiceNumber);
}
