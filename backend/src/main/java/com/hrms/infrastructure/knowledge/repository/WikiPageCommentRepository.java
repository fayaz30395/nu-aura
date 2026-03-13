package com.hrms.infrastructure.knowledge.repository;

import com.hrms.domain.knowledge.WikiPageComment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface WikiPageCommentRepository extends JpaRepository<WikiPageComment, UUID> {

    Page<WikiPageComment> findByTenantIdAndPageId(UUID tenantId, UUID pageId, Pageable pageable);

    Page<WikiPageComment> findByTenantIdAndPageIdAndParentCommentIsNull(UUID tenantId, UUID pageId, Pageable pageable);

    List<WikiPageComment> findByTenantIdAndParentCommentId(UUID tenantId, UUID parentCommentId);

    @Query("SELECT wc FROM WikiPageComment wc WHERE wc.tenantId = :tenantId AND wc.page.id = :pageId " +
           "AND wc.isPinned = true ORDER BY wc.createdAt DESC")
    List<WikiPageComment> findPinnedCommentsByPage(@Param("tenantId") UUID tenantId, @Param("pageId") UUID pageId);

    long countByTenantIdAndPageId(UUID tenantId, UUID pageId);
}
