package com.hrms.infrastructure.payroll.repository;

import com.hrms.domain.payroll.PayrollRun;
import com.hrms.domain.payroll.PayrollRun.PayrollStatus;
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
}
