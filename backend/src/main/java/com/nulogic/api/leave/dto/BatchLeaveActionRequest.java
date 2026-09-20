package com.nulogic.api.leave.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;
import java.util.UUID;

/**
 * Request to bulk-approve multiple leave requests in one call, from the
 * admin leave-requests table's multi-select toolbar.
 */
@Data
public class BatchLeaveActionRequest {

    @NotEmpty(message = "leaveRequestIds must not be empty")
    @Size(max = 200, message = "Cannot process more than 200 leave requests in a single batch")
    private List<UUID> leaveRequestIds;
}
