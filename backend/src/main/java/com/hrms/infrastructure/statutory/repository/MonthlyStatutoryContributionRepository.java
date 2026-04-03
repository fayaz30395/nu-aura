package com.hrms.infrastructure.statutory.repository;

import com.hrms.domain.statutory.MonthlyStatutoryContribution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MonthlyStatutoryContributionRepository extends JpaRepository<MonthlyStatutoryContribution, UUID> {
    List<MonthlyStatutoryContribution> findByTenantIdAndEmployeeIdOrderByYearDescMonthDesc(
            UUID tenantId, UUID employeeId);

    List<MonthlyStatutoryContribution> findByTenantIdAndMonthAndYear(
            UUID tenantId, Integer month, Integer year);

    Optional<MonthlyStatutoryContribution> findByPayslipId(UUID payslipId);
}
