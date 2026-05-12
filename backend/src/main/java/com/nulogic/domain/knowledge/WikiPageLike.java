package com.nulogic.domain.knowledge;

import com.nulogic.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.Where;

import java.util.UUID;

@Where(clause = "is_deleted = false")
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
