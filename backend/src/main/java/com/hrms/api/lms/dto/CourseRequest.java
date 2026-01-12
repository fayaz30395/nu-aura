package com.hrms.api.lms.dto;

import com.hrms.domain.lms.Course.DifficultyLevel;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private String code;
    private String description;
    private String shortDescription;
    private UUID categoryId;
    private String thumbnailUrl;
    private String previewVideoUrl;
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
    private UUID certificateTemplateId;
    private Boolean isCertificateEnabled;
}
