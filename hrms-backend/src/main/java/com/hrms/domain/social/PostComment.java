package com.hrms.domain.social;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "post_comments", indexes = {
        @Index(name = "idx_comment_tenant", columnList = "tenant_id"),
        @Index(name = "idx_comment_post", columnList = "tenant_id,post_id"),
        @Index(name = "idx_comment_author", columnList = "tenant_id,author_id"),
        @Index(name = "idx_comment_parent", columnList = "parent_comment_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PostComment {

    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "post_id", nullable = false)
    private UUID postId;

    @Column(name = "author_id", nullable = false)
    private UUID authorId;

    @Column(name = "parent_comment_id")
    private UUID parentCommentId; // For nested comments/replies

    @Column(name = "content", columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "likes_count")
    private Integer likesCount;

    @Column(name = "is_edited")
    private Boolean isEdited;

    @Column(name = "edited_at")
    private LocalDateTime editedAt;

    @Column(name = "is_deleted")
    private Boolean isDeleted;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
