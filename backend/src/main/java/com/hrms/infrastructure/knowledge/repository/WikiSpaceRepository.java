package com.hrms.infrastructure.knowledge.repository;

import com.hrms.domain.knowledge.WikiSpace;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WikiSpaceRepository extends JpaRepository<WikiSpace, UUID>, JpaSpecificationExecutor<WikiSpace> {

    Optional<WikiSpace> findByTenantIdAndSlug(UUID tenantId, String slug);

    Page<WikiSpace> findByTenantIdAndIsArchivedFalse(UUID tenantId, Pageable pageable);

    Page<WikiSpace> findByTenantId(UUID tenantId, Pageable pageable);

    List<WikiSpace> findByTenantIdAndIsArchivedFalseOrderByOrderIndex(UUID tenantId);

    @Query("SELECT ws FROM WikiSpace ws WHERE ws.tenantId = :tenantId AND ws.isArchived = false " +
           "ORDER BY ws.orderIndex ASC")
    List<WikiSpace> findActiveSpacesByTenant(@Param("tenantId") UUID tenantId);

    boolean existsByTenantIdAndSlug(UUID tenantId, String slug);
}
