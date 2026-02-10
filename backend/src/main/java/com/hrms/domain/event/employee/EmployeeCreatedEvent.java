package com.hrms.domain.event.employee;

import com.hrms.domain.employee.Employee;
import lombok.Getter;

import java.util.Map;
import java.util.UUID;

/**
 * Event raised when a new employee is created/hired.
 *
 * <p>This event triggers downstream processes such as:</p>
 * <ul>
 *   <li>Onboarding workflow initiation</li>
 *   <li>IT asset provisioning</li>
 *   <li>Welcome email sending</li>
 *   <li>External system synchronization (HRIS, payroll)</li>
 * </ul>
 */
@Getter
public class EmployeeCreatedEvent extends EmployeeEvent {

    private final Employee employee;

    public EmployeeCreatedEvent(Object source, Employee employee) {
        super(source,
              employee.getTenantId(),
              employee.getId(),
              employee.getEmployeeCode(),
              employee.getFullName(),
              employee.getUser() != null ? employee.getUser().getEmail() : null);
        this.employee = employee;
    }

    @Override
    public String getEventType() {
        return "EMPLOYEE_CREATED";
    }

    @Override
    public Object getEventPayload() {
        Map<String, Object> payload = buildBasePayload(employee);
        payload.put("joiningDate", employee.getJoiningDate().toString());
        if (employee.getUser() != null) {
            payload.put("email", employee.getUser().getEmail());
            payload.put("userId", employee.getUser().getId().toString());
        }
        return payload;
    }

    /**
     * Factory method for creating the event.
     */
    public static EmployeeCreatedEvent of(Object source, Employee employee) {
        return new EmployeeCreatedEvent(source, employee);
    }
}
