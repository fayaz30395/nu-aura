package com.hrms.application.payroll.listener;

import com.hrms.domain.event.expense.ExpenseApprovedEvent;
import com.hrms.domain.event.leave.LeaveApprovedEvent;
import com.hrms.domain.event.overtime.OvertimeApprovedEvent;
import com.hrms.domain.payroll.PayrollAdjustment;
import com.hrms.infrastructure.payroll.repository.PayrollAdjustmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Listens for cross-module domain events and creates payroll adjustments.
 *
 * <p>FIX-001: Overtime approved → creates OVERTIME_EARNING adjustment</p>
 * <p>FIX-002: Expense approved → creates EXPENSE_REIMBURSEMENT adjustment</p>
 * <p>FIX-005: LOP leave approved → creates LOP_DEDUCTION adjustment</p>
 *
 * <p>Adjustments are picked up during the next payroll run and applied to the employee's payslip.</p>
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class PayrollIntegrationListener {

    private final PayrollAdjustmentRepository adjustmentRepository;

    /**
     * FIX-001: When overtime is approved, create an earning adjustment for the next payroll run.
     * Amount = overtimeHours * overtimeRate (multiplier represents pay rate factor, e.g. 1.5x).
     */
    @EventListener
    @Transactional
    public void onOvertimeApproved(OvertimeApprovedEvent event) {
        log.info("Overtime approved for employee {} — creating payroll earning adjustment",
                event.getEmployeeId());

        BigDecimal hours = event.getHoursWorked();
        BigDecimal rate = event.getOvertimeRate() != null ? event.getOvertimeRate() : new BigDecimal("1.5");

        // Note: actual overtime pay = hours * rate * hourly_rate. Since we don't have the hourly
        // rate here, we store the hours and multiplier. The payroll engine resolves the final
        // amount during payroll processing using the employee's salary structure.
        // For now, we store a placeholder amount; the payroll processor should recalculate.
        PayrollAdjustment adjustment = PayrollAdjustment.builder()
                .tenantId(event.getTenantId())
                .employeeId(event.getEmployeeId())
                .adjustmentType(PayrollAdjustment.AdjustmentType.OVERTIME_EARNING)
                .category(PayrollAdjustment.AdjustmentCategory.EARNING)
                .amount(hours.multiply(rate)) // Effective overtime hours (hours × multiplier)
                .description(String.format("Overtime: %.1f hrs × %.1fx on %s",
                        hours.doubleValue(), rate.doubleValue(), event.getOvertimeDate()))
                .sourceModule("OVERTIME")
                .sourceId(event.getAggregateId())
                .effectiveDate(event.getOvertimeDate())
                .build();

        adjustmentRepository.save(adjustment);
        log.info("Created payroll adjustment {} for overtime record {}", adjustment.getId(), event.getAggregateId());
    }

    /**
     * FIX-002: When an expense is approved, create a reimbursement earning for the next payroll.
     */
    @EventListener
    @Transactional
    public void onExpenseApproved(ExpenseApprovedEvent event) {
        log.info("Expense claim {} approved for employee {} — creating reimbursement adjustment",
                event.getClaimNumber(), event.getEmployeeId());

        PayrollAdjustment adjustment = PayrollAdjustment.builder()
                .tenantId(event.getTenantId())
                .employeeId(event.getEmployeeId())
                .adjustmentType(PayrollAdjustment.AdjustmentType.EXPENSE_REIMBURSEMENT)
                .category(PayrollAdjustment.AdjustmentCategory.EARNING)
                .amount(event.getAmount())
                .currency(event.getCurrency())
                .description(String.format("Expense reimbursement: %s (%s %s)",
                        event.getClaimNumber(), event.getCurrency(), event.getAmount()))
                .sourceModule("EXPENSE")
                .sourceId(event.getAggregateId())
                .effectiveDate(LocalDate.now())
                .build();

        adjustmentRepository.save(adjustment);
        log.info("Created payroll adjustment {} for expense claim {}", adjustment.getId(), event.getClaimNumber());
    }

    /**
     * FIX-005: When a loss-of-pay (unpaid) leave is approved, create a deduction for payroll.
     * Only creates a deduction when the leave type is NOT paid (isPaidLeave = false).
     */
    @EventListener
    @Transactional
    public void onLeaveApproved(LeaveApprovedEvent event) {
        if (event.isPaidLeave()) {
            log.debug("Paid leave approved for employee {} — no payroll deduction needed", event.getEmployeeId());
            return;
        }

        log.info("LOP leave approved for employee {} — creating payroll deduction adjustment ({} days)",
                event.getEmployeeId(), event.getDaysDeducted());

        PayrollAdjustment adjustment = PayrollAdjustment.builder()
                .tenantId(event.getTenantId())
                .employeeId(event.getEmployeeId())
                .adjustmentType(PayrollAdjustment.AdjustmentType.LOP_DEDUCTION)
                .category(PayrollAdjustment.AdjustmentCategory.DEDUCTION)
                .amount(event.getDaysDeducted()) // Days — payroll engine converts to salary deduction
                .description(String.format("LOP deduction: %s days (%s, %s to %s)",
                        event.getDaysDeducted(), event.getLeaveType(),
                        event.getStartDate(), event.getEndDate()))
                .sourceModule("LEAVE")
                .sourceId(event.getAggregateId())
                .effectiveDate(event.getStartDate())
                .build();

        adjustmentRepository.save(adjustment);
        log.info("Created LOP payroll deduction for leave request {}", event.getAggregateId());
    }
}
