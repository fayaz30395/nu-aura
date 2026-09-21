package com.nulogic.infrastructure.performance.repository;

import com.nulogic.domain.performance.CompetencyRequirement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CompetencyRequirementRepository extends JpaRepository<CompetencyRequirement, UUID> {

    List<CompetencyRequirement> findByFrameworkIdAndTenantId(UUID frameworkId, UUID tenantId);

    Optional<CompetencyRequirement> findByIdAndTenantId(UUID id, UUID tenantId);
}
