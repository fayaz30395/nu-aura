package com.hrms.api.project.dto;

import com.hrms.domain.project.TimeEntry;
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
public class TimeEntryRequest {
    private UUID projectId;
    private UUID employeeId;
    private LocalDate workDate;
    private BigDecimal hoursWorked;
    private String description;
    private String taskName;
    private TimeEntry.EntryType entryType;
    private Boolean isBillable;
    private BigDecimal billingRate;
    private TimeEntry.TimeEntryStatus status;
}
