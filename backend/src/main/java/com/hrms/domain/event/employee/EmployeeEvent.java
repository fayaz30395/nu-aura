package com.hrms.domain.event.employee;

import com.hrms.domain.employee.Employee;
import com.hrms.domain.event.DomainEvent;
import lombok.Getter;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Base class for all employee-related domain events.
 *
 * <p>Employee events capture significant lifecycle changes such as:
 * hiring, updates, promotions, terminations, and status changes.</p>
 */
@Getter
public abstract class EmployeeEvent extends DomainEvent {

    private final String employeeCode;
    private final String employeeName;
    private final String email;

    protected EmployeeEvent(Object source, UUID tenantId, UUID employeeId,
                            String employeeCode, String employeeName, String email) {
        super(source, tenantId, employeeId, "Employee");
        this.employeeCode = employeeCode;
        this.employeeName = employeeName;
        this.email = email;
    }

    /**
     * Create an employee event from an Employee entity.
     */
    protected static Map<String, Object> buildBasePayload(Employee employee) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("employeeId", employee.getId().toString());
        payload.put("employeeCode", employee.getEmployeeCode());
        payload.put("firstName", employee.getFirstName());
        payload.put("lastName", employee.getLastName());
        payload.put("fullName", employee.getFullName());
        payload.put("status", employee.getStatus().name());
        payload.put("employmentType", employee.getEmploymentType().name());
        if (employee.getDepartmentId() != null) {
            payload.put("departmentId", employee.getDepartmentId().toString());
        }
        if (employee.getManagerId() != null) {
            payload.put("managerId", employee.getManagerId().toString());
        }
        if (employee.getDesignation() != null) {
            payload.put("designation", employee.getDesignation());
        }
        if (employee.getLevel() != null) {
            payload.put("level", employee.getLevel().name());
        }
        if (employee.getJobRole() != null) {
            payload.put("jobRole", employee.getJobRole().name());
        }
        return payload;
    }
}
