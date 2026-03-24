package com.hrms.api.leave.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class LeaveEncashmentRequest {

    @NotNull(message = "Leave balance ID is required")
    private UUID leaveBalanceId;

    @NotNull(message = "Days to encash is required")
    @Min(value = 1, message = "Days to encash must be at least 1")
    private Integer daysToEncash;

    private String reason;
}
