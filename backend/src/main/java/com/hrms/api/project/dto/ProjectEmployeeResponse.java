package com.hrms.api.project.dto;

import com.hrms.domain.project.ProjectEmployee;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectEmployeeResponse {

    private UUID id;
    private UUID projectId;
    private String projectName;
    private UUID employeeId;
    private String employeeName;
    private String employeeCode;
    private String role;
    private Integer allocationPercentage;
    private LocalDate startDate;
    private LocalDate endDate;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ProjectEmployeeResponse fromProjectEmployee(ProjectEmployee projectEmployee) {
        return ProjectEmployeeResponse.builder()
                .id(projectEmployee.getId())
                .projectId(projectEmployee.getProjectId())
                .employeeId(projectEmployee.getEmployeeId())
                .role(projectEmployee.getRole())
                .allocationPercentage(projectEmployee.getAllocationPercentage())
                .startDate(projectEmployee.getStartDate())
                .endDate(projectEmployee.getEndDate())
                .isActive(projectEmployee.getIsActive())
                .createdAt(projectEmployee.getCreatedAt())
                .updatedAt(projectEmployee.getUpdatedAt())
                .build();
    }
}
