package com.hrms.infrastructure.payroll.repository;

import com.hrms.domain.payroll.Payslip;
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
        @Param("tenantId")    UUID tenantId,
        @Param("startYear")   Integer startYear,
        @Param("startMonth")  Integer startMonth,
        @Param("endYear")     Integer endYear,
        @Param("endMonth")    Integer endMonth
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
}
