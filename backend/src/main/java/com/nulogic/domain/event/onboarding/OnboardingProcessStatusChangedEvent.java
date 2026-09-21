package com.nulogic.domain.event.onboarding;

import com.nulogic.domain.event.DomainEvent;
import com.nulogic.domain.onboarding.OnboardingProcess;
import lombok.Getter;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Raised whenever an {@link OnboardingProcess} (onboarding or offboarding) transitions
 * status, so notification/reminder features can react without OnboardingManagementService
 * knowing about them directly.
 */
@Getter
public class OnboardingProcessStatusChangedEvent extends DomainEvent {

    private final UUID employeeId;
    private final OnboardingProcess.ProcessType processType;
    private final OnboardingProcess.ProcessStatus oldStatus;
    private final OnboardingProcess.ProcessStatus newStatus;
    private final UUID assignedBuddyId;

    public OnboardingProcessStatusChangedEvent(Object source, OnboardingProcess process,
                                                OnboardingProcess.ProcessStatus oldStatus) {
        super(source, process.getTenantId(), process.getId(), "OnboardingProcess");
        this.employeeId = process.getEmployeeId();
        this.processType = process.getProcessType();
        this.oldStatus = oldStatus;
        this.newStatus = process.getStatus();
        this.assignedBuddyId = process.getAssignedBuddyId();
    }

    @Override
    public String getEventType() {
        return "ONBOARDING_PROCESS_STATUS_CHANGED";
    }

    @Override
    public Object getEventPayload() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("processId", getAggregateId().toString());
        payload.put("employeeId", employeeId.toString());
        payload.put("processType", processType != null ? processType.name() : null);
        payload.put("oldStatus", oldStatus != null ? oldStatus.name() : null);
        payload.put("newStatus", newStatus != null ? newStatus.name() : null);
        if (assignedBuddyId != null) {
            payload.put("assignedBuddyId", assignedBuddyId.toString());
        }
        return payload;
    }
}
