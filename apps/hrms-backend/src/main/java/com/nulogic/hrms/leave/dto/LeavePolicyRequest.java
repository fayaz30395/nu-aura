package com.nulogic.hrms.leave.dto;

import com.nulogic.hrms.leave.LeaveType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class LeavePolicyRequest {
    @NotNull(message = "Leave type is required")
    private LeaveType leaveType;

    @DecimalMin(value = "0", message = "Annual allotment must be non-negative")
    private BigDecimal annualAllotment;
}
