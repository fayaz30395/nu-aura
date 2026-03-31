package com.nulogic.pm.api.dto;

import com.nulogic.pm.domain.project.ProjectComment;
import com.nulogic.pm.domain.project.ProjectComment.CommentType;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class CommentDTO {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {
        private UUID projectId;
        private UUID taskId;
        private UUID milestoneId;
        private String content;
        private UUID parentCommentId;
        private CommentType type;
        private String mentions;
        private String attachments;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        private String content;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private UUID id;
        private UUID projectId;
        private UUID taskId;
        private UUID milestoneId;
        private UUID authorId;
        private String authorName;
        private String content;
        private UUID parentCommentId;
        private CommentType type;
        private Boolean isEdited;
        private Boolean isDeleted;
        private String mentions;
        private String attachments;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private List<Response> replies;

        public static Response fromEntity(ProjectComment comment) {
            return Response.builder()
                    .id(comment.getId())
                    .projectId(comment.getProjectId())
                    .taskId(comment.getTaskId())
                    .milestoneId(comment.getMilestoneId())
                    .authorId(comment.getAuthorId())
                    .authorName(comment.getAuthorName())
                    .content(comment.getContent())
                    .parentCommentId(comment.getParentCommentId())
                    .type(comment.getType())
                    .isEdited(comment.getIsEdited())
                    .isDeleted(comment.getIsDeleted())
                    .mentions(comment.getMentions())
                    .attachments(comment.getAttachments())
                    .createdAt(comment.getCreatedAt())
                    .updatedAt(comment.getUpdatedAt())
                    .build();
        }
    }
}
