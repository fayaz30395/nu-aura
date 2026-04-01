package com.hrms.api.overtime.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OvertimeApprovalRequest {

    @NotBlank(message = "Action is required (APPROVE or REJECT)")
    private String action;

    private String rejectionReason;
}
