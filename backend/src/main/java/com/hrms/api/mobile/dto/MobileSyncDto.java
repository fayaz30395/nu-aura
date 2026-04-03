package com.hrms.api.mobile.dto;

import lombok.*;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Container class for mobile sync DTOs.
 * This class has no fields - it only contains inner static classes.
 */
public final class MobileSyncDto {

    private MobileSyncDto() {
        // Private constructor to prevent instantiation
    }

    // ==================== SYNC REQUEST ====================
    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SyncRequest {
        @NotNull(message = "Last sync timestamp is required")
        private LocalDateTime lastSyncAt;

        private Integer limit; // Batch size for sync
    }

    // ==================== SYNC RESPONSE ====================
    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SyncResponse {
        private LocalDateTime syncTimestamp; // Use this for next sync
        private Integer totalChanges;
        private Boolean hasMoreChanges;

        private List<EmployeeDataChange> employeeDataChanges;
        private List<LeaveBalanceChange> leaveBalanceChanges;
        private List<AttendanceRecordChange> attendanceRecordChanges;
        private List<ApprovalChange> approvalChanges;
        private List<NotificationChange> notificationChanges;

        @Getter
        @Setter
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class EmployeeDataChange {
            private UUID employeeId;
            private String changeType; // CREATED, UPDATED, DELETED
            private LocalDateTime changedAt;
            private String designation;
            private String department;
            private String name;
        }

        @Getter
        @Setter
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class LeaveBalanceChange {
            private UUID employeeId;
            private UUID leaveTypeId;
            private String leaveTypeName;
            private Double availableBalance;
            private Double pendingBalance;
            private LocalDateTime changedAt;
        }

        @Getter
        @Setter
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class AttendanceRecordChange {
            private UUID recordId;
            private UUID employeeId;
            private String status;
            private LocalDateTime checkInTime;
            private LocalDateTime checkOutTime;
            private Integer workDurationMinutes;
            private Boolean isLate;
            private LocalDateTime changedAt;
        }

        @Getter
        @Setter
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class ApprovalChange {
            private UUID approvalId;
            private String type;
            private String status;
            private LocalDateTime changedAt;
        }

        @Getter
        @Setter
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class NotificationChange {
            private UUID notificationId;
            private String type;
            private String title;
            private String message;
            private Boolean isRead;
            private LocalDateTime createdAt;
        }
    }
}
