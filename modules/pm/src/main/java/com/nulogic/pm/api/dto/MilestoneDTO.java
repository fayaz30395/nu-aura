package com.nulogic.pm.api.dto;

import com.nulogic.pm.domain.project.ProjectMilestone;
import com.nulogic.pm.domain.project.ProjectMilestone.MilestoneStatus;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class MilestoneDTO {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {
        private UUID projectId;
        private String name;
        private String description;
        private LocalDate startDate;
        private LocalDate dueDate;
        private UUID ownerId;
        private String ownerName;
        private String color;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        private String name;
        private String description;
        private MilestoneStatus status;
        private LocalDate startDate;
        private LocalDate dueDate;
        private UUID ownerId;
        private String ownerName;
        private Integer progressPercentage;
        private Integer sortOrder;
        private String color;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private UUID id;
        private UUID projectId;
        private String name;
        private String description;
        private MilestoneStatus status;
        private LocalDate startDate;
        private LocalDate dueDate;
        private LocalDate completedDate;
        private Integer progressPercentage;
        private UUID ownerId;
        private String ownerName;
        private Integer sortOrder;
        private String color;
        private boolean isOverdue;
        private Long totalTasks;
        private Long completedTasks;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        public static Response fromEntity(ProjectMilestone milestone) {
            return Response.builder()
                    .id(milestone.getId())
                    .projectId(milestone.getProjectId())
                    .name(milestone.getName())
                    .description(milestone.getDescription())
                    .status(milestone.getStatus())
                    .startDate(milestone.getStartDate())
                    .dueDate(milestone.getDueDate())
                    .completedDate(milestone.getCompletedDate())
                    .progressPercentage(milestone.getProgressPercentage())
                    .ownerId(milestone.getOwnerId())
                    .ownerName(milestone.getOwnerName())
                    .sortOrder(milestone.getSortOrder())
                    .color(milestone.getColor())
                    .isOverdue(milestone.isOverdue())
                    .createdAt(milestone.getCreatedAt())
                    .updatedAt(milestone.getUpdatedAt())
                    .build();
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ListResponse {
        private UUID id;
        private String name;
        private MilestoneStatus status;
        private LocalDate dueDate;
        private Integer progressPercentage;
        private String color;
        private boolean isOverdue;

        public static ListResponse fromEntity(ProjectMilestone milestone) {
            return ListResponse.builder()
                    .id(milestone.getId())
                    .name(milestone.getName())
                    .status(milestone.getStatus())
                    .dueDate(milestone.getDueDate())
                    .progressPercentage(milestone.getProgressPercentage())
                    .color(milestone.getColor())
                    .isOverdue(milestone.isOverdue())
                    .build();
        }
    }
}
