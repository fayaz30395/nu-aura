package com.hrms.infrastructure.recruitment.repository;

import com.hrms.domain.recruitment.ScorecardTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ScorecardTemplateRepository extends JpaRepository<ScorecardTemplate, UUID> {

    List<ScorecardTemplate> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);

    Optional<ScorecardTemplate> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<ScorecardTemplate> findByTenantIdAndIsDefaultTrue(UUID tenantId);
}
