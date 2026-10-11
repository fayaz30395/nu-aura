package com.nulogic.api.payroll.dto;

/**
 * Release state of one month's payslip for an employee. Deliberately carries no amounts.
 *
 * <p>{@code released} is true only when the payslip belongs to a payroll run that is APPROVED or LOCKED
 * (see {@code PayslipService.RELEASED_STATUSES}). Release is not payment.</p>
 */
public record PayslipReleaseStatusResponse(int month, boolean released, Reason reason) {

    /**
     * RELEASED: the payslip belongs to a released run. NOT_RELEASED: the payslip exists but its run is not
     * released. NO_PAYSLIP: no payslip for this employee in that month (including months with no payroll run).
     */
    public enum Reason {
        RELEASED,
        NOT_RELEASED,
        NO_PAYSLIP
    }
}
