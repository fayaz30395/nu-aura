package com.hrms.domain.payment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentConfigRepository extends JpaRepository<PaymentConfig, UUID> {

    List<PaymentConfig> findByTenantId(UUID tenantId);

    Optional<PaymentConfig> findByTenantIdAndProvider(UUID tenantId, PaymentConfig.PaymentProvider provider);

    Optional<PaymentConfig> findByTenantIdAndProviderAndIsActiveTrueAndIsDeletedFalse(UUID tenantId, PaymentConfig.PaymentProvider provider);

    List<PaymentConfig> findByTenantIdAndIsActiveTrueAndIsDeletedFalse(UUID tenantId);
}
