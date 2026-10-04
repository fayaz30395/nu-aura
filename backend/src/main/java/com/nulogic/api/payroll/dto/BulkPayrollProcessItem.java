package com.nulogic.api.payroll.dto;

import java.util.UUID;

/**
 * Per-employee result of a bulk process run.
 *
 * <p>{@code ALREADY_PROCESSED} marks an employee whose payslip already exists for
 * the period (idempotent re-run); {@code FAILED} carries the reason for the skip.</p>
 */
public record BulkPayrollProcessItem(
        UUID employeeId,
        Status status,
        String reason
) {
    public enum Status {
        PROCESSED,
        ALREADY_PROCESSED,
        FAILED
    }
}
