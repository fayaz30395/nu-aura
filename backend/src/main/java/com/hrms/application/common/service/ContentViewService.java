package com.hrms.application.common.service;

import com.hrms.domain.common.ContentView;
import com.hrms.domain.common.ContentView.ContentType;
import com.hrms.domain.employee.Employee;
import com.hrms.infrastructure.common.repository.ContentViewRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for tracking content views across the application.
 * Provides a unified way to track and query views for any content type.
 */
@Service
@Transactional
public class ContentViewService {

    private final ContentViewRepository contentViewRepository;
    private final EmployeeRepository employeeRepository;

    public ContentViewService(ContentViewRepository contentViewRepository,
                              EmployeeRepository employeeRepository) {
        this.contentViewRepository = contentViewRepository;
        this.employeeRepository = employeeRepository;
    }

    /**
     * Record a view for content. Creates new record or increments existing.
     */
    public ContentView recordView(ContentType contentType, UUID contentId, UUID employeeId) {
        return recordView(contentType, contentId, employeeId, null);
    }

    /**
     * Record a view with source tracking
     */
    public ContentView recordView(ContentType contentType, UUID contentId, UUID employeeId, String viewSource) {
        Optional<ContentView> existing = contentViewRepository
                .findByContentTypeAndContentIdAndEmployeeId(contentType, contentId, employeeId);

        if (existing.isPresent()) {
            ContentView view = existing.get();
            view.incrementViewCount();
            if (viewSource != null) {
                view.setViewSource(viewSource);
            }
            return contentViewRepository.save(view);
        }

        ContentView view = new ContentView(contentType, contentId, employeeId);
        view.setViewSource(viewSource);
        return contentViewRepository.save(view);
    }

    /**
     * Check if employee has viewed content
     */
    @Transactional(readOnly = true)
    public boolean hasViewed(ContentType contentType, UUID contentId, UUID employeeId) {
        return contentViewRepository.existsByContentTypeAndContentIdAndEmployeeId(contentType, contentId, employeeId);
    }

    /**
     * Get unique view count for content
     */
    @Transactional(readOnly = true)
    public long getViewCount(ContentType contentType, UUID contentId) {
        return contentViewRepository.countByContentTypeAndContentId(contentType, contentId);
    }

    /**
     * Get all viewers for content with employee details
     */
    @Transactional(readOnly = true)
    public List<ViewerInfo> getViewers(ContentType contentType, UUID contentId) {
        List<ContentView> views = contentViewRepository
                .findByContentTypeAndContentIdOrderByCreatedAtDesc(contentType, contentId);
        return enrichWithEmployeeDetails(views);
    }

    /**
     * Get viewers paginated
     */
    @Transactional(readOnly = true)
    public Page<ContentView> getViewers(ContentType contentType, UUID contentId, Pageable pageable) {
        return contentViewRepository
                .findByContentTypeAndContentIdOrderByCreatedAtDesc(contentType, contentId, pageable);
    }

    /**
     * Get recent viewers (top N)
     */
    @Transactional(readOnly = true)
    public List<ViewerInfo> getRecentViewers(ContentType contentType, UUID contentId, int limit) {
        List<ContentView> views = contentViewRepository
                .findRecentViewers(contentType, contentId, PageRequest.of(0, limit));
        return enrichWithEmployeeDetails(views);
    }

    /**
     * Get view statistics for content
     */
    @Transactional(readOnly = true)
    public ViewStats getViewStats(ContentType contentType, UUID contentId) {
        Object[] stats = contentViewRepository.getViewStats(contentType, contentId);
        long uniqueViewers = stats[0] != null ? ((Number) stats[0]).longValue() : 0;
        long totalViews = stats[1] != null ? ((Number) stats[1]).longValue() : 0;
        return new ViewStats(uniqueViewers, totalViews);
    }

    /**
     * Get content IDs that employee has viewed (for marking as read in UI)
     */
    @Transactional(readOnly = true)
    public Set<UUID> getViewedContentIds(ContentType contentType, UUID employeeId) {
        return new HashSet<>(contentViewRepository.findContentIdsByContentTypeAndEmployeeId(contentType, employeeId));
    }

    /**
     * Batch get view counts for multiple content items
     */
    @Transactional(readOnly = true)
    public Map<UUID, Long> getViewCounts(ContentType contentType, List<UUID> contentIds) {
        List<Object[]> results = contentViewRepository.countViewersByContentIds(contentType, contentIds);
        Map<UUID, Long> counts = new HashMap<>();
        for (Object[] result : results) {
            UUID contentId = (UUID) result[0];
            Long count = ((Number) result[1]).longValue();
            counts.put(contentId, count);
        }
        // Fill in zeros for content with no views
        for (UUID contentId : contentIds) {
            counts.putIfAbsent(contentId, 0L);
        }
        return counts;
    }

    /**
     * Get employees who have NOT viewed content (useful for follow-up)
     */
    @Transactional(readOnly = true)
    public List<UUID> getNonViewers(ContentType contentType, UUID contentId, List<UUID> targetEmployeeIds) {
        Set<UUID> viewerIds = new HashSet<>(
                contentViewRepository.findEmployeeIdsByContentTypeAndContentId(contentType, contentId));
        return targetEmployeeIds.stream()
                .filter(id -> !viewerIds.contains(id))
                .collect(Collectors.toList());
    }

    // Helper to enrich views with employee details
    private List<ViewerInfo> enrichWithEmployeeDetails(List<ContentView> views) {
        if (views.isEmpty()) {
            return Collections.emptyList();
        }

        Set<UUID> employeeIds = views.stream()
                .map(ContentView::getEmployeeId)
                .collect(Collectors.toSet());

        Map<UUID, Employee> employeeMap = employeeRepository.findAllById(employeeIds).stream()
                .collect(Collectors.toMap(Employee::getId, e -> e));

        return views.stream()
                .map(view -> {
                    Employee emp = employeeMap.get(view.getEmployeeId());
                    return new ViewerInfo(
                            view.getEmployeeId(),
                            emp != null ? emp.getFullName() : "Unknown",
                            emp != null ? emp.getEmployeeCode() : null,
                            emp != null ? emp.getDesignation() : null,
                            null, // Department name would require additional query
                            view.getCreatedAt(),
                            view.getLastViewedAt(),
                            view.getViewCount(),
                            view.getViewSource()
                    );
                })
                .collect(Collectors.toList());
    }

    // DTOs
    public record ViewerInfo(
            UUID employeeId,
            String fullName,
            String employeeCode,
            String designation,
            String department,
            java.time.LocalDateTime firstViewedAt,
            java.time.LocalDateTime lastViewedAt,
            int viewCount,
            String viewSource
    ) {}

    public record ViewStats(long uniqueViewers, long totalViews) {}
}
