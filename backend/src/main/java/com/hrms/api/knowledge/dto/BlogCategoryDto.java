package com.hrms.api.knowledge.dto;

import com.hrms.domain.knowledge.BlogCategory;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlogCategoryDto {

    private UUID id;
    private UUID tenantId;

    private String name;
    private String slug;
    private String description;
    private String color;
    private String icon;
    private Integer orderIndex;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdBy;
    private UUID lastModifiedBy;

    private Long postCount;

    public static BlogCategoryDto fromEntity(BlogCategory entity) {
        if (entity == null) return null;

        return BlogCategoryDto.builder()
                .id(entity.getId())
                .tenantId(entity.getTenantId())
                .name(entity.getName())
                .slug(entity.getSlug())
                .description(entity.getDescription())
                .color(entity.getColor())
                .icon(entity.getIcon())
                .orderIndex(entity.getOrderIndex())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .lastModifiedBy(entity.getLastModifiedBy())
                .build();
    }

    public BlogCategory toEntity() {
        return BlogCategory.builder()
                .id(this.id)
                .tenantId(this.tenantId)
                .name(this.name)
                .slug(this.slug)
                .description(this.description)
                .color(this.color)
                .icon(this.icon)
                .orderIndex(this.orderIndex)
                .createdAt(this.createdAt)
                .updatedAt(this.updatedAt)
                .createdBy(this.createdBy)
                .lastModifiedBy(this.lastModifiedBy)
                .build();
    }
}
