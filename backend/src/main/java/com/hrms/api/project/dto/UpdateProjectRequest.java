package com.hrms.api.project.dto;

import com.hrms.domain.project.Project;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class UpdateProjectRequest {

    private String name;

    private String description;

    private LocalDate startDate;

    private LocalDate endDate;

    private LocalDate expectedEndDate;

    private Project.ProjectStatus status;

    private Project.Priority priority;

    private UUID projectManagerId;

    private String clientName;

    private BigDecimal budget;

    private String currency;
}
