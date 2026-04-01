package com.hrms.api.knowledge.dto;

import com.hrms.domain.knowledge.DocumentTemplate;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentTemplateDto {

    private UUID id;
    private UUID tenantId;

    private String name;
    private String slug;
    private String description;
    private String category;
    private String content;

    private String templateVariables;
    private String sampleData;

    private String thumbnailUrl;

    private Integer usageCount;
    private Boolean isActive;
    private Boolean isFeatured;

    private String tags;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdBy;
    private UUID lastModifiedBy;

    public static DocumentTemplateDto fromEntity(DocumentTemplate entity) {
        if (entity == null) return null;

        return DocumentTemplateDto.builder()
                .id(entity.getId())
                .tenantId(entity.getTenantId())
                .name(entity.getName())
                .slug(entity.getSlug())
                .description(entity.getDescription())
                .category(entity.getCategory())
                .content(entity.getContent())
                .templateVariables(entity.getTemplateVariables())
                .sampleData(entity.getSampleData())
                .thumbnailUrl(entity.getThumbnailUrl())
                .usageCount(entity.getUsageCount())
                .isActive(entity.getIsActive())
                .isFeatured(entity.getIsFeatured())
                .tags(entity.getTags())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .lastModifiedBy(entity.getLastModifiedBy())
                .build();
    }

    public DocumentTemplate toEntity() {
        return DocumentTemplate.builder()
                .id(this.id)
                .tenantId(this.tenantId)
                .name(this.name)
                .slug(this.slug)
                .description(this.description)
                .category(this.category)
                .content(this.content)
                .templateVariables(this.templateVariables)
                .sampleData(this.sampleData)
                .thumbnailUrl(this.thumbnailUrl)
                .usageCount(this.usageCount)
                .isActive(this.isActive)
                .isFeatured(this.isFeatured)
                .tags(this.tags)
                .createdAt(this.createdAt)
                .updatedAt(this.updatedAt)
                .createdBy(this.createdBy)
                .lastModifiedBy(this.lastModifiedBy)
                .build();
    }
}
