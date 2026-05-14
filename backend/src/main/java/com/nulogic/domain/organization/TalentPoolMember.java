package com.nulogic.domain.organization;

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

import java.time.LocalDate;
import java.util.UUID;

/**
 * Migrated to {@link TimeAuditingEntityListener} — see
 * {@code backend/docs/architecture/timeprovider-seam-design.md} (Option B) and the audit at
 * {@code backend/docs/audit/prepersist-now-audit.md} row 15.
 *
 * <p>Previously {@code addedDate} was defaulted from a server-default-zone
 * {@code LocalDate.now()} inside an in-entity {@code @PrePersist}. The field is now stamped
 * by {@link TimeAuditingEntityListener} via {@link TenantTimestamp}, which resolves the
 * tenant's IANA zone through {@code TenantTimeService}. The remaining {@code @PrePersist}
 * exists solely to default {@code status} (non-time invariant).</p>
 */
@Where(clause = "is_deleted = false")
@Entity
@Table(name = "talent_pool_members",
        uniqueConstraints = @UniqueConstraint(columnNames = {"talent_pool_id", "employee_id"}))
@EntityListeners(TimeAuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class TalentPoolMember extends TenantAware {


    @Column(name = "talent_pool_id", nullable = false)
    private UUID talentPoolId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @TenantTimestamp
    private LocalDate addedDate;

    private UUID addedBy;

    @Enumerated(EnumType.STRING)
    private MemberStatus status;

    @Column(columnDefinition = "TEXT")
    private String notes;

    private LocalDate reviewDate;

    @PrePersist
    public void prePersist() {
        if (status == null) {
            status = MemberStatus.ACTIVE;
        }
    }

    public enum MemberStatus {
        ACTIVE,
        ON_HOLD,
        GRADUATED,
        REMOVED
    }
}
