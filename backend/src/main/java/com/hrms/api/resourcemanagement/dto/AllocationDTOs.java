package com.hrms.api.resourcemanagement.dto;

import lombok.*;

import java.util.List;
import java.util.UUID;

public class AllocationDTOs {

    public enum AllocationStatus {
        OVER_ALLOCATED, OPTIMAL, UNDER_UTILIZED, UNASSIGNED
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AllocationBreakdown {
        private UUID projectId;
        private String projectName;
        private String projectCode;
        private String projectStatus;
        private Integer allocationPercentage;
        private String role;
        private String startDate;
        private String endDate;
        private Boolean isActive;
        private Boolean isPendingApproval;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmployeeCapacity {
        private UUID employeeId;
        private String employeeName;
        private String employeeCode;
        private UUID departmentId;
        private String departmentName;
        private String designation;
        private String avatarUrl;
        private Integer totalAllocation;
        private Integer approvedAllocation;
        private Integer pendingAllocation;
        private Integer availableCapacity;
        private Boolean isOverAllocated;
        private Boolean hasPendingApprovals;
        private AllocationStatus allocationStatus;
        private List<AllocationBreakdown> allocations;
        private String effectiveDate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AllocationValidationResult {
        private Boolean isValid;
        private Boolean requiresApproval;
        private Integer currentTotalAllocation;
        private Integer proposedAllocation;
        private Integer resultingAllocation;
        private String message;
        private List<AllocationBreakdown> existingAllocations;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateAllocationRequest {
        private UUID employeeId;
        private UUID projectId;
        private Integer allocationPercentage;
        private java.time.LocalDate startDate;
        private java.time.LocalDate endDate;
    }
}
