package com.hrms.api.timetracking.dto;

import com.hrms.domain.timetracking.TimeEntry;
import com.hrms.domain.timetracking.TimeEntry.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimeEntryDto {

    private UUID id;
    private UUID tenantId;
    private UUID employeeId;
    private String employeeName;
    private UUID projectId;
    private String projectName;
    private UUID taskId;
    private String taskName;

    private LocalDate entryDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private BigDecimal hoursWorked;
    private BigDecimal billableHours;
    private Boolean isBillable;
    private BigDecimal hourlyRate;
    private BigDecimal billingAmount;

    private EntryType entryType;
    private String description;
    private String notes;

    private TimeEntryStatus status;
    private LocalDate submittedDate;
    private UUID approvedBy;
    private String approverName;
    private LocalDate approvedDate;
    private String rejectionReason;

    private UUID clientId;
    private String clientName;
    private String externalRef;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static TimeEntryDto fromEntity(TimeEntry entity) {
        if (entity == null) return null;

        return TimeEntryDto.builder()
                .id(entity.getId())
                .tenantId(entity.getTenantId())
                .employeeId(entity.getEmployeeId())
                .projectId(entity.getProjectId())
                .taskId(entity.getTaskId())
                .entryDate(entity.getEntryDate())
                .startTime(entity.getStartTime())
                .endTime(entity.getEndTime())
                .hoursWorked(entity.getHoursWorked())
                .billableHours(entity.getBillableHours())
                .isBillable(entity.getIsBillable())
                .hourlyRate(entity.getHourlyRate())
                .billingAmount(entity.getBillingAmount())
                .entryType(entity.getEntryType())
                .description(entity.getDescription())
                .notes(entity.getNotes())
                .status(entity.getStatus())
                .submittedDate(entity.getSubmittedDate())
                .approvedBy(entity.getApprovedBy())
                .approvedDate(entity.getApprovedDate())
                .rejectionReason(entity.getRejectionReason())
                .clientId(entity.getClientId())
                .clientName(entity.getClientName())
                .externalRef(entity.getExternalRef())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
