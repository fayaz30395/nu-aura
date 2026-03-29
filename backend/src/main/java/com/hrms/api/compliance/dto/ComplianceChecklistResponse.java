package com.hrms.api.compliance.dto;

import com.hrms.domain.compliance.ComplianceChecklist;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
public class ComplianceChecklistResponse {
    private UUID id;
    private String name;
    private String description;
    private ComplianceChecklist.ChecklistCategory category;
    private ComplianceChecklist.ChecklistStatus status;
    private Integer totalItems;
    private Integer completedItems;
    private LocalDate nextDueDate;
    private LocalDate lastCompletedDate;
    private UUID assignedTo;

    public static ComplianceChecklistResponse from(ComplianceChecklist checklist) {
        return ComplianceChecklistResponse.builder()
                .id(checklist.getId())
                .name(checklist.getName())
                .description(checklist.getDescription())
                .category(checklist.getCategory())
                .status(checklist.getStatus())
                .totalItems(checklist.getTotalItems())
                .completedItems(checklist.getCompletedItems())
                .nextDueDate(checklist.getNextDueDate())
                .lastCompletedDate(checklist.getLastCompletedDate())
                .assignedTo(checklist.getAssignedTo())
                .build();
    }
}
