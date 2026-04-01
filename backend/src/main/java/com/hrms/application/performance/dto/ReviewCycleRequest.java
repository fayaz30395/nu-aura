package com.hrms.application.performance.dto;

import com.hrms.domain.performance.ReviewCycle;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewCycleRequest {
    private String cycleName;
    private ReviewCycle.CycleType cycleType;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate selfReviewDeadline;
    private LocalDate managerReviewDeadline;
    private ReviewCycle.CycleStatus status;
    private String description;
}
