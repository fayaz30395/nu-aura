package com.hrms.api.knowledge.dto;

import com.hrms.domain.knowledge.WikiSpace;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WikiSpaceDto {

    private UUID id;
    private UUID tenantId;

    private String name;
    private String description;
    private String slug;
    private String icon;
    private String visibility;
    private String color;
    private Integer orderIndex;
    private Boolean isArchived;
    private LocalDateTime archivedAt;
    private UUID archivedBy;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdBy;
    private UUID lastModifiedBy;

    private Long pageCount;

    public static WikiSpaceDto fromEntity(WikiSpace entity) {
        if (entity == null) return null;

        return WikiSpaceDto.builder()
                .id(entity.getId())
                .tenantId(entity.getTenantId())
                .name(entity.getName())
                .description(entity.getDescription())
                .slug(entity.getSlug())
                .icon(entity.getIcon())
                .visibility(entity.getVisibility() != null ? entity.getVisibility().name() : null)
                .color(entity.getColor())
                .orderIndex(entity.getOrderIndex())
                .isArchived(entity.getIsArchived())
                .archivedAt(entity.getArchivedAt())
                .archivedBy(entity.getArchivedBy())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .lastModifiedBy(entity.getLastModifiedBy())
                .build();
    }

    public WikiSpace toEntity() {
        return WikiSpace.builder()
                .id(this.id)
                .tenantId(this.tenantId)
                .name(this.name)
                .description(this.description)
                .slug(this.slug)
                .icon(this.icon)
                .visibility(WikiSpace.VisibilityLevel.valueOf(this.visibility))
                .color(this.color)
                .orderIndex(this.orderIndex)
                .isArchived(this.isArchived)
                .archivedAt(this.archivedAt)
                .archivedBy(this.archivedBy)
                .createdAt(this.createdAt)
                .updatedAt(this.updatedAt)
                .createdBy(this.createdBy)
                .lastModifiedBy(this.lastModifiedBy)
                .build();
    }
}
