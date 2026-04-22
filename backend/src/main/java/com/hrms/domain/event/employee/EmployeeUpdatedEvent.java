package com.hrms.domain.event.employee;

import com.hrms.domain.employee.Employee;
import lombok.Getter;

import java.util.Map;
import java.util.Set;

/**
 * Event raised when an employee's information is updated.
 *
 * <p>Includes the list of changed fields for consumers to react appropriately.</p>
 */
@Getter
public class EmployeeUpdatedEvent extends EmployeeEvent {

    private final Employee employee;
    private final Set<String> changedFields;

    public EmployeeUpdatedEvent(Object source, Employee employee, Set<String> changedFields) {
        super(source,
                employee.getTenantId(),
                employee.getId(),
                employee.getEmployeeCode(),
                employee.getFullName(),
                employee.getUser() != null ? employee.getUser().getEmail() : null);
        this.employee = employee;
        this.changedFields = changedFields;
    }

    /**
     * Factory method for creating the event.
     */
    public static EmployeeUpdatedEvent of(Object source, Employee employee, Set<String> changedFields) {
        return new EmployeeUpdatedEvent(source, employee, changedFields);
    }

    @Override
    public String getEventType() {
        return "EMPLOYEE_UPDATED";
    }

    @Override
    public Object getEventPayload() {
        Map<String, Object> payload = buildBasePayload(employee);
        payload.put("changedFields", changedFields);
        return payload;
    }
}
