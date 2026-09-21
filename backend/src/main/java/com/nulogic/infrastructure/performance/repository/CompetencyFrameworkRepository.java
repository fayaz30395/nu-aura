package com.nulogic.infrastructure.performance.repository;

import com.nulogic.domain.performance.CompetencyFramework;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CompetencyFrameworkRepository extends JpaRepository<CompetencyFramework, UUID> {

    List<CompetencyFramework> findAllByTenantId(UUID tenantId);

    Optional<CompetencyFramework> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<CompetencyFramework> findByTenantIdAndRoleFamilyAndIsActiveTrue(UUID tenantId, String roleFamily);
}
