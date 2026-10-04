package com.nulogic.api.payroll.dto;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Per-employee preview row returned by the bulk preview endpoint.
 *
 * <p>Field names intentionally mirror the {@code EmployeePreview} shape the
 * frontend wizard renders, so no client-side re-mapping is required.</p>
 */
public record BulkPayrollPreviewItem(
        UUID employeeId,
        String employeeName,
        BigDecimal baseSalary,
        BigDecimal totalAllowances,
        BigDecimal totalDeductions,
        BigDecimal grossAmount,
        BigDecimal netAmount
) {
}
