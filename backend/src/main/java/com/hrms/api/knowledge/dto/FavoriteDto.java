package com.hrms.api.knowledge.dto;

import com.hrms.domain.knowledge.FluenceFavorite;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FavoriteDto {

    private UUID id;
    private UUID userId;
    private UUID contentId;
    private String contentType;
    private LocalDateTime createdAt;

    public static FavoriteDto fromEntity(FluenceFavorite entity) {
        if (entity == null) return null;

        return FavoriteDto.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .contentId(entity.getContentId())
                .contentType(entity.getContentType())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
