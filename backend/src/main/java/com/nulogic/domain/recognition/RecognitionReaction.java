package com.nulogic.domain.recognition;

import com.nulogic.common.entity.TenantAware;
import com.nulogic.common.util.TenantTimestamp;
import com.nulogic.common.util.TimeAuditingEntityListener;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.Where;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Pilot entity for the {@link TimeAuditingEntityListener} rollout — see
 * {@code backend/docs/architecture/timeprovider-seam-design.md} (Option B) and the audit at
 * {@code backend/docs/audit/prepersist-now-audit.md} row 21.
 *
 * <p>Previously {@code reactedAt} was defaulted from a server-default-zone
 * {@code LocalDateTime.now()} inside an in-entity {@code @PrePersist}. The field is now
 * stamped by {@link TimeAuditingEntityListener} via {@link TenantTimestamp}, which
 * resolves the tenant's IANA zone through {@code TenantTimeService}.</p>
 */
@Where(clause = "is_deleted = false")
@Entity
@Table(name = "recognition_reactions",
        uniqueConstraints = @UniqueConstraint(columnNames = {"recognition_id", "employee_id", "reaction_type"}))
@EntityListeners(TimeAuditingEntityListener.class)
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

    @TenantTimestamp
    private LocalDateTime reactedAt;

    public enum ReactionType {
        LIKE,
        CELEBRATE,
        LOVE,
        INSIGHTFUL,
        CURIOUS
    }
}
