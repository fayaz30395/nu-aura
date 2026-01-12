package com.hrms.domain.lms;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "lms_content_progress", indexes = {
        @Index(name = "idx_lms_progress_tenant", columnList = "tenantId"),
        @Index(name = "idx_lms_progress_enrollment", columnList = "enrollmentId"),
        @Index(name = "idx_lms_progress_content", columnList = "contentId")
}, uniqueConstraints = {
        @UniqueConstraint(columnNames = { "enrollmentId", "contentId", "tenantId" })
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContentProgress extends TenantAware {

    @Column(name = "enrollment_id", nullable = false)
    private UUID enrollmentId;

    @Column(name = "content_id", nullable = false)
    private UUID contentId;

    @Column(name = "module_id", nullable = false)
    private UUID moduleId;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    @Builder.Default
    private ProgressStatus status = ProgressStatus.NOT_STARTED;

    @Column(name = "progress_percentage", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal progressPercentage = BigDecimal.ZERO;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "time_spent_seconds")
    @Builder.Default
    private Integer timeSpentSeconds = 0;

    // For video content
    @Column(name = "video_position_seconds")
    private Integer videoPositionSeconds;

    // For document content
    @Column(name = "current_page")
    private Integer currentPage;

    @Column(name = "total_pages")
    private Integer totalPages;

    public Integer getTimeSpentSeconds() {
        return timeSpentSeconds;
    }

    public void setTimeSpentSeconds(Integer timeSpentSeconds) {
        this.timeSpentSeconds = timeSpentSeconds;
    }

    @Override
    public void setUpdatedAt(LocalDateTime updatedAt) {
        super.setUpdatedAt(updatedAt);
    }

    public void setStatus(ProgressStatus status) {
        this.status = status;
    }

    public enum ProgressStatus {
        NOT_STARTED,
        IN_PROGRESS,
        COMPLETED
    }

    // Explicit setters for service layer access
    public void setId(UUID id) {
        super.setId(id);
    }

    public void setTenantId(UUID tenantId) {
        super.setTenantId(tenantId);
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(LocalDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public void setProgressPercentage(BigDecimal progressPercentage) {
        this.progressPercentage = progressPercentage;
    }

    public ProgressStatus getStatus() {
        return status;
    }

    public UUID getModuleId() {
        return moduleId;
    }

    public UUID getContentId() {
        return contentId;
    }

    public UUID getEnrollmentId() {
        return enrollmentId;
    }
}
