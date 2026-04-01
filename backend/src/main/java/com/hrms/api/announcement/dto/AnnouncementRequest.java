package com.hrms.api.announcement.dto;

import com.hrms.domain.announcement.Announcement;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnnouncementRequest {

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Content is required")
    private String content;

    @NotNull(message = "Category is required")
    private Announcement.AnnouncementCategory category;

    @NotNull(message = "Priority is required")
    private Announcement.AnnouncementPriority priority;

    @NotNull(message = "Target audience is required")
    private Announcement.TargetAudience targetAudience;

    private List<UUID> targetDepartmentIds;

    private List<UUID> targetEmployeeIds;

    private LocalDateTime publishedAt; // For scheduling

    private LocalDateTime expiresAt;

    private Boolean isPinned;

    private Boolean sendEmail; // Send email notification

    private String attachmentUrl;
}
