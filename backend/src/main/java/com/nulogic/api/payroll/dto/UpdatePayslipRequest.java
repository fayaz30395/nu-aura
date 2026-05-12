package com.nulogic.api.payroll.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Whitelist DTO for {@code PUT /api/v1/payroll/payslips/{id}}.
 *
 * <p>Replaces direct {@code @RequestBody Payslip} binding to close mass-assignment
 * vector R-1.10. Only the fields the service's update logic legitimately copies
 * are exposed. System fields (id, tenantId, totals — recomputed via
 * {@code Payslip.calculateTotals()} — and pdfFileId) are NEVER accepted.</p>
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "Request body for updating a payslip. " +
        "Totals are recomputed server-side; tenantId / pdfFileId / status fields are rejected.")
public class UpdatePayslipRequest {

    @NotNull(message = "Payroll run id is required")
    private UUID payrollRunId;

    @NotNull(message = "Employee id is required")
    private UUID employeeId;

    @NotNull(message = "Pay period month is required")
    @Min(value = 1, message = "Pay period month must be between 1 and 12")
    @Max(value = 12, message = "Pay period month must be between 1 and 12")
    private Integer payPeriodMonth;

    @NotNull(message = "Pay period year is required")
    @Min(value = 2000, message = "Pay period year must be 2000 or later")
    @Max(value = 2100, message = "Pay period year must be 2100 or earlier")
    private Integer payPeriodYear;

    @NotNull(message = "Pay date is required")
    private LocalDate payDate;

    @NotNull(message = "Basic salary is required")
    @DecimalMin(value = "0.00", message = "Basic salary must be non-negative")
    @Digits(integer = 12, fraction = 2, message = "Basic salary must have at most 12 digits and 2 decimals")
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

    @Min(value = 0, message = "Working days must be non-negative")
    @Max(value = 31, message = "Working days must be at most 31")
    private Integer workingDays;

    @Min(value = 0, message = "Present days must be non-negative")
    @Max(value = 31, message = "Present days must be at most 31")
    private Integer presentDays;

    @Min(value = 0, message = "Leave days must be non-negative")
    @Max(value = 31, message = "Leave days must be at most 31")
    private Integer leaveDays;
}
