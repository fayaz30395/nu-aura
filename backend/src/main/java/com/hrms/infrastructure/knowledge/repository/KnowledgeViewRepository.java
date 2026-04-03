package com.hrms.infrastructure.knowledge.repository;

import com.hrms.domain.knowledge.KnowledgeView;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface KnowledgeViewRepository extends JpaRepository<KnowledgeView, UUID> {

    Page<KnowledgeView> findByTenantIdAndContentTypeAndContentId(
            UUID tenantId, KnowledgeView.ContentType contentType, UUID contentId, Pageable pageable);

    Page<KnowledgeView> findByTenantIdAndUserId(UUID tenantId, UUID userId, Pageable pageable);

    @Query("SELECT COUNT(kv) FROM KnowledgeView kv WHERE kv.tenantId = :tenantId " +
            "AND kv.contentType = :contentType AND kv.contentId = :contentId")
    long countViewsByContent(@Param("tenantId") UUID tenantId,
                             @Param("contentType") KnowledgeView.ContentType contentType,
                             @Param("contentId") UUID contentId);

    long countByTenantId(UUID tenantId);
}
