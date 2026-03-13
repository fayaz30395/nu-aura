package com.hrms.api.knowledge.dto;

import com.hrms.domain.knowledge.BlogPost;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlogPostDto {

    private UUID id;
    private UUID tenantId;

    private UUID categoryId;
    private String categoryName;

    private String title;
    private String slug;
    private String excerpt;
    private String featuredImageUrl;
    private String content;

    private String status;
    private String visibility;

    private Integer viewCount;
    private Integer likeCount;
    private Integer commentCount;

    private LocalDateTime publishedAt;
    private UUID publishedBy;
    private LocalDateTime scheduledFor;

    private LocalDateTime lastViewedAt;
    private UUID lastViewedBy;

    private Boolean isFeatured;
    private LocalDateTime featuredUntil;

    private Integer readTimeMinutes;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdBy;
    private UUID lastModifiedBy;

    private Boolean isLikedByCurrentUser;
    private Boolean canEdit;
    private Boolean canDelete;

    public static BlogPostDto fromEntity(BlogPost entity) {
        if (entity == null) return null;

        return BlogPostDto.builder()
                .id(entity.getId())
                .tenantId(entity.getTenantId())
                .categoryId(entity.getCategory() != null ? entity.getCategory().getId() : null)
                .categoryName(entity.getCategory() != null ? entity.getCategory().getName() : null)
                .title(entity.getTitle())
                .slug(entity.getSlug())
                .excerpt(entity.getExcerpt())
                .featuredImageUrl(entity.getFeaturedImageUrl())
                .content(entity.getContent())
                .status(entity.getStatus() != null ? entity.getStatus().name() : null)
                .visibility(entity.getVisibility() != null ? entity.getVisibility().name() : null)
                .viewCount(entity.getViewCount())
                .likeCount(entity.getLikeCount())
                .commentCount(entity.getCommentCount())
                .publishedAt(entity.getPublishedAt())
                .publishedBy(entity.getPublishedBy())
                .scheduledFor(entity.getScheduledFor())
                .lastViewedAt(entity.getLastViewedAt())
                .lastViewedBy(entity.getLastViewedBy())
                .isFeatured(entity.getIsFeatured())
                .featuredUntil(entity.getFeaturedUntil())
                .readTimeMinutes(entity.getReadTimeMinutes())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .lastModifiedBy(entity.getLastModifiedBy())
                .build();
    }

    public BlogPost toEntity() {
        return BlogPost.builder()
                .id(this.id)
                .tenantId(this.tenantId)
                .title(this.title)
                .slug(this.slug)
                .excerpt(this.excerpt)
                .featuredImageUrl(this.featuredImageUrl)
                .content(this.content)
                .status(BlogPost.BlogPostStatus.valueOf(this.status))
                .visibility(BlogPost.VisibilityLevel.valueOf(this.visibility))
                .viewCount(this.viewCount)
                .likeCount(this.likeCount)
                .commentCount(this.commentCount)
                .publishedAt(this.publishedAt)
                .publishedBy(this.publishedBy)
                .scheduledFor(this.scheduledFor)
                .lastViewedAt(this.lastViewedAt)
                .lastViewedBy(this.lastViewedBy)
                .isFeatured(this.isFeatured)
                .featuredUntil(this.featuredUntil)
                .readTimeMinutes(this.readTimeMinutes)
                .createdAt(this.createdAt)
                .updatedAt(this.updatedAt)
                .createdBy(this.createdBy)
                .lastModifiedBy(this.lastModifiedBy)
                .build();
    }
}
