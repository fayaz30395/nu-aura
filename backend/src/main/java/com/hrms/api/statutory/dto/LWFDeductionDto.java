package com.hrms.api.statutory.dto;

import com.hrms.domain.statutory.LWFConfiguration.LWFFrequency;
import com.hrms.domain.statutory.LWFDeduction.LWFDeductionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for LWF deduction records (response only).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LWFDeductionDto {

    private UUID id;
    private UUID employeeId;
    private UUID payrollRunId;
    private String stateCode;
    private BigDecimal employeeAmount;
    private BigDecimal employerAmount;
    private LWFFrequency frequency;
    private Integer deductionMonth;
    private Integer deductionYear;
    private LWFDeductionStatus status;
    private BigDecimal grossSalary;
    private LocalDateTime createdAt;
}
