package com.hrms.application.performance.dto;

import com.hrms.domain.performance.Goal;
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
    private BigDecimal targetValue;
    private BigDecimal currentValue;
    private String measurementUnit;
    private LocalDate startDate;
    private LocalDate dueDate;
    private Goal.GoalStatus status;
    private Integer progressPercentage;
    private UUID parentGoalId;
    private Integer weight;
}
