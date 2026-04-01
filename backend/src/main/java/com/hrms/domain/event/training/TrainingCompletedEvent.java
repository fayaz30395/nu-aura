package com.hrms.domain.event.training;

import com.hrms.domain.event.DomainEvent;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Event raised when an employee completes a training program.
 * Consumed by TrainingSkillUpdateListener to update the employee's skill matrix.
 */
@Getter
public class TrainingCompletedEvent extends DomainEvent {

    private final UUID employeeId;
    private final UUID enrollmentId;
    private final UUID programId;
    private final String programName;
    private final LocalDateTime completedAt;

    public TrainingCompletedEvent(Object source, UUID tenantId, UUID enrollmentId,
                                 UUID employeeId, UUID programId, String programName,
                                 LocalDateTime completedAt) {
        super(source, tenantId, enrollmentId, "TrainingEnrollment");
        this.employeeId = employeeId;
        this.enrollmentId = enrollmentId;
        this.programId = programId;
        this.programName = programName;
        this.completedAt = completedAt;
    }

    @Override
    public String getEventType() {
        return "TRAINING_COMPLETED";
    }

    @Override
    public Object getEventPayload() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("enrollmentId", enrollmentId.toString());
        payload.put("employeeId", employeeId.toString());
        payload.put("programId", programId.toString());
        payload.put("programName", programName);
        payload.put("completedAt", completedAt.toString());
        return payload;
    }

    public static TrainingCompletedEvent of(Object source, UUID tenantId, UUID enrollmentId,
                                            UUID employeeId, UUID programId, String programName,
                                            LocalDateTime completedAt) {
        return new TrainingCompletedEvent(source, tenantId, enrollmentId,
                employeeId, programId, programName, completedAt);
    }
}
