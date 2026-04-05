package com.hrms.application.knowledge.service;

import com.hrms.api.knowledge.dto.WikiPageBreadcrumb;
import com.hrms.api.knowledge.dto.WikiPageTreeNode;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.knowledge.WikiPage;
import com.hrms.domain.knowledge.WikiPageVersion;
import com.hrms.infrastructure.kafka.events.FluenceContentEvent;
import com.hrms.infrastructure.kafka.producer.EventPublisher;
import com.hrms.infrastructure.knowledge.repository.WikiPageRepository;
import com.hrms.infrastructure.knowledge.repository.WikiPageVersionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.lang.Nullable;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class WikiPageService {

    private final WikiPageRepository wikiPageRepository;
    private final WikiPageVersionRepository wikiPageVersionRepository;
    private final FluenceNotificationService fluenceNotificationService;
    private final FluenceActivityService fluenceActivityService;

    @Autowired(required = false)
    private EventPublisher eventPublisher;

    @Transactional
    public WikiPage createPage(WikiPage page) {
        UUID tenantId = TenantContext.getCurrentTenant();
        page.setTenantId(tenantId);
        page.setStatus(WikiPage.PageStatus.DRAFT);
        page.setViewCount(0);
        page.setLikeCount(0);
        page.setCommentCount(0);
        page.setIsPinned(false);

        WikiPage saved = wikiPageRepository.save(page);

        // Create initial version
        createPageVersion(saved, "Initial version", tenantId, page.getCreatedBy());

        log.info("Created wiki page: {} in space: {}", saved.getId(),
            page.getSpace() != null ? page.getSpace().getId() : null);
        publishFluenceEvent(saved.getId(), tenantId, FluenceContentEvent.ACTION_CREATED);
        recordActivity(tenantId, page.getCreatedBy(), "CREATED", saved);
        return saved;
    }

    @Transactional
    public WikiPage updatePage(UUID pageId, WikiPage pageData) {
        UUID tenantId = TenantContext.getCurrentTenant();

        WikiPage page = wikiPageRepository.findById(pageId)
                .filter(p -> p.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Wiki page not found"));

        // Store old version before update
        createPageVersion(page, pageData.getExcerpt(), tenantId, SecurityContext.getCurrentUserId());

        page.setTitle(pageData.getTitle());
        page.setSlug(pageData.getSlug());
        page.setExcerpt(pageData.getExcerpt());
        page.setContent(pageData.getContent());
        page.setVisibility(pageData.getVisibility());
        page.setStatus(pageData.getStatus());

        WikiPage updated = wikiPageRepository.save(page);
        log.info("Updated wiki page: {}", pageId);
        publishFluenceEvent(pageId, tenantId, FluenceContentEvent.ACTION_UPDATED);
        recordActivity(tenantId, SecurityContext.getCurrentUserId(), "UPDATED", updated);

        // Notify watchers about the update
        fluenceNotificationService.notifyWatchers(
                tenantId, pageId, SecurityContext.getCurrentUserId(), "updated", updated.getTitle());

        return updated;
    }

    @Transactional
    public WikiPage getPageById(UUID pageId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        WikiPage page = wikiPageRepository.findById(pageId)
                .filter(p -> p.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Wiki page not found"));

        // Track view
        page.setViewCount(page.getViewCount() + 1);
        page.setLastViewedAt(LocalDateTime.now());
        page.setLastViewedBy(SecurityContext.getCurrentUserId());
        wikiPageRepository.save(page);

        return page;
    }

    @Transactional
    public WikiPage getPageBySlug(UUID spaceId, String slug) {
        UUID tenantId = TenantContext.getCurrentTenant();
        WikiPage page = wikiPageRepository.findByTenantIdAndSpaceIdAndSlug(tenantId, spaceId, slug)
                .orElseThrow(() -> new IllegalArgumentException("Wiki page not found"));

        // Track view
        page.setViewCount(page.getViewCount() + 1);
        page.setLastViewedAt(LocalDateTime.now());
        page.setLastViewedBy(SecurityContext.getCurrentUserId());
        wikiPageRepository.save(page);

        return page;
    }

    @Transactional(readOnly = true)
    public Page<WikiPage> getAllPages(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return wikiPageRepository.findByTenantId(tenantId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<WikiPage> getPagesBySpace(UUID spaceId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return wikiPageRepository.findByTenantIdAndSpaceId(tenantId, spaceId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<WikiPage> getPagesByStatus(WikiPage.PageStatus status, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return wikiPageRepository.findByTenantIdAndStatus(tenantId, status, pageable);
    }

    @Transactional(readOnly = true)
    public List<WikiPage> getPinnedPages() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return wikiPageRepository.findPinnedPagesByTenant(tenantId);
    }

    @Transactional(readOnly = true)
    public Page<WikiPage> searchPages(String query, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return wikiPageRepository.searchByTenant(tenantId, query, pageable);
    }

    public WikiPage publishPage(UUID pageId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        WikiPage page = wikiPageRepository.findById(pageId)
                .filter(p -> p.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Wiki page not found"));

        page.setStatus(WikiPage.PageStatus.PUBLISHED);
        page.setPublishedAt(LocalDateTime.now());
        page.setPublishedBy(userId);

        WikiPage updated = wikiPageRepository.save(page);
        log.info("Published wiki page: {}", pageId);
        publishFluenceEvent(pageId, tenantId, FluenceContentEvent.ACTION_PUBLISHED);
        recordActivity(tenantId, userId, "PUBLISHED", updated);

        // Notify watchers about the publish
        fluenceNotificationService.notifyWatchers(
                tenantId, pageId, userId, "published", updated.getTitle());

        return updated;
    }

    public WikiPage archivePage(UUID pageId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        WikiPage page = wikiPageRepository.findById(pageId)
                .filter(p -> p.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Wiki page not found"));

        page.setStatus(WikiPage.PageStatus.ARCHIVED);
        WikiPage updated = wikiPageRepository.save(page);
        log.info("Archived wiki page: {}", pageId);
        return updated;
    }

    public WikiPage togglePin(UUID pageId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        WikiPage page = wikiPageRepository.findById(pageId)
                .filter(p -> p.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Wiki page not found"));

        page.setIsPinned(!page.getIsPinned());
        if (page.getIsPinned()) {
            page.setPinnedAt(LocalDateTime.now());
            page.setPinnedBy(userId);
        } else {
            page.setPinnedAt(null);
            page.setPinnedBy(null);
        }

        WikiPage updated = wikiPageRepository.save(page);
        log.info("Toggled pin for wiki page: {}", pageId);
        return updated;
    }

    @Transactional
    public void deletePage(UUID pageId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        WikiPage page = wikiPageRepository.findById(pageId)
                .filter(p -> p.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Wiki page not found"));

        wikiPageRepository.delete(page);
        log.info("Deleted wiki page: {}", pageId);
        publishFluenceEvent(pageId, tenantId, FluenceContentEvent.ACTION_DELETED);
    }

    // ==================== Page Hierarchy Methods ====================

    /**
     * Get root pages (no parent) in a space.
     */
    @Transactional(readOnly = true)
    public List<WikiPage> getRootPages(UUID spaceId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return wikiPageRepository.findByTenantIdAndSpaceIdAndParentPageIsNull(tenantId, spaceId);
    }

    /**
     * Get direct child pages of a given parent page.
     */
    @Transactional(readOnly = true)
    public List<WikiPage> getChildPages(UUID parentPageId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return wikiPageRepository.findByTenantIdAndParentPageId(tenantId, parentPageId);
    }

    /**
     * Get the full page tree for a space (root pages + children recursively, max 3 levels deep).
     */
    @Transactional(readOnly = true)
    public List<WikiPageTreeNode> getPageTree(UUID spaceId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // Fetch all pages in this space in one query to avoid N+1
        List<WikiPage> allPages = wikiPageRepository.findByTenantIdAndSpaceId(tenantId, spaceId);

        // Group pages by parentPageId (null key = root pages)
        Map<UUID, List<WikiPage>> childrenByParent = allPages.stream()
                .collect(Collectors.groupingBy(
                        page -> page.getParentPage() != null ? page.getParentPage().getId() : UUID.fromString("00000000-0000-0000-0000-000000000000"),
                        Collectors.toList()
                ));

        // Build tree starting from root pages (those with no parent)
        List<WikiPage> rootPages = allPages.stream()
                .filter(p -> p.getParentPage() == null)
                .collect(Collectors.toList());

        return rootPages.stream()
                .map(page -> buildTreeNode(page, childrenByParent, 1, 3))
                .collect(Collectors.toList());
    }

    /**
     * Move a page to a new parent (or to root if newParentPageId is null).
     */
    @Transactional
    public WikiPage movePage(UUID pageId, UUID newParentPageId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        WikiPage page = wikiPageRepository.findById(pageId)
                .filter(p -> p.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Wiki page not found"));

        if (newParentPageId != null) {
            // Prevent moving a page under itself or its own descendants
            if (newParentPageId.equals(pageId)) {
                throw new IllegalArgumentException("Cannot move a page under itself");
            }

            WikiPage newParent = wikiPageRepository.findById(newParentPageId)
                    .filter(p -> p.getTenantId().equals(tenantId))
                    .orElseThrow(() -> new IllegalArgumentException("Target parent page not found"));

            // Check that the new parent is in the same space
            if (page.getSpace() != null && newParent.getSpace() != null
                    && !page.getSpace().getId().equals(newParent.getSpace().getId())) {
                throw new IllegalArgumentException("Cannot move a page to a different space");
            }

            // Prevent circular references (check ancestors of newParent)
            UUID ancestorId = newParent.getParentPage() != null ? newParent.getParentPage().getId() : null;
            int depth = 0;
            while (ancestorId != null && depth < 10) {
                if (ancestorId.equals(pageId)) {
                    throw new IllegalArgumentException("Cannot move a page under its own descendant");
                }
                WikiPage ancestor = wikiPageRepository.findById(ancestorId).orElse(null);
                ancestorId = (ancestor != null && ancestor.getParentPage() != null)
                        ? ancestor.getParentPage().getId() : null;
                depth++;
            }

            page.setParentPage(newParent);
        } else {
            page.setParentPage(null);
        }

        WikiPage updated = wikiPageRepository.save(page);
        log.info("Moved wiki page {} to parent {}", pageId, newParentPageId);
        return updated;
    }

    /**
     * Get breadcrumbs (ancestor chain) for a page, from root to the page itself.
     */
    @Transactional(readOnly = true)
    public List<WikiPageBreadcrumb> getBreadcrumbs(UUID pageId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        WikiPage page = wikiPageRepository.findById(pageId)
                .filter(p -> p.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Wiki page not found"));

        List<WikiPageBreadcrumb> breadcrumbs = new ArrayList<>();
        breadcrumbs.add(new WikiPageBreadcrumb(page.getId(), page.getTitle(), page.getSlug()));

        WikiPage current = page;
        int depth = 0;
        while (current.getParentPage() != null && depth < 10) {
            current = wikiPageRepository.findById(current.getParentPage().getId())
                    .filter(p -> p.getTenantId().equals(tenantId))
                    .orElse(null);
            if (current == null) break;
            breadcrumbs.add(new WikiPageBreadcrumb(current.getId(), current.getTitle(), current.getSlug()));
            depth++;
        }

        // Reverse so root is first
        Collections.reverse(breadcrumbs);
        return breadcrumbs;
    }

    /**
     * Count direct children of a page.
     */
    @Transactional(readOnly = true)
    public long countChildPages(UUID pageId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return wikiPageRepository.countByTenantIdAndParentPageId(tenantId, pageId);
    }

    private WikiPageTreeNode buildTreeNode(WikiPage page, Map<UUID, List<WikiPage>> childrenByParent,
                                           int currentLevel, int maxLevel) {
        List<WikiPageTreeNode> children = List.of();

        if (currentLevel < maxLevel) {
            List<WikiPage> childPages = childrenByParent.getOrDefault(page.getId(), List.of());
            children = childPages.stream()
                    .map(child -> buildTreeNode(child, childrenByParent, currentLevel + 1, maxLevel))
                    .collect(Collectors.toList());
        }

        return new WikiPageTreeNode(
                page.getId(),
                page.getTitle(),
                page.getSlug(),
                page.getStatus() != null ? page.getStatus().name() : null,
                page.getIsPinned(),
                page.getViewCount(),
                page.getParentPage() != null ? page.getParentPage().getId() : null,
                children
        );
    }

    @Transactional(readOnly = true)
    public List<WikiPageVersion> getPageVersionHistory(UUID pageId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return wikiPageVersionRepository.findVersionHistoryByPage(tenantId, pageId);
    }

    @Transactional(readOnly = true)
    public WikiPageVersion getPageVersion(UUID pageId, Integer versionNumber) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return wikiPageVersionRepository.findByTenantIdAndPageIdAndVersionNumber(tenantId, pageId, versionNumber)
                .orElseThrow(() -> new IllegalArgumentException("Version not found"));
    }

    private void publishFluenceEvent(UUID pageId, UUID tenantId, String action) {
        if (eventPublisher != null) {
            try {
                eventPublisher.publishFluenceContent("wiki", pageId, action, tenantId);
            } catch (Exception e) { // Intentional broad catch — content indexing error boundary
                log.warn("Failed to publish fluence content event for wiki page {}: {}", pageId, e.getMessage());
            }
        }
    }

    private void recordActivity(UUID tenantId, UUID actorId, String action, WikiPage page) {
        try {
            String excerpt = extractExcerpt(page.getContent());
            fluenceActivityService.recordActivity(tenantId, actorId, action, "WIKI", page.getId(), page.getTitle(), excerpt);
        } catch (Exception e) { // Intentional broad catch — content indexing error boundary
            log.warn("Failed to record activity for wiki page: {}", e.getMessage());
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

    private void createPageVersion(WikiPage page, String changeSummary, UUID tenantId, UUID userId) {
        long versionCount = wikiPageVersionRepository.countByTenantIdAndPageId(tenantId, page.getId());
        int nextVersion = (int) (versionCount + 1);

        WikiPageVersion version = WikiPageVersion.builder()
                .tenantId(tenantId)
                .page(page)
                .versionNumber(nextVersion)
                .title(page.getTitle())
                .excerpt(page.getExcerpt())
                .content(page.getContent())
                .changeSummary(changeSummary)
                .createdBy(userId)
                .build();

        wikiPageVersionRepository.save(version);
    }
}
