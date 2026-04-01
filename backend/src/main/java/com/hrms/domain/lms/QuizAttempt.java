package com.hrms.domain.lms;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "lms_quiz_attempts", indexes = {
    @Index(name = "idx_lms_attempt_tenant", columnList = "tenantId"),
    @Index(name = "idx_lms_attempt_quiz_employee", columnList = "quizId, employeeId"),
    @Index(name = "idx_lms_attempt_enrollment", columnList = "enrollmentId"),
    @Index(name = "idx_lms_attempt_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class QuizAttempt extends TenantAware {

    @Column(name = "quiz_id", nullable = false)
    private UUID quizId;

    @Column(name = "enrollment_id", nullable = false)
    private UUID enrollmentId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private AttemptStatus status = AttemptStatus.IN_PROGRESS;

    @Column
    private Integer score;

    @Column(name = "max_score")
    private Integer maxScore;

    @Column(name = "passing_score")
    private Integer passingScore;

    @Column
    private Boolean passed;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "time_taken_seconds")
    private Integer timeTakenSeconds;

    @Column(name = "attempt_number")
    @Builder.Default
    private Integer attemptNumber = 1;

    // Answers stored as JSON: {"question-id": "answer-value", ...}
    @Column(columnDefinition = "TEXT")
    private String answers;

    @Column(columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "attempted_by")
    private UUID attemptedBy;

    public enum AttemptStatus {
        IN_PROGRESS,
        COMPLETED,
        TIMED_OUT,
        ABANDONED
    }
}
