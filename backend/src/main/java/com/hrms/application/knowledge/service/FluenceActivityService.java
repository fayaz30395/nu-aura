package com.hrms.application.knowledge.service;

import com.hrms.domain.knowledge.FluenceActivity;
import com.hrms.infrastructure.knowledge.repository.FluenceActivityRepository;
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
public class FluenceActivityService {

    private final FluenceActivityRepository fluenceActivityRepository;

    /**
     * Record a new activity event in the fluence activity feed.
     */
    public FluenceActivity recordActivity(UUID tenantId, UUID actorId, String action,
                                           String contentType, UUID contentId,
                                           String contentTitle, String contentExcerpt) {
        if (contentExcerpt != null && contentExcerpt.length() > 200) {
            contentExcerpt = contentExcerpt.substring(0, 200) + "...";
        }

        FluenceActivity activity = FluenceActivity.builder()
                .tenantId(tenantId)
                .actorId(actorId)
                .action(action)
                .contentType(contentType)
                .contentId(contentId)
                .contentTitle(contentTitle)
                .contentExcerpt(contentExcerpt)
                .build();

        FluenceActivity saved = fluenceActivityRepository.save(activity);
        log.info("Recorded fluence activity: {} {} on {} {}", action, contentType, contentId, contentTitle);
        return saved;
    }

    /**
     * Get the full activity feed for a tenant, ordered by most recent first.
     */
    @Transactional(readOnly = true, timeout = 10)
    public Page<FluenceActivity> getActivityFeed(UUID tenantId, Pageable pageable) {
        return fluenceActivityRepository.findByTenantIdAndIsDeletedFalseOrderByCreatedAtDesc(
                tenantId, pageable);
    }

    /**
     * Get activity feed filtered by content type (WIKI, BLOG, TEMPLATE).
     */
    @Transactional(readOnly = true, timeout = 10)
    public Page<FluenceActivity> getActivityFeedByType(UUID tenantId, String contentType, Pageable pageable) {
        return fluenceActivityRepository.findByTenantIdAndContentTypeAndIsDeletedFalseOrderByCreatedAtDesc(
                tenantId, contentType, pageable);
    }

    /**
     * Get activity feed for a specific user.
     */
    @Transactional(readOnly = true, timeout = 10)
    public Page<FluenceActivity> getUserActivity(UUID tenantId, UUID actorId, Pageable pageable) {
        return fluenceActivityRepository.findByTenantIdAndActorIdAndIsDeletedFalseOrderByCreatedAtDesc(
                tenantId, actorId, pageable);
    }
}
