package com.hrms.domain.social;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "post_mentions", indexes = {
        @Index(name = "idx_mention_tenant", columnList = "tenant_id"),
        @Index(name = "idx_mention_post", columnList = "tenant_id,post_id"),
        @Index(name = "idx_mention_employee", columnList = "tenant_id,mentioned_employee_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PostMention {

    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "post_id")
    private UUID postId;

    @Column(name = "comment_id")
    private UUID commentId;

    @Column(name = "mentioned_employee_id", nullable = false)
    private UUID mentionedEmployeeId;

    @Column(name = "is_read")
    private Boolean isRead;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
