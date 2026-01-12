package com.hrms.infrastructure.tax.repository;

import com.hrms.domain.tax.TaxRegimeComparison;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TaxRegimeComparisonRepository extends JpaRepository<TaxRegimeComparison, UUID>, JpaSpecificationExecutor<TaxRegimeComparison> {

    Optional<TaxRegimeComparison> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<TaxRegimeComparison> findByTenantIdAndEmployeeIdAndFinancialYear(
            UUID tenantId, UUID employeeId, String financialYear);

    List<TaxRegimeComparison> findByTenantIdAndEmployeeIdOrderByFinancialYearDesc(
            UUID tenantId, UUID employeeId);
}
