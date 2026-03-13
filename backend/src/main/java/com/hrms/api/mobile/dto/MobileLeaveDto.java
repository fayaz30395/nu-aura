package com.hrms.api.mobile.dto;

import lombok.*;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Container class for mobile leave DTOs.
 * This class has no fields - it only contains inner static classes.
 */
public final class MobileLeaveDto {

    private MobileLeaveDto() {
        // Private constructor to prevent instantiation
    }

    // ==================== QUICK APPLY REQUEST ====================
    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuickLeaveRequest {
        @NotNull(message = "Leave type is required")
        private UUID leaveTypeId;

        @NotNull(message = "Start date is required")
        private LocalDate startDate;

        @NotNull(message = "End date is required")
        private LocalDate endDate;

        private String halfDayPeriod; // FIRST_HALF, SECOND_HALF (optional)

        @NotBlank(message = "Reason is required")
        private String reason;

        private String notes;
    }

    // ==================== LEAVE BALANCE RESPONSE ====================
    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LeaveBalanceResponse {
        private UUID employeeId;
        private String employeeName;

        private LeaveTypeBalance casualLeave;
        private LeaveTypeBalance sickLeave;
        private LeaveTypeBalance earnedLeave;
        private LeaveTypeBalance maternityLeave;
        private LeaveTypeBalance paternityleave;
        private LeaveTypeBalance unpaidLeave;

        @Getter
        @Setter
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class LeaveTypeBalance {
            private UUID leaveTypeId;
            private String leaveTypeName;
            private Double totalBalance;
            private Double usedBalance;
            private Double pendingBalance;
            private Double availableBalance;
            private Integer maxConsecutiveDays;
        }
    }

    // ==================== RECENT LEAVE REQUEST RESPONSE ====================
    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentLeaveRequest {
        private UUID leaveRequestId;
        private UUID leaveTypeId;
        private String leaveTypeName;
        private LocalDate startDate;
        private LocalDate endDate;
        private Integer numberOfDays;
        private String status; // PENDING, APPROVED, REJECTED, CANCELLED
        private String reason;
        private LocalDateTime submittedAt;
        private LocalDateTime approvedAt;
        private String approverName;
        private String approverComments;
    }

    // ==================== CANCEL LEAVE REQUEST ====================
    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CancelLeaveRequest {
        @NotBlank(message = "Cancellation reason is required")
        private String reason;
    }
}
