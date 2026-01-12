package com.hrms.api.project.dto;

import com.hrms.domain.project.TimeEntry;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimeEntryResponse {
    private UUID id;
    private UUID tenantId;
    private UUID projectId;
    private String projectName;
    private UUID employeeId;
    private String employeeName;
    private LocalDate workDate;
    private BigDecimal hoursWorked;
    private String description;
    private String taskName;
    private TimeEntry.EntryType entryType;
    private Boolean isBillable;
    private BigDecimal billingRate;
    private BigDecimal billedAmount;
    private TimeEntry.TimeEntryStatus status;
    private UUID approvedBy;
    private String approvedByName;
    private LocalDateTime approvedAt;
    private LocalDateTime submittedAt;
    private String rejectedReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
