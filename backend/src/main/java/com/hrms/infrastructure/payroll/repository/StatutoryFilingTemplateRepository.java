package com.hrms.infrastructure.payroll.repository;

import com.hrms.domain.payroll.StatutoryFilingTemplate;
import com.hrms.domain.payroll.StatutoryFilingTemplate.FilingType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StatutoryFilingTemplateRepository extends JpaRepository<StatutoryFilingTemplate, UUID> {

    List<StatutoryFilingTemplate> findByTenantIdAndIsActiveTrue(UUID tenantId);

    Optional<StatutoryFilingTemplate> findByTenantIdAndFilingType(UUID tenantId, FilingType filingType);
}
