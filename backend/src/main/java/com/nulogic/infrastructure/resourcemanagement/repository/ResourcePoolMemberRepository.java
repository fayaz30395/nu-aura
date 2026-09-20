package com.nulogic.infrastructure.resourcemanagement.repository;

import com.nulogic.domain.resourcemanagement.ResourcePoolMember;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ResourcePoolMemberRepository extends JpaRepository<ResourcePoolMember, UUID> {

    Page<ResourcePoolMember> findAllByTenantIdAndPoolId(UUID tenantId, UUID poolId, Pageable pageable);

    Optional<ResourcePoolMember> findByTenantIdAndPoolIdAndEmployeeId(UUID tenantId, UUID poolId, UUID employeeId);

    boolean existsByTenantIdAndPoolIdAndEmployeeId(UUID tenantId, UUID poolId, UUID employeeId);

    long countByTenantIdAndPoolId(UUID tenantId, UUID poolId);

    void deleteByTenantIdAndPoolIdAndEmployeeId(UUID tenantId, UUID poolId, UUID employeeId);
}
