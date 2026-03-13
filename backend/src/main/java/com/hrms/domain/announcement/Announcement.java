package com.hrms.domain.announcement;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "announcements", indexes = {
    @Index(name = "idx_announcement_tenant", columnList = "tenant_id"),
    @Index(name = "idx_announcement_status", columnList = "status"),
    @Index(name = "idx_announcement_published", columnList = "published_at"),
    @Index(name = "idx_announcement_pinned", columnList = "is_pinned")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Announcement extends TenantAware {

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private AnnouncementCategory category = AnnouncementCategory.GENERAL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private AnnouncementPriority priority = AnnouncementPriority.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private AnnouncementStatus status = AnnouncementStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_audience", nullable = false, length = 30)
    @Builder.Default
    private TargetAudience targetAudience = TargetAudience.ALL_EMPLOYEES;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "announcement_target_departments",
                     joinColumns = @JoinColumn(name = "announcement_id"))
    @Column(name = "department_id")
    @Builder.Default
    private Set<UUID> targetDepartmentIds = new HashSet<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "announcement_target_employees",
                     joinColumns = @JoinColumn(name = "announcement_id"))
    @Column(name = "employee_id")
    @Builder.Default
    private Set<UUID> targetEmployeeIds = new HashSet<>();

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "is_pinned")
    @Builder.Default
    private Boolean isPinned = false;

    @Column(name = "send_email")
    @Builder.Default
    private Boolean sendEmail = false;

    @Column(name = "attachment_url", length = 500)
    private String attachmentUrl;

    @Column(name = "read_count")
    @Builder.Default
    private Integer readCount = 0;

    @Column(name = "accepted_count")
    @Builder.Default
    private Integer acceptedCount = 0;

    @Column(name = "requires_acceptance")
    @Builder.Default
    private Boolean requiresAcceptance = false;

    @Column(name = "published_by")
    private UUID publishedBy;

    @Column(name = "published_by_name", length = 200)
    private String publishedByName;

    public enum AnnouncementCategory {
        GENERAL, POLICY_UPDATE, EVENT, HOLIDAY, ACHIEVEMENT, URGENT,
        BENEFIT, TRAINING, SOCIAL, IT_MAINTENANCE, HEALTH_SAFETY, OTHER
    }

    public enum AnnouncementPriority {
        LOW, MEDIUM, HIGH, CRITICAL
    }

    public enum AnnouncementStatus {
        DRAFT, SCHEDULED, PUBLISHED, EXPIRED, ARCHIVED
    }

    public enum TargetAudience {
        ALL_EMPLOYEES, SPECIFIC_DEPARTMENTS, SPECIFIC_EMPLOYEES, MANAGERS_ONLY, NEW_JOINERS
    }

    public void publish(UUID publisherId, String publisherName) {
        this.status = AnnouncementStatus.PUBLISHED;
        this.publishedAt = LocalDateTime.now();
        this.publishedBy = publisherId;
        this.publishedByName = publisherName;
    }

    public void incrementReadCount() {
        this.readCount = (this.readCount == null ? 0 : this.readCount) + 1;
    }

    public void incrementAcceptedCount() {
        this.acceptedCount = (this.acceptedCount == null ? 0 : this.acceptedCount) + 1;
    }
}
