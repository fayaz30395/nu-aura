package com.hrms.infrastructure.overtime.repository;

import com.hrms.domain.overtime.CompTimeBalance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CompTimeBalanceRepository extends JpaRepository<CompTimeBalance, UUID> {

    Optional<CompTimeBalance> findByIdAndTenantId(UUID id, UUID tenantId);

    List<CompTimeBalance> findByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId);

    Optional<CompTimeBalance> findByTenantIdAndEmployeeIdAndFiscalYear(
            UUID tenantId, UUID employeeId, int fiscalYear);

    @Query("SELECT c FROM CompTimeBalance c WHERE c.tenantId = :tenantId " +
            "AND c.employeeId = :employeeId AND c.currentBalance > 0 " +
            "ORDER BY c.fiscalYear DESC")
    List<CompTimeBalance> findActiveBalances(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId);

    @Query("SELECT c FROM CompTimeBalance c WHERE c.tenantId = :tenantId " +
            "AND c.atMaxBalance = true")
    List<CompTimeBalance> findAtMaxBalance(@Param("tenantId") UUID tenantId);

    @Query("SELECT SUM(c.currentBalance) FROM CompTimeBalance c " +
            "WHERE c.tenantId = :tenantId AND c.employeeId = :employeeId")
    BigDecimal getTotalBalance(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId);

    @Query("SELECT c FROM CompTimeBalance c WHERE c.tenantId = :tenantId " +
            "AND c.fiscalYear = :fiscalYear")
    List<CompTimeBalance> findByFiscalYear(
            @Param("tenantId") UUID tenantId,
            @Param("fiscalYear") int fiscalYear);
}
