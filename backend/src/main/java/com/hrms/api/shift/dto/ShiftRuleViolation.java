package com.hrms.api.shift.dto;

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
public class ShiftRuleViolation {
    private UUID employeeId;
    private String employeeName;
    private LocalDate date;
    private String rule;
    private String description;
    private String severity; // WARNING, ERROR
}
