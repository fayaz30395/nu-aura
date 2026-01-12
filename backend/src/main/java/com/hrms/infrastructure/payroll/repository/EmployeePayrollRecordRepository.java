package com.hrms.infrastructure.payroll.repository;

import com.hrms.domain.payroll.EmployeePayrollRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmployeePayrollRecordRepository extends JpaRepository<EmployeePayrollRecord, UUID> {

    Optional<EmployeePayrollRecord> findByIdAndTenantId(UUID id, UUID tenantId);

    @Query("SELECT r FROM EmployeePayrollRecord r WHERE r.payrollRun.id = :runId ORDER BY r.employeeName")
    List<EmployeePayrollRecord> findByPayrollRun(@Param("runId") UUID payrollRunId);

    @Query("SELECT r FROM EmployeePayrollRecord r WHERE r.tenantId = :tenantId AND r.employeeId = :employeeId " +
           "ORDER BY r.payrollRun.payPeriodStart DESC")
    List<EmployeePayrollRecord> findByEmployee(@Param("tenantId") UUID tenantId, @Param("employeeId") UUID employeeId);

    @Query("SELECT r FROM EmployeePayrollRecord r WHERE r.payrollRun.id = :runId AND r.locationCode = :locationCode")
    List<EmployeePayrollRecord> findByPayrollRunAndLocation(@Param("runId") UUID payrollRunId,
                                                             @Param("locationCode") String locationCode);

    @Query("SELECT r FROM EmployeePayrollRecord r WHERE r.payrollRun.id = :runId AND r.status = :status")
    List<EmployeePayrollRecord> findByPayrollRunAndStatus(@Param("runId") UUID payrollRunId,
                                                           @Param("status") EmployeePayrollRecord.RecordStatus status);

    @Query("SELECT COUNT(r) FROM EmployeePayrollRecord r WHERE r.payrollRun.id = :runId")
    int countByPayrollRun(@Param("runId") UUID payrollRunId);

    @Query("SELECT COUNT(DISTINCT r.locationCode) FROM EmployeePayrollRecord r WHERE r.payrollRun.id = :runId")
    int countDistinctLocationsByPayrollRun(@Param("runId") UUID payrollRunId);

    @Query("SELECT SUM(r.grossPayLocal) FROM EmployeePayrollRecord r WHERE r.payrollRun.id = :runId AND r.localCurrency = :currency")
    BigDecimal getTotalGrossByCurrency(@Param("runId") UUID payrollRunId, @Param("currency") String currency);

    @Query("SELECT r.localCurrency, SUM(r.grossPayBase), SUM(r.netPayBase), SUM(r.totalEmployerCostBase), COUNT(r) " +
           "FROM EmployeePayrollRecord r WHERE r.payrollRun.id = :runId " +
           "GROUP BY r.localCurrency")
    List<Object[]> getSummaryByCurrency(@Param("runId") UUID payrollRunId);

    @Query("SELECT r.locationCode, SUM(r.grossPayBase), SUM(r.netPayBase), SUM(r.totalEmployerCostBase), COUNT(r) " +
           "FROM EmployeePayrollRecord r WHERE r.payrollRun.id = :runId " +
           "GROUP BY r.locationCode")
    List<Object[]> getSummaryByLocation(@Param("runId") UUID payrollRunId);
}
