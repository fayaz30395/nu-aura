package com.hrms.infrastructure.knowledge.repository;

import com.hrms.domain.knowledge.SpaceMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SpaceMemberRepository extends JpaRepository<SpaceMember, UUID> {

    List<SpaceMember> findByTenantIdAndSpaceId(UUID tenantId, UUID spaceId);

    Optional<SpaceMember> findByTenantIdAndSpaceIdAndUserId(UUID tenantId, UUID spaceId, UUID userId);

    boolean existsByTenantIdAndSpaceIdAndUserId(UUID tenantId, UUID spaceId, UUID userId);

    void deleteByTenantIdAndSpaceIdAndUserId(UUID tenantId, UUID spaceId, UUID userId);

    long countByTenantIdAndSpaceId(UUID tenantId, UUID spaceId);
}
