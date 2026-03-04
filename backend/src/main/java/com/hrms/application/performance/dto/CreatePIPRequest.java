package com.hrms.application.performance.dto;

import jakarta.validation.constraints.NotBlank;
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
public class CreatePIPRequest {

    @NotNull
    private UUID employeeId;

    @NotNull
    private UUID managerId;

    @NotNull
    private LocalDate startDate;

    @NotNull
    private LocalDate endDate;

    @NotBlank
    private String reason;

    private String goals; // JSON string: [{goalText, targetDate, achieved}]

    private String checkInFrequency; // WEEKLY / BIWEEKLY / MONTHLY
}
