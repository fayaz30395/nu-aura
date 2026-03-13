package com.hrms.domain.knowledge;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "blog_posts", indexes = {
        @Index(name = "idx_blog_posts_tenant", columnList = "tenantId"),
        @Index(name = "idx_blog_posts_category", columnList = "categoryId"),
        @Index(name = "idx_blog_posts_status", columnList = "status"),
        @Index(name = "idx_blog_posts_visibility", columnList = "visibility"),
        @Index(name = "idx_blog_posts_published", columnList = "publishedAt"),
        @Index(name = "idx_blog_posts_featured", columnList = "isFeatured"),
        @Index(name = "idx_blog_posts_slug", columnList = "slug")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class BlogPost extends TenantAware {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private BlogCategory category;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(nullable = false, length = 500, unique = true)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String excerpt;

    @Column(name = "featured_image_url", length = 500)
    private String featuredImageUrl;

    @Column(columnDefinition = "JSONB", nullable = false)
    private String content;

    @Column(nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private BlogPostStatus status = BlogPostStatus.DRAFT;

    @Column(nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private VisibilityLevel visibility;

    @Column(name = "view_count", nullable = false)
    private Integer viewCount = 0;

    @Column(name = "like_count", nullable = false)
    private Integer likeCount = 0;

    @Column(name = "comment_count", nullable = false)
    private Integer commentCount = 0;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "published_by")
    private UUID publishedBy;

    @Column(name = "scheduled_for")
    private LocalDateTime scheduledFor;

    @Column(name = "last_viewed_at")
    private LocalDateTime lastViewedAt;

    @Column(name = "last_viewed_by")
    private UUID lastViewedBy;

    @Column(name = "is_featured", nullable = false)
    private Boolean isFeatured = false;

    @Column(name = "featured_until")
    private LocalDateTime featuredUntil;

    @Column(name = "read_time_minutes")
    private Integer readTimeMinutes;

    public enum BlogPostStatus {
        DRAFT, PUBLISHED, SCHEDULED, ARCHIVED
    }

    public enum VisibilityLevel {
        PUBLIC, ORGANIZATION, TEAM, PRIVATE, RESTRICTED
    }
}
