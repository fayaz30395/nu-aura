package com.hrms.infrastructure.payroll.repository;

import com.hrms.domain.payroll.PayrollLocation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PayrollLocationRepository extends JpaRepository<PayrollLocation, UUID> {

    Optional<PayrollLocation> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<PayrollLocation> findByLocationCodeAndTenantId(String locationCode, UUID tenantId);

    Page<PayrollLocation> findByTenantId(UUID tenantId, Pageable pageable);

    List<PayrollLocation> findByTenantIdAndIsActiveTrue(UUID tenantId);

    @Query("SELECT l FROM PayrollLocation l WHERE l.tenantId = :tenantId AND l.countryCode = :countryCode")
    List<PayrollLocation> findByCountry(@Param("tenantId") UUID tenantId, @Param("countryCode") String countryCode);

    @Query("SELECT l FROM PayrollLocation l WHERE l.tenantId = :tenantId AND l.localCurrency = :currency")
    List<PayrollLocation> findByCurrency(@Param("tenantId") UUID tenantId, @Param("currency") String currency);

    @Query("SELECT DISTINCT l.countryCode FROM PayrollLocation l WHERE l.tenantId = :tenantId AND l.isActive = true")
    List<String> findDistinctCountries(@Param("tenantId") UUID tenantId);

    @Query("SELECT DISTINCT l.localCurrency FROM PayrollLocation l WHERE l.tenantId = :tenantId AND l.isActive = true")
    List<String> findDistinctCurrencies(@Param("tenantId") UUID tenantId);

    boolean existsByLocationCodeAndTenantId(String locationCode, UUID tenantId);
}
