package com.nulogic.infrastructure.statutory.repository;

import com.nulogic.domain.statutory.ESIConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ESIConfigRepository extends JpaRepository<ESIConfig, UUID> {
    List<ESIConfig> findByTenantIdAndIsActiveTrue(UUID tenantId);
}
