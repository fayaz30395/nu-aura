package com.hrms.domain.event.leave;

import com.hrms.domain.event.DomainEvent;
import lombok.Getter;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Event raised when a leave request is rejected.
 *
 * <p>Consumed by downstream services for:</p>
 * <ul>
 *   <li>Notification delivery (email, push) to the employee</li>
 *   <li>Analytics and reporting aggregation</li>
 *   <li>Audit log enrichment</li>
 * </ul>
 */
@Getter
public class LeaveRejectedEvent extends DomainEvent {

    private final UUID employeeId;
    private final UUID approverId;
    private final String leaveType;
    private final LocalDate startDate;
    private final LocalDate endDate;
    private final String reason;

    public LeaveRejectedEvent(Object source, UUID tenantId, UUID leaveRequestId,
                              UUID employeeId, UUID approverId, String leaveType,
                              LocalDate startDate, LocalDate endDate, String reason) {
        super(source, tenantId, leaveRequestId, "LeaveRequest");
        this.employeeId = employeeId;
        this.approverId = approverId;
        this.leaveType = leaveType;
        this.startDate = startDate;
        this.endDate = endDate;
        this.reason = reason;
    }

    public static LeaveRejectedEvent of(Object source, UUID tenantId, UUID leaveRequestId,
                                        UUID employeeId, UUID approverId, String leaveType,
                                        LocalDate startDate, LocalDate endDate, String reason) {
        return new LeaveRejectedEvent(source, tenantId, leaveRequestId,
                employeeId, approverId, leaveType, startDate, endDate, reason);
    }

    @Override
    public String getEventType() {
        return "LEAVE_REJECTED";
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
        if (reason != null) {
            payload.put("reason", reason);
        }
        return payload;
    }
}
