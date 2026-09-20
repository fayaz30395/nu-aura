package com.nulogic.api.knowledge.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Minimal shape consumed by the frontend's {@code RelatedContent} component.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RelatedContentDto {
    private UUID id;
    private String title;
    private String excerpt;
    private String type;
    private Integer viewCount;
    private Integer likeCount;
    private LocalDateTime updatedAt;
}
