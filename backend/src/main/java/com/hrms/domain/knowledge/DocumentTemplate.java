package com.hrms.domain.knowledge;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity(name = "KnowledgeDocumentTemplate")
@Table(name = "knowledge_templates", indexes = {
        @Index(name = "idx_knowledge_templates_tenant", columnList = "tenantId"),
        @Index(name = "idx_knowledge_templates_category", columnList = "category"),
        @Index(name = "idx_knowledge_templates_is_active", columnList = "isActive"),
        @Index(name = "idx_knowledge_templates_is_featured", columnList = "isFeatured")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class DocumentTemplate extends TenantAware {

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, length = 200, unique = true)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 100)
    private String category;

    @Column(columnDefinition = "JSONB", nullable = false)
    private String content;

    @Column(columnDefinition = "JSONB")
    private String templateVariables;

    @Column(columnDefinition = "JSONB")
    private String sampleData;

    @Column(name = "thumbnail_url", length = 500)
    private String thumbnailUrl;

    @Column(name = "usage_count", nullable = false)
    private Integer usageCount = 0;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "is_featured", nullable = false)
    private Boolean isFeatured = false;

    @Column(length = 1000)
    private String tags;
}
