package com.hrms.infrastructure.payroll.repository;

import com.hrms.domain.payroll.EmployeePayrollRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for EmployeePayrollRecord entity with mandatory tenant isolation.
 *
 * <p><strong>SECURITY:</strong> All queries MUST include tenantId to prevent cross-tenant data leaks.
 * The inherited JpaRepository methods (findAll, findById, deleteById) are intentionally
 * overridden to enforce tenant isolation at the repository level.</p>
 */
@Repository
public interface EmployeePayrollRecordRepository extends JpaRepository<EmployeePayrollRecord, UUID> {

    // ==================== TENANT-SAFE OVERRIDE METHODS ====================

    Optional<EmployeePayrollRecord> findByIdAndTenantId(UUID id, UUID tenantId);

    /**
     * Find all payroll records for a tenant.
     * Use this instead of the inherited findAll().
     */
    @Query("SELECT r FROM EmployeePayrollRecord r WHERE r.tenantId = :tenantId ORDER BY r.payrollRun.payPeriodStart DESC")
    List<EmployeePayrollRecord> findAllByTenantId(@Param("tenantId") UUID tenantId);

    /**
     * Find all payroll records for a tenant with pagination.
     */
    @Query("SELECT r FROM EmployeePayrollRecord r WHERE r.tenantId = :tenantId ORDER BY r.payrollRun.payPeriodStart DESC")
    Page<EmployeePayrollRecord> findAllByTenantId(@Param("tenantId") UUID tenantId, Pageable pageable);

    /**
     * Delete payroll record by ID with mandatory tenant isolation.
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM EmployeePayrollRecord r WHERE r.id = :id AND r.tenantId = :tenantId")
    void deleteByIdAndTenantId(@Param("id") UUID id, @Param("tenantId") UUID tenantId);

    /**
     * Check if payroll record exists with mandatory tenant isolation.
     */
    @Query("SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END FROM EmployeePayrollRecord r WHERE r.id = :id AND r.tenantId = :tenantId")
    boolean existsByIdAndTenantId(@Param("id") UUID id, @Param("tenantId") UUID tenantId);

    // ==================== TENANT-SCOPED QUERY METHODS ====================

    @Query("SELECT r FROM EmployeePayrollRecord r WHERE r.tenantId = :tenantId AND r.payrollRun.id = :runId ORDER BY r.employeeName")
    List<EmployeePayrollRecord> findByTenantIdAndPayrollRun(@Param("tenantId") UUID tenantId, @Param("runId") UUID payrollRunId);

    @Query("SELECT r FROM EmployeePayrollRecord r WHERE r.tenantId = :tenantId AND r.employeeId = :employeeId " +
            "ORDER BY r.payrollRun.payPeriodStart DESC")
    List<EmployeePayrollRecord> findByEmployee(@Param("tenantId") UUID tenantId, @Param("employeeId") UUID employeeId);

    @Query("SELECT r FROM EmployeePayrollRecord r WHERE r.tenantId = :tenantId AND r.payrollRun.id = :runId AND r.locationCode = :locationCode")
    List<EmployeePayrollRecord> findByTenantIdAndPayrollRunAndLocation(@Param("tenantId") UUID tenantId,
                                                                       @Param("runId") UUID payrollRunId,
                                                                       @Param("locationCode") String locationCode);

    @Query("SELECT r FROM EmployeePayrollRecord r WHERE r.tenantId = :tenantId AND r.payrollRun.id = :runId AND r.status = :status")
    List<EmployeePayrollRecord> findByTenantIdAndPayrollRunAndStatus(@Param("tenantId") UUID tenantId,
                                                                     @Param("runId") UUID payrollRunId,
                                                                     @Param("status") EmployeePayrollRecord.RecordStatus status);

    @Query("SELECT COUNT(r) FROM EmployeePayrollRecord r WHERE r.tenantId = :tenantId AND r.payrollRun.id = :runId")
    int countByTenantIdAndPayrollRun(@Param("tenantId") UUID tenantId, @Param("runId") UUID payrollRunId);

    @Query("SELECT COUNT(DISTINCT r.locationCode) FROM EmployeePayrollRecord r WHERE r.tenantId = :tenantId AND r.payrollRun.id = :runId")
    int countDistinctLocationsByTenantIdAndPayrollRun(@Param("tenantId") UUID tenantId, @Param("runId") UUID payrollRunId);

