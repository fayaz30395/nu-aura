package com.nulogic.api.employee.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.UUID;

/**
 * Minimal directory view of an employee for callers who may see the person
 * but not their sensitive profile (S-002). Null fields are omitted from JSON.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record EmployeeMinimalResponse(
        UUID id,
        String employeeCode,
        String firstName,
        String lastName,
        String fullName,
        String designation,
        UUID departmentId,
        String departmentName,
        String workEmail
) {
    public static EmployeeMinimalResponse from(EmployeeResponse e) {
        return new EmployeeMinimalResponse(e.getId(), e.getEmployeeCode(), e.getFirstName(), e.getLastName(),
                e.getFullName(), e.getDesignation(), e.getDepartmentId(), e.getDepartmentName(), e.getWorkEmail());
    }
}
