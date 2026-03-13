package com.hrms.domain.payment;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, UUID> {

    Optional<PaymentTransaction> findByTenantIdAndTransactionRef(UUID tenantId, String transactionRef);

    Optional<PaymentTransaction> findByExternalRef(String externalRef);

    Page<PaymentTransaction> findByTenantId(UUID tenantId, Pageable pageable);

    Page<PaymentTransaction> findByTenantIdAndType(UUID tenantId, PaymentTransaction.PaymentType type, Pageable pageable);

    Page<PaymentTransaction> findByTenantIdAndStatus(UUID tenantId, PaymentTransaction.PaymentStatus status, Pageable pageable);

    Page<PaymentTransaction> findByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId, Pageable pageable);

    Page<PaymentTransaction> findByPayrollRunId(UUID payrollRunId, Pageable pageable);

    List<PaymentTransaction> findByTenantIdAndPayrollRunId(UUID tenantId, UUID payrollRunId);

    @Query("SELECT pt FROM PaymentTransaction pt WHERE pt.tenantId = :tenantId AND pt.status IN :statuses")
    Page<PaymentTransaction> findByStatusIn(@Param("tenantId") UUID tenantId, @Param("statuses") List<PaymentTransaction.PaymentStatus> statuses, Pageable pageable);

    @Query("SELECT SUM(pt.amount) FROM PaymentTransaction pt WHERE pt.tenantId = :tenantId AND pt.status = :status")
    Optional<BigDecimal> sumAmountByTenantIdAndStatus(@Param("tenantId") UUID tenantId, @Param("status") PaymentTransaction.PaymentStatus status);

    @Query("SELECT COUNT(pt) FROM PaymentTransaction pt WHERE pt.tenantId = :tenantId AND pt.type = :type AND pt.status = :status")
    Long countByTypeAndStatus(@Param("tenantId") UUID tenantId, @Param("type") PaymentTransaction.PaymentType type, @Param("status") PaymentTransaction.PaymentStatus status);
}
