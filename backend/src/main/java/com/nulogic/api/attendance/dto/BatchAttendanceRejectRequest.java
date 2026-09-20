package com.nulogic.api.attendance.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * Request to bulk-reject multiple attendance regularization requests. Extends
 * {@link BatchAttendanceActionRequest} with the shared rejection reason
 * applied to every record in the batch.
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class BatchAttendanceRejectRequest extends BatchAttendanceActionRequest {

    @Size(max = 1000, message = "reason must be at most 1000 characters")
    private String reason = "";
}
