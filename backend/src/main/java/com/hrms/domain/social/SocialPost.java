package com.hrms.domain.social;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "social_posts", indexes = {
        @Index(name = "idx_social_post_tenant", columnList = "tenant_id"),
        @Index(name = "idx_social_post_author", columnList = "tenant_id,author_id"),
        @Index(name = "idx_social_post_type", columnList = "tenant_id,post_type"),
        @Index(name = "idx_social_post_created", columnList = "tenant_id,created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SocialPost {

    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "author_id", nullable = false)
    private UUID authorId;

    @Column(name = "post_type", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private PostType postType;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Column(name = "media_urls", columnDefinition = "TEXT")
    private String mediaUrls; // JSON array of media URLs

    @Column(name = "visibility", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private Visibility visibility;

    @Column(name = "is_pinned")
    private Boolean isPinned;

    @Column(name = "pinned_at")
    private LocalDateTime pinnedAt;

    @Column(name = "pinned_by")
    private UUID pinnedBy;

    @Column(name = "is_announcement")
    private Boolean isAnnouncement;

    @Column(name = "target_audience", length = 50)
    @Enumerated(EnumType.STRING)
    private TargetAudience targetAudience;

    @Column(name = "department_id")
    private UUID departmentId;

    @Column(name = "location", length = 255)
    private String location;

    @Column(name = "celebration_type", length = 50)
    @Enumerated(EnumType.STRING)
    private CelebrationType celebrationType;

    @Column(name = "celebrated_employee_id")
    private UUID celebratedEmployeeId;

    @Column(name = "achievement_title", length = 500)
    private String achievementTitle;

    @Column(name = "likes_count")
    private Integer likesCount;

    @Column(name = "comments_count")
    private Integer commentsCount;

    @Column(name = "shares_count")
    private Integer sharesCount;

    @Column(name = "is_edited")
    private Boolean isEdited;

    @Column(name = "edited_at")
    private LocalDateTime editedAt;

    @Column(name = "is_deleted")
    private Boolean isDeleted;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_by")
    private UUID deletedBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum PostType {
        GENERAL,              // Regular post
        ANNOUNCEMENT,         // Company announcement
        CELEBRATION,          // Birthday, work anniversary, achievement
        PRAISE,              // Praise/recognition post
        POLL,                // Poll/survey
        EVENT,               // Event invitation/update
        MILESTONE,           // Company/team milestone
        WELCOME              // Welcome new employee
    }

    public enum Visibility {
        PUBLIC,              // Visible to all employees
        DEPARTMENT,          // Only department members
        TEAM,               // Only team members
        PRIVATE             // Only mentioned people
    }

    public enum TargetAudience {
        ALL_EMPLOYEES,
        DEPARTMENT,
        LOCATION,
        CUSTOM
    }

    public enum CelebrationType {
        BIRTHDAY,
        WORK_ANNIVERSARY,
        PROMOTION,
        NEW_JOINER,
        ACHIEVEMENT,
        AWARD,
        CERTIFICATION
    }
}
