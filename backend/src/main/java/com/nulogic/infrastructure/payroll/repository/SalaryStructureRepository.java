package com.nulogic.infrastructure.payroll.repository;

import com.nulogic.domain.payroll.SalaryStructure;
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
public interface SalaryStructureRepository extends JpaRepository<SalaryStructure, UUID> {

    Optional<SalaryStructure> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<SalaryStructure> findAllByTenantId(UUID tenantId, Pageable pageable);

    List<SalaryStructure> findAllByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId);

    Page<SalaryStructure> findAllByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId, Pageable pageable);

    @Query("SELECT s FROM SalaryStructure s WHERE s.tenantId = :tenantId AND s.employeeId = :employeeId " +
            "AND s.effectiveDate <= :date AND s.isActive = true " +
            "ORDER BY s.effectiveDate DESC")
    Optional<SalaryStructure> findActiveByEmployeeIdAndDate(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("date") LocalDate date
    );

    /**
     * Find the latest active salary structure for an employee.
     * Used for statutory enrollment eligibility checks.
     */
    @Query("SELECT s FROM SalaryStructure s WHERE s.tenantId = :tenantId AND s.employeeId = :employeeId " +
            "AND s.isActive = true ORDER BY s.effectiveDate DESC, s.createdAt DESC")
    Optional<SalaryStructure> findLatestActiveByTenantIdAndEmployeeId(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId
    );

    Page<SalaryStructure> findAllByTenantIdAndIsActive(UUID tenantId, Boolean isActive, Pageable pageable);

    boolean existsByTenantIdAndEmployeeIdAndEffectiveDate(UUID tenantId, UUID employeeId, LocalDate effectiveDate);

    /**
     * Count distinct employees who have at least one active salary structure.
     * Used for payroll pre-flight validation to detect employees missing a structure.
     */
    @Query("SELECT COUNT(DISTINCT s.employeeId) FROM SalaryStructure s " +
            "WHERE s.tenantId = :tenantId AND s.isActive = true")
    long countDistinctEmployeesWithActiveSalaryStructure(@Param("tenantId") UUID tenantId);

    /**
     * Count all (non-deleted) salary structures for a tenant.
     * Used as the denominator for salary-percentile calculations; mirrors the
     * total size of {@code findAllByTenantId(...)} without loading rows into heap.
     */
    @Query("SELECT COUNT(s) FROM SalaryStructure s WHERE s.tenantId = :tenantId")
    long countByTenantId(@Param("tenantId") UUID tenantId);

    /**
     * Count salary structures for a tenant whose basic salary is strictly below
     * the given threshold. Rows with a null basic salary are excluded (JPQL
     * comparison predicates are false for null operands).
     * Used as the numerator for salary-percentile calculations.
     */
    @Query("SELECT COUNT(s) FROM SalaryStructure s " +
            "WHERE s.tenantId = :tenantId AND s.basicSalary < :basicSalary")
    long countByTenantIdAndBasicSalaryLessThan(
            @Param("tenantId") UUID tenantId,
            @Param("basicSalary") BigDecimal basicSalary
    );

    /**
     * Count active salary structures with a non-null basic salary for a tenant.
     * Used as the divisor when computing the average active salary.
     */
    @Query("SELECT COUNT(s) FROM SalaryStructure s " +
            "WHERE s.tenantId = :tenantId AND s.isActive = true AND s.basicSalary IS NOT NULL")
    long countActiveWithBasicSalaryByTenantId(@Param("tenantId") UUID tenantId);

    /**
     * Sum the basic salary of active salary structures (non-null) for a tenant.
     * Returns null when no matching rows exist (SQL SUM over an empty set).
     * Used as the dividend when computing the average active salary.
     */
    @Query("SELECT SUM(s.basicSalary) FROM SalaryStructure s " +
            "WHERE s.tenantId = :tenantId AND s.isActive = true AND s.basicSalary IS NOT NULL")
    BigDecimal sumActiveBasicSalaryByTenantId(@Param("tenantId") UUID tenantId);
}
