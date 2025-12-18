package com.hrms.infrastructure.statutory.repository;
import com.hrms.domain.statutory.EmployeeTDSDeclaration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface EmployeeTDSDeclarationRepository extends JpaRepository<EmployeeTDSDeclaration, UUID> {
    Optional<EmployeeTDSDeclaration> findByTenantIdAndEmployeeIdAndFinancialYear(
        UUID tenantId, UUID employeeId, String financialYear);
    List<EmployeeTDSDeclaration> findByTenantIdAndFinancialYearAndStatus(
        UUID tenantId, String financialYear, EmployeeTDSDeclaration.DeclarationStatus status);
}
