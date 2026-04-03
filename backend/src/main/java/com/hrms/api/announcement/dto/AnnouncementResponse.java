package com.hrms.api.announcement.dto;

import com.hrms.domain.announcement.Announcement;
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

    // Helper methods
    public boolean isExpired() {
        return expiresAt != null && expiresAt.isBefore(LocalDateTime.now());
    }

    public boolean isActive() {
        return status == Announcement.AnnouncementStatus.PUBLISHED &&
                (expiresAt == null || expiresAt.isAfter(LocalDateTime.now()));
    }

    public boolean isScheduled() {
        return status == Announcement.AnnouncementStatus.SCHEDULED &&
                publishedAt != null && publishedAt.isAfter(LocalDateTime.now());
    }
}
