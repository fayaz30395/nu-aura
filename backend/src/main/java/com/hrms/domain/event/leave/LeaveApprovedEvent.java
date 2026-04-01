package com.hrms.domain.event.leave;

import com.hrms.domain.event.DomainEvent;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Event raised when a leave request is approved.
 *
 * <p>Consumed by downstream services for:</p>
 * <ul>
 *   <li>Notification delivery (email, push) to the employee</li>
 *   <li>Calendar/scheduling integration</li>
 *   <li>Analytics and reporting aggregation</li>
 *   <li>Audit log enrichment</li>
 * </ul>
 */
@Getter
public class LeaveApprovedEvent extends DomainEvent {

    private final UUID employeeId;
    private final UUID approverId;
    private final String leaveType;
    private final boolean isPaidLeave;
    private final LocalDate startDate;
    private final LocalDate endDate;
    private final BigDecimal daysDeducted;

    public LeaveApprovedEvent(Object source, UUID tenantId, UUID leaveRequestId,
                              UUID employeeId, UUID approverId, String leaveType,
                              LocalDate startDate, LocalDate endDate, BigDecimal daysDeducted) {
        this(source, tenantId, leaveRequestId, employeeId, approverId, leaveType, true, startDate, endDate, daysDeducted);
    }

    public LeaveApprovedEvent(Object source, UUID tenantId, UUID leaveRequestId,
                              UUID employeeId, UUID approverId, String leaveType,
                              boolean isPaidLeave,
                              LocalDate startDate, LocalDate endDate, BigDecimal daysDeducted) {
        super(source, tenantId, leaveRequestId, "LeaveRequest");
        this.employeeId = employeeId;
        this.approverId = approverId;
        this.leaveType = leaveType;
        this.isPaidLeave = isPaidLeave;
        this.startDate = startDate;
        this.endDate = endDate;
        this.daysDeducted = daysDeducted;
    }

    @Override
    public String getEventType() {
        return "LEAVE_APPROVED";
    }

    @Override
    public Object getEventPayload() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("leaveRequestId", getAggregateId().toString());
        payload.put("employeeId", employeeId.toString());
        payload.put("approverId", approverId.toString());
        payload.put("leaveType", leaveType);
        payload.put("startDate", startDate.toString());
        payload.put("endDate", endDate.toString());
        payload.put("daysDeducted", daysDeducted.toString());
        payload.put("isPaidLeave", isPaidLeave);
        return payload;
    }

    public static LeaveApprovedEvent of(Object source, UUID tenantId, UUID leaveRequestId,
                                        UUID employeeId, UUID approverId, String leaveType,
                                        LocalDate startDate, LocalDate endDate, BigDecimal daysDeducted) {
        return new LeaveApprovedEvent(source, tenantId, leaveRequestId,
                employeeId, approverId, leaveType, startDate, endDate, daysDeducted);
    }

    public static LeaveApprovedEvent of(Object source, UUID tenantId, UUID leaveRequestId,
                                        UUID employeeId, UUID approverId, String leaveType,
                                        boolean isPaidLeave,
                                        LocalDate startDate, LocalDate endDate, BigDecimal daysDeducted) {
        return new LeaveApprovedEvent(source, tenantId, leaveRequestId,
                employeeId, approverId, leaveType, isPaidLeave, startDate, endDate, daysDeducted);
    }
}
