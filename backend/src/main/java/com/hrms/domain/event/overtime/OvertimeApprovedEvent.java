package com.hrms.domain.event.overtime;

import com.hrms.domain.event.DomainEvent;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Published when an overtime record is approved.
 * Consumed by payroll to add overtime earnings to the next payroll run.
 */
@Getter
public class OvertimeApprovedEvent extends DomainEvent {

    private final UUID employeeId;
    private final UUID approverId;
    private final LocalDate overtimeDate;
    private final BigDecimal hoursWorked;
    private final BigDecimal overtimeRate;

    public OvertimeApprovedEvent(Object source, UUID tenantId, UUID overtimeRecordId,
                                 UUID employeeId, UUID approverId,
                                 LocalDate overtimeDate, BigDecimal hoursWorked, BigDecimal overtimeRate) {
        super(source, tenantId, overtimeRecordId, "OvertimeRecord");
        this.employeeId = employeeId;
        this.approverId = approverId;
        this.overtimeDate = overtimeDate;
        this.hoursWorked = hoursWorked;
        this.overtimeRate = overtimeRate;
    }

    public static OvertimeApprovedEvent of(Object source, UUID tenantId, UUID overtimeRecordId,
                                           UUID employeeId, UUID approverId,
                                           LocalDate overtimeDate, BigDecimal hoursWorked, BigDecimal overtimeRate) {
        return new OvertimeApprovedEvent(source, tenantId, overtimeRecordId,
                employeeId, approverId, overtimeDate, hoursWorked, overtimeRate);
    }

    @Override
    public String getEventType() {
        return "OVERTIME_APPROVED";
    }

    @Override
    public Object getEventPayload() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("overtimeRecordId", getAggregateId().toString());
        payload.put("employeeId", employeeId.toString());
        payload.put("approverId", approverId.toString());
        payload.put("overtimeDate", overtimeDate.toString());
        payload.put("hoursWorked", hoursWorked.toString());
        payload.put("overtimeRate", overtimeRate != null ? overtimeRate.toString() : "1.5");
        return payload;
    }
}
