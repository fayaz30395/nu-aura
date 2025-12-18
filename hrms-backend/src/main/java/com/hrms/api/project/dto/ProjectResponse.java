package com.hrms.api.project.dto;

import com.hrms.api.employee.dto.EmployeeResponse;
import com.hrms.domain.project.Project;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectResponse {

    private UUID id;
    private String projectCode;
    private String name;
    private String description;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate expectedEndDate;
    private Project.ProjectStatus status;
    private Project.Priority priority;
    private UUID projectManagerId;
    private String projectManagerName;
    private String clientName;
    private BigDecimal budget;
    private String currency;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<ProjectEmployeeResponse> teamMembers;

    public static ProjectResponse fromProject(Project project) {
        return ProjectResponse.builder()
                .id(project.getId())
                .projectCode(project.getProjectCode())
                .name(project.getName())
                .description(project.getDescription())
                .startDate(project.getStartDate())
                .endDate(project.getEndDate())
                .expectedEndDate(project.getExpectedEndDate())
                .status(project.getStatus())
                .priority(project.getPriority())
                .projectManagerId(project.getProjectManagerId())
                .clientName(project.getClientName())
                .budget(project.getBudget())
                .currency(project.getCurrency())
                .createdAt(project.getCreatedAt())
                .updatedAt(project.getUpdatedAt())
                .build();
    }
}
