package com.hrms.application.knowledge.service;

import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.knowledge.WikiPage;
import com.hrms.domain.knowledge.WikiPageVersion;
import com.hrms.infrastructure.knowledge.repository.WikiPageRepository;
import com.hrms.infrastructure.knowledge.repository.WikiPageVersionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
        return saved;
    }

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
        return updated;
    }

    @Transactional(readOnly = true)
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

    @Transactional(readOnly = true)
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

    public void deletePage(UUID pageId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        WikiPage page = wikiPageRepository.findById(pageId)
            .filter(p -> p.getTenantId().equals(tenantId))
            .orElseThrow(() -> new IllegalArgumentException("Wiki page not found"));

        wikiPageRepository.delete(page);
        log.info("Deleted wiki page: {}", pageId);
    }

    @Transactional(readOnly = true)
    public List<WikiPageVersion> getPageVersionHistory(UUID pageId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return wikiPageVersionRepository.findVersionHistoryByPage(tenantId, pageId);
    }

    public WikiPageVersion getPageVersion(UUID pageId, Integer versionNumber) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return wikiPageVersionRepository.findByTenantIdAndPageIdAndVersionNumber(tenantId, pageId, versionNumber)
            .orElseThrow(() -> new IllegalArgumentException("Version not found"));
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
