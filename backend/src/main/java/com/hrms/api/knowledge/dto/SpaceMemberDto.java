package com.hrms.api.knowledge.dto;

import com.hrms.domain.knowledge.SpaceMember;
import lombok.*;

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
