package com.hrms.application.performance.dto;

import com.hrms.domain.performance.ReviewCycle;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewCycleResponse {
    private UUID id;
    private String cycleName;
    private ReviewCycle.CycleType cycleType;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate selfReviewDeadline;
    private LocalDate managerReviewDeadline;
    private ReviewCycle.CycleStatus status;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Activation metadata (populated when activating a cycle)
    private Integer employeesInScope;
    private Integer reviewsCreated;
}
