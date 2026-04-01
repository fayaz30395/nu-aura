package com.hrms.domain.payment;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentRefundRepository extends JpaRepository<PaymentRefund, UUID> {

    Optional<PaymentRefund> findByTenantIdAndRefundRef(UUID tenantId, String refundRef);

    Optional<PaymentRefund> findByExternalRefundId(String externalRefundId);

    List<PaymentRefund> findByTransactionId(UUID transactionId);

    Page<PaymentRefund> findByTenantId(UUID tenantId, Pageable pageable);

    Page<PaymentRefund> findByTenantIdAndStatus(UUID tenantId, PaymentRefund.RefundStatus status, Pageable pageable);
}
