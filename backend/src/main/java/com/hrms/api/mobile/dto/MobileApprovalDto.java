package com.hrms.api.mobile.dto;

import lombok.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Container class for mobile approval DTOs.
 * This class has no fields - it only contains inner static classes.
 */
public final class MobileApprovalDto {

    private MobileApprovalDto() {
        // Private constructor to prevent instantiation
    }

    // ==================== PENDING APPROVALS LIST ====================
    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PendingApprovalsResponse {
        private Integer totalPendingCount;
        private ApprovalCounts counts;
        private List<ApprovalItem> approvals;

        @Getter
        @Setter
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class ApprovalCounts {
            private Integer leaveRequestsCount;
            private Integer expenseClaimsCount;
            private Integer employmentChangesCount;
            private Integer overtimeRequestsCount;
            private Integer assetRequestsCount;
        }
    }

    // ==================== APPROVAL ITEM ====================
    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApprovalItem {
        private UUID approvalId;
        private String approvalType; // LEAVE_REQUEST, EXPENSE_CLAIM, EMPLOYMENT_CHANGE, OVERTIME, ASSET
        private UUID requesterId;
        private String requesterName;
        private String requesterDepartment;
        private String requesterAvatar;
        private String details; // Leave dates, expense amount, etc.
        private String amount; // For expense, etc.
        private LocalDateTime submittedAt;
        private Integer daysAwaitingApproval;
        private String priority; // LOW, MEDIUM, HIGH
    }

    // ==================== ACTION REQUEST ====================
    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApprovalActionRequest {
        @NotNull(message = "Approval ID is required")
        private UUID approvalId;

        @NotNull(message = "Action is required")
        private String action; // APPROVE, REJECT

        private String notes;
        private String rejectionReason; // Required if action is REJECT
    }

    // ==================== BULK APPROVAL REQUEST ====================
    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BulkApprovalRequest {
        @NotNull(message = "Approval IDs are required")
        private List<UUID> approvalIds;

        @NotNull(message = "Action is required")
        private String action; // APPROVE, REJECT

        private String notes;
    }

    // ==================== ACTION RESPONSE ====================
    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApprovalActionResponse {
        private UUID approvalId;
        private String status; // APPROVED, REJECTED
        private LocalDateTime actionedAt;
        private String message;
    }
}
