package com.hrms.infrastructure.payroll.repository;

import com.hrms.domain.payroll.GlobalPayrollRun;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GlobalPayrollRunRepository extends JpaRepository<GlobalPayrollRun, UUID> {

    Optional<GlobalPayrollRun> findByIdAndTenantId(UUID id, UUID tenantId);

    // NEW-04 FIX: Pessimistic lock for state-transition operations (process, approve, lock).
    // Prevents concurrent double-processing, matching domestic PayrollRunRepository pattern.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM GlobalPayrollRun r WHERE r.id = :id AND r.tenantId = :tenantId")
    Optional<GlobalPayrollRun> findByIdAndTenantIdForUpdate(@Param("id") UUID id, @Param("tenantId") UUID tenantId);

    Optional<GlobalPayrollRun> findByRunCodeAndTenantId(String runCode, UUID tenantId);

    Page<GlobalPayrollRun> findByTenantId(UUID tenantId, Pageable pageable);

    @Query("SELECT r FROM GlobalPayrollRun r WHERE r.tenantId = :tenantId AND r.status = :status ORDER BY r.createdAt DESC")
    List<GlobalPayrollRun> findByStatus(@Param("tenantId") UUID tenantId,
                                        @Param("status") GlobalPayrollRun.PayrollRunStatus status);

    @Query("SELECT r FROM GlobalPayrollRun r WHERE r.tenantId = :tenantId " +
            "AND r.payPeriodStart >= :startDate AND r.payPeriodEnd <= :endDate " +
            "ORDER BY r.payPeriodStart DESC")
    List<GlobalPayrollRun> findByPeriod(@Param("tenantId") UUID tenantId,
                                        @Param("startDate") LocalDate startDate,
                                        @Param("endDate") LocalDate endDate);

    @Query("SELECT r FROM GlobalPayrollRun r WHERE r.tenantId = :tenantId " +
            "AND YEAR(r.payPeriodStart) = :year ORDER BY r.payPeriodStart")
    List<GlobalPayrollRun> findByYear(@Param("tenantId") UUID tenantId, @Param("year") int year);

    @Query("SELECT SUM(r.totalGrossBase) FROM GlobalPayrollRun r WHERE r.tenantId = :tenantId " +
            "AND r.status = 'PAID' AND YEAR(r.payPeriodStart) = :year")
    java.math.BigDecimal getTotalGrossForYear(@Param("tenantId") UUID tenantId, @Param("year") int year);

    @Query("SELECT SUM(r.totalEmployerCostBase) FROM GlobalPayrollRun r WHERE r.tenantId = :tenantId " +
            "AND r.status = 'PAID' AND YEAR(r.payPeriodStart) = :year")
    java.math.BigDecimal getTotalEmployerCostForYear(@Param("tenantId") UUID tenantId, @Param("year") int year);

    boolean existsByRunCodeAndTenantId(String runCode, UUID tenantId);
}
