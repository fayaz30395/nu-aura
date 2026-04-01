package com.hrms.api.shift.dto;

import jakarta.validation.constraints.NotNull;
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
public class ShiftAssignmentRequest {

    @NotNull(message = "Employee ID is required")
    private UUID employeeId;

    @NotNull(message = "Shift ID is required")
    private UUID shiftId;

    @NotNull(message = "Assignment date is required")
    private LocalDate assignmentDate;

    @NotNull(message = "Effective from date is required")
    private LocalDate effectiveFrom;

    private LocalDate effectiveTo;

    @NotNull(message = "Assignment type is required")
    private String assignmentType;

    private Boolean isRecurring;
    private String recurrencePattern;
    private String notes;
}
