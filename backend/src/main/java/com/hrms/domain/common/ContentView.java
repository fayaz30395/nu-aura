package com.hrms.domain.common;

import jakarta.persistence.*;
import org.hibernate.annotations.TenantId;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Generic content view tracking entity.
 * Tracks views/reads for any content type (posts, announcements, documents, etc.)
 *
 * This allows a unified view tracking system across the application.
 */
@Entity
@Table(name = "content_views",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_content_view_unique",
                columnNames = {"tenant_id", "content_type", "content_id", "employee_id"}
        ),
        indexes = {
                @Index(name = "idx_content_view_content", columnList = "tenant_id, content_type, content_id"),
                @Index(name = "idx_content_view_employee", columnList = "tenant_id, employee_id"),
                @Index(name = "idx_content_view_created", columnList = "tenant_id, created_at")
        }
)
@EntityListeners(AuditingEntityListener.class)
public class ContentView {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @TenantId
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    /**
     * Type of content being viewed.
     * Examples: WALL_POST, ANNOUNCEMENT, DOCUMENT, COMMENT
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "content_type", nullable = false, length = 50)
    private ContentType contentType;

    /**
     * ID of the content being viewed
     */
    @Column(name = "content_id", nullable = false)
    private UUID contentId;

    /**
     * Employee who viewed the content
     */
    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    /**
     * Optional: Duration of view in seconds (for video/document tracking)
     */
    @Column(name = "view_duration_seconds")
    private Integer viewDurationSeconds;

    /**
     * Optional: Source/context of the view (feed, direct_link, notification, search)
     */
    @Column(name = "view_source", length = 50)
    private String viewSource;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * Last view timestamp (updated if same user views again)
     */
    @Column(name = "last_viewed_at")
    private LocalDateTime lastViewedAt;

    /**
     * Number of times this user viewed this content
     */
    @Column(name = "view_count")
    private int viewCount = 1;

    public enum ContentType {
        WALL_POST,
        ANNOUNCEMENT,
        DOCUMENT,
        COMMENT,
        LETTER,
        TRAINING_MATERIAL,
        POLICY,
        NEWS,
        EVENT
    }

    // Constructors
    public ContentView() {}

    public ContentView(ContentType contentType, UUID contentId, UUID employeeId) {
        this.contentType = contentType;
        this.contentId = contentId;
        this.employeeId = employeeId;
        this.lastViewedAt = LocalDateTime.now();
    }

    // Static factory methods
    public static ContentView forWallPost(UUID postId, UUID employeeId) {
        return new ContentView(ContentType.WALL_POST, postId, employeeId);
    }

    public static ContentView forAnnouncement(UUID announcementId, UUID employeeId) {
        return new ContentView(ContentType.ANNOUNCEMENT, announcementId, employeeId);
    }

    public static ContentView forDocument(UUID documentId, UUID employeeId) {
        return new ContentView(ContentType.DOCUMENT, documentId, employeeId);
    }

    // Increment view count for repeat views
    public void incrementViewCount() {
        this.viewCount++;
        this.lastViewedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getTenantId() {
        return tenantId;
    }

    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }

    public ContentType getContentType() {
        return contentType;
    }

    public void setContentType(ContentType contentType) {
        this.contentType = contentType;
    }

    public UUID getContentId() {
        return contentId;
    }

    public void setContentId(UUID contentId) {
        this.contentId = contentId;
    }

    public UUID getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(UUID employeeId) {
        this.employeeId = employeeId;
    }

    public Integer getViewDurationSeconds() {
        return viewDurationSeconds;
    }

    public void setViewDurationSeconds(Integer viewDurationSeconds) {
        this.viewDurationSeconds = viewDurationSeconds;
    }

    public String getViewSource() {
        return viewSource;
    }

    public void setViewSource(String viewSource) {
        this.viewSource = viewSource;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getLastViewedAt() {
        return lastViewedAt;
    }

    public void setLastViewedAt(LocalDateTime lastViewedAt) {
        this.lastViewedAt = lastViewedAt;
    }

    public int getViewCount() {
        return viewCount;
    }

    public void setViewCount(int viewCount) {
        this.viewCount = viewCount;
    }
}
