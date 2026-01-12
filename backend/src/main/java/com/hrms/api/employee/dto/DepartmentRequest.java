package com.hrms.api.employee.dto;

import com.hrms.domain.employee.Department;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.UUID;

@Data
public class DepartmentRequest {

    @NotBlank(message = "Department code is required")
    private String code;

    @NotBlank(message = "Department name is required")
    private String name;

    private String description;

    private UUID parentDepartmentId;

    private UUID managerId;

    private Boolean isActive;

    private String location;

    private String costCenter;

    private Department.DepartmentType type;
}
