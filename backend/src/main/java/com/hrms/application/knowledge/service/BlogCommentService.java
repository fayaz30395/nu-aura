package com.hrms.application.knowledge.service;

import com.hrms.api.knowledge.dto.CreateCommentRequest;
import com.hrms.api.knowledge.dto.WikiCommentDto;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.knowledge.BlogComment;
import com.hrms.domain.knowledge.BlogPost;
import com.hrms.infrastructure.knowledge.repository.BlogCommentRepository;
import com.hrms.infrastructure.knowledge.repository.BlogPostRepository;
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
public class BlogCommentService {

    private final BlogCommentRepository commentRepository;
    private final BlogPostRepository blogPostRepository;
    private final FluenceNotificationService fluenceNotificationService;

    @Transactional
    public WikiCommentDto createComment(UUID postId, CreateCommentRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        BlogPost post = blogPostRepository.findById(postId)
                .filter(p -> p.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Blog post not found"));

        BlogComment.BlogCommentBuilder<?, ?> builder = BlogComment.builder()
                .post(post)
                .content(request.getContent())
                .mentions(request.getMentions())
                .likeCount(0)
                .isApproved(false);

        if (request.getParentCommentId() != null) {
            BlogComment parent = commentRepository.findById(request.getParentCommentId())
                    .filter(c -> c.getTenantId().equals(tenantId))
                    .orElseThrow(() -> new IllegalArgumentException("Parent comment not found"));
            builder.parentComment(parent);
        }

        BlogComment comment = builder.build();
        comment.setTenantId(tenantId);
        BlogComment saved = commentRepository.save(comment);

        // Update comment count on the post
        post.setCommentCount(post.getCommentCount() + 1);
        blogPostRepository.save(post);

        log.info("Created blog comment {} on post {} by user {}", saved.getId(), postId, userId);

        // Send notifications for mentions, content owner, and watchers
        if (request.getMentions() != null && !request.getMentions().isEmpty()) {
            fluenceNotificationService.notifyMentionedUsers(
                    tenantId, new HashSet<>(request.getMentions()), userId,
                    "BLOG_POST", postId, post.getTitle());
        }
        fluenceNotificationService.notifyCommentOnOwnContent(
                tenantId, post.getCreatedBy(), userId, "BLOG_POST", postId, post.getTitle());

        return toBlogCommentDto(saved);
    }

    @Transactional(readOnly = true)
    public Page<WikiCommentDto> getComments(UUID postId, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        Page<BlogComment> topLevel = commentRepository
                .findByTenantIdAndPostIdAndParentCommentIsNull(tenantId, postId, pageable);

        return topLevel.map(comment -> {
            WikiCommentDto dto = toBlogCommentDto(comment);
            List<BlogComment> replies = commentRepository.findByTenantIdAndParentCommentId(tenantId, comment.getId());
            dto.setReplies(replies.stream().map(this::toBlogCommentDto).collect(Collectors.toList()));
            return dto;
        });
    }

    @Transactional
    public WikiCommentDto updateComment(UUID commentId, CreateCommentRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        BlogComment comment = commentRepository.findById(commentId)
                .filter(c -> c.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Comment not found"));

        if (!comment.getCreatedBy().equals(userId)) {
            throw new IllegalStateException("Only the author can edit this comment");
        }

        comment.setContent(request.getContent());
        if (request.getMentions() != null) {
            comment.setMentions(request.getMentions());
        }

        BlogComment saved = commentRepository.save(comment);
        log.info("Updated blog comment {} by user {}", commentId, userId);
        return toBlogCommentDto(saved);
    }

    @Transactional
    public void deleteComment(UUID postId, UUID commentId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        BlogComment comment = commentRepository.findById(commentId)
                .filter(c -> c.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Comment not found"));

        comment.softDelete();
        commentRepository.save(comment);

        // Decrement comment count
        BlogPost post = blogPostRepository.findById(postId)
                .filter(p -> p.getTenantId().equals(tenantId))
                .orElse(null);
        if (post != null && post.getCommentCount() > 0) {
            post.setCommentCount(post.getCommentCount() - 1);
            blogPostRepository.save(post);
        }

        log.info("Soft-deleted blog comment {}", commentId);
    }

    @Transactional(readOnly = true)
    public WikiCommentDto getCommentById(UUID commentId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        BlogComment comment = commentRepository.findById(commentId)
                .filter(c -> c.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Comment not found"));

        WikiCommentDto dto = toBlogCommentDto(comment);
        List<BlogComment> replies = commentRepository.findByTenantIdAndParentCommentId(tenantId, commentId);
        dto.setReplies(replies.stream().map(this::toBlogCommentDto).collect(Collectors.toList()));
        return dto;
    }

    private WikiCommentDto toBlogCommentDto(BlogComment entity) {
        if (entity == null) return null;

        return WikiCommentDto.builder()
                .id(entity.getId())
                .content(entity.getContent())
                .authorId(entity.getCreatedBy())
                .likeCount(entity.getLikeCount())
                .parentCommentId(entity.getParentComment() != null ? entity.getParentComment().getId() : null)
                .mentions(entity.getMentions())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
