package com.hrms.api.knowledge.dto;

import com.hrms.domain.knowledge.WikiPage;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WikiPageDto {

    private UUID id;
    private UUID tenantId;

    private UUID spaceId;
    private String spaceName;
    private UUID parentPageId;
    private String parentPageTitle;

    private String title;
    private String slug;
    private String excerpt;
    private String content;

    private String status;
    private String visibility;

    private Integer viewCount;
    private Integer likeCount;
    private Integer commentCount;

    private LocalDateTime lastViewedAt;
    private UUID lastViewedBy;

    private Boolean isPinned;
    private LocalDateTime pinnedAt;
    private UUID pinnedBy;

    private LocalDateTime publishedAt;
    private UUID publishedBy;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdBy;
    private UUID lastModifiedBy;

    // Author information
    private String authorName;
    private String authorAvatarUrl;

    private Integer childCount;

    private Boolean canEdit;
    private Boolean canDelete;
    private Boolean canPublish;

    public static WikiPageDto fromEntity(WikiPage entity) {
        return fromEntity(entity, null, null);
    }

    public static WikiPageDto fromEntity(WikiPage entity, String authorName, String authorAvatarUrl) {
        if (entity == null) return null;

        return WikiPageDto.builder()
                .id(entity.getId())
                .tenantId(entity.getTenantId())
                .spaceId(entity.getSpace() != null ? entity.getSpace().getId() : null)
                .spaceName(entity.getSpace() != null ? entity.getSpace().getName() : null)
                .parentPageId(entity.getParentPage() != null ? entity.getParentPage().getId() : null)
                .parentPageTitle(entity.getParentPage() != null ? entity.getParentPage().getTitle() : null)
                .title(entity.getTitle())
                .slug(entity.getSlug())
                .excerpt(entity.getExcerpt())
                .content(entity.getContent())
                .status(entity.getStatus() != null ? entity.getStatus().name() : null)
                .visibility(entity.getVisibility() != null ? entity.getVisibility().name() : null)
                .viewCount(entity.getViewCount())
                .likeCount(entity.getLikeCount())
                .commentCount(entity.getCommentCount())
                .lastViewedAt(entity.getLastViewedAt())
                .lastViewedBy(entity.getLastViewedBy())
                .isPinned(entity.getIsPinned())
                .pinnedAt(entity.getPinnedAt())
                .pinnedBy(entity.getPinnedBy())
                .publishedAt(entity.getPublishedAt())
                .publishedBy(entity.getPublishedBy())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .lastModifiedBy(entity.getLastModifiedBy())
                .authorName(authorName)
                .authorAvatarUrl(authorAvatarUrl)
                .build();
    }

    public WikiPage toEntity() {
        return WikiPage.builder()
                .id(this.id)
                .tenantId(this.tenantId)
                .title(this.title)
                .slug(this.slug)
                .excerpt(this.excerpt)
                .content(this.content)
                .status(WikiPage.PageStatus.valueOf(this.status))
                .visibility(WikiPage.VisibilityLevel.valueOf(this.visibility))
                .viewCount(this.viewCount)
                .likeCount(this.likeCount)
                .commentCount(this.commentCount)
                .lastViewedAt(this.lastViewedAt)
                .lastViewedBy(this.lastViewedBy)
                .isPinned(this.isPinned)
                .pinnedAt(this.pinnedAt)
                .pinnedBy(this.pinnedBy)
                .publishedAt(this.publishedAt)
                .publishedBy(this.publishedBy)
                .createdAt(this.createdAt)
                .updatedAt(this.updatedAt)
                .createdBy(this.createdBy)
                .lastModifiedBy(this.lastModifiedBy)
                .build();
    }
}
