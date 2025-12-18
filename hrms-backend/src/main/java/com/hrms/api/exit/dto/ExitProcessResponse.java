package com.hrms.api.exit.dto;

import com.hrms.domain.exit.ExitProcess;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class ExitProcessResponse {
    private UUID id;
    private UUID tenantId;
    private UUID employeeId;
    private String employeeName;
    private ExitProcess.ExitType exitType;
    private LocalDate resignationDate;
    private LocalDate lastWorkingDate;
    private Integer noticePeriodDays;
    private Integer noticePeriodServed;
    private BigDecimal buyoutAmount;
    private String reasonForLeaving;
    private String newCompany;
    private String newDesignation;
    private ExitProcess.ExitStatus status;
    private Boolean rehireEligible;
    private Boolean exitInterviewScheduled;
    private LocalDate exitInterviewDate;
    private String exitInterviewFeedback;
    private BigDecimal finalSettlementAmount;
    private LocalDate settlementDate;
    private UUID managerId;
    private String managerName;
    private UUID hrSpocId;
    private String hrSpocName;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
