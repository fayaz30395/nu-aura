package com.hrms.common.security;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApiKeyRepository extends JpaRepository<ApiKey, UUID> {

    Optional<ApiKey> findByKeyHash(String keyHash);

    @Query("SELECT a FROM ApiKey a WHERE a.keyHash = :keyHash AND a.isActive = true AND " +
           "(a.expiresAt IS NULL OR a.expiresAt > CURRENT_TIMESTAMP)")
    Optional<ApiKey> findValidByKeyHash(@Param("keyHash") String keyHash);

    List<ApiKey> findByTenantIdAndIsActiveTrue(UUID tenantId);

    List<ApiKey> findByTenantId(UUID tenantId);

    boolean existsByKeyHash(String keyHash);

    Optional<ApiKey> findByIdAndTenantId(UUID id, UUID tenantId);
}
