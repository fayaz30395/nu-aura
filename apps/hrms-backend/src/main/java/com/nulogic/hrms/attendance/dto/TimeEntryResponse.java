package com.nulogic.hrms.attendance.dto;

import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class TimeEntryResponse {
    UUID id;
    UUID attendanceRecordId;
    String entryType;
    OffsetDateTime checkInTime;
    OffsetDateTime checkOutTime;
    long durationMinutes;
    int sequenceNumber;
    boolean open;
}
