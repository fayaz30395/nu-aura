package com.hrms.infrastructure.statutory.repository;

import com.hrms.domain.statutory.LWFConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LWFConfigurationRepository extends JpaRepository<LWFConfiguration, UUID> {

    List<LWFConfiguration> findByTenantIdAndIsActiveTrue(UUID tenantId);

    Optional<LWFConfiguration> findByTenantIdAndStateCodeAndIsActiveTrue(UUID tenantId, String stateCode);

    List<LWFConfiguration> findByTenantIdOrderByStateNameAsc(UUID tenantId);

    boolean existsByTenantIdAndStateCodeAndIsActiveTrue(UUID tenantId, String stateCode);
}
