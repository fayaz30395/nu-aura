package com.hrms.api.timetracking.dto;

import com.hrms.domain.timetracking.TimeEntry.EntryType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateTimeEntryRequest {

    private UUID projectId;
    private UUID taskId;

    @NotNull(message = "Entry date is required")
    private LocalDate entryDate;

    private LocalTime startTime;
    private LocalTime endTime;

    @NotNull(message = "Hours worked is required")
    @Positive(message = "Hours worked must be positive")
    private BigDecimal hoursWorked;

    private BigDecimal billableHours;
    private Boolean isBillable;
    private BigDecimal hourlyRate;

    private EntryType entryType;
    private String description;
    private String notes;

    private UUID clientId;
    private String clientName;
    private String externalRef;
}
