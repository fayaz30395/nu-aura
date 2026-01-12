package com.hrms.api.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkAttendanceImportRequest {
    private String employeeCode;
    private LocalDate attendanceDate;
    private LocalDateTime checkInTime;
    private LocalDateTime checkOutTime;
    private String status; // PRESENT, ABSENT, HALF_DAY, etc.
    private String source; // BIOMETRIC, MANUAL, EXCEL_IMPORT
    private String remarks;
}
