package com.hrms.domain.event.employee;

import com.hrms.domain.employee.Employee;
import lombok.Getter;

import java.util.Map;

/**
 * Event raised when an employee is terminated.
 *
 * <p>This event triggers downstream processes such as:</p>
 * <ul>
 *   <li>Offboarding workflow initiation</li>
 *   <li>IT access revocation</li>
 *   <li>Asset recovery scheduling</li>
 *   <li>Final settlement processing</li>
 *   <li>Exit interview scheduling</li>
 * </ul>
 */
@Getter
public class EmployeeTerminatedEvent extends EmployeeEvent {

    private final Employee employee;
    private final String terminationReason;

    public EmployeeTerminatedEvent(Object source, Employee employee, String terminationReason) {
        super(source,
              employee.getTenantId(),
              employee.getId(),
              employee.getEmployeeCode(),
              employee.getFullName(),
              employee.getUser() != null ? employee.getUser().getEmail() : null);
        this.employee = employee;
        this.terminationReason = terminationReason;
    }

    @Override
    public String getEventType() {
        return "EMPLOYEE_TERMINATED";
    }

    @Override
    public Object getEventPayload() {
        Map<String, Object> payload = buildBasePayload(employee);
        payload.put("terminationReason", terminationReason);
        if (employee.getExitDate() != null) {
            payload.put("exitDate", employee.getExitDate().toString());
        }
        return payload;
    }

    /**
     * Factory method for creating the event.
     */
    public static EmployeeTerminatedEvent of(Object source, Employee employee, String reason) {
        return new EmployeeTerminatedEvent(source, employee, reason);
    }
}
