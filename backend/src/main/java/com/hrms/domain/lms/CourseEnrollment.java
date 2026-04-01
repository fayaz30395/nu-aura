package com.hrms.domain.lms;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "lms_course_enrollments", indexes = {
        @Index(name = "idx_lms_enroll_tenant", columnList = "tenantId"),
        @Index(name = "idx_lms_enroll_course", columnList = "courseId"),
        @Index(name = "idx_lms_enroll_employee", columnList = "employeeId"),
        @Index(name = "idx_lms_enroll_status", columnList = "status")
}, uniqueConstraints = {
        @UniqueConstraint(columnNames = { "courseId", "employeeId", "tenantId" })
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CourseEnrollment extends TenantAware {

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    public UUID getCourseId() {
        return courseId;
    }

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    public UUID getEmployeeId() {
        return employeeId;
    }

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    @Builder.Default
    private EnrollmentStatus status = EnrollmentStatus.ENROLLED;

    @Column(name = "enrolled_at")
    private LocalDateTime enrolledAt;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "progress_percentage", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal progressPercentage = BigDecimal.ZERO;

    @Column(name = "last_accessed_at")
    private LocalDateTime lastAccessedAt;

    @Column(name = "last_module_id")
    private UUID lastModuleId;

    @Column(name = "last_content_id")
    private UUID lastContentId;

    @Column(name = "total_time_spent_minutes")
    @Builder.Default
    private Integer totalTimeSpentMinutes = 0;

    // Quiz/Assessment tracking
    @Column(name = "quiz_score", precision = 5, scale = 2)
    private BigDecimal quizScore;

    @Column(name = "quiz_attempts")
    @Builder.Default
    private Integer quizAttempts = 0;

    @Column(name = "quiz_passed")
    @Builder.Default
    private Boolean quizPassed = false;

    // Certificate
    @Column(name = "certificate_id")
    private UUID certificateId;

    @Column(name = "certificate_issued_at")
    private LocalDateTime certificateIssuedAt;

    // Rating
    @Column(name = "rating", precision = 3, scale = 2)
    private BigDecimal rating;

    @Column(columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "enrolled_by")
    private UUID enrolledBy; // Manager or HR who enrolled

    @Column(name = "due_date")
    private LocalDateTime dueDate;

    public enum EnrollmentStatus {
        ENROLLED,
        IN_PROGRESS,
        COMPLETED,
        FAILED,
        EXPIRED,
        CANCELLED
    }

    // Explicit setters for fields that need to be updated after creation
    public void setUpdatedAt(LocalDateTime updatedAt) {
        super.setUpdatedAt(updatedAt);
    }

    public void setCertificateIssuedAt(LocalDateTime certificateIssuedAt) {
        this.certificateIssuedAt = certificateIssuedAt;
    }

    public BigDecimal getQuizScore() {
        return quizScore;
    }

    public void setProgressPercentage(BigDecimal progressPercentage) {
        this.progressPercentage = progressPercentage;
    }

    public void setStatus(EnrollmentStatus status) {
        this.status = status;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public void setLastAccessedAt(LocalDateTime lastAccessedAt) {
        this.lastAccessedAt = lastAccessedAt;
    }

    public BigDecimal getProgressPercentage() {
        return progressPercentage;
    }

    public EnrollmentStatus getStatus() {
        return status;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }
}
