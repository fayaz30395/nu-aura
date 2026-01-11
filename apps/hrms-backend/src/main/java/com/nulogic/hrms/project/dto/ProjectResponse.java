package com.nulogic.hrms.project.dto;

import com.nulogic.hrms.project.ProjectStatus;
import com.nulogic.hrms.project.ProjectType;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ProjectResponse {
    UUID id;
    String projectCode;
    String name;
    ProjectType type;
    ProjectStatus status;
    UUID ownerId;
    String ownerName;
    String ownerEmployeeCode;
    String ownerEmail;
    LocalDate startDate;
    LocalDate endDate;
    String clientName;
    String description;
    OffsetDateTime activatedAt;
    OffsetDateTime closedAt;
    OffsetDateTime createdAt;
    OffsetDateTime updatedAt;
}
