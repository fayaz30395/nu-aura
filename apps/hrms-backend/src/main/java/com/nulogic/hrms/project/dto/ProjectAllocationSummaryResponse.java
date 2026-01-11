package com.nulogic.hrms.project.dto;

import java.math.BigDecimal;
import java.util.UUID;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ProjectAllocationSummaryResponse {
    UUID employeeId;
    String employeeCode;
    String employeeName;
    String employeeEmail;
    BigDecimal allocationPercent;
    Integer activeProjectCount;
    Boolean overAllocated;
}
