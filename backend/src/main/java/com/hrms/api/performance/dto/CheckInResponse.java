package com.hrms.api.performance.dto;

import com.hrms.domain.performance.OkrCheckIn;
import com.hrms.domain.performance.OkrCheckIn.CheckInType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckInResponse {

    private UUID id;
    private UUID tenantId;
    private UUID objectiveId;
    private UUID keyResultId;
    private UUID employeeId;
    private String employeeName;
    private LocalDateTime checkInDate;
    private BigDecimal previousValue;
    private BigDecimal newValue;
    private BigDecimal previousProgress;
    private BigDecimal newProgress;
    private Integer confidenceLevel;
    private String notes;
    private String blockers;
    private String nextSteps;
    private CheckInType checkInType;
    private LocalDateTime createdAt;

    public static CheckInResponse fromEntity(OkrCheckIn checkIn) {
        return CheckInResponse.builder()
                .id(checkIn.getId())
                .tenantId(checkIn.getTenantId())
                .objectiveId(checkIn.getObjectiveId())
                .keyResultId(checkIn.getKeyResultId())
                .employeeId(checkIn.getEmployeeId())
                .checkInDate(checkIn.getCheckInDate())
                .previousValue(checkIn.getPreviousValue())
                .newValue(checkIn.getNewValue())
                .previousProgress(checkIn.getPreviousProgress())
                .newProgress(checkIn.getNewProgress())
                .confidenceLevel(checkIn.getConfidenceLevel())
                .notes(checkIn.getNotes())
                .blockers(checkIn.getBlockers())
                .nextSteps(checkIn.getNextSteps())
                .checkInType(checkIn.getCheckInType())
                .createdAt(checkIn.getCreatedAt())
                .build();
    }
}
