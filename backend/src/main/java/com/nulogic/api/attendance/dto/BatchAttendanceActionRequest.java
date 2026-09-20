package com.nulogic.api.attendance.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;
import java.util.UUID;

/**
 * Request to bulk-approve multiple attendance regularization requests in one
 * call, from the admin attendance table's multi-select toolbar.
 */
@Data
public class BatchAttendanceActionRequest {

    @NotEmpty(message = "recordIds must not be empty")
    @Size(max = 200, message = "Cannot process more than 200 attendance records in a single batch")
    private List<UUID> recordIds;
}
