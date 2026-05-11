package com.hrms.api.payroll.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Whitelist DTO for {@code POST /api/v1/payroll/salary-structures}.
 *
 * <p>Replaces direct {@code @RequestBody SalaryStructure} binding to close
 * mass-assignment vector R-1.10. System fields (id, tenantId, audit fields)
 * are NEVER accepted from the request body.</p>
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "Request body for creating a salary structure. " +
        "Server-controlled fields (id, tenantId, audit fields) are rejected.")
public class CreateSalaryStructureRequest {

    @NotNull(message = "Employee id is required")
    @Schema(description = "Employee this salary structure applies to", required = true)
    private UUID employeeId;

    @NotNull(message = "Effective date is required")
    @Schema(description = "Date this salary structure becomes effective", required = true)
    private LocalDate effectiveDate;

    @Schema(description = "Optional end date for this salary structure")
    private LocalDate endDate;

    @NotNull(message = "Basic salary is required")
    @DecimalMin(value = "0.00", message = "Basic salary must be non-negative")
    @Digits(integer = 12, fraction = 2)
    private BigDecimal basicSalary;

    @PositiveOrZero @Digits(integer = 12, fraction = 2)
    private BigDecimal hra;

    @PositiveOrZero @Digits(integer = 12, fraction = 2)
    private BigDecimal conveyanceAllowance;

    @PositiveOrZero @Digits(integer = 12, fraction = 2)
    private BigDecimal medicalAllowance;

    @PositiveOrZero @Digits(integer = 12, fraction = 2)
    private BigDecimal specialAllowance;

    @PositiveOrZero @Digits(integer = 12, fraction = 2)
    private BigDecimal otherAllowances;

    @PositiveOrZero @Digits(integer = 12, fraction = 2)
    private BigDecimal providentFund;

    @PositiveOrZero @Digits(integer = 12, fraction = 2)
    private BigDecimal professionalTax;

    @PositiveOrZero @Digits(integer = 12, fraction = 2)
    private BigDecimal incomeTax;

    @PositiveOrZero @Digits(integer = 12, fraction = 2)
    private BigDecimal otherDeductions;

    @Schema(description = "Whether this structure is active (defaults to true)")
    private Boolean isActive;
}
