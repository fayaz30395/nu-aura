package com.hrms.domain.knowledge;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.Where;

import java.time.LocalDateTime;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "wiki_inline_comments", indexes = {
        @Index(name = "idx_wiki_inline_comments_tenant_page", columnList = "tenantId, pageId"),
        @Index(name = "idx_wiki_inline_comments_tenant_page_status", columnList = "tenantId, pageId, status"),
        @Index(name = "idx_wiki_inline_comments_parent", columnList = "parentCommentId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class WikiInlineComment extends TenantAware {

    @Column(name = "page_id", nullable = false)
    private UUID pageId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_comment_id")
    private WikiInlineComment parentComment;

    @Column(name = "anchor_selector", length = 500)
    private String anchorSelector;

    @Column(name = "anchor_text", length = 500)
    private String anchorText;

    @Column(name = "anchor_offset")
    private Integer anchorOffset;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Builder.Default
    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private InlineCommentStatus status = InlineCommentStatus.OPEN;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "resolved_by")
    private UUID resolvedBy;

    public enum InlineCommentStatus {
        OPEN, RESOLVED, DELETED
    }
}
