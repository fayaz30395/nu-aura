package com.hrms.api.knowledge.dto;

import com.hrms.domain.knowledge.FluenceActivity;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FluenceActivityDto {

    private UUID id;
    private UUID actorId;
    private String actorName;
    private String action;
    private String contentType;
    private UUID contentId;
    private String contentTitle;
    private String contentExcerpt;
    private Map<String, Object> metadata;
    private LocalDateTime createdAt;

    public static FluenceActivityDto fromEntity(FluenceActivity entity) {
        return fromEntity(entity, null);
    }

    public static FluenceActivityDto fromEntity(FluenceActivity entity, String actorName) {
        if (entity == null) return null;

        return FluenceActivityDto.builder()
                .id(entity.getId())
                .actorId(entity.getActorId())
                .actorName(actorName)
                .action(entity.getAction())
                .contentType(entity.getContentType())
                .contentId(entity.getContentId())
                .contentTitle(entity.getContentTitle())
                .contentExcerpt(entity.getContentExcerpt())
                .metadata(entity.getMetadata())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
