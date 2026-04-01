package com.hrms.infrastructure.knowledge.repository;

import com.hrms.domain.knowledge.TemplateInstantiation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface TemplateInstantiationRepository extends JpaRepository<TemplateInstantiation, UUID> {

    Page<TemplateInstantiation> findByTenantId(UUID tenantId, Pageable pageable);

    Page<TemplateInstantiation> findByTenantIdAndTemplateId(UUID tenantId, UUID templateId, Pageable pageable);

    @Query("SELECT ti FROM TemplateInstantiation ti WHERE ti.tenantId = :tenantId AND ti.createdBy = :userId " +
           "ORDER BY ti.createdAt DESC")
    Page<TemplateInstantiation> findByTenantIdAndCreatedBy(@Param("tenantId") UUID tenantId, @Param("userId") UUID userId, Pageable pageable);

    long countByTenantIdAndTemplateId(UUID tenantId, UUID templateId);
}
