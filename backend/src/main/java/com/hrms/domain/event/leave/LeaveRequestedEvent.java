package com.hrms.domain.event.leave;

import com.hrms.domain.event.DomainEvent;
import lombok.Getter;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Event raised when an employee submits a leave request.
 * Consumed by NotificationEventListener to create in-app notifications
 * for the employee's manager / HR.
 */
@Getter
public class LeaveRequestedEvent extends DomainEvent {

    private final UUID employeeId;
    private final String requesterName;
    private final String leaveType;
    private final LocalDate startDate;
    private final LocalDate endDate;
    private final UUID managerId;

    public LeaveRequestedEvent(Object source, UUID tenantId, UUID leaveRequestId,
                               UUID employeeId, String requesterName, String leaveType,
                               LocalDate startDate, LocalDate endDate, UUID managerId) {
        super(source, tenantId, leaveRequestId, "LeaveRequest");
        this.employeeId = employeeId;
        this.requesterName = requesterName;
        this.leaveType = leaveType;
        this.startDate = startDate;
        this.endDate = endDate;
        this.managerId = managerId;
    }

    public static LeaveRequestedEvent of(Object source, UUID tenantId, UUID leaveRequestId,
                                         UUID employeeId, String requesterName, String leaveType,
                                         LocalDate startDate, LocalDate endDate, UUID managerId) {
        return new LeaveRequestedEvent(source, tenantId, leaveRequestId,
                employeeId, requesterName, leaveType, startDate, endDate, managerId);
    }

    @Override
    public String getEventType() {
        return "LEAVE_REQUESTED";
    }

    @Override
    public Object getEventPayload() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("leaveRequestId", getAggregateId().toString());
        payload.put("employeeId", employeeId.toString());
        payload.put("requesterName", requesterName);
        payload.put("leaveType", leaveType);
        payload.put("startDate", startDate.toString());
        payload.put("endDate", endDate.toString());
        if (managerId != null) {
            payload.put("managerId", managerId.toString());
        }
        return payload;
    }
}
