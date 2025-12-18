package com.nulogic.pm.domain.project;

import com.nulogic.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity(name = "PmProjectComment")
@Table(name = "project_comments", schema = "pm", indexes = {
    @Index(name = "idx_pm_comment_tenant", columnList = "tenantId"),
    @Index(name = "idx_pm_comment_project", columnList = "projectId"),
    @Index(name = "idx_pm_comment_task", columnList = "taskId"),
    @Index(name = "idx_pm_comment_author", columnList = "authorId"),
    @Index(name = "idx_pm_comment_parent", columnList = "parentCommentId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectComment extends TenantAware {

    @Column(nullable = false)
    private UUID projectId;

    @Column
    private UUID taskId;

    @Column
    private UUID milestoneId;

    @Column(nullable = false)
    private UUID authorId;

    @Column(length = 200)
    private String authorName;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column
    private UUID parentCommentId;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private CommentType type = CommentType.COMMENT;

    @Column
    @Builder.Default
    private Boolean isEdited = false;

    @Column
    @Builder.Default
    private Boolean isDeleted = false;

    @Column(length = 500)
    private String mentions;

    @Column(length = 500)
    private String attachments;

    public enum CommentType {
        COMMENT,
        STATUS_CHANGE,
        ASSIGNMENT,
        MENTION,
        SYSTEM
    }

    public void edit(String newContent) {
        this.content = newContent;
        this.isEdited = true;
    }

    public void softDelete() {
        this.isDeleted = true;
        this.content = "[Deleted]";
    }

    public boolean isReply() {
        return parentCommentId != null;
    }

    public boolean isTaskComment() {
        return taskId != null;
    }

    public boolean isMilestoneComment() {
        return milestoneId != null;
    }
}
