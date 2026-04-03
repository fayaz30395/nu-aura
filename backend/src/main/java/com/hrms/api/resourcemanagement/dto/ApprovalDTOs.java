package com.hrms.api.resourcemanagement.dto;

import com.hrms.domain.resourcemanagement.AllocationApprovalRequest;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class ApprovalDTOs {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AllocationApprovalResponse {
        private UUID id;
        private UUID employeeId;
        private String employeeName;
        private String employeeCode;
        private UUID projectId;
        private String projectName;
        private String projectCode;
        private Integer requestedAllocation;
        private String role;
        private LocalDate startDate;
        private LocalDate endDate;
        private Integer currentTotalAllocation;
        private Integer resultingAllocation;
        private UUID requestedById;
        private String requestedByName;
        private UUID approverId;
        private String approverName;
        private AllocationApprovalRequest.ApprovalStatus status;
        private String requestReason;
        private String approvalComment;
        private String rejectionReason;
        private LocalDateTime createdAt;
        private LocalDateTime resolvedAt;

        public static AllocationApprovalResponse fromEntity(AllocationApprovalRequest entity, String employeeName,
                                                            String employeeCode, String projectName, String projectCode, String requestedByName,
                                                            String approverName, Integer currentTotalAllocation) {
            return AllocationApprovalResponse.builder()
                    .id(entity.getId())
                    .employeeId(entity.getEmployeeId())
                    .employeeName(employeeName)
                    .employeeCode(employeeCode)
                    .projectId(entity.getProjectId())
                    .projectName(projectName)
                    .projectCode(projectCode)
                    .requestedAllocation(entity.getRequestedAllocation())
                    .role(entity.getRole())
                    .startDate(entity.getStartDate())
                    .endDate(entity.getEndDate())
                    .currentTotalAllocation(currentTotalAllocation)
                    .resultingAllocation(currentTotalAllocation + entity.getRequestedAllocation())
                    .requestedById(entity.getRequestedById())
                    .requestedByName(requestedByName)
                    .approverId(entity.getApproverId())
                    .approverName(approverName)
                    .status(entity.getStatus())
                    .requestReason(entity.getRequestReason())
                    .approvalComment(entity.getApprovalComment())
                    .rejectionReason(entity.getRejectionReason())
                    .createdAt(entity.getCreatedAt())
                    .resolvedAt(entity.getResolvedAt())
                    .build();
        }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateAllocationRequest {
        private UUID employeeId;
        private UUID projectId;
        private Integer allocationPercentage;
        private String role;
        private LocalDate startDate;
        private LocalDate endDate;
        private String reason;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApproveRequest {
        private String comment;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RejectRequest {
        private String reason;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GetEmployeesCapacityRequest {
        private List<UUID> employeeIds;
        private LocalDate asOfDate;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ValidateAllocationRequest {
        private UUID employeeId;
        private UUID projectId;
        private Integer allocationPercentage;
    }
}
