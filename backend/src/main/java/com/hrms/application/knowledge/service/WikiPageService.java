package com.hrms.application.knowledge.service;

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

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

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

        log.info("Created wiki page: {} in space: {}", saved.getId(), page.getSpace().getId());
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
