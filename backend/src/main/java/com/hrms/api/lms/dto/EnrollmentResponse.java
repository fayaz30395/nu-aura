package com.hrms.api.lms.dto;

import com.hrms.domain.lms.CourseEnrollment;
import com.hrms.domain.lms.CourseEnrollment.EnrollmentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrollmentResponse {

    private UUID id;
    private UUID tenantId;
    private UUID courseId;
    private UUID employeeId;
    private EnrollmentStatus status;
    private BigDecimal progressPercentage;
    private LocalDateTime enrolledAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private LocalDateTime lastAccessedAt;
    private LocalDate completionDate;
    private String certificateUrl;
    private UUID certificateId;
    private LocalDateTime certificateIssuedAt;
    private BigDecimal quizScore;
    private Boolean quizPassed;
    private Integer totalTimeSpentMinutes;
    private LocalDateTime dueDate;

    public static EnrollmentResponse fromEntity(CourseEnrollment e) {
        return EnrollmentResponse.builder()
                .id(e.getId())
                .tenantId(e.getTenantId())
                .courseId(e.getCourseId())
                .employeeId(e.getEmployeeId())
                .status(e.getStatus())
                .progressPercentage(e.getProgressPercentage())
                .enrolledAt(e.getEnrolledAt())
                .startedAt(e.getStartedAt())
                .completedAt(e.getCompletedAt())
                .lastAccessedAt(e.getLastAccessedAt())
                .completionDate(e.getCompletedAt() != null ? e.getCompletedAt().toLocalDate() : null)
                .certificateId(e.getCertificateId())
                .certificateIssuedAt(e.getCertificateIssuedAt())
                .quizScore(e.getQuizScore())
                .quizPassed(e.getQuizPassed())
                .totalTimeSpentMinutes(e.getTotalTimeSpentMinutes())
                .dueDate(e.getDueDate())
                .build();
    }
}
