package com.hrms.api.knowledge.dto;

import com.hrms.domain.knowledge.WikiInlineComment;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WikiInlineCommentDto {

    private UUID id;
    private UUID pageId;
    private UUID parentCommentId;
    private String anchorSelector;
    private String anchorText;
    private Integer anchorOffset;
    private String content;
    private String status;
    private LocalDateTime resolvedAt;
    private UUID resolvedBy;
    private UUID authorId;
    private String authorName;
    private String authorAvatarUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<WikiInlineCommentDto> replies;

    public static WikiInlineCommentDto fromEntity(WikiInlineComment entity, String authorName, String authorAvatarUrl) {
        if (entity == null) return null;

        return WikiInlineCommentDto.builder()
                .id(entity.getId())
                .pageId(entity.getPageId())
                .parentCommentId(entity.getParentComment() != null ? entity.getParentComment().getId() : null)
                .anchorSelector(entity.getAnchorSelector())
                .anchorText(entity.getAnchorText())
                .anchorOffset(entity.getAnchorOffset())
                .content(entity.getContent())
                .status(entity.getStatus() != null ? entity.getStatus().name() : null)
                .resolvedAt(entity.getResolvedAt())
                .resolvedBy(entity.getResolvedBy())
                .authorId(entity.getCreatedBy())
                .authorName(authorName)
                .authorAvatarUrl(authorAvatarUrl)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
