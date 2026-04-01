package com.hrms.domain.payment;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentWebhookRepository extends JpaRepository<PaymentWebhook, UUID> {

    Optional<PaymentWebhook> findByExternalEventId(String externalEventId);

    List<PaymentWebhook> findByTenantIdAndProcessedFalse(UUID tenantId);

    Page<PaymentWebhook> findByTenantId(UUID tenantId, Pageable pageable);

    Page<PaymentWebhook> findByTenantIdAndProvider(UUID tenantId, String provider, Pageable pageable);

    Page<PaymentWebhook> findByTenantIdAndEventType(UUID tenantId, String eventType, Pageable pageable);

    Page<PaymentWebhook> findByTenantIdAndStatus(UUID tenantId, String status, Pageable pageable);
}
