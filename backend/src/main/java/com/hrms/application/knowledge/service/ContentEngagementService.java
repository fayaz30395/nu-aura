package com.hrms.application.knowledge.service;

import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.knowledge.*;
import com.hrms.infrastructure.knowledge.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ContentEngagementService {

    private final WikiPageLikeRepository wikiPageLikeRepository;
    private final WikiPageRepository wikiPageRepository;
    private final BlogLikeRepository blogLikeRepository;
    private final BlogPostRepository blogPostRepository;
    private final FluenceFavoriteRepository favoriteRepository;
    private final WikiPageWatchRepository watchRepository;
    private final KnowledgeViewRepository viewRepository;

    // ==================== Wiki Page Likes ====================

    @Transactional
    public boolean toggleWikiPageLike(UUID pageId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        Optional<WikiPageLike> existing = wikiPageLikeRepository
                .findByTenantIdAndWikiPageIdAndLikedBy(tenantId, pageId, userId);

        WikiPage page = wikiPageRepository.findById(pageId)
                .filter(p -> p.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Wiki page not found"));

        if (existing.isPresent()) {
            wikiPageLikeRepository.delete(existing.get());
            page.setLikeCount(Math.max(0, page.getLikeCount() - 1));
            wikiPageRepository.save(page);
            log.info("User {} unliked wiki page {}", userId, pageId);
            return false;
        } else {
            WikiPageLike like = WikiPageLike.builder()
                    .wikiPage(page)
                    .likedBy(userId)
                    .build();
            like.setTenantId(tenantId);
            wikiPageLikeRepository.save(like);
            page.setLikeCount(page.getLikeCount() + 1);
            wikiPageRepository.save(page);
            log.info("User {} liked wiki page {}", userId, pageId);
            return true;
        }
    }

    @Transactional(readOnly = true)
    public boolean isWikiPageLiked(UUID pageId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();
        return wikiPageLikeRepository.existsByTenantIdAndWikiPageIdAndLikedBy(tenantId, pageId, userId);
    }

    // ==================== Blog Post Likes ====================

    @Transactional
    public boolean toggleBlogPostLike(UUID postId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        Optional<BlogLike> existing = blogLikeRepository
                .findByTenantIdAndPostIdAndUserId(tenantId, postId, userId);

        BlogPost post = blogPostRepository.findById(postId)
                .filter(p -> p.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Blog post not found"));

        if (existing.isPresent()) {
            blogLikeRepository.delete(existing.get());
            post.setLikeCount(Math.max(0, post.getLikeCount() - 1));
            blogPostRepository.save(post);
            log.info("User {} unliked blog post {}", userId, postId);
            return false;
        } else {
            BlogLike like = BlogLike.builder()
                    .post(post)
                    .userId(userId)
                    .build();
            like.setTenantId(tenantId);
            blogLikeRepository.save(like);
            post.setLikeCount(post.getLikeCount() + 1);
            blogPostRepository.save(post);
            log.info("User {} liked blog post {}", userId, postId);
            return true;
        }
    }

    @Transactional(readOnly = true)
    public boolean isBlogPostLiked(UUID postId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();
        return blogLikeRepository.existsByTenantIdAndPostIdAndUserId(tenantId, postId, userId);
    }

    // ==================== Favorites ====================

    @Transactional
    public boolean toggleFavorite(UUID contentId, String contentType) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        Optional<FluenceFavorite> existing = favoriteRepository
                .findByTenantIdAndUserIdAndContentIdAndContentType(tenantId, userId, contentId, contentType);

        if (existing.isPresent()) {
            favoriteRepository.delete(existing.get());
            log.info("User {} unfavorited {} {}", userId, contentType, contentId);
            return false;
        } else {
            FluenceFavorite fav = FluenceFavorite.builder()
                    .userId(userId)
                    .contentId(contentId)
                    .contentType(contentType)
                    .build();
            fav.setTenantId(tenantId);
            favoriteRepository.save(fav);
            log.info("User {} favorited {} {}", userId, contentType, contentId);
            return true;
        }
    }

    @Transactional(readOnly = true)
    public boolean isFavorited(UUID contentId, String contentType) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();
        return favoriteRepository.existsByTenantIdAndUserIdAndContentIdAndContentType(
                tenantId, userId, contentId, contentType);
    }

    @Transactional(readOnly = true)
    public Page<FluenceFavorite> getFavorites(Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();
        return favoriteRepository.findByTenantIdAndUserId(tenantId, userId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<FluenceFavorite> getFavoritesByType(String contentType, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();
        return favoriteRepository.findByTenantIdAndUserIdAndContentType(tenantId, userId, contentType, pageable);
    }

    // ==================== Views ====================

    @Transactional
    public void recordView(UUID contentId, KnowledgeView.ContentType contentType, String ipAddress, String userAgent) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        KnowledgeView view = KnowledgeView.builder()
                .contentId(contentId)
                .contentType(contentType)
                .userId(userId)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .build();
        view.setTenantId(tenantId);
        viewRepository.save(view);
        log.debug("Recorded view for {} {} by user {}", contentType, contentId, userId);
    }

    @Transactional(readOnly = true)
    public Page<KnowledgeView> getViewers(UUID contentId, KnowledgeView.ContentType contentType, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return viewRepository.findByTenantIdAndContentTypeAndContentId(tenantId, contentType, contentId, pageable);
    }

    @Transactional(readOnly = true)
    public long getViewCount(UUID contentId, KnowledgeView.ContentType contentType) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return viewRepository.countViewsByContent(tenantId, contentType, contentId);
    }

    // ==================== Wiki Page Watches ====================

    @Transactional
    public boolean toggleWatch(UUID pageId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        Optional<WikiPageWatch> existing = watchRepository
                .findByTenantIdAndPageIdAndUserId(tenantId, pageId, userId);

        if (existing.isPresent()) {
            watchRepository.delete(existing.get());
            log.info("User {} unwatched wiki page {}", userId, pageId);
            return false;
        } else {
            WikiPage page = wikiPageRepository.findById(pageId)
                    .filter(p -> p.getTenantId().equals(tenantId))
                    .orElseThrow(() -> new IllegalArgumentException("Wiki page not found"));

            WikiPageWatch watch = WikiPageWatch.builder()
                    .page(page)
                    .userId(userId)
                    .watchType(WikiPageWatch.WatchType.ALL)
                    .build();
            watch.setTenantId(tenantId);
            watchRepository.save(watch);
            log.info("User {} watching wiki page {}", userId, pageId);
            return true;
        }
    }

    @Transactional(readOnly = true)
    public boolean isWatching(UUID pageId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();
        return watchRepository.existsByTenantIdAndPageIdAndUserId(tenantId, pageId, userId);
    }
}
