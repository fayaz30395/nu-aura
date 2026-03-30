package com.hrms.infrastructure.statutory.repository;

import com.hrms.domain.statutory.LWFDeduction;
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
public interface LWFDeductionRepository extends JpaRepository<LWFDeduction, UUID> {

    List<LWFDeduction> findByTenantIdAndDeductionMonthAndDeductionYearOrderByStateCodeAsc(
            UUID tenantId, Integer month, Integer year);

    Page<LWFDeduction> findByTenantIdAndDeductionMonthAndDeductionYear(
            UUID tenantId, Integer month, Integer year, Pageable pageable);

    List<LWFDeduction> findByTenantIdAndEmployeeIdOrderByDeductionYearDescDeductionMonthDesc(
            UUID tenantId, UUID employeeId);

    List<LWFDeduction> findByTenantIdAndEmployeeIdAndDeductionYear(
            UUID tenantId, UUID employeeId, Integer year);

    Optional<LWFDeduction> findByTenantIdAndEmployeeIdAndDeductionMonthAndDeductionYear(
            UUID tenantId, UUID employeeId, Integer month, Integer year);

    @Query("SELECT d FROM LWFDeduction d WHERE d.tenantId = :tenantId " +
            "AND d.deductionMonth = :month AND d.deductionYear = :year " +
            "AND d.stateCode = :stateCode ORDER BY d.employeeId")
    List<LWFDeduction> findByTenantIdAndPeriodAndState(
            @Param("tenantId") UUID tenantId,
            @Param("month") Integer month,
            @Param("year") Integer year,
            @Param("stateCode") String stateCode);

    boolean existsByTenantIdAndEmployeeIdAndDeductionMonthAndDeductionYear(
            UUID tenantId, UUID employeeId, Integer month, Integer year);
}
