package com.hrms.domain.event.expense;

import com.hrms.domain.event.DomainEvent;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Published when an expense claim is approved.
 * Consumed by payroll to add expense reimbursement to the next payroll run.
 */
@Getter
public class ExpenseApprovedEvent extends DomainEvent {

    private final UUID employeeId;
    private final UUID approverId;
    private final BigDecimal amount;
    private final String currency;
    private final String claimNumber;
    private final String category;

    public ExpenseApprovedEvent(Object source, UUID tenantId, UUID expenseClaimId,
                                UUID employeeId, UUID approverId,
                                BigDecimal amount, String currency,
                                String claimNumber, String category) {
        super(source, tenantId, expenseClaimId, "ExpenseClaim");
        this.employeeId = employeeId;
        this.approverId = approverId;
        this.amount = amount;
        this.currency = currency;
        this.claimNumber = claimNumber;
        this.category = category;
    }

    public static ExpenseApprovedEvent of(Object source, UUID tenantId, UUID expenseClaimId,
                                          UUID employeeId, UUID approverId,
                                          BigDecimal amount, String currency,
                                          String claimNumber, String category) {
        return new ExpenseApprovedEvent(source, tenantId, expenseClaimId,
                employeeId, approverId, amount, currency, claimNumber, category);
    }

    @Override
    public String getEventType() {
        return "EXPENSE_APPROVED";
    }

    @Override
    public Object getEventPayload() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("expenseClaimId", getAggregateId().toString());
        payload.put("employeeId", employeeId.toString());
        payload.put("approverId", approverId.toString());
        payload.put("amount", amount.toString());
        payload.put("currency", currency);
        payload.put("claimNumber", claimNumber);
        payload.put("category", category);
        return payload;
    }
}
