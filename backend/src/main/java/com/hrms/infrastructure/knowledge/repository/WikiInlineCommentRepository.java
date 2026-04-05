package com.hrms.infrastructure.knowledge.repository;

import com.hrms.domain.knowledge.WikiInlineComment;
import com.hrms.domain.knowledge.WikiInlineComment.InlineCommentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface WikiInlineCommentRepository extends JpaRepository<WikiInlineComment, UUID> {

    List<WikiInlineComment> findByTenantIdAndPageId(UUID tenantId, UUID pageId);

    List<WikiInlineComment> findByTenantIdAndPageIdAndStatus(UUID tenantId, UUID pageId, InlineCommentStatus status);

    List<WikiInlineComment> findByTenantIdAndParentCommentId(UUID tenantId, UUID parentCommentId);

    long countByTenantIdAndPageIdAndStatus(UUID tenantId, UUID pageId, InlineCommentStatus status);
}
