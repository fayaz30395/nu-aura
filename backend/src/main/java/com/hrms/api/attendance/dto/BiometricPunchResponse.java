package com.hrms.api.attendance.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BiometricPunchResponse {

    private UUID id;
    private UUID deviceId;
    private UUID employeeId;
    private String employeeIdentifier;
    private LocalDateTime punchTime;
    private String punchType;
    private String processedStatus;
    private String errorMessage;
    private UUID attendanceRecordId;
    private LocalDateTime processedAt;
    private LocalDateTime createdAt;
}