    @Query("SELECT SUM(r.grossPayLocal) FROM EmployeePayrollRecord r WHERE r.tenantId = :tenantId AND r.payrollRun.id = :runId AND r.localCurrency = :currency")
    BigDecimal getTotalGrossByCurrency(@Param("tenantId") UUID tenantId, @Param("runId") UUID payrollRunId, @Param("currency") String currency);

    @Query("SELECT r.localCurrency, SUM(r.grossPayBase), SUM(r.netPayBase), SUM(r.totalEmployerCostBase), COUNT(r) " +
            "FROM EmployeePayrollRecord r WHERE r.tenantId = :tenantId AND r.payrollRun.id = :runId " +
            "GROUP BY r.localCurrency")
    List<Object[]> getSummaryByCurrency(@Param("tenantId") UUID tenantId, @Param("runId") UUID payrollRunId);

    @Query("SELECT r.locationCode, SUM(r.grossPayBase), SUM(r.netPayBase), SUM(r.totalEmployerCostBase), COUNT(r) " +
            "FROM EmployeePayrollRecord r WHERE r.tenantId = :tenantId AND r.payrollRun.id = :runId " +
            "GROUP BY r.locationCode")
    List<Object[]> getSummaryByLocation(@Param("tenantId") UUID tenantId, @Param("runId") UUID payrollRunId);

    // ==================== DEPRECATED - DO NOT USE ====================

    /**
     * @deprecated Use {@link #findByIdAndTenantId(UUID, UUID)} instead.
     * This method is unsafe for multi-tenant environments.
     */
    @Override
    @Deprecated
    Optional<EmployeePayrollRecord> findById(UUID id);

    /**
     * @deprecated Use {@link #findAllByTenantId(UUID)} instead.
     * This method is unsafe for multi-tenant environments.
     */
    @Override
    @Deprecated
    List<EmployeePayrollRecord> findAll();

    /**
     * @deprecated Use {@link #deleteByIdAndTenantId(UUID, UUID)} instead.
     * This method is unsafe for multi-tenant environments.
     */
    @Override
    @Deprecated
    void deleteById(UUID id);

    /**
     * @deprecated Use {@link #findByTenantIdAndPayrollRun(UUID, UUID)} instead.
     * This method is unsafe for multi-tenant environments.
     */
    @Deprecated
    @Query("SELECT r FROM EmployeePayrollRecord r WHERE r.payrollRun.id = :runId ORDER BY r.employeeName")
    List<EmployeePayrollRecord> findByPayrollRun(@Param("runId") UUID payrollRunId);

    /**
     * @deprecated Use {@link #findByTenantIdAndPayrollRunAndLocation(UUID, UUID, String)} instead.
     * This method is unsafe for multi-tenant environments.
     */
    @Deprecated
    @Query("SELECT r FROM EmployeePayrollRecord r WHERE r.payrollRun.id = :runId AND r.locationCode = :locationCode")
    List<EmployeePayrollRecord> findByPayrollRunAndLocation(@Param("runId") UUID payrollRunId,
                                                            @Param("locationCode") String locationCode);

    /**
     * @deprecated Use {@link #findByTenantIdAndPayrollRunAndStatus(UUID, UUID, EmployeePayrollRecord.RecordStatus)} instead.
     * This method is unsafe for multi-tenant environments.
     */
    @Deprecated
    @Query("SELECT r FROM EmployeePayrollRecord r WHERE r.payrollRun.id = :runId AND r.status = :status")
    List<EmployeePayrollRecord> findByPayrollRunAndStatus(@Param("runId") UUID payrollRunId,
                                                          @Param("status") EmployeePayrollRecord.RecordStatus status);

    /**
     * @deprecated Use {@link #countByTenantIdAndPayrollRun(UUID, UUID)} instead.
     * This method is unsafe for multi-tenant environments.
     */
    @Deprecated
    @Query("SELECT COUNT(r) FROM EmployeePayrollRecord r WHERE r.payrollRun.id = :runId")
    int countByPayrollRun(@Param("runId") UUID payrollRunId);

    /**
     * @deprecated Use {@link #countDistinctLocationsByTenantIdAndPayrollRun(UUID, UUID)} instead.
     * This method is unsafe for multi-tenant environments.
     */
    @Deprecated
    @Query("SELECT COUNT(DISTINCT r.locationCode) FROM EmployeePayrollRecord r WHERE r.payrollRun.id = :runId")
    int countDistinctLocationsByPayrollRun(@Param("runId") UUID payrollRunId);
}
