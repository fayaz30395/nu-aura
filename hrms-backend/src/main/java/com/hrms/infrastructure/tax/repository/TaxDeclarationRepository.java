package com.hrms.infrastructure.tax.repository;

import com.hrms.domain.tax.TaxDeclaration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TaxDeclarationRepository extends JpaRepository<TaxDeclaration, UUID>, JpaSpecificationExecutor<TaxDeclaration> {

    Optional<TaxDeclaration> findByIdAndTenantId(UUID id, UUID tenantId);

    List<TaxDeclaration> findByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId);

    Optional<TaxDeclaration> findByTenantIdAndEmployeeIdAndFinancialYear(UUID tenantId, UUID employeeId, String financialYear);

    List<TaxDeclaration> findByTenantIdAndFinancialYear(UUID tenantId, String financialYear);

    List<TaxDeclaration> findByTenantIdAndStatus(UUID tenantId, TaxDeclaration.DeclarationStatus status);

    List<TaxDeclaration> findByTenantIdAndEmployeeIdOrderByFinancialYearDesc(UUID tenantId, UUID employeeId);
}
