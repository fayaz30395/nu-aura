package com.hrms.infrastructure.payroll.repository;

import com.hrms.domain.payroll.ExchangeRate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExchangeRateRepository extends JpaRepository<ExchangeRate, UUID> {

    Optional<ExchangeRate> findByIdAndTenantId(UUID id, UUID tenantId);

    @Query("SELECT r FROM ExchangeRate r WHERE r.tenantId = :tenantId " +
            "AND r.fromCurrency = :from AND r.toCurrency = :to " +
            "AND r.effectiveDate <= :date AND (r.expiryDate IS NULL OR r.expiryDate >= :date) " +
            "ORDER BY r.effectiveDate DESC")
    List<ExchangeRate> findValidRates(@Param("tenantId") UUID tenantId,
                                      @Param("from") String fromCurrency,
                                      @Param("to") String toCurrency,
                                      @Param("date") LocalDate date);

    @Query("SELECT r FROM ExchangeRate r WHERE r.tenantId = :tenantId " +
            "AND r.fromCurrency = :from AND r.toCurrency = :to " +
            "AND r.rateType = :rateType " +
            "AND r.effectiveDate <= :date AND (r.expiryDate IS NULL OR r.expiryDate >= :date) " +
            "ORDER BY r.effectiveDate DESC")
    List<ExchangeRate> findValidRatesByType(@Param("tenantId") UUID tenantId,
                                            @Param("from") String fromCurrency,
                                            @Param("to") String toCurrency,
                                            @Param("rateType") ExchangeRate.RateType rateType,
                                            @Param("date") LocalDate date);

    @Query("SELECT r FROM ExchangeRate r WHERE r.tenantId = :tenantId " +
            "AND r.effectiveDate BETWEEN :startDate AND :endDate " +
            "ORDER BY r.fromCurrency, r.toCurrency, r.effectiveDate")
    List<ExchangeRate> findRatesInPeriod(@Param("tenantId") UUID tenantId,
                                         @Param("startDate") LocalDate startDate,
                                         @Param("endDate") LocalDate endDate);

    @Query("SELECT DISTINCT r.fromCurrency FROM ExchangeRate r WHERE r.tenantId = :tenantId " +
            "UNION SELECT DISTINCT r.toCurrency FROM ExchangeRate r WHERE r.tenantId = :tenantId")
    List<String> findAllConfiguredCurrencies(@Param("tenantId") UUID tenantId);
}
