package com.hrms.infrastructure.payroll.repository;

import com.hrms.domain.payroll.SalaryStructure;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SalaryStructureRepository extends JpaRepository<SalaryStructure, UUID> {

    Page<SalaryStructure> findAllByTenantId(UUID tenantId, Pageable pageable);

    List<SalaryStructure> findAllByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId);

    Page<SalaryStructureRepository> findAllByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId, Pageable pageable);

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
}
