package com.nulogic.domain.compliance;

import com.nulogic.common.entity.TenantAware;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Idempotency tracking row for {@code PolicyAcknowledgmentReminderScheduler}: one row per
 * (tenant, policy, employee) recording when the employee was last reminded to acknowledge
 * a policy, so the daily job doesn't re-notify more often than the configured cadence.
 */
@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "policy_acknowledgment_reminders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PolicyAcknowledgmentReminder extends TenantAware {

    @Column(name = "policy_id", nullable = false)
    private UUID policyId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "last_reminded_at", nullable = false)
    private LocalDateTime lastRemindedAt;
}
