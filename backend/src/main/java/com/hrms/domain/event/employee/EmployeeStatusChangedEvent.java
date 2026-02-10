package com.hrms.domain.event.employee;

import com.hrms.domain.employee.Employee;
import lombok.Getter;

import java.util.Map;

/**
 * Event raised when an employee's status changes.
 *
 * <p>Status transitions include:</p>
 * <ul>
 *   <li>ACTIVE → ON_LEAVE (leave started)</li>
 *   <li>ON_LEAVE → ACTIVE (leave ended)</li>
 *   <li>ACTIVE → ON_NOTICE (resignation submitted)</li>
 *   <li>ON_NOTICE → RESIGNED (notice period completed)</li>
 * </ul>
 */
@Getter
public class EmployeeStatusChangedEvent extends EmployeeEvent {

    private final Employee employee;
    private final Employee.EmployeeStatus previousStatus;
    private final Employee.EmployeeStatus newStatus;

    public EmployeeStatusChangedEvent(Object source, Employee employee,
                                      Employee.EmployeeStatus previousStatus,
                                      Employee.EmployeeStatus newStatus) {
        super(source,
              employee.getTenantId(),
              employee.getId(),
              employee.getEmployeeCode(),
              employee.getFullName(),
              employee.getUser() != null ? employee.getUser().getEmail() : null);
        this.employee = employee;
        this.previousStatus = previousStatus;
        this.newStatus = newStatus;
    }

    @Override
    public String getEventType() {
        return "EMPLOYEE_STATUS_CHANGED";
    }

    @Override
    public Object getEventPayload() {
        Map<String, Object> payload = buildBasePayload(employee);
        payload.put("previousStatus", previousStatus.name());
        payload.put("newStatus", newStatus.name());
        return payload;
    }

    /**
     * Factory method for creating the event.
     */
    public static EmployeeStatusChangedEvent of(Object source, Employee employee,
                                                Employee.EmployeeStatus previousStatus,
                                                Employee.EmployeeStatus newStatus) {
        return new EmployeeStatusChangedEvent(source, employee, previousStatus, newStatus);
    }
}
