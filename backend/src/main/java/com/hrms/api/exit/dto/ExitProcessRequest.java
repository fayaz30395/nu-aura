package com.hrms.api.exit.dto;

import com.hrms.domain.exit.ExitProcess;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class ExitProcessRequest {
    @NotNull(message = "Employee ID is required")
    private UUID employeeId;

    @NotNull(message = "Exit type is required")
    private ExitProcess.ExitType exitType;

    private LocalDate resignationDate;

    @NotNull(message = "Last working date is required")
    private LocalDate lastWorkingDate;

    @Min(value = 0, message = "Notice period days must be non-negative")
    private Integer noticePeriodDays;

    @Min(value = 0, message = "Notice period served must be non-negative")
    private Integer noticePeriodServed;

    @Min(value = 0, message = "Buyout amount must be non-negative")
    private BigDecimal buyoutAmount;

    @Size(max = 1000, message = "Reason for leaving must not exceed 1000 characters")
    private String reasonForLeaving;

    @Size(max = 200, message = "New company must not exceed 200 characters")
    private String newCompany;

    @Size(max = 200, message = "New designation must not exceed 200 characters")
    private String newDesignation;

    private ExitProcess.ExitStatus status;
    private Boolean rehireEligible;
    private Boolean exitInterviewScheduled;
    private LocalDate exitInterviewDate;

    @Size(max = 5000, message = "Exit interview feedback must not exceed 5000 characters")
    private String exitInterviewFeedback;

    @Min(value = 0, message = "Final settlement amount must be non-negative")
    private BigDecimal finalSettlementAmount;

    private LocalDate settlementDate;
    private UUID managerId;
    private UUID hrSpocId;

    @Size(max = 2000, message = "Notes must not exceed 2000 characters")
    private String notes;
}
