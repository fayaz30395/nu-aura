package com.nulogic.hrms.project.dto;

import com.nulogic.hrms.project.ProjectType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Data;

@Data
public class ProjectCreateRequest {
    @NotBlank(message = "Project name is required")
    private String name;

    @NotNull(message = "Project type is required")
    private ProjectType type;

    @NotNull(message = "Project owner is required")
    private UUID ownerId;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    private LocalDate endDate;

    private String clientName;

    private String description;
}
