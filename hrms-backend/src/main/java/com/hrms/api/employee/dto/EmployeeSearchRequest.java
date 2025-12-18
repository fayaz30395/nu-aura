package com.hrms.api.employee.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeSearchRequest {

    // Text search
    private String searchTerm; // Searches in name, email, phone, employee code

    // Filters
    private List<UUID> departmentIds;
    private List<String> jobRoles;
    private List<String> levels;
    private List<String> employmentTypes;
    private List<String> statuses;
    private UUID managerId;

    // Pagination
    private Integer page = 0;
    private Integer size = 20;

    // Sorting
    private String sortBy = "fullName"; // fullName, employeeCode, joiningDate, department
    private String sortDirection = "ASC"; // ASC, DESC
}
