package com.hrms.domain.training;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "training_enrollments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrainingEnrollment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "program_id", nullable = false)
    private UUID programId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "enrollment_date")
    private LocalDate enrollmentDate;

    @Column(name = "completion_date")
    private LocalDate completionDate;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private EnrollmentStatus status = EnrollmentStatus.ENROLLED;

    @Column(name = "score_percentage")
    private Integer scorePercentage;

    @Column(name = "feedback", columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "certificate_url", length = 500)
    private String certificateUrl;

    @Column(name = "enrolled_at")
    private LocalDateTime enrolledAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "attendance_percentage")
    private Integer attendancePercentage;

    @Column(name = "assessment_score")
    private Integer assessmentScore;

    @Builder.Default
    @Column(name = "certificate_issued")
    private Boolean certificateIssued = false;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder.Default
    @Version
    private Long version = 0L;

    public enum EnrollmentStatus {
        ENROLLED, IN_PROGRESS, COMPLETED, DROPPED, FAILED, CANCELLED
    }
}
