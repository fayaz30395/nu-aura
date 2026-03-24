package com.hrms.api.leave.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class LeaveEncashmentResponse {

    private UUID id;
    private UUID leaveBalanceId;
    private Integer daysEncashed;
    private String status;
    private String message;
}
