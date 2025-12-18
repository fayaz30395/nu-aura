package com.nulogic.pm.api.dto;

import com.nulogic.pm.domain.project.Project;
import com.nulogic.pm.domain.project.Project.ProjectStatus;
import com.nulogic.pm.domain.project.Project.Priority;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class ProjectDTO {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {
        private String projectCode;
        private String name;
        private String description;
        private Priority priority;
        private UUID ownerId;
        private String ownerName;
        private LocalDate startDate;
        private LocalDate targetEndDate;
        private String clientName;
        private BigDecimal budget;
        private String currency;
        private String color;
        private String tags;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        private String name;
        private String description;
        private ProjectStatus status;
        private Priority priority;
        private UUID ownerId;
        private String ownerName;
        private LocalDate startDate;
        private LocalDate targetEndDate;
        private String clientName;
        private BigDecimal budget;
        private String currency;
        private String color;
        private String tags;
        private Integer progressPercentage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private UUID id;
        private String projectCode;
        private String name;
        private String description;
        private ProjectStatus status;
        private Priority priority;
        private UUID ownerId;
        private String ownerName;
        private LocalDate startDate;
        private LocalDate endDate;
        private LocalDate targetEndDate;
        private String clientName;
        private BigDecimal budget;
        private String currency;
        private Integer progressPercentage;
        private String color;
        private String tags;
        private Boolean isArchived;
        private boolean isOverdue;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        // Statistics
        private Long totalTasks;
        private Long completedTasks;
        private Long totalMembers;
        private Long totalMilestones;
        private Long completedMilestones;

        public static Response fromEntity(Project project) {
            return Response.builder()
                    .id(project.getId())
                    .projectCode(project.getProjectCode())
                    .name(project.getName())
                    .description(project.getDescription())
                    .status(project.getStatus())
                    .priority(project.getPriority())
                    .ownerId(project.getOwnerId())
                    .ownerName(project.getOwnerName())
                    .startDate(project.getStartDate())
                    .endDate(project.getEndDate())
                    .targetEndDate(project.getTargetEndDate())
                    .clientName(project.getClientName())
                    .budget(project.getBudget())
                    .currency(project.getCurrency())
                    .progressPercentage(project.getProgressPercentage())
                    .color(project.getColor())
                    .tags(project.getTags())
                    .isArchived(project.getIsArchived())
                    .isOverdue(project.isOverdue())
                    .createdAt(project.getCreatedAt())
                    .updatedAt(project.getUpdatedAt())
                    .build();
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ListResponse {
        private UUID id;
        private String projectCode;
        private String name;
        private ProjectStatus status;
        private Priority priority;
        private String ownerName;
        private LocalDate targetEndDate;
        private Integer progressPercentage;
        private String color;
        private boolean isOverdue;
        private Long totalTasks;
        private Long completedTasks;

        public static ListResponse fromEntity(Project project) {
            return ListResponse.builder()
                    .id(project.getId())
                    .projectCode(project.getProjectCode())
                    .name(project.getName())
                    .status(project.getStatus())
                    .priority(project.getPriority())
                    .ownerName(project.getOwnerName())
                    .targetEndDate(project.getTargetEndDate())
                    .progressPercentage(project.getProgressPercentage())
                    .color(project.getColor())
                    .isOverdue(project.isOverdue())
                    .build();
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Statistics {
        private long totalProjects;
        private long planningProjects;
        private long inProgressProjects;
        private long completedProjects;
        private long onHoldProjects;
        private long overdueProjects;
    }
}
