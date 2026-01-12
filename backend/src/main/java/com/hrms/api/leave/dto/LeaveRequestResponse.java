package com.hrms.api.leave.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class LeaveRequestResponse {
    private UUID id;
    private UUID employeeId;
    private UUID leaveTypeId;
    private String requestNumber;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal totalDays;
    private Boolean isHalfDay;
    private String halfDayPeriod;
    private String reason;
    private String status;
    private String documentPath;
    private LocalDateTime appliedOn;
    private UUID approvedBy;
    private String approverName;
    private LocalDateTime approvedOn;
    private String rejectionReason;
    private LocalDateTime cancelledOn;
    private String cancellationReason;
    private String comments;

    // Approver info - the reporting manager who should approve this request
    private UUID approverId;
    private String pendingApproverName;
}
