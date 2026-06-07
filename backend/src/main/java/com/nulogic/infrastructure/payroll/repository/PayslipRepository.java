package com.nulogic.infrastructure.payroll.repository;

import com.nulogic.domain.payroll.Payslip;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PayslipRepository extends JpaRepository<Payslip, UUID> {

    Page<Payslip> findAllByTenantId(UUID tenantId, Pageable pageable);

    Page<Payslip> findAllByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId, Pageable pageable);

    List<Payslip> findAllByTenantIdAndPayrollRunId(UUID tenantId, UUID payrollRunId);

    List<Payslip> findByTenantIdAndPayrollRunId(UUID tenantId, UUID payrollRunId);

    @Query("SELECT p FROM Payslip p WHERE p.tenantId = :tenantId AND p.payDate BETWEEN :startDate AND :endDate")
    List<Payslip> findByTenantIdAndPayPeriodBetween(
            @Param("tenantId") UUID tenantId,
            @Param("startDate") java.time.LocalDate startDate,
            @Param("endDate") java.time.LocalDate endDate
    );

    Page<Payslip> findAllByTenantIdAndPayrollRunId(UUID tenantId, UUID payrollRunId, Pageable pageable);

    Optional<Payslip> findByTenantIdAndEmployeeIdAndPayPeriodYearAndPayPeriodMonth(
            UUID tenantId,
            UUID employeeId,
            Integer year,
            Integer month
    );

    Optional<Payslip> findByEmployeeIdAndPayPeriodYearAndPayPeriodMonthAndTenantId(
            UUID employeeId,
            Integer year,
            Integer month,
            UUID tenantId
    );

    boolean existsByTenantIdAndEmployeeIdAndPayPeriodYearAndPayPeriodMonth(
            UUID tenantId,
            UUID employeeId,
            Integer year,
            Integer month
    );

    @Query("SELECT p FROM Payslip p WHERE p.tenantId = :tenantId AND p.employeeId = :employeeId " +
            "AND p.payPeriodYear = :year ORDER BY p.payPeriodMonth DESC")
    List<Payslip> findByEmployeeIdAndYear(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("year") Integer year
    );

    @Query("SELECT p FROM Payslip p WHERE p.tenantId = :tenantId AND p.employeeId = :employeeId " +
            "ORDER BY p.payPeriodYear DESC, p.payPeriodMonth DESC")
    Page<Payslip> findAllByEmployeeIdOrderByPeriodDesc(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            Pageable pageable
    );

    /**
     * Find all payslips for a tenant in a specific pay period (used by statutory filing generators).
     */
    List<Payslip> findByTenantIdAndPayPeriodMonthAndPayPeriodYear(
            UUID tenantId, Integer payPeriodMonth, Integer payPeriodYear);

    // Analytics methods
    @Query("SELECT COUNT(p) FROM Payslip p WHERE p.tenantId = :tenantId AND p.payPeriodYear = :year AND p.payPeriodMonth = :month")
    Long countByTenantIdAndYearAndMonth(
            @Param("tenantId") UUID tenantId,
            @Param("year") Integer year,
            @Param("month") Integer month
    );

    @Query("SELECT COALESCE(SUM(p.netSalary), 0) FROM Payslip p WHERE p.tenantId = :tenantId AND p.payPeriodYear = :year AND p.payPeriodMonth = :month")
    BigDecimal sumNetSalaryByTenantIdAndYearAndMonth(
            @Param("tenantId") UUID tenantId,
            @Param("year") Integer year,
            @Param("month") Integer month
    );

    /**
     * Batch query: returns payroll totals for all months in [startYear/startMonth .. endYear/endMonth].
     * Each element is Object[]{year (Integer), month (Integer), total (BigDecimal)}.
     * Replaces 12 individual sumNetSalaryByTenantIdAndYearAndMonth calls in trend-chart generation.
     */
    @Query("SELECT p.payPeriodYear, p.payPeriodMonth, COALESCE(SUM(p.netSalary), 0) " +
            "FROM Payslip p " +
            "WHERE p.tenantId = :tenantId " +
            "  AND (p.payPeriodYear > :startYear OR (p.payPeriodYear = :startYear AND p.payPeriodMonth >= :startMonth)) " +
            "  AND (p.payPeriodYear < :endYear   OR (p.payPeriodYear = :endYear   AND p.payPeriodMonth <= :endMonth)) " +
            "GROUP BY p.payPeriodYear, p.payPeriodMonth")
    List<Object[]> sumNetSalaryByTenantIdAndYearMonthRange(
            @Param("tenantId") UUID tenantId,
            @Param("startYear") Integer startYear,
            @Param("startMonth") Integer startMonth,
            @Param("endYear") Integer endYear,
            @Param("endMonth") Integer endMonth
    );

    // Get net salary for employee for a specific month
    @Query("SELECT p.netSalary FROM Payslip p WHERE p.tenantId = :tenantId AND p.employeeId = :employeeId AND p.payPeriodYear = :year AND p.payPeriodMonth = :month")
    BigDecimal findNetSalaryByEmployeeIdAndYearAndMonth(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("year") Integer year,
            @Param("month") Integer month
    );

    // Get payslip details for employee for a specific month
    @Query("SELECT p.grossSalary, p.netSalary, p.totalDeductions, p.incomeTax FROM Payslip p " +
            "WHERE p.tenantId = :tenantId AND p.employeeId = :employeeId AND p.payPeriodYear = :year AND p.payPeriodMonth = :month")
    Object[] findPayslipDetailsByEmployeeIdAndYearAndMonth(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("year") Integer year,
            @Param("month") Integer month
    );

    // ==================== N+1 PREVENTION: NATIVE JOIN QUERIES ====================

    /**
     * Fetch all payslips for a payroll run with employee first/last name joined in a
     * single SQL query — prevents N+1 when rendering payslip batch reports where each
     * row needs the employee display name.
     *
     * <p>Payslip stores employeeId as a plain UUID scalar column (no @ManyToOne ORM
     * association), so JPQL JOIN FETCH is not applicable. This native query joins the
     * employees table once per payroll run rather than issuing one SELECT per payslip.</p>
     *
     * <p>Returns Object[] per row: {p.*, e.first_name, e.last_name, e.employee_code}</p>
     * Use instead of findAllByTenantIdAndPayrollRunId when the caller needs employee
     * identity columns alongside payslip financial data.</p>
     */
    // SOFT_DELETE_GUARD (S13-B): native query needs explicit filter since @Where is bypassed
    @Query(value = "SELECT p.*, e.first_name, e.last_name, e.employee_code " +
            "FROM payslips p " +
            "LEFT JOIN employees e ON e.id = p.employee_id AND e.tenant_id = :tenantId AND e.is_deleted = false " +
            "WHERE p.tenant_id = :tenantId AND p.payroll_run_id = :runId " +
            "AND p.is_deleted = false " +
            "ORDER BY e.last_name ASC, e.first_name ASC",
            nativeQuery = true)
    List<Object[]> findByRunWithEmployee(
            @Param("tenantId") UUID tenantId,
            @Param("runId") UUID runId
    );

    /**
     * Fetch payslips for a pay period with employee data joined in one query — used by
     * statutory filing generators (PF, ESI, etc.) that need employee codes alongside
     * salary components without a per-row employee lookup.
     */
    // SOFT_DELETE_GUARD (S12-F): native query needs explicit filter since @Where is bypassed —
    // statutory filings (PF/ESI) MUST exclude soft-deleted payslips and employees
    @Query(value = "SELECT p.*, e.first_name, e.last_name, e.employee_code " +
            "FROM payslips p " +
            "LEFT JOIN employees e ON e.id = p.employee_id AND e.tenant_id = :tenantId AND e.is_deleted = false " +
            "WHERE p.tenant_id = :tenantId " +
            "AND p.is_deleted = false " +
            "AND p.pay_period_month = :month AND p.pay_period_year = :year " +
            "ORDER BY e.last_name ASC, e.first_name ASC",
            nativeQuery = true)
    List<Object[]> findByPeriodWithEmployee(
            @Param("tenantId") UUID tenantId,
            @Param("month") Integer month,
            @Param("year") Integer year
    );

    /**
     * F1.2-wiring: Returns the gross salary from the most recent payslip for an employee
     * whose pay period falls at or before the given ESI contribution-period start date.
     *
     * <p>Used by {@code StatutoryDeductionService} to detect whether an employee crossed the
     * ₹21,000 ESI ceiling mid-contribution-period (Reg.40, ESI Central Rules 1950).
     * The result is the gross on the payslip whose (year, month) sorts latest among all
     * payslips that are ≤ {@code periodStart}.</p>
     *
     * <p>Returns {@code null} (via {@link Optional#empty()}) when no prior payslip exists
     * (new joiner) — caller must treat absence as "unknown" and default to the safe
     * exempt-above-ceiling behaviour.</p>
     */
    @Query("SELECT p.grossSalary FROM Payslip p " +
            "WHERE p.employeeId = :employeeId " +
            "  AND (p.payPeriodYear < :periodYear " +
            "       OR (p.payPeriodYear = :periodYear AND p.payPeriodMonth <= :periodMonth)) " +
            "ORDER BY p.payPeriodYear DESC, p.payPeriodMonth DESC")
    List<BigDecimal> findGrossAtOrBeforePeriodStart(
            @Param("employeeId") UUID employeeId,
            @Param("periodYear") Integer periodYear,
            @Param("periodMonth") Integer periodMonth,
            Pageable pageable
    );
}
