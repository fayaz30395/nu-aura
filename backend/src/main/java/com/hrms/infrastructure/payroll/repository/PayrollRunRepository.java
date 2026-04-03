package com.hrms.infrastructure.payroll.repository;

import com.hrms.domain.payroll.PayrollRun;
import com.hrms.domain.payroll.PayrollRun.PayrollStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PayrollRunRepository extends JpaRepository<PayrollRun, UUID> {

    Page<PayrollRun> findAllByTenantId(UUID tenantId, Pageable pageable);

    Optional<PayrollRun> findByTenantIdAndPayPeriodYearAndPayPeriodMonth(
            UUID tenantId,
            Integer year,
            Integer month
    );

    boolean existsByTenantIdAndPayPeriodYearAndPayPeriodMonth(
            UUID tenantId,
            Integer year,
            Integer month
    );

    Page<PayrollRun> findAllByTenantIdAndStatus(UUID tenantId, PayrollStatus status, Pageable pageable);

    @Query("SELECT pr FROM PayrollRun pr WHERE pr.tenantId = :tenantId " +
            "AND pr.payPeriodYear = :year ORDER BY pr.payPeriodMonth DESC")
    List<PayrollRun> findByTenantIdAndYear(@Param("tenantId") UUID tenantId, @Param("year") Integer year);

    @Query("SELECT pr FROM PayrollRun pr WHERE pr.tenantId = :tenantId " +
            "ORDER BY pr.payPeriodYear DESC, pr.payPeriodMonth DESC")
    Page<PayrollRun> findAllByTenantIdOrderByPeriodDesc(UUID tenantId, Pageable pageable);

    /**
     * Acquire a pessimistic write lock on a payroll run.
     * Used for state transitions (process, approve, lock) to prevent concurrent
     * modifications. The lock is held for the duration of the transaction.
     * <p>
     * PESSIMISTIC_WRITE issues SELECT ... FOR UPDATE which blocks concurrent
     * readers/writers on the same row until the transaction commits.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT pr FROM PayrollRun pr WHERE pr.id = :id AND pr.tenantId = :tenantId")
    Optional<PayrollRun> findByIdAndTenantIdForUpdate(
            @Param("id") UUID id,
            @Param("tenantId") UUID tenantId
    );

    /**
     * Acquire a pessimistic write lock to prevent duplicate payroll run creation.
     * Used in createPayrollRun to ensure only one run per period per tenant.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT pr FROM PayrollRun pr WHERE pr.tenantId = :tenantId " +
            "AND pr.payPeriodYear = :year AND pr.payPeriodMonth = :month")
    Optional<PayrollRun> findByTenantIdAndPeriodForUpdate(
            @Param("tenantId") UUID tenantId,
            @Param("year") Integer year,
            @Param("month") Integer month
    );
}
