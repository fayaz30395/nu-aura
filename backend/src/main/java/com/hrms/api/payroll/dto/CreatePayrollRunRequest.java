package com.hrms.api.payroll.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

/**
 * Whitelist DTO for {@code POST /api/v1/payroll/runs}.
 *
 * <p>Replaces direct {@code @RequestBody PayrollRun} binding to close mass-assignment
 * vector R-1.10. Only client-mutable fields are exposed; server-controlled fields
 * (id, tenantId, status, processedAt/By, approvedAt/By, totals) are NEVER bound
 * from the request body.</p>
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "Request body for creating a payroll run. " +
        "Server-controlled fields (id, tenantId, status, audit fields) are rejected.")
public class CreatePayrollRunRequest {

    @NotNull(message = "Pay period month is required")
    @Min(value = 1, message = "Pay period month must be between 1 and 12")
    @Max(value = 12, message = "Pay period month must be between 1 and 12")
    @Schema(description = "Pay period month (1-12)", example = "5", required = true)
    private Integer payPeriodMonth;

    @NotNull(message = "Pay period year is required")
    @Min(value = 2000, message = "Pay period year must be 2000 or later")
    @Max(value = 2100, message = "Pay period year must be 2100 or earlier")
    @Schema(description = "Pay period year (4-digit)", example = "2026", required = true)
    private Integer payPeriodYear;

    @NotNull(message = "Payroll date is required")
    @Schema(description = "Date payroll is processed/paid", required = true)
    private LocalDate payrollDate;

    @Size(max = 2000, message = "Remarks must not exceed 2000 characters")
    @Schema(description = "Optional remarks/notes for this run")
    private String remarks;
}
