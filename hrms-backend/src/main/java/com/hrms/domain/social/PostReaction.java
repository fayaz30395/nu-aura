package com.hrms.domain.social;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "post_reactions", indexes = {
        @Index(name = "idx_reaction_tenant", columnList = "tenant_id"),
        @Index(name = "idx_reaction_post", columnList = "tenant_id,post_id"),
        @Index(name = "idx_reaction_employee", columnList = "tenant_id,employee_id"),
        @Index(name = "idx_reaction_unique", columnList = "tenant_id,post_id,employee_id,reaction_type", unique = true)
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PostReaction {

    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "post_id")
    private UUID postId;

    @Column(name = "comment_id")
    private UUID commentId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "reaction_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ReactionType reactionType;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum ReactionType {
        LIKE,
        LOVE,
        CELEBRATE,
        SUPPORT,
        INSIGHTFUL,
        FUNNY
    }
}
