package com.nulogic.domain.employee;

import com.nulogic.common.entity.TenantAware;
import com.nulogic.common.util.TenantTimestamp;
import com.nulogic.common.util.TimeAuditingEntityListener;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.Where;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Audit rows 27–29 of {@code backend/docs/audit/prepersist-now-audit.md} flagged
 * {@code createdAt} / {@code updatedAt} as defaulted from a server-default-zone
 * {@code LocalDateTime.now()} inside in-entity {@code @PrePersist} / {@code @PreUpdate}
 * callbacks. Both fields are now stamped by {@link TimeAuditingEntityListener} via
 * {@link TenantTimestamp}, which resolves the tenant's IANA zone through
 * {@code TenantTimeService}. {@code TenantEntityListener} runs first via the
 * {@link TenantAware} mapped superclass (JPA spec §3.5.4), so {@code tenantId} is
 * populated when the time-auditing listener reads it.
 */
@Where(clause = "is_deleted = false")
@Entity
@Table(name = "employee_skills", indexes = {
        @Index(name = "idx_emp_skill_tenant", columnList = "tenantId"),
        @Index(name = "idx_emp_skill_employee", columnList = "employeeId"),
        @Index(name = "idx_emp_skill_name", columnList = "skillName")
})
@EntityListeners(TimeAuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class EmployeeSkill extends TenantAware {

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "skill_name", nullable = false, length = 100)
    private String skillName;

    @Column(name = "category", length = 50)
    private String category;

    @Column(name = "proficiency_level", nullable = false)
    private Integer proficiencyLevel; // 1-5

    @Column(name = "years_of_experience")
    private Double yearsOfExperience;

    @Column(name = "last_used")
    private LocalDateTime lastUsed;

    @Column(name = "is_verified")
    @Builder.Default
    private Boolean isVerified = false;

    @Column(name = "verified_by")
    private UUID verifiedBy;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "source")
    private String source; // e.g., "SELF", "MANAGER", "COURSE_COMPLETION"

    @TenantTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @TenantTimestamp(updateOnChange = true)
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
