package com.nulogic.hrms.attendance.dto;

import com.nulogic.hrms.attendance.RegularizationReason;
import com.nulogic.hrms.attendance.RegularizationStatus;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class RegularizationResponse {
    UUID id;
    UUID employeeId;
    LocalDate date;
    RegularizationReason reason;
    String comment;
    RegularizationStatus status;
    UUID approverUserId;
}
