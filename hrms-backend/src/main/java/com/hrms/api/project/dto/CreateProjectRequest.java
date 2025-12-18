package com.hrms.api.project.dto;

import com.hrms.domain.project.Project;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class CreateProjectRequest {

    @NotBlank(message = "Project code is required")
    private String projectCode;

    @NotBlank(message = "Project name is required")
    private String name;

    private String description;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    private LocalDate expectedEndDate;

    @NotNull(message = "Status is required")
    private Project.ProjectStatus status;

    @NotNull(message = "Priority is required")
    private Project.Priority priority;

    private UUID projectManagerId;

    private String clientName;

    private BigDecimal budget;

    private String currency;
}
