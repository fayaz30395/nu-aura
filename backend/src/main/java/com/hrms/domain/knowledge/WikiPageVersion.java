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
@Table(name = "wiki_page_versions", indexes = {
        @Index(name = "idx_wiki_page_versions_tenant", columnList = "tenantId"),
        @Index(name = "idx_wiki_page_versions_page", columnList = "pageId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class WikiPageVersion extends TenantAware {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "page_id", nullable = false)
    private WikiPage page;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String excerpt;

    @Column(columnDefinition = "JSONB", nullable = false)
    private String content;

    @Column(name = "change_summary", length = 500)
    private String changeSummary;

    @Column(name = "created_by")
    private UUID createdBy;
}
