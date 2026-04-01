package com.hrms.api.attendance.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class TimeEntryResponse {
    private UUID id;
    private UUID attendanceRecordId;
    private String entryType;
    private LocalDateTime checkInTime;
    private LocalDateTime checkOutTime;
    private String checkInSource;
    private String checkOutSource;
    private Integer durationMinutes;
    private Integer sequenceNumber;
    private String notes;
    private boolean isOpen;
}
