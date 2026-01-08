package com.nulogic.hrms.leave.dto;

import com.nulogic.hrms.leave.HalfDaySession;
import com.nulogic.hrms.leave.LeaveRequestStatus;
import com.nulogic.hrms.leave.LeaveType;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class LeaveRequestResponse {
    UUID id;
    UUID employeeId;
    LeaveType leaveType;
    LocalDate startDate;
    LocalDate endDate;
    boolean halfDay;
    HalfDaySession halfDaySession;
    LeaveRequestStatus status;
    UUID approverUserId;
    String reason;
}
