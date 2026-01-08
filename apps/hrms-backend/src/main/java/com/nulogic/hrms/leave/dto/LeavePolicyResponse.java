package com.nulogic.hrms.leave.dto;

import com.nulogic.hrms.leave.LeaveType;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class LeavePolicyResponse {
    UUID id;
    LeaveType leaveType;
    BigDecimal annualAllotment;
}
