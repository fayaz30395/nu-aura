package com.hrms.domain.knowledge;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "wiki_page_likes", indexes = {
        @Index(name = "idx_wiki_page_likes_tenant_page", columnList = "tenantId,wikiPageId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class WikiPageLike extends TenantAware {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wiki_page_id", nullable = false)
    private WikiPage wikiPage;

    @Column(name = "liked_by", nullable = false)
    private UUID likedBy;
}
