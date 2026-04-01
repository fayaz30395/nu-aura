package com.hrms.api.resourcemanagement.dto;

import lombok.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public class WorkloadDTOs {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WorkloadSummary {
        private Integer totalEmployees;
        private Integer activeProjects;
        private Double averageAllocation;
        private Double medianAllocation;
        private Integer overAllocatedCount;
        private Integer optimalCount;
        private Integer underUtilizedCount;
        private Integer unassignedCount;
        private Integer pendingApprovals;
        private Long totalAllocatedHours;
        private LocalDate periodStart;
        private LocalDate periodEnd;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmployeeWorkload {
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
        private AllocationDTOs.AllocationStatus allocationStatus;
        private Integer projectCount;
        private List<AllocationDTOs.AllocationBreakdown> allocations;
        private Boolean hasPendingApprovals;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DepartmentWorkload {
        private UUID departmentId;
        private String departmentName;
        private Integer employeeCount;
        private Double averageAllocation;
        private Integer overAllocatedCount;
        private Integer optimalCount;
        private Integer underUtilizedCount;
        private Integer unassignedCount;
        private Integer activeProjects;
        private Long totalAllocatedHours;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectWorkloadSummary {
        private UUID projectId;
        private String projectName;
        private String projectCode;
        private String projectStatus;
        private Integer teamSize;
        private Integer totalAllocatedPercentage;
        private Double averageAllocation;
        private LocalDate startDate;
        private LocalDate endDate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WorkloadHeatmapCell {
        private LocalDate weekStart;
        private LocalDate weekEnd;
        private Integer allocation;
        private AllocationDTOs.AllocationStatus status;
        private Integer projectCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WorkloadHeatmapRow {
        private UUID employeeId;
        private String employeeName;
        private String employeeCode;
        private String departmentName;
        private List<WorkloadHeatmapCell> cells;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WorkloadTrend {
        private String period;
        private String periodLabel;
        private Double averageAllocation;
        private Integer overAllocatedCount;
        private Integer optimalCount;
        private Integer underUtilizedCount;
        private Integer totalEmployees;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WorkloadDashboardData {
        private WorkloadSummary summary;
        private List<EmployeeWorkload> employeeWorkloads;
        private List<DepartmentWorkload> departmentWorkloads;
        private List<ProjectWorkloadSummary> projectWorkloads;
        private List<WorkloadHeatmapRow> heatmapData;
        private List<WorkloadTrend> trends;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WorkloadFilterOptions {
        private LocalDate startDate;
        private LocalDate endDate;
        private List<UUID> departmentIds;
        private List<UUID> projectIds;
        private List<AllocationDTOs.AllocationStatus> allocationStatus;
        private Integer minAllocation;
        private Integer maxAllocation;
        private Boolean includePendingApprovals;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode(callSuper = true)
    public static class ExportWorkloadRequest extends WorkloadFilterOptions {
        private String format;
    }
}
