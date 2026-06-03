package com.nulogic.application.knowledge.service;

import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.knowledge.FluenceActivity;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.knowledge.repository.FluenceActivityRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class FluenceActivityService {

    private final FluenceActivityRepository fluenceActivityRepository;
    private final EmployeeRepository employeeRepository;

    /**
     * Batch-fetch employees by their (employee) ids for actor-name resolution.
     * Used by the controller to resolve activity actor display names in a single query.
     */
    @Transactional(readOnly = true)
    public List<Employee> findActorsByIds(Collection<UUID> actorIds) {
        return employeeRepository.findAllById(actorIds);
    }

    /**
     * Resolve a single actor by user id (with associated User) within a tenant — used as the
     * fallback path when an actorId turns out to be a user id rather than an employee id.
     */
    @Transactional(readOnly = true)
    public Optional<Employee> resolveActorByUserId(UUID userId, UUID tenantId) {
        return employeeRepository.findByUserIdWithUser(userId, tenantId);
    }

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
