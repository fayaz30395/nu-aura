package com.nulogic.hrms.leave.dto;

import com.nulogic.hrms.leave.HalfDaySession;
import com.nulogic.hrms.leave.LeaveType;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import lombok.Data;

@Data
public class LeaveRequestCreateRequest {
    @NotNull(message = "Leave type is required")
    private LeaveType leaveType;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;

    private boolean halfDay;

    private HalfDaySession halfDaySession;

    private String reason;
}
