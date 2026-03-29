package com.hrms.infrastructure.auth.repository;

import com.hrms.domain.auth.SamlIdentityProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SamlIdentityProviderRepository extends JpaRepository<SamlIdentityProvider, UUID> {

    @Query("SELECT s FROM SamlIdentityProvider s WHERE s.tenantId = :tenantId AND s.isDeleted = false")
    Optional<SamlIdentityProvider> findByTenantId(@Param("tenantId") UUID tenantId);

    @Query("SELECT s FROM SamlIdentityProvider s WHERE s.tenantId = :tenantId AND s.isActive = true AND s.isDeleted = false")
    Optional<SamlIdentityProvider> findActiveByTenantId(@Param("tenantId") UUID tenantId);

    @Query("SELECT s FROM SamlIdentityProvider s WHERE s.entityId = :entityId AND s.isDeleted = false")
    Optional<SamlIdentityProvider> findByEntityId(@Param("entityId") String entityId);

    @Query("SELECT s FROM SamlIdentityProvider s WHERE s.isActive = true AND s.isDeleted = false")
    List<SamlIdentityProvider> findAllActive();

    @Query("SELECT s FROM SamlIdentityProvider s WHERE s.isDeleted = false")
    List<SamlIdentityProvider> findAllProviders();

    boolean existsByTenantIdAndIsDeletedFalse(UUID tenantId);
}
