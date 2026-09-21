package com.nulogic.infrastructure.performance.repository;

import com.nulogic.domain.performance.CompetencyFramework;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CompetencyFrameworkRepository extends JpaRepository<CompetencyFramework, UUID> {

    @Query("SELECT DISTINCT f FROM CompetencyFramework f LEFT JOIN FETCH f.requirements WHERE f.tenantId = :tenantId")
    List<CompetencyFramework> findAllByTenantId(@Param("tenantId") UUID tenantId);

    @Query("SELECT f FROM CompetencyFramework f LEFT JOIN FETCH f.requirements WHERE f.id = :id AND f.tenantId = :tenantId")
    Optional<CompetencyFramework> findByIdAndTenantId(@Param("id") UUID id, @Param("tenantId") UUID tenantId);

    Optional<CompetencyFramework> findByTenantIdAndRoleFamilyAndIsActiveTrue(UUID tenantId, String roleFamily);
}
