package com.hrms.domain.knowledge;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "wiki_pages", indexes = {
        @Index(name = "idx_wiki_pages_tenant", columnList = "tenantId"),
        @Index(name = "idx_wiki_pages_space", columnList = "spaceId"),
        @Index(name = "idx_wiki_pages_parent", columnList = "parentPageId"),
        @Index(name = "idx_wiki_pages_status", columnList = "status"),
        @Index(name = "idx_wiki_pages_visibility", columnList = "visibility"),
        @Index(name = "idx_wiki_pages_slug", columnList = "slug"),
        @Index(name = "idx_wiki_pages_is_pinned", columnList = "isPinned")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class WikiPage extends TenantAware {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "space_id", nullable = false)
    private WikiSpace space;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_page_id")
    private WikiPage parentPage;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(nullable = false, length = 500)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String excerpt;

    @Column(columnDefinition = "JSONB", nullable = false)
    private String content;

    @Builder.Default
    @Column(nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private PageStatus status = PageStatus.DRAFT;

    @Column(nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private VisibilityLevel visibility;

    @Builder.Default
    @Column(name = "view_count", nullable = false)
    private Integer viewCount = 0;

    @Builder.Default
    @Column(name = "like_count", nullable = false)
    private Integer likeCount = 0;

    @Builder.Default
    @Column(name = "comment_count", nullable = false)
    private Integer commentCount = 0;

    @Column(name = "last_viewed_at")
    private LocalDateTime lastViewedAt;

    @Column(name = "last_viewed_by")
    private UUID lastViewedBy;

    @Builder.Default
    @Column(name = "is_pinned", nullable = false)
    private Boolean isPinned = false;

    @Column(name = "pinned_at")
    private LocalDateTime pinnedAt;

    @Column(name = "pinned_by")
    private UUID pinnedBy;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "published_by")
    private UUID publishedBy;

    public enum PageStatus {
        DRAFT, PUBLISHED, ARCHIVED
    }

    public enum VisibilityLevel {
        PUBLIC, ORGANIZATION, TEAM, PRIVATE, RESTRICTED
    }
}
