package com.hrms.application.knowledge.service;

import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.knowledge.BlogPost;
import com.hrms.domain.knowledge.KnowledgeSearch;
import com.hrms.domain.knowledge.WikiPage;
import com.hrms.infrastructure.knowledge.repository.BlogPostRepository;
import com.hrms.infrastructure.knowledge.repository.KnowledgeSearchRepository;
import com.hrms.infrastructure.knowledge.repository.WikiPageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class KnowledgeSearchService {

    private final WikiPageRepository wikiPageRepository;
    private final BlogPostRepository blogPostRepository;
    private final KnowledgeSearchRepository knowledgeSearchRepository;

    @Transactional(readOnly = true)
    public Page<WikiPage> searchWikiPages(String query, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        recordSearch(query);
        return wikiPageRepository.searchByTenant(tenantId, query, pageable);
    }

    @Transactional(readOnly = true)
    public Page<BlogPost> searchBlogPosts(String query, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        recordSearch(query);
        return blogPostRepository.searchByTenant(tenantId, query, pageable);
    }

    @Transactional(readOnly = true)
    public Page<WikiPage> searchAllContent(String query, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        recordSearch(query);
        return wikiPageRepository.searchByTenant(tenantId, query, pageable);
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
