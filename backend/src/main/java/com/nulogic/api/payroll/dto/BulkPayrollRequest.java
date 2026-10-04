package com.nulogic.api.payroll.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Request body for the bulk payroll preview/process endpoints.
 *
 * <p>Carries the employee subset plus the single pay period to compute. The
 * period is reduced to a single {@code (year, month)} tuple — matching the
 * {@code payroll_runs}/{@code payslips} period model — derived from
 * {@code payrollPeriodStart}. A run spanning more than one calendar month is
 * rejected by the service (see {@code PayrollRunService#validateBulkPeriod}).</p>
 */
public record BulkPayrollRequest(
        @NotEmpty(message = "employeeIds must not be empty") List<UUID> employeeIds,
        @NotNull(message = "payrollPeriodStart is required") LocalDate payrollPeriodStart,
        @NotNull(message = "payrollPeriodEnd is required") LocalDate payrollPeriodEnd,
        LocalDate paymentDate,
        String runName
) {
}
