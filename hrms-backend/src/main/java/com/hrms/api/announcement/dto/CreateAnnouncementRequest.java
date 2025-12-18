package com.hrms.api.announcement.dto;

import com.hrms.domain.announcement.Announcement.AnnouncementCategory;
import com.hrms.domain.announcement.Announcement.AnnouncementPriority;
import com.hrms.domain.announcement.Announcement.TargetAudience;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAnnouncementRequest {
    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    @NotBlank(message = "Content is required")
    private String content;

    private AnnouncementCategory category;
    private AnnouncementPriority priority;
    private TargetAudience targetAudience;
    private Set<UUID> targetDepartmentIds;
    private Set<UUID> targetEmployeeIds;
    private LocalDateTime publishedAt;
    private LocalDateTime expiresAt;
    private Boolean isPinned;
    private Boolean sendEmail;
    private String attachmentUrl;
    private Boolean requiresAcceptance;
}
