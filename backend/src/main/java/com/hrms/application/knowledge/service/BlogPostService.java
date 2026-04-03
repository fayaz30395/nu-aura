package com.hrms.application.knowledge.service;

import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.knowledge.BlogPost;
import com.hrms.infrastructure.kafka.events.FluenceContentEvent;
import com.hrms.infrastructure.kafka.producer.EventPublisher;
import com.hrms.infrastructure.knowledge.repository.BlogPostRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.lang.Nullable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class BlogPostService {

    private final BlogPostRepository blogPostRepository;
    private final FluenceActivityService fluenceActivityService;

    @Autowired(required = false)
    private EventPublisher eventPublisher;

    @Transactional
    public BlogPost createPost(BlogPost post) {
        UUID tenantId = TenantContext.getCurrentTenant();
        post.setTenantId(tenantId);
        post.setStatus(BlogPost.BlogPostStatus.DRAFT);
        post.setViewCount(0);
        post.setLikeCount(0);
        post.setCommentCount(0);
        post.setIsFeatured(false);

        BlogPost saved = blogPostRepository.save(post);
        log.info("Created blog post: {}", saved.getId());
        publishFluenceEvent(saved.getId(), tenantId, FluenceContentEvent.ACTION_CREATED);
        recordActivity(tenantId, saved.getCreatedBy(), "CREATED", saved);
        return saved;
    }

    @Transactional
    public BlogPost updatePost(UUID postId, BlogPost postData) {
        UUID tenantId = TenantContext.getCurrentTenant();

        BlogPost post = blogPostRepository.findById(postId)
                .filter(p -> p.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Blog post not found"));

        post.setTitle(postData.getTitle());
        post.setSlug(postData.getSlug());
        post.setExcerpt(postData.getExcerpt());
        post.setFeaturedImageUrl(postData.getFeaturedImageUrl());
        post.setContent(postData.getContent());
        post.setVisibility(postData.getVisibility());
        post.setStatus(postData.getStatus());
        post.setReadTimeMinutes(postData.getReadTimeMinutes());

        if (postData.getIsFeatured() != null) {
            post.setIsFeatured(postData.getIsFeatured());
            if (postData.getFeaturedUntil() != null) {
                post.setFeaturedUntil(postData.getFeaturedUntil());
            }
        }

        BlogPost updated = blogPostRepository.save(post);
        log.info("Updated blog post: {}", postId);
        publishFluenceEvent(postId, tenantId, FluenceContentEvent.ACTION_UPDATED);
        recordActivity(tenantId, SecurityContext.getCurrentUserId(), "UPDATED", updated);
        return updated;
    }

    @Transactional(readOnly = true)
    public BlogPost getPostById(UUID postId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        BlogPost post = blogPostRepository.findById(postId)
                .filter(p -> p.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Blog post not found"));

        // Track view
        post.setViewCount(post.getViewCount() + 1);
        post.setLastViewedAt(LocalDateTime.now());
        post.setLastViewedBy(SecurityContext.getCurrentUserId());
        blogPostRepository.save(post);

        return post;
    }

    @Transactional(readOnly = true)
    public BlogPost getPostBySlug(String slug) {
        UUID tenantId = TenantContext.getCurrentTenant();
        BlogPost post = blogPostRepository.findByTenantIdAndSlug(tenantId, slug)
                .orElseThrow(() -> new IllegalArgumentException("Blog post not found"));

        // Track view
        post.setViewCount(post.getViewCount() + 1);
        post.setLastViewedAt(LocalDateTime.now());
        post.setLastViewedBy(SecurityContext.getCurrentUserId());
        blogPostRepository.save(post);

        return post;
    }

    @Transactional(readOnly = true)
    public Page<BlogPost> getPostsByStatus(BlogPost.BlogPostStatus status, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return blogPostRepository.findByTenantIdAndStatus(tenantId, status, pageable);
    }

    @Transactional(readOnly = true)
    public Page<BlogPost> getPublishedPosts(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return blogPostRepository.findPublishedPostsByTenant(tenantId, pageable);
    }

    @Transactional(readOnly = true)
    public List<BlogPost> getFeaturedPosts() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return blogPostRepository.findFeaturedPostsByTenant(tenantId);
    }

    @Transactional(readOnly = true)
    public Page<BlogPost> getPostsByCategory(UUID categoryId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return blogPostRepository.findByTenantIdAndCategoryId(tenantId, categoryId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<BlogPost> searchPosts(String query, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return blogPostRepository.searchByTenant(tenantId, query, pageable);
    }

    public BlogPost publishPost(UUID postId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        BlogPost post = blogPostRepository.findById(postId)
                .filter(p -> p.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Blog post not found"));

        post.setStatus(BlogPost.BlogPostStatus.PUBLISHED);
        post.setPublishedAt(LocalDateTime.now());
        post.setPublishedBy(userId);

        BlogPost updated = blogPostRepository.save(post);
        log.info("Published blog post: {}", postId);
        publishFluenceEvent(postId, tenantId, FluenceContentEvent.ACTION_PUBLISHED);
        recordActivity(tenantId, userId, "PUBLISHED", updated);
        return updated;
    }

    public BlogPost schedulePost(UUID postId, LocalDateTime scheduledFor) {
        UUID tenantId = TenantContext.getCurrentTenant();

        BlogPost post = blogPostRepository.findById(postId)
                .filter(p -> p.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Blog post not found"));

        post.setStatus(BlogPost.BlogPostStatus.SCHEDULED);
        post.setScheduledFor(scheduledFor);

        BlogPost updated = blogPostRepository.save(post);
        log.info("Scheduled blog post: {} for {}", postId, scheduledFor);
        return updated;
    }

    public BlogPost archivePost(UUID postId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        BlogPost post = blogPostRepository.findById(postId)
                .filter(p -> p.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Blog post not found"));

        post.setStatus(BlogPost.BlogPostStatus.ARCHIVED);
        BlogPost updated = blogPostRepository.save(post);
        log.info("Archived blog post: {}", postId);
        return updated;
    }

    @Transactional
    public void deletePost(UUID postId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        BlogPost post = blogPostRepository.findById(postId)
                .filter(p -> p.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Blog post not found"));

        blogPostRepository.delete(post);
        log.info("Deleted blog post: {}", postId);
        publishFluenceEvent(postId, tenantId, FluenceContentEvent.ACTION_DELETED);
    }

    private void publishFluenceEvent(UUID postId, UUID tenantId, String action) {
        if (eventPublisher != null) {
            try {
                eventPublisher.publishFluenceContent("blog", postId, action, tenantId);
            } catch (Exception e) { // Intentional broad catch — content indexing error boundary
                log.warn("Failed to publish fluence content event for blog post {}: {}", postId, e.getMessage());
            }
        }
    }

    private void recordActivity(UUID tenantId, UUID actorId, String action, BlogPost post) {
        try {
            String excerpt = extractExcerpt(post.getContent());
            fluenceActivityService.recordActivity(tenantId, actorId, action, "BLOG", post.getId(), post.getTitle(), excerpt);
        } catch (Exception e) { // Intentional broad catch — content indexing error boundary
            log.warn("Failed to record activity for blog post: {}", e.getMessage());
        }
    }

    @Nullable
    private String extractExcerpt(String content) {
        if (content == null || content.isBlank()) return null;
        String plain = content.replaceAll("<[^>]*>", " ")
                .replaceAll("\\{[^}]*}", " ")
                .replaceAll("\\[[^]]*]", " ")
                .replaceAll("\"[a-zA-Z]+\":", " ")
                .replaceAll("\\s+", " ")
                .trim();
        return plain.length() > 200 ? plain.substring(0, 200) : plain;
    }
}
