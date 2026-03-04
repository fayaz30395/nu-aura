package com.hrms.application.performance.dto;

import com.hrms.domain.performance.PerformanceImprovementPlan.PIPStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PIPResponse {

    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private UUID managerId;
    private String managerName;
    private PIPStatus status;
    private LocalDate startDate;
    private LocalDate endDate;
    private String goals;
    private String checkInFrequency;
    private String reason;
    private String closeNotes;
    private int checkInCount;
    private List<PIPCheckInResponse> checkIns;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
