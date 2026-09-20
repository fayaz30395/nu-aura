package com.nulogic.infrastructure.resourcemanagement.repository;

import com.nulogic.domain.resourcemanagement.ResourcePool;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ResourcePoolRepository extends JpaRepository<ResourcePool, UUID> {

    Optional<ResourcePool> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<ResourcePool> findAllByTenantId(UUID tenantId, Pageable pageable);

    Page<ResourcePool> findAllByTenantIdAndPoolType(UUID tenantId, ResourcePool.PoolType poolType, Pageable pageable);
}
