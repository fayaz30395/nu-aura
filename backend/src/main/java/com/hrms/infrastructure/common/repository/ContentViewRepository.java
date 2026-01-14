package com.hrms.infrastructure.common.repository;

import com.hrms.domain.common.ContentView;
import com.hrms.domain.common.ContentView.ContentType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for content view tracking.
 * Provides methods to track and query views across all content types.
 */
@Repository
public interface ContentViewRepository extends JpaRepository<ContentView, UUID> {

    /**
     * Find existing view record for a specific content and employee
     */
    Optional<ContentView> findByContentTypeAndContentIdAndEmployeeId(
            ContentType contentType, UUID contentId, UUID employeeId);

    /**
     * Check if employee has viewed specific content
     */
    boolean existsByContentTypeAndContentIdAndEmployeeId(
            ContentType contentType, UUID contentId, UUID employeeId);

    /**
     * Count unique viewers for a piece of content
     */
    long countByContentTypeAndContentId(ContentType contentType, UUID contentId);

    /**
     * Get all viewers for a piece of content
     */
    List<ContentView> findByContentTypeAndContentIdOrderByCreatedAtDesc(
            ContentType contentType, UUID contentId);

    /**
     * Get all viewers for a piece of content (paginated)
     */
    Page<ContentView> findByContentTypeAndContentIdOrderByCreatedAtDesc(
            ContentType contentType, UUID contentId, Pageable pageable);

    /**
     * Get all content viewed by an employee
     */
    Page<ContentView> findByEmployeeIdOrderByLastViewedAtDesc(UUID employeeId, Pageable pageable);

    /**
     * Get all content of a specific type viewed by an employee
     */
    Page<ContentView> findByContentTypeAndEmployeeIdOrderByLastViewedAtDesc(
            ContentType contentType, UUID employeeId, Pageable pageable);

    /**
     * Get employee IDs who viewed specific content
     */
    @Query("SELECT cv.employeeId FROM ContentView cv WHERE cv.contentType = :contentType AND cv.contentId = :contentId")
    List<UUID> findEmployeeIdsByContentTypeAndContentId(
            @Param("contentType") ContentType contentType,
            @Param("contentId") UUID contentId);

    /**
     * Get content IDs viewed by employee (useful for marking as "read")
     */
    @Query("SELECT cv.contentId FROM ContentView cv WHERE cv.contentType = :contentType AND cv.employeeId = :employeeId")
    List<UUID> findContentIdsByContentTypeAndEmployeeId(
            @Param("contentType") ContentType contentType,
            @Param("employeeId") UUID employeeId);

    /**
     * Get view statistics for content
     */
    @Query("SELECT COUNT(DISTINCT cv.employeeId), SUM(cv.viewCount) FROM ContentView cv " +
            "WHERE cv.contentType = :contentType AND cv.contentId = :contentId")
    Object[] getViewStats(@Param("contentType") ContentType contentType, @Param("contentId") UUID contentId);

    /**
     * Get views within a time range
     */
    List<ContentView> findByContentTypeAndContentIdAndCreatedAtBetween(
            ContentType contentType, UUID contentId, LocalDateTime start, LocalDateTime end);

    /**
     * Count views by source for analytics
     */
    @Query("SELECT cv.viewSource, COUNT(cv) FROM ContentView cv " +
            "WHERE cv.contentType = :contentType AND cv.contentId = :contentId " +
            "GROUP BY cv.viewSource")
    List<Object[]> countByViewSource(
            @Param("contentType") ContentType contentType,
            @Param("contentId") UUID contentId);

    /**
     * Get recent viewers (last N)
     */
    @Query("SELECT cv FROM ContentView cv WHERE cv.contentType = :contentType AND cv.contentId = :contentId " +
            "ORDER BY cv.lastViewedAt DESC")
    List<ContentView> findRecentViewers(
            @Param("contentType") ContentType contentType,
            @Param("contentId") UUID contentId,
            Pageable pageable);

    /**
     * Delete all views for a piece of content (when content is deleted)
     */
    void deleteByContentTypeAndContentId(ContentType contentType, UUID contentId);

    /**
     * Count total views for multiple content items (for batch operations)
     */
    @Query("SELECT cv.contentId, COUNT(DISTINCT cv.employeeId) FROM ContentView cv " +
            "WHERE cv.contentType = :contentType AND cv.contentId IN :contentIds " +
            "GROUP BY cv.contentId")
    List<Object[]> countViewersByContentIds(
            @Param("contentType") ContentType contentType,
            @Param("contentIds") List<UUID> contentIds);
}
