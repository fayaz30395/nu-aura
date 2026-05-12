package com.nulogic.api.knowledge.dto;

import com.nulogic.domain.knowledge.SpaceMember;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpaceMemberDto {

    private UUID id;
    private UUID spaceId;
    private UUID userId;
    private String role;
    private UUID addedBy;
    private LocalDateTime addedAt;
    private LocalDateTime createdAt;

    public static SpaceMemberDto fromEntity(SpaceMember entity) {
        if (entity == null) return null;

        return SpaceMemberDto.builder()
                .id(entity.getId())
                .spaceId(entity.getSpaceId())
                .userId(entity.getUserId())
                .role(entity.getRole() != null ? entity.getRole().name() : null)
                .addedBy(entity.getAddedBy())
                .addedAt(entity.getAddedAt())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
