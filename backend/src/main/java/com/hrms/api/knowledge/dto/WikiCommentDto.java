package com.hrms.api.knowledge.dto;

import com.hrms.domain.knowledge.WikiPageComment;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WikiCommentDto {

    private UUID id;
    private String content;
    private UUID authorId;
    private String authorName;
    private Integer likeCount;
    private UUID parentCommentId;
    private List<UUID> mentions;
    private List<WikiCommentDto> replies;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static WikiCommentDto fromEntity(WikiPageComment entity) {
        if (entity == null) return null;

        return WikiCommentDto.builder()
                .id(entity.getId())
                .content(entity.getContent())
                .authorId(entity.getCreatedBy())
                .likeCount(entity.getLikeCount())
                .parentCommentId(entity.getParentComment() != null ? entity.getParentComment().getId() : null)
                .mentions(entity.getMentions())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
