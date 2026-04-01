package com.hrms.infrastructure.report.repository;

import com.hrms.domain.report.ReportTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReportTemplateRepository extends JpaRepository<ReportTemplate, UUID> {

    List<ReportTemplate> findByTenantIdAndIsDeletedFalse(UUID tenantId);

    List<ReportTemplate> findByTenantIdAndModuleAndIsDeletedFalse(UUID tenantId, String module);

    Optional<ReportTemplate> findByIdAndTenantIdAndIsDeletedFalse(UUID id, UUID tenantId);
}
