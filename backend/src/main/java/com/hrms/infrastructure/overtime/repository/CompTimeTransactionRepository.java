package com.hrms.infrastructure.overtime.repository;

import com.hrms.domain.overtime.CompTimeTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface CompTimeTransactionRepository extends JpaRepository<CompTimeTransaction, UUID> {

    List<CompTimeTransaction> findByBalanceId(UUID balanceId);

    Page<CompTimeTransaction> findByBalanceId(UUID balanceId, Pageable pageable);

    @Query("SELECT t FROM CompTimeTransaction t WHERE t.balance.tenantId = :tenantId " +
            "AND t.balance.employeeId = :employeeId " +
            "ORDER BY t.transactionDate DESC")
    List<CompTimeTransaction> findByEmployee(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId);

    @Query("SELECT t FROM CompTimeTransaction t WHERE t.balance.tenantId = :tenantId " +
            "AND t.balance.employeeId = :employeeId " +
            "AND t.transactionDate BETWEEN :startDate AND :endDate")
    List<CompTimeTransaction> findByEmployeeAndDateRange(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT t.transactionType, SUM(t.hours) FROM CompTimeTransaction t " +
            "WHERE t.balance.tenantId = :tenantId " +
            "AND t.balance.employeeId = :employeeId " +
            "GROUP BY t.transactionType")
    List<Object[]> getSummaryByType(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId);

    @Query("SELECT t FROM CompTimeTransaction t " +
            "WHERE t.balance.tenantId = :tenantId " +
            "AND t.transactionType = 'ACCRUAL' " +
            "AND t.expiryDate IS NOT NULL " +
            "AND t.expiryDate <= :expiryDate")
    List<CompTimeTransaction> findExpiringCredits(
            @Param("tenantId") UUID tenantId,
            @Param("expiryDate") LocalDate expiryDate);

    @Query("SELECT SUM(t.hours) FROM CompTimeTransaction t " +
            "WHERE t.balance.tenantId = :tenantId " +
            "AND t.balance.employeeId = :employeeId " +
            "AND t.transactionType = :type " +
            "AND FUNCTION('YEAR', t.transactionDate) = :year")
    BigDecimal getYearlyTotalByType(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("type") CompTimeTransaction.TransactionType type,
            @Param("year") int year);
}
