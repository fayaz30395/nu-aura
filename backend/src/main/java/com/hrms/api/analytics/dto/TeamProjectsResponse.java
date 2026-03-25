package com.hrms.api.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Response DTO for manager's team project allocations.
 * Shows each direct report with their active project assignments.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamProjectsResponse {

    private List<TeamMemberProjectsDto> teamMembers;
    private TeamProjectsSummary summary;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamMemberProjectsDto {
        private UUID employeeId;
        private String employeeName;
        private String employeeCode;
        private String designation;
        private String level;
        private String avatarUrl;
        private List<EmployeeProjectAllocationDto> projects;
        private int totalAllocation;
        private boolean isOverAllocated;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmployeeProjectAllocationDto {
        private UUID projectId;
        private String projectName;
        private String projectCode;
        private String role;
        private int allocationPercentage;
        private LocalDate startDate;
        private LocalDate endDate;
        private String projectStatus;
        private String projectPriority;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamProjectsSummary {
        private int totalReports;
        private int allocatedCount;
        private int unallocatedCount;
        private int overAllocatedCount;
        private int avgAllocation;
    }
}
