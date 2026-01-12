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

    Page<SalaryStructure> findAllByTenantIdAndIsActive(UUID tenantId, Boolean isActive, Pageable pageable);

    boolean existsByTenantIdAndEmployeeIdAndEffectiveDate(UUID tenantId, UUID employeeId, LocalDate effectiveDate);
}
