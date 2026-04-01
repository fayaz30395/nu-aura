package com.hrms.infrastructure.exit.repository;

import com.hrms.domain.exit.FullAndFinalSettlement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FullAndFinalSettlementRepository extends JpaRepository<FullAndFinalSettlement, UUID> {

    Optional<FullAndFinalSettlement> findByExitProcessIdAndTenantId(UUID exitProcessId, UUID tenantId);

    Optional<FullAndFinalSettlement> findByEmployeeIdAndTenantId(UUID employeeId, UUID tenantId);

    Page<FullAndFinalSettlement> findByTenantId(UUID tenantId, Pageable pageable);

    List<FullAndFinalSettlement> findByTenantIdAndStatus(UUID tenantId, FullAndFinalSettlement.SettlementStatus status);

    @Query("SELECT f FROM FullAndFinalSettlement f WHERE f.tenantId = :tenantId AND f.status = 'PENDING_APPROVAL'")
    List<FullAndFinalSettlement> findPendingApprovals(@Param("tenantId") UUID tenantId);

    @Query("SELECT f FROM FullAndFinalSettlement f WHERE f.tenantId = :tenantId AND f.status = 'APPROVED' AND f.paymentDate IS NULL")
    List<FullAndFinalSettlement> findApprovedPendingPayment(@Param("tenantId") UUID tenantId);

    @Query("SELECT f FROM FullAndFinalSettlement f WHERE f.tenantId = :tenantId AND f.paymentDate BETWEEN :startDate AND :endDate")
    List<FullAndFinalSettlement> findByPaymentDateRange(
            @Param("tenantId") UUID tenantId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT SUM(f.netPayable) FROM FullAndFinalSettlement f WHERE f.tenantId = :tenantId AND f.status = 'PAID' AND f.paymentDate BETWEEN :startDate AND :endDate")
    BigDecimal getTotalSettlementAmount(
            @Param("tenantId") UUID tenantId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT COUNT(f) FROM FullAndFinalSettlement f WHERE f.tenantId = :tenantId AND f.status = :status")
    long countByStatus(@Param("tenantId") UUID tenantId, @Param("status") FullAndFinalSettlement.SettlementStatus status);

    Optional<FullAndFinalSettlement> findByIdAndTenantId(UUID id, UUID tenantId);
}
