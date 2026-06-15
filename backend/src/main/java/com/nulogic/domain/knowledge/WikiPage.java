package com.nulogic.domain.knowledge;

import com.nulogic.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;
import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "wiki_pages", indexes = {
        @Index(name = "idx_wiki_pages_tenant", columnList = "tenant_id"),
        @Index(name = "idx_wiki_pages_space", columnList = "space_id"),
        @Index(name = "idx_wiki_pages_parent", columnList = "parent_page_id"),
        @Index(name = "idx_wiki_pages_status", columnList = "status"),
        @Index(name = "idx_wiki_pages_visibility", columnList = "visibility"),
        @Index(name = "idx_wiki_pages_slug", columnList = "slug"),
        @Index(name = "idx_wiki_pages_is_pinned", columnList = "is_pinned")
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

    /**
     * Plain-text projection of {@link #content} (TipTap JSONB), populated by
     * {@code WikiPageService.{createPage,updatePage}}. Indexed with pg_trgm GIN
     * (V152) so the RAG retriever in {@code FluenceContentRetriever} can perform
     * substring search without falling back to a sequential scan of the
     * {@code CAST(content AS TEXT)} expression. See V152 migration notes.
     */
    @Column(name = "body_text", columnDefinition = "TEXT")
    private String bodyText;

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
