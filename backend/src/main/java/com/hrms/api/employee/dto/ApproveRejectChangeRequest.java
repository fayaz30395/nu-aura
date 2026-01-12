package com.hrms.api.employee.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for approving or rejecting an employment change request.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApproveRejectChangeRequest {

    private String comments;  // Optional comments from approver
    private String rejectionReason;  // Required when rejecting
}
