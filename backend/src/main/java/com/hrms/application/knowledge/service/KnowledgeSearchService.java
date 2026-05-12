package com.hrms.application.knowledge.service;

import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.knowledge.BlogPost;
import com.hrms.domain.knowledge.KnowledgeSearch;
import com.hrms.domain.knowledge.WikiPage;
import com.hrms.infrastructure.knowledge.repository.BlogPostRepository;
import com.hrms.infrastructure.knowledge.repository.DocumentTemplateRepository;
import com.hrms.infrastructure.knowledge.repository.KnowledgeSearchRepository;
import com.hrms.infrastructure.knowledge.repository.WikiPageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.InvalidDataAccessResourceUsageException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class KnowledgeSearchService {

    private final WikiPageRepository wikiPageRepository;
    private final BlogPostRepository blogPostRepository;
    private final DocumentTemplateRepository documentTemplateRepository;
    private final KnowledgeSearchRepository knowledgeSearchRepository;

    @Transactional(readOnly = true)
    public Page<WikiPage> searchWikiPages(String query, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        recordSearch(query);
        try {
            return wikiPageRepository.searchByTenant(tenantId, query, pageable);
        } catch (InvalidDataAccessResourceUsageException e) {
            // Defensive: malformed full-text search expression (e.g. unbalanced quotes) — return empty page.
            log.warn("Wiki search rejected by Postgres for tenant {} (query length={}): {}",
                    tenantId, query == null ? 0 : query.length(), e.getMostSpecificCause().getMessage());
            return new PageImpl<>(List.of(), pageable, 0);
        }
    }

    @Transactional(readOnly = true)
    public Page<BlogPost> searchBlogPosts(String query, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        recordSearch(query);
        try {
            return blogPostRepository.searchByTenant(tenantId, query, pageable);
        } catch (InvalidDataAccessResourceUsageException e) {
            log.warn("Blog search rejected by Postgres for tenant {} (query length={}): {}",
                    tenantId, query == null ? 0 : query.length(), e.getMostSpecificCause().getMessage());
            return new PageImpl<>(List.of(), pageable, 0);
        }
    }

    @Transactional(readOnly = true)
    public Page<WikiPage> searchAllContent(String query, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        recordSearch(query);
        try {
            return wikiPageRepository.searchByTenant(tenantId, query, pageable);
        } catch (InvalidDataAccessResourceUsageException e) {
            log.warn("Content search rejected by Postgres for tenant {} (query length={}): {}",
                    tenantId, query == null ? 0 : query.length(), e.getMostSpecificCause().getMessage());
            return new PageImpl<>(List.of(), pageable, 0);
        }
    }

    private void recordSearch(String query) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        KnowledgeSearch search = KnowledgeSearch.builder()
                .tenantId(tenantId)
                .query(query)
                .searchedBy(userId)
                .build();

        knowledgeSearchRepository.save(search);
        log.debug("Recorded search query: {}", query);
    }
}
