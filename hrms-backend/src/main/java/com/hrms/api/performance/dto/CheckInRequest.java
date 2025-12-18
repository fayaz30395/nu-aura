package com.hrms.api.performance.dto;

import com.hrms.domain.performance.OkrCheckIn.CheckInType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckInRequest {

    private UUID objectiveId;

    private UUID keyResultId;

    private BigDecimal newValue;

    private BigDecimal newProgress;

    private Integer confidenceLevel;

    private String notes;

    private String blockers;

    private String nextSteps;

    private CheckInType checkInType;
}
