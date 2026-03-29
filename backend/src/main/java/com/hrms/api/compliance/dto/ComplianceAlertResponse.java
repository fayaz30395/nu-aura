package com.hrms.api.compliance.dto;

import com.hrms.domain.compliance.ComplianceAlert;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
public class ComplianceAlertResponse {
    private UUID id;
    private String title;
    private String description;
    private ComplianceAlert.AlertType type;
    private ComplianceAlert.AlertPriority priority;
    private ComplianceAlert.AlertStatus status;
    private LocalDate dueDate;
    private UUID assignedTo;

    public static ComplianceAlertResponse from(ComplianceAlert alert) {
        return ComplianceAlertResponse.builder()
                .id(alert.getId())
                .title(alert.getTitle())
                .description(alert.getDescription())
                .type(alert.getType())
                .priority(alert.getPriority())
                .status(alert.getStatus())
                .dueDate(alert.getDueDate())
                .assignedTo(alert.getAssignedTo())
                .build();
    }
}
