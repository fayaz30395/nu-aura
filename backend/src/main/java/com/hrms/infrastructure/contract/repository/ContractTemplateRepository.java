package com.hrms.infrastructure.contract.repository;

import com.hrms.domain.contract.ContractTemplate;
import com.hrms.domain.contract.ContractType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for ContractTemplate entity
 */
@Repository
public interface ContractTemplateRepository extends JpaRepository<ContractTemplate, UUID> {

    Optional<ContractTemplate> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<ContractTemplate> findByTenantIdAndIsActive(UUID tenantId, Boolean isActive, Pageable pageable);

    List<ContractTemplate> findByTenantIdAndType(UUID tenantId, ContractType type);

    Page<ContractTemplate> findByTenantId(UUID tenantId, Pageable pageable);

    @Query("SELECT ct FROM ContractTemplate ct WHERE ct.tenantId = :tenantId AND ct.isActive = true " +
            "AND LOWER(ct.name) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<ContractTemplate> searchActiveTemplates(
            @Param("tenantId") UUID tenantId,
            @Param("search") String search,
            Pageable pageable
    );
}
