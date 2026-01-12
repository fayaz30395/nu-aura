package com.hrms.api.employee.dto;

import com.hrms.domain.employee.Department;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentResponse {

    private UUID id;
    private String code;
    private String name;
    private String description;
    private UUID parentDepartmentId;
    private String parentDepartmentName;
    private UUID managerId;
    private String managerName;
    private Boolean isActive;
    private String location;
    private String costCenter;
    private Department.DepartmentType type;
    private Long employeeCount;
    private Long subDepartmentCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // For hierarchical structure
    @Builder.Default
    private List<DepartmentResponse> subDepartments = new ArrayList<>();

    public static DepartmentResponse fromDepartment(Department department) {
        return DepartmentResponse.builder()
                .id(department.getId())
                .code(department.getCode())
                .name(department.getName())
                .description(department.getDescription())
                .parentDepartmentId(department.getParentDepartmentId())
                .managerId(department.getManagerId())
                .isActive(department.getIsActive())
                .location(department.getLocation())
                .costCenter(department.getCostCenter())
                .type(department.getType())
                .createdAt(department.getCreatedAt())
                .updatedAt(department.getUpdatedAt())
                .build();
    }
}
