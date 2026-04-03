package com.hrms.application.performance.dto;

import com.hrms.domain.performance.PerformanceReview;
import jakarta.validation.constraints.NotNull;
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
public class ReviewRequest {
    @NotNull(message = "Employee ID is required")
    private UUID employeeId;
    @NotNull(message = "Reviewer ID is required")
    private UUID reviewerId;
    private UUID reviewCycleId;
    private PerformanceReview.ReviewType reviewType;
    private LocalDate reviewPeriodStart;
    private LocalDate reviewPeriodEnd;
    private PerformanceReview.ReviewStatus status;
    private BigDecimal overallRating;
    private String strengths;
    private String areasForImprovement;
    private String achievements;
    private String goalsForNextPeriod;
    private String managerComments;
    private String employeeComments;
}
