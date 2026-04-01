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
public class BirthdayResponse {
    private UUID employeeId;
    private String employeeName;
    private String avatarUrl;
    private String department;
    private LocalDate dateOfBirth;
    private LocalDate birthdayDate; // This year's birthday date
    private boolean isToday;
    private int daysUntil;
}
