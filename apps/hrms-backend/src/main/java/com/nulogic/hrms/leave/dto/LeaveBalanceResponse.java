package com.nulogic.hrms.leave.dto;

import com.nulogic.hrms.leave.LeaveType;
import java.math.BigDecimal;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class LeaveBalanceResponse {
    LeaveType leaveType;
    int year;
    BigDecimal balance;
}
