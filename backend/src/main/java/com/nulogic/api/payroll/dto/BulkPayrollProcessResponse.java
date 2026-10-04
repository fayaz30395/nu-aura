package com.nulogic.api.payroll.dto;

import java.util.List;
import java.util.UUID;

/**
 * Summary returned by the bulk process endpoint.
 *
 * <p>{@code processedCount} counts newly generated payslips,
 * {@code alreadyProcessedCount} counts skipped (idempotent) employees, and
 * {@code failedCount} counts employees that could not be processed.</p>
 */
public record BulkPayrollProcessResponse(
        UUID payrollRunId,
        int processedCount,
        int failedCount,
        int alreadyProcessedCount,
        List<BulkPayrollProcessItem> results
) {
}
