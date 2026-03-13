package com.hrms.domain.recognition;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "recognition_reactions",
       uniqueConstraints = @UniqueConstraint(columnNames = {"recognition_id", "employee_id", "reaction_type"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class RecognitionReaction extends TenantAware {


    @Column(name = "recognition_id", nullable = false)
    private UUID recognitionId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "reaction_type", nullable = false)
    private ReactionType reactionType;

    private LocalDateTime reactedAt;

    public enum ReactionType {
        LIKE,
        CELEBRATE,
        LOVE,
        INSIGHTFUL,
        CURIOUS
    }

    @PrePersist
    public void prePersist() {
        if (reactedAt == null) {
            reactedAt = LocalDateTime.now();
        }
    }
}
