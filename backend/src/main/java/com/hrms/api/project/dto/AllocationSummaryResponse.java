package com.hrms.api.project.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class AllocationSummaryResponse {

    private UUID employeeId;
    private String employeeName;
    private String designation;
    private String department;
    private int totalAllocationPercent;
    private boolean isOverAllocated; // total > 100%
    private List<AllocationEntry> projects;

    @Data
    @Builder
    public static class AllocationEntry {
        private UUID projectId;
        private String projectName;
        private String role;
        private int allocationPercent;
        private String startDate;
        private String endDate;
    }
}
