package com.nulogic.api.leave.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * Request to bulk-reject multiple leave requests in one call. Extends
 * {@link BatchLeaveActionRequest} with the shared rejection reason applied
 * to every request in the batch.
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class BatchLeaveRejectRequest extends BatchLeaveActionRequest {

    @NotBlank(message = "reason is required")
    @Size(max = 1000, message = "reason must be at most 1000 characters")
    private String reason;
}
