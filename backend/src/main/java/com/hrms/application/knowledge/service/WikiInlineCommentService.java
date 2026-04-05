package com.hrms.application.knowledge.service;

import com.hrms.api.knowledge.dto.CreateInlineCommentRequest;
import com.hrms.api.knowledge.dto.ReplyToInlineCommentRequest;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.knowledge.WikiInlineComment;
import com.hrms.domain.knowledge.WikiInlineComment.InlineCommentStatus;
import com.hrms.infrastructure.knowledge.repository.WikiInlineCommentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class WikiInlineCommentService {

    private final WikiInlineCommentRepository wikiInlineCommentRepository;

    @Transactional(readOnly = true)
    public List<WikiInlineComment> getInlineComments(UUID pageId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return wikiInlineCommentRepository.findByTenantIdAndPageId(tenantId, pageId);
    }

    @Transactional(readOnly = true)
    public List<WikiInlineComment> getOpenInlineComments(UUID pageId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return wikiInlineCommentRepository.findByTenantIdAndPageIdAndStatus(tenantId, pageId, InlineCommentStatus.OPEN);
    }

    public WikiInlineComment createInlineComment(UUID pageId, CreateInlineCommentRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        WikiInlineComment comment = WikiInlineComment.builder()
                .tenantId(tenantId)
                .pageId(pageId)
                .anchorSelector(request.getAnchorSelector())
                .anchorText(request.getAnchorText())
                .anchorOffset(request.getAnchorOffset())
                .content(request.getContent())
                .status(InlineCommentStatus.OPEN)
                .build();

        WikiInlineComment saved = wikiInlineCommentRepository.save(comment);
        log.info("Created inline comment {} on page {} for tenant {}", saved.getId(), pageId, tenantId);
        return saved;
    }

    public WikiInlineComment replyToInlineComment(UUID commentId, ReplyToInlineCommentRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        WikiInlineComment parent = wikiInlineCommentRepository.findById(commentId)
                .filter(c -> c.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Inline comment not found"));

        WikiInlineComment reply = WikiInlineComment.builder()
                .tenantId(tenantId)
                .pageId(parent.getPageId())
                .parentComment(parent)
                .anchorSelector(parent.getAnchorSelector())
                .anchorText(parent.getAnchorText())
                .anchorOffset(parent.getAnchorOffset())
                .content(request.getContent())
                .status(InlineCommentStatus.OPEN)
                .build();

        WikiInlineComment saved = wikiInlineCommentRepository.save(reply);
        log.info("Created reply {} to inline comment {} for tenant {}", saved.getId(), commentId, tenantId);
        return saved;
    }

    public WikiInlineComment resolveInlineComment(UUID commentId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        WikiInlineComment comment = wikiInlineCommentRepository.findById(commentId)
                .filter(c -> c.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Inline comment not found"));

        comment.setStatus(InlineCommentStatus.RESOLVED);
        comment.setResolvedAt(LocalDateTime.now());
        comment.setResolvedBy(userId);

        WikiInlineComment saved = wikiInlineCommentRepository.save(comment);
        log.info("Resolved inline comment {} by user {} for tenant {}", commentId, userId, tenantId);
        return saved;
    }

    public void deleteInlineComment(UUID commentId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        WikiInlineComment comment = wikiInlineCommentRepository.findById(commentId)
                .filter(c -> c.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Inline comment not found"));

        comment.softDelete();
        wikiInlineCommentRepository.save(comment);
        log.info("Soft-deleted inline comment {} for tenant {}", commentId, tenantId);
    }

    @Transactional(readOnly = true)
    public List<WikiInlineComment> getReplies(UUID commentId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return wikiInlineCommentRepository.findByTenantIdAndParentCommentId(tenantId, commentId);
    }

    @Transactional(readOnly = true)
    public long countOpenComments(UUID pageId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return wikiInlineCommentRepository.countByTenantIdAndPageIdAndStatus(tenantId, pageId, InlineCommentStatus.OPEN);
    }
}
