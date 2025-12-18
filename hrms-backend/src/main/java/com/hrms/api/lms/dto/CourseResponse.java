package com.hrms.api.lms.dto;

import com.hrms.domain.lms.Course;
import com.hrms.domain.lms.Course.CourseStatus;
import com.hrms.domain.lms.Course.DifficultyLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseResponse {

    private UUID id;
    private UUID tenantId;
    private String title;
    private String code;
    private String description;
    private String shortDescription;
    private UUID categoryId;
    private String thumbnailUrl;
    private String previewVideoUrl;
    private CourseStatus status;
    private DifficultyLevel difficultyLevel;
    private BigDecimal durationHours;
    private Integer passingScore;
    private Integer maxAttempts;
    private Boolean isMandatory;
    private Boolean isSelfPaced;
    private LocalDate enrollmentDeadline;
    private LocalDate completionDeadline;
    private UUID instructorId;
    private String instructorName;
    private String prerequisites;
    private String skillsCovered;
    private String tags;
    private Integer totalEnrollments;
    private BigDecimal avgRating;
    private Integer totalRatings;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private List<CourseModuleResponse> modules;

    public static CourseResponse fromEntity(Course course) {
        return CourseResponse.builder()
                .id(course.getId())
                .tenantId(course.getTenantId())
                .title(course.getTitle())
                .code(course.getCode())
                .description(course.getDescription())
                .shortDescription(course.getShortDescription())
                .categoryId(course.getCategoryId())
                .thumbnailUrl(course.getThumbnailUrl())
                .previewVideoUrl(course.getPreviewVideoUrl())
                .status(course.getStatus())
                .difficultyLevel(course.getDifficultyLevel())
                .durationHours(course.getDurationHours())
                .passingScore(course.getPassingScore())
                .maxAttempts(course.getMaxAttempts())
                .isMandatory(course.getIsMandatory())
                .isSelfPaced(course.getIsSelfPaced())
                .enrollmentDeadline(course.getEnrollmentDeadline())
                .completionDeadline(course.getCompletionDeadline())
                .instructorId(course.getInstructorId())
                .instructorName(course.getInstructorName())
                .prerequisites(course.getPrerequisites())
                .skillsCovered(course.getSkillsCovered())
                .tags(course.getTags())
                .totalEnrollments(course.getTotalEnrollments())
                .avgRating(course.getAvgRating())
                .totalRatings(course.getTotalRatings())
                .createdAt(course.getCreatedAt())
                .updatedAt(course.getUpdatedAt())
                .build();
    }
}
