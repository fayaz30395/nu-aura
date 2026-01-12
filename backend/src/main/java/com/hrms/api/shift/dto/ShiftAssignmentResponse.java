package com.hrms.api.shift.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShiftAssignmentResponse {
    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private String employeeCode;
    private UUID shiftId;
    private String shiftName;
    private String shiftCode;
    private LocalTime shiftStartTime;
    private LocalTime shiftEndTime;
    private LocalDate assignmentDate;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    private String assignmentType;
    private String status;
    private Boolean isRecurring;
    private String recurrencePattern;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
