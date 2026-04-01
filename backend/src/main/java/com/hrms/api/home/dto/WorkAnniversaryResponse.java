package com.hrms.api.home.dto;

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
public class WorkAnniversaryResponse {
    private UUID employeeId;
    private String employeeName;
    private String avatarUrl;
    private String department;
    private String designation;
    private LocalDate joiningDate;
    private LocalDate anniversaryDate; // This year's anniversary date
    private int yearsCompleted;
    private boolean isToday;
    private int daysUntil;
}
