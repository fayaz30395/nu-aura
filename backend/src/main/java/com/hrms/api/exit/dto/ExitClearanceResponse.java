package com.hrms.api.exit.dto;

import com.hrms.domain.exit.ExitClearance;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class ExitClearanceResponse {
    private UUID id;
    private UUID tenantId;
    private UUID exitProcessId;
    private String employeeName;
    private ExitClearance.ClearanceDepartment department;
    private UUID approverId;
    private String approverName;
    private ExitClearance.ClearanceStatus status;
    private LocalDate requestedDate;
    private LocalDate approvedDate;
    private String comments;
    private String checklistItems;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
