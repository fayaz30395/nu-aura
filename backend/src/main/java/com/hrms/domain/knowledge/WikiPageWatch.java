package com.hrms.domain.knowledge;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Entity
@Table(name = "wiki_page_watches", indexes = {
        @Index(name = "idx_wiki_page_watches_tenant", columnList = "tenantId"),
        @Index(name = "idx_wiki_page_watches_user", columnList = "userId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class WikiPageWatch extends TenantAware {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "page_id", nullable = false)
    private WikiPage page;

    @Column(nullable = false)
    private UUID userId;

    @Builder.Default
    @Column(name = "watch_type", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private WatchType watchType = WatchType.COMMENTS;

    public enum WatchType {
        ALL, COMMENTS, NONE
    }
}
