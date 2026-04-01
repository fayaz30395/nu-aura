package com.hrms.infrastructure.organization.repository;

import com.hrms.domain.organization.TalentPool;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TalentPoolRepository extends JpaRepository<TalentPool, UUID> {

    Optional<TalentPool> findByIdAndTenantId(UUID id, UUID tenantId);

    List<TalentPool> findByTenantIdAndIsActiveTrue(UUID tenantId);

    @Query("SELECT p FROM TalentPool p WHERE p.tenantId = :tenantId AND p.type = :type")
    List<TalentPool> findByType(@Param("tenantId") UUID tenantId, @Param("type") TalentPool.PoolType type);
}
