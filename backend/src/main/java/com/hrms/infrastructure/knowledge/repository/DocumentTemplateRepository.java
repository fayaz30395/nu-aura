package com.hrms.infrastructure.knowledge.repository;

import com.hrms.domain.knowledge.DocumentTemplate;
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
public interface DocumentTemplateRepository extends JpaRepository<DocumentTemplate, UUID>, JpaSpecificationExecutor<DocumentTemplate> {

    Optional<DocumentTemplate> findByTenantIdAndSlug(UUID tenantId, String slug);

    Page<DocumentTemplate> findByTenantIdAndIsActiveTrue(UUID tenantId, Pageable pageable);

    Page<DocumentTemplate> findByTenantIdAndCategory(UUID tenantId, String category, Pageable pageable);

    Page<DocumentTemplate> findByTenantId(UUID tenantId, Pageable pageable);

    @Query("SELECT dt FROM KnowledgeDocumentTemplate dt WHERE dt.tenantId = :tenantId AND dt.isFeatured = true " +
           "AND dt.isActive = true ORDER BY dt.createdAt DESC")
    List<DocumentTemplate> findFeaturedTemplatesByTenant(@Param("tenantId") UUID tenantId);

    @Query("SELECT dt FROM KnowledgeDocumentTemplate dt WHERE dt.tenantId = :tenantId AND dt.isActive = true " +
           "ORDER BY dt.usageCount DESC LIMIT 10")
    List<DocumentTemplate> findPopularTemplatesByTenant(@Param("tenantId") UUID tenantId);

    boolean existsByTenantIdAndSlug(UUID tenantId, String slug);

    long countByTenantIdAndIsActiveTrue(UUID tenantId);
}
