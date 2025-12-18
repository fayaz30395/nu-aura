package com.hrms.api.attendance.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class BulkAttendanceResponse {
    private int successCount;
    private int failureCount;
    private List<AttendanceResponse> successful;
    private List<FailedEntry> failed;

    @Data
    @Builder
    public static class FailedEntry {
        private UUID employeeId;
        private String error;
    }
}
