package com.hrms.api.attendance.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Request for closing an open time entry
 */
@Data
public class MultiCheckOutRequest {
    @NotNull
    private UUID employeeId;

    private UUID timeEntryId; // Optional - if not provided, closes the latest open entry
    private LocalDateTime checkOutTime;
    private String source = "WEB";
    private String location;
    private String ip;
}
