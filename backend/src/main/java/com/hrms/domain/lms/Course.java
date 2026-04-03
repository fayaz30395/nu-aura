package com.hrms.domain.lms;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "lms_courses", indexes = {
        @Index(name = "idx_lms_course_tenant", columnList = "tenantId"),
        @Index(name = "idx_lms_course_status", columnList = "status"),
        @Index(name = "idx_lms_course_category", columnList = "categoryId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Course extends TenantAware {

    @Column(nullable = false, length = 255)
    private String title;

    @Column(length = 100)
    private String code;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "short_description", length = 500)
    private String shortDescription;

    @Column(name = "category_id")
    private UUID categoryId;

    @Column(name = "thumbnail_url", length = 500)
    private String thumbnailUrl;

    @Column(name = "preview_video_url", length = 500)
    private String previewVideoUrl;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    @Builder.Default
    private CourseStatus status = CourseStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(name = "difficulty_level", length = 20)
    @Builder.Default
    private DifficultyLevel difficultyLevel = DifficultyLevel.BEGINNER;

    @Column(name = "duration_hours", precision = 5, scale = 2)
    private BigDecimal durationHours;

    @Column(name = "passing_score")
    @Builder.Default
    private Integer passingScore = 70;

    @Column(name = "max_attempts")
    @Builder.Default
    private Integer maxAttempts = 3;

    @Column(name = "is_mandatory")
    @Builder.Default
    private Boolean isMandatory = false;

    @Column(name = "is_self_paced")
    @Builder.Default
    private Boolean isSelfPaced = true;

    @Column(name = "enrollment_deadline")
    private LocalDate enrollmentDeadline;

    @Column(name = "completion_deadline")
    private LocalDate completionDeadline;

    @Column(name = "instructor_id")
    private UUID instructorId;

    @Column(name = "instructor_name", length = 200)
    private String instructorName;

    @Column(name = "prerequisites", columnDefinition = "TEXT")
    private String prerequisites; // JSON array of course IDs

    @Column(name = "skills_covered", columnDefinition = "TEXT")
    private String skillsCovered; // Comma-separated skills

    @Column(name = "tags", length = 500)
    private String tags;

    @Column(name = "certificate_template_id")
    private UUID certificateTemplateId;

    @Column(name = "is_certificate_enabled")
    @Builder.Default
    private Boolean isCertificateEnabled = true;

    @Column(name = "total_enrollments")
    @Builder.Default
    private Integer totalEnrollments = 0;

    @Column(name = "avg_rating", precision = 3, scale = 2)
    private BigDecimal avgRating;

    @Column(name = "total_ratings")
    @Builder.Default
    private Integer totalRatings = 0;

    // Note: Modules are loaded via CourseModuleRepository.findByCourseIdOrderByOrderIndexAsc()
    // Using UUID reference pattern instead of JPA relationship for flexibility
    @Transient
    @Builder.Default
    private List<CourseModule> modules = new ArrayList<>();

    public String getTitle() {
        return title;
    }

    public Integer getTotalEnrollments() {
        return totalEnrollments;
    }

    public enum CourseStatus {
        DRAFT,
        UNDER_REVIEW,
        PUBLISHED,
        ARCHIVED
    }

    public enum DifficultyLevel {
        BEGINNER,
        INTERMEDIATE,
        ADVANCED,
        EXPERT
    }
}
