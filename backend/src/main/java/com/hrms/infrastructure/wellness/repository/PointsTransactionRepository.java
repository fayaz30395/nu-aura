package com.hrms.infrastructure.wellness.repository;

import com.hrms.domain.wellness.PointsTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface PointsTransactionRepository extends JpaRepository<PointsTransaction, UUID> {

    Page<PointsTransaction> findByEmployeeId(UUID employeeId, Pageable pageable);

    @Query("SELECT t FROM PointsTransaction t WHERE t.employeeId = :employeeId " +
            "AND t.transactionAt BETWEEN :startDate AND :endDate ORDER BY t.transactionAt DESC")
    List<PointsTransaction> findByDateRange(
            @Param("employeeId") UUID employeeId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    @Query("SELECT t FROM PointsTransaction t WHERE t.employeeId = :employeeId " +
            "AND t.transactionType = :type ORDER BY t.transactionAt DESC")
    List<PointsTransaction> findByType(
            @Param("employeeId") UUID employeeId,
            @Param("type") PointsTransaction.TransactionType type);

    @Query("SELECT SUM(t.points) FROM PointsTransaction t WHERE t.employeeId = :employeeId " +
            "AND t.transactionType = 'EARNED' AND t.transactionAt BETWEEN :startDate AND :endDate")
    Integer getPointsEarnedInPeriod(
            @Param("employeeId") UUID employeeId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    @Query("SELECT SUM(t.points) FROM PointsTransaction t WHERE t.employeeId = :employeeId " +
            "AND t.transactionType = 'REDEEMED'")
    Integer getTotalPointsRedeemed(@Param("employeeId") UUID employeeId);

    @Query("SELECT t.referenceType, SUM(t.points) FROM PointsTransaction t " +
            "WHERE t.employeeId = :employeeId AND t.transactionType = 'EARNED' " +
            "GROUP BY t.referenceType")
    List<Object[]> getPointsBySource(@Param("employeeId") UUID employeeId);
}
