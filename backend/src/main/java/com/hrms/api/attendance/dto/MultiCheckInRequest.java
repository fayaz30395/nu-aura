package com.hrms.api.attendance.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Request for creating a new time entry (for break tracking)
 */
@Data
public class MultiCheckInRequest {
    @NotNull
    private UUID employeeId;

    private LocalDateTime checkInTime;
    private String entryType = "REGULAR"; // REGULAR, BREAK, LUNCH, MEETING, CLIENT_VISIT, OTHER
    private String source = "WEB";
    private String location;
    private String ip;
    private String notes;
}
