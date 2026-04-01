package com.hrms.api.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PerformanceReportRow {
    private UUID employeeId;
    private String employeeCode;
    private String employeeName;
    private String department;
    private String designation;
    private String reviewCycle;
    private LocalDate reviewDate;
    private String reviewer;
    private Double overallRating;
    private String performanceLevel; // EXCEPTIONAL, EXCEEDS_EXPECTATIONS, MEETS_EXPECTATIONS, etc.
    private Integer goalsCompleted;
    private Integer totalGoals;
    private String comments;
}
