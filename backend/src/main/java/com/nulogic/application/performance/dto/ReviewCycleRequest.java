package com.nulogic.application.performance.dto;

import com.nulogic.domain.performance.ReviewCycle;
import jakarta.validation.constraints.AssertTrue;
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

    @AssertTrue(message = "endDate must not be before startDate")
    public boolean isEndDateValid() {
        return startDate == null || endDate == null || !endDate.isBefore(startDate);
    }

    @AssertTrue(message = "selfReviewDeadline must be within [startDate, endDate]")
    public boolean isSelfReviewDeadlineValid() {
        return isWithinCycle(selfReviewDeadline);
    }

    @AssertTrue(message = "managerReviewDeadline must be within [startDate, endDate]")
    public boolean isManagerReviewDeadlineValid() {
        return isWithinCycle(managerReviewDeadline);
    }

    private boolean isWithinCycle(LocalDate deadline) {
        if (deadline == null) {
            return true;
        }
        if (startDate != null && deadline.isBefore(startDate)) {
            return false;
        }
        return endDate == null || !deadline.isAfter(endDate);
    }
}
