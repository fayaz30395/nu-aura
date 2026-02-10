package com.hrms.domain.event.employee;

import com.hrms.domain.employee.Employee;
import lombok.Getter;

import java.util.Map;

/**
 * Event raised when an employee is promoted.
 *
 * <p>A promotion includes changes to:</p>
 * <ul>
 *   <li>Level (e.g., SENIOR → LEAD)</li>
 *   <li>Designation/Title</li>
 *   <li>Department (lateral promotion)</li>
 *   <li>Manager (new reporting structure)</li>
 * </ul>
 */
@Getter
public class EmployeePromotedEvent extends EmployeeEvent {

    private final Employee employee;
    private final String previousDesignation;
    private final String newDesignation;
    private final Employee.EmployeeLevel previousLevel;
    private final Employee.EmployeeLevel newLevel;

    public EmployeePromotedEvent(Object source, Employee employee,
                                 String previousDesignation, String newDesignation,
                                 Employee.EmployeeLevel previousLevel,
                                 Employee.EmployeeLevel newLevel) {
        super(source,
              employee.getTenantId(),
              employee.getId(),
              employee.getEmployeeCode(),
              employee.getFullName(),
              employee.getUser() != null ? employee.getUser().getEmail() : null);
        this.employee = employee;
        this.previousDesignation = previousDesignation;
        this.newDesignation = newDesignation;
        this.previousLevel = previousLevel;
        this.newLevel = newLevel;
    }

    @Override
    public String getEventType() {
        return "EMPLOYEE_PROMOTED";
    }

    @Override
    public Object getEventPayload() {
        Map<String, Object> payload = buildBasePayload(employee);
        payload.put("previousDesignation", previousDesignation);
        payload.put("newDesignation", newDesignation);
        if (previousLevel != null) {
            payload.put("previousLevel", previousLevel.name());
        }
        if (newLevel != null) {
            payload.put("newLevel", newLevel.name());
        }
        return payload;
    }

    /**
     * Factory method for creating the event.
     */
    public static EmployeePromotedEvent of(Object source, Employee employee,
                                           String previousDesignation, String newDesignation,
                                           Employee.EmployeeLevel previousLevel,
                                           Employee.EmployeeLevel newLevel) {
        return new EmployeePromotedEvent(source, employee, previousDesignation, newDesignation,
                                        previousLevel, newLevel);
    }
}
