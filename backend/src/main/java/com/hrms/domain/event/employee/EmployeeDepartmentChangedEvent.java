package com.hrms.domain.event.employee;

import com.hrms.domain.employee.Employee;
import lombok.Getter;

import java.util.Map;
import java.util.UUID;

/**
 * Event raised when an employee's department changes (internal transfer).
 */
@Getter
public class EmployeeDepartmentChangedEvent extends EmployeeEvent {

    private final Employee employee;
    private final UUID previousDepartmentId;
    private final UUID newDepartmentId;
    private final UUID previousManagerId;
    private final UUID newManagerId;

    public EmployeeDepartmentChangedEvent(Object source, Employee employee,
                                          UUID previousDepartmentId, UUID newDepartmentId,
                                          UUID previousManagerId, UUID newManagerId) {
        super(source,
                employee.getTenantId(),
                employee.getId(),
                employee.getEmployeeCode(),
                employee.getFullName(),
                employee.getUser() != null ? employee.getUser().getEmail() : null);
        this.employee = employee;
        this.previousDepartmentId = previousDepartmentId;
        this.newDepartmentId = newDepartmentId;
        this.previousManagerId = previousManagerId;
        this.newManagerId = newManagerId;
    }

    /**
     * Factory method for creating the event.
     */
    public static EmployeeDepartmentChangedEvent of(Object source, Employee employee,
                                                    UUID previousDepartmentId, UUID newDepartmentId,
                                                    UUID previousManagerId, UUID newManagerId) {
        return new EmployeeDepartmentChangedEvent(source, employee,
                previousDepartmentId, newDepartmentId, previousManagerId, newManagerId);
    }

    @Override
    public String getEventType() {
        return "EMPLOYEE_DEPARTMENT_CHANGED";
    }

    @Override
    public Object getEventPayload() {
        Map<String, Object> payload = buildBasePayload(employee);
        if (previousDepartmentId != null) {
            payload.put("previousDepartmentId", previousDepartmentId.toString());
        }
        if (newDepartmentId != null) {
            payload.put("newDepartmentId", newDepartmentId.toString());
        }
        if (previousManagerId != null) {
            payload.put("previousManagerId", previousManagerId.toString());
        }
        if (newManagerId != null) {
            payload.put("newManagerId", newManagerId.toString());
        }
        return payload;
    }
}
