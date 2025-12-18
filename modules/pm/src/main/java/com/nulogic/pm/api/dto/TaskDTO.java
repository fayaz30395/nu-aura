package com.nulogic.pm.api.dto;

import com.nulogic.pm.domain.project.ProjectTask;
import com.nulogic.pm.domain.project.ProjectTask.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class TaskDTO {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {
        private UUID projectId;
        private String title;
        private String description;
        private TaskPriority priority;
        private TaskType type;
        private UUID assigneeId;
        private String assigneeName;
        private UUID reporterId;
        private String reporterName;
        private UUID parentTaskId;
        private UUID milestoneId;
        private LocalDate startDate;
        private LocalDate dueDate;
        private Integer estimatedHours;
        private Integer storyPoints;
        private String sprintName;
        private String tags;
        private String color;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        private String title;
        private String description;
        private TaskStatus status;
        private TaskPriority priority;
        private TaskType type;
        private UUID assigneeId;
        private String assigneeName;
        private UUID milestoneId;
        private LocalDate startDate;
        private LocalDate dueDate;
        private Integer estimatedHours;
        private Integer actualHours;
        private Integer progressPercentage;
        private Integer storyPoints;
        private String sprintName;
        private Integer sortOrder;
        private String tags;
        private String color;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private UUID id;
        private String taskCode;
        private UUID projectId;
        private String title;
        private String description;
        private TaskStatus status;
        private TaskPriority priority;
        private TaskType type;
        private UUID assigneeId;
        private String assigneeName;
        private UUID reporterId;
        private String reporterName;
        private UUID parentTaskId;
        private UUID milestoneId;
        private LocalDate startDate;
        private LocalDate dueDate;
        private LocalDate completedDate;
        private Integer estimatedHours;
        private Integer actualHours;
        private Integer progressPercentage;
        private Integer storyPoints;
        private String sprintName;
        private Integer sortOrder;
        private String tags;
        private String color;
        private boolean isOverdue;
        private boolean isSubtask;
        private Long subtaskCount;
        private Long commentCount;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        public static Response fromEntity(ProjectTask task) {
            return Response.builder()
                    .id(task.getId())
                    .taskCode(task.getTaskCode())
                    .projectId(task.getProjectId())
                    .title(task.getTitle())
                    .description(task.getDescription())
                    .status(task.getStatus())
                    .priority(task.getPriority())
                    .type(task.getType())
                    .assigneeId(task.getAssigneeId())
                    .assigneeName(task.getAssigneeName())
                    .reporterId(task.getReporterId())
                    .reporterName(task.getReporterName())
                    .parentTaskId(task.getParentTaskId())
                    .milestoneId(task.getMilestoneId())
                    .startDate(task.getStartDate())
                    .dueDate(task.getDueDate())
                    .completedDate(task.getCompletedDate())
                    .estimatedHours(task.getEstimatedHours())
                    .actualHours(task.getActualHours())
                    .progressPercentage(task.getProgressPercentage())
                    .storyPoints(task.getStoryPoints())
                    .sprintName(task.getSprintName())
                    .sortOrder(task.getSortOrder())
                    .tags(task.getTags())
                    .color(task.getColor())
                    .isOverdue(task.isOverdue())
                    .isSubtask(task.isSubtask())
                    .createdAt(task.getCreatedAt())
                    .updatedAt(task.getUpdatedAt())
                    .build();
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ListResponse {
        private UUID id;
        private String taskCode;
        private String title;
        private TaskStatus status;
        private TaskPriority priority;
        private TaskType type;
        private String assigneeName;
        private LocalDate dueDate;
        private Integer progressPercentage;
        private String color;
        private boolean isOverdue;
        private boolean isSubtask;

        public static ListResponse fromEntity(ProjectTask task) {
            return ListResponse.builder()
                    .id(task.getId())
                    .taskCode(task.getTaskCode())
                    .title(task.getTitle())
                    .status(task.getStatus())
                    .priority(task.getPriority())
                    .type(task.getType())
                    .assigneeName(task.getAssigneeName())
                    .dueDate(task.getDueDate())
                    .progressPercentage(task.getProgressPercentage())
                    .color(task.getColor())
                    .isOverdue(task.isOverdue())
                    .isSubtask(task.isSubtask())
                    .build();
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StatusUpdateRequest {
        private TaskStatus status;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssignRequest {
        private UUID assigneeId;
        private String assigneeName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LogTimeRequest {
        private Integer hours;
        private String description;
    }
}
