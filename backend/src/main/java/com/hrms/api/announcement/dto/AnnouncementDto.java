package com.hrms.api.announcement.dto;

import com.hrms.domain.announcement.Announcement;
import lombok.*;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class AnnouncementDto {
    private UUID id;
    private String title;
    private String content;
    private String category;
    private String priority;
    private String status;
    private String targetAudience;
    private Set<UUID> targetDepartmentIds;
    private Set<UUID> targetEmployeeIds;
    private LocalDateTime publishedAt;
    private LocalDateTime expiresAt;
    private Boolean isPinned;
    private Boolean sendEmail;
    private String attachmentUrl;
    private Integer readCount;
    private Integer acceptedCount;
    private UUID publishedBy;
    private String publishedByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean isRead;
    private Boolean isAccepted;
    private LocalDateTime acceptedAt;
    private Boolean requiresAcceptance;
    private UUID wallPostId;
    private Boolean hasReacted;

    public static AnnouncementDto fromEntity(Announcement entity) {
        return AnnouncementDto.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .content(entity.getContent())
                .category(entity.getCategory().name())
                .priority(entity.getPriority().name())
                .status(entity.getStatus().name())
                .targetAudience(entity.getTargetAudience().name())
                .targetDepartmentIds(entity.getTargetDepartmentIds() != null ? new HashSet<>(entity.getTargetDepartmentIds()) : new HashSet<>())
                .targetEmployeeIds(entity.getTargetEmployeeIds() != null ? new HashSet<>(entity.getTargetEmployeeIds()) : new HashSet<>())
                .publishedAt(entity.getPublishedAt())
                .expiresAt(entity.getExpiresAt())
                .isPinned(entity.getIsPinned())
                .sendEmail(entity.getSendEmail())
                .attachmentUrl(entity.getAttachmentUrl())
                .readCount(entity.getReadCount())
                .acceptedCount(entity.getAcceptedCount())
                .requiresAcceptance(entity.getRequiresAcceptance())
                .publishedBy(entity.getPublishedBy())
                .publishedByName(entity.getPublishedByName())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .wallPostId(entity.getWallPostId())
                .isRead(false)
                .isAccepted(false)
                .build();
    }
}
