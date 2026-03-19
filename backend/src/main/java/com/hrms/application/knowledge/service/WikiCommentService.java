package com.hrms.application.knowledge.service;

import com.hrms.api.knowledge.dto.CreateCommentRequest;
import com.hrms.api.knowledge.dto.WikiCommentDto;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.knowledge.WikiPage;
import com.hrms.domain.knowledge.WikiPageComment;
import com.hrms.infrastructure.knowledge.repository.WikiPageCommentRepository;
import com.hrms.infrastructure.knowledge.repository.WikiPageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WikiCommentService {

    private final WikiPageCommentRepository commentRepository;
    private final WikiPageRepository wikiPageRepository;
    private final FluenceNotificationService fluenceNotificationService;

    @Transactional
    public WikiCommentDto createComment(UUID pageId, CreateCommentRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        WikiPage page = wikiPageRepository.findById(pageId)
                .filter(p -> p.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Wiki page not found"));

        WikiPageComment.WikiPageCommentBuilder<?, ?> builder = WikiPageComment.builder()
                .page(page)
                .content(request.getContent())
                .mentions(request.getMentions())
                .likeCount(0)
                .isPinned(false);

        if (request.getParentCommentId() != null) {
            WikiPageComment parent = commentRepository.findById(request.getParentCommentId())
                    .filter(c -> c.getTenantId().equals(tenantId))
                    .orElseThrow(() -> new IllegalArgumentException("Parent comment not found"));
            builder.parentComment(parent);
        }

        WikiPageComment comment = builder.build();
        comment.setTenantId(tenantId);
        WikiPageComment saved = commentRepository.save(comment);

        // Update comment count on the page
        page.setCommentCount(page.getCommentCount() + 1);
        wikiPageRepository.save(page);

        log.info("Created wiki comment {} on page {} by user {}", saved.getId(), pageId, userId);

        // Send notifications for mentions, content owner, and watchers
        if (request.getMentions() != null && !request.getMentions().isEmpty()) {
            fluenceNotificationService.notifyMentionedUsers(
                    tenantId, new HashSet<>(request.getMentions()), userId,
                    "WIKI_PAGE", pageId, page.getTitle());
        }
        fluenceNotificationService.notifyCommentOnOwnContent(
                tenantId, page.getCreatedBy(), userId, "WIKI_PAGE", pageId, page.getTitle());
        fluenceNotificationService.notifyWatchers(
                tenantId, pageId, userId, "commented on", page.getTitle());

        return WikiCommentDto.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public Page<WikiCommentDto> getComments(UUID pageId, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        Page<WikiPageComment> topLevel = commentRepository
                .findByTenantIdAndPageIdAndParentCommentIsNullOrderByCreatedAtDesc(tenantId, pageId, pageable);

        return topLevel.map(comment -> {
            WikiCommentDto dto = WikiCommentDto.fromEntity(comment);
            List<WikiPageComment> replies = commentRepository.findByTenantIdAndParentCommentId(tenantId, comment.getId());
            dto.setReplies(replies.stream().map(WikiCommentDto::fromEntity).collect(Collectors.toList()));
            return dto;
        });
    }

    @Transactional
    public WikiCommentDto updateComment(UUID commentId, CreateCommentRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        WikiPageComment comment = commentRepository.findById(commentId)
                .filter(c -> c.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Comment not found"));

        if (!comment.getCreatedBy().equals(userId)) {
            throw new IllegalStateException("Only the author can edit this comment");
        }

        comment.setContent(request.getContent());
        if (request.getMentions() != null) {
            comment.setMentions(request.getMentions());
        }

        WikiPageComment saved = commentRepository.save(comment);
        log.info("Updated wiki comment {} by user {}", commentId, userId);
        return WikiCommentDto.fromEntity(saved);
    }

    @Transactional
    public void deleteComment(UUID pageId, UUID commentId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        WikiPageComment comment = commentRepository.findById(commentId)
                .filter(c -> c.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Comment not found"));

        comment.softDelete();
        commentRepository.save(comment);

        // Decrement comment count
        WikiPage page = wikiPageRepository.findById(pageId)
                .filter(p -> p.getTenantId().equals(tenantId))
                .orElse(null);
        if (page != null && page.getCommentCount() > 0) {
            page.setCommentCount(page.getCommentCount() - 1);
            wikiPageRepository.save(page);
        }

        log.info("Soft-deleted wiki comment {}", commentId);
    }

    @Transactional(readOnly = true)
    public WikiCommentDto getCommentById(UUID commentId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        WikiPageComment comment = commentRepository.findById(commentId)
                .filter(c -> c.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Comment not found"));

        WikiCommentDto dto = WikiCommentDto.fromEntity(comment);
        List<WikiPageComment> replies = commentRepository.findByTenantIdAndParentCommentId(tenantId, commentId);
        dto.setReplies(replies.stream().map(WikiCommentDto::fromEntity).collect(Collectors.toList()));
        return dto;
    }
}
