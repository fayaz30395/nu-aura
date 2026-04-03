package com.hrms.domain.event.expense;

import com.hrms.domain.event.DomainEvent;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Event raised when an employee submits an expense claim.
 * Consumed by NotificationEventListener to notify the approver.
 */
@Getter
public class ExpenseSubmittedEvent extends DomainEvent {

    private final UUID employeeId;
    private final String requesterName;
    private final BigDecimal amount;
    private final String currency;
    private final UUID approverId;

    public ExpenseSubmittedEvent(Object source, UUID tenantId, UUID expenseId,
                                 UUID employeeId, String requesterName,
                                 BigDecimal amount, String currency, UUID approverId) {
        super(source, tenantId, expenseId, "ExpenseClaim");
        this.employeeId = employeeId;
        this.requesterName = requesterName;
        this.amount = amount;
        this.currency = currency;
        this.approverId = approverId;
    }

    public static ExpenseSubmittedEvent of(Object source, UUID tenantId, UUID expenseId,
                                           UUID employeeId, String requesterName,
                                           BigDecimal amount, String currency, UUID approverId) {
        return new ExpenseSubmittedEvent(source, tenantId, expenseId,
                employeeId, requesterName, amount, currency, approverId);
    }

    @Override
    public String getEventType() {
        return "EXPENSE_SUBMITTED";
    }

    @Override
    public Object getEventPayload() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("expenseId", getAggregateId().toString());
        payload.put("employeeId", employeeId.toString());
        payload.put("requesterName", requesterName);
        payload.put("amount", amount.toPlainString());
        payload.put("currency", currency);
        if (approverId != null) {
            payload.put("approverId", approverId.toString());
        }
        return payload;
    }
}
