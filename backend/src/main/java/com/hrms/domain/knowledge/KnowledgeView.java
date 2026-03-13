package com.hrms.domain.knowledge;

import com.hrms.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Entity
@Table(name = "knowledge_views", indexes = {
        @Index(name = "idx_knowledge_views_tenant", columnList = "tenantId"),
        @Index(name = "idx_knowledge_views_content", columnList = "contentType,contentId"),
        @Index(name = "idx_knowledge_views_user", columnList = "userId"),
        @Index(name = "idx_knowledge_views_created_at", columnList = "createdAt")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class KnowledgeView extends BaseEntity {

    @Column(nullable = false)
    private UUID tenantId;

    @Column(name = "content_type", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private ContentType contentType;

    @Column(name = "content_id", nullable = false)
    private UUID contentId;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", length = 1000)
    private String userAgent;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    public enum ContentType {
        WIKI_PAGE, BLOG_POST
    }
}
