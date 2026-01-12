package com.hrms.infrastructure.payroll.repository;

import com.hrms.domain.payroll.Currency;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CurrencyRepository extends JpaRepository<Currency, UUID> {

    Optional<Currency> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<Currency> findByCurrencyCodeAndTenantId(String currencyCode, UUID tenantId);

    List<Currency> findByTenantIdAndIsActiveTrue(UUID tenantId);

    @Query("SELECT c FROM Currency c WHERE c.tenantId = :tenantId AND c.isBaseCurrency = true")
    Optional<Currency> findBaseCurrency(@Param("tenantId") UUID tenantId);

    boolean existsByCurrencyCodeAndTenantId(String currencyCode, UUID tenantId);
}
