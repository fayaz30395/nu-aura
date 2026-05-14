package com.nulogic.api.announcement.dto;

import com.nulogic.domain.announcement.Announcement;
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
public class AnnouncementResponse {

    private UUID id;
    private String title;
    private String content;
    private Announcement.AnnouncementCategory category;
    private Announcement.AnnouncementPriority priority;
    private Announcement.AnnouncementStatus status;
    private Announcement.TargetAudience targetAudience;
    private LocalDateTime publishedAt;
    private LocalDateTime expiresAt;
    private Boolean isPinned;
    private String publishedByName;
    private String attachmentUrl;
    private Long readCount;
    private Boolean isRead; // For current user
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID wallPostId; // Reference to wall post for reactions/comments
    private Boolean hasReacted; // Whether current user has reacted

    // Helper methods — callers must supply tenant-aware "now"
    // (e.g. tenantTimeService.now(tenantId)) because DTOs cannot inject Spring beans.
    public boolean isExpired(LocalDateTime now) {
        return expiresAt != null && expiresAt.isBefore(now);
    }

    public boolean isActive(LocalDateTime now) {
        return status == Announcement.AnnouncementStatus.PUBLISHED &&
                (expiresAt == null || expiresAt.isAfter(now));
    }

    public boolean isScheduled(LocalDateTime now) {
        return status == Announcement.AnnouncementStatus.SCHEDULED &&
                publishedAt != null && publishedAt.isAfter(now);
    }
}
