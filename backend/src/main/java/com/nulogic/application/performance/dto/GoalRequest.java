package com.nulogic.application.performance.dto;

import com.nulogic.domain.performance.Goal;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.PositiveOrZero;
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
public class GoalRequest {
    private UUID employeeId;
    private String title;
    private String description;
    private Goal.GoalType goalType;
    private String category;
    @PositiveOrZero(message = "Target value cannot be negative")
    private BigDecimal targetValue;
    @PositiveOrZero(message = "Current value cannot be negative")
    private BigDecimal currentValue;
    private String measurementUnit;
    private LocalDate startDate;
    private LocalDate dueDate;
    private Goal.GoalStatus status;
    private Integer progressPercentage;
    private UUID parentGoalId;
    private Integer weight;

    @AssertTrue(message = "Due date must not be before start date")
    public boolean isDueDateValid() {
        return startDate == null || dueDate == null || !dueDate.isBefore(startDate);
    }
}
