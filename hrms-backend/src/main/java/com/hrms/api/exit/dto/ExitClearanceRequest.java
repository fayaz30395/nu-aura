package com.hrms.api.exit.dto;

import com.hrms.domain.exit.ExitClearance;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class ExitClearanceRequest {
    private UUID exitProcessId;
    private ExitClearance.ClearanceDepartment department;
    private UUID approverId;
    private ExitClearance.ClearanceStatus status;
    private LocalDate requestedDate;
    private LocalDate approvedDate;
    private String comments;
    private String checklistItems;
}
