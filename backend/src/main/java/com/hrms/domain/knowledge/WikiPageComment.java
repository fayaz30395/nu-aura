package com.hrms.domain.knowledge;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Entity
@Table(name = "wiki_page_comments", indexes = {
        @Index(name = "idx_wiki_page_comments_tenant", columnList = "tenantId"),
        @Index(name = "idx_wiki_page_comments_page", columnList = "pageId"),
        @Index(name = "idx_wiki_page_comments_parent", columnList = "parentCommentId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class WikiPageComment extends TenantAware {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "page_id", nullable = false)
    private WikiPage page;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_comment_id")
    private WikiPageComment parentComment;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "like_count", nullable = false)
    private Integer likeCount = 0;

    @Column(name = "is_pinned", nullable = false)
    private Boolean isPinned = false;
}
