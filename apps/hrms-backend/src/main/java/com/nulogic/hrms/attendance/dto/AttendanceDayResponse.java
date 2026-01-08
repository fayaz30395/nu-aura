package com.nulogic.hrms.attendance.dto;

import com.nulogic.hrms.attendance.AttendanceStatus;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class AttendanceDayResponse {
    UUID id;
    UUID employeeId;
    LocalDate date;
    OffsetDateTime checkInAt;
    OffsetDateTime checkOutAt;
    AttendanceStatus status;
}
