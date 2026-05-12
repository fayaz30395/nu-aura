package com.nulogic.api.payroll.dto;

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
 * Whitelist DTO for {@code PUT /api/v1/payroll/salary-structures/{id}}.
 *
 * <p>Replaces direct {@code @RequestBody SalaryStructure} binding to close
 * mass-assignment vector R-1.10. Exposes only the fields the service's update
 * logic copies. System fields (id, tenantId, audit fields) are NEVER
 * accepted.</p>
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "Request body for updating a salary structure. " +
        "Server-controlled fields (id, tenantId, audit fields) are rejected.")
public class UpdateSalaryStructureRequest {

    @NotNull(message = "Employee id is required")
    private UUID employeeId;

    @NotNull(message = "Effective date is required")
    private LocalDate effectiveDate;

    private LocalDate endDate;

    @NotNull(message = "Basic salary is required")
    @DecimalMin(value = "0.00", message = "Basic salary must be non-negative")
    @Digits(integer = 12, fraction = 2)
    private BigDecimal basicSalary;

    @PositiveOrZero
    @Digits(integer = 12, fraction = 2)
    private BigDecimal hra;

    @PositiveOrZero
    @Digits(integer = 12, fraction = 2)
    private BigDecimal conveyanceAllowance;

    @PositiveOrZero
    @Digits(integer = 12, fraction = 2)
    private BigDecimal medicalAllowance;

    @PositiveOrZero
    @Digits(integer = 12, fraction = 2)
    private BigDecimal specialAllowance;

    @PositiveOrZero
    @Digits(integer = 12, fraction = 2)
    private BigDecimal otherAllowances;

    @PositiveOrZero
    @Digits(integer = 12, fraction = 2)
    private BigDecimal providentFund;

    @PositiveOrZero
    @Digits(integer = 12, fraction = 2)
    private BigDecimal professionalTax;

    @PositiveOrZero
    @Digits(integer = 12, fraction = 2)
    private BigDecimal incomeTax;

    @PositiveOrZero
    @Digits(integer = 12, fraction = 2)
    private BigDecimal otherDeductions;

    @NotNull(message = "isActive is required")
    @Schema(description = "Whether this structure is active")
    private Boolean isActive;
}
