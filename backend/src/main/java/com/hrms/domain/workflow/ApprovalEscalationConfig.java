package com.hrms.domain.workflow;

import com.hrms.common.entity.TenantAware;
import com.hrms.domain.user.EscalationType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

/**
 * Configures automatic escalation behavior for approval workflows.
 *
 * <p>When an approval request remains pending for longer than {@link #timeoutHours},
 * the system automatically escalates the task to a new approver determined by
 * the {@link #escalationType} strategy.
 *
 * <p>Examples:
 * <ul>
 *   <li>SKIP_LEVEL_MANAGER: escalate to the approver's manager
 *   <li>DEPARTMENT_HEAD: escalate to the requester's department head
 *   <li>SPECIFIC_ROLE: escalate to anyone with fallbackRoleId
 *   <li>SPECIFIC_USER: escalate directly to fallbackUserId
 * </ul>
 *
 * <p>The system tracks escalation count per approval instance to prevent infinite loops.
 */
@Entity
@Table(name = "approval_escalation_config")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ApprovalEscalationConfig extends TenantAware {

    @Column(nullable = false)
    private UUID workflowDefinitionId;

    @Column(nullable = false)
    @Builder.Default
    private Integer timeoutHours = 48;

    @Column(nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private EscalationType escalationType = EscalationType.SKIP_LEVEL_MANAGER;

    @Column
    private UUID fallbackRoleId;

    @Column
    private UUID fallbackUserId;

    @Column(nullable = false)
    @Builder.Default
    private Integer maxEscalations = 2;

    @Column(nullable = false)
    @Builder.Default
    private Boolean notifyOnEscalation = true;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @PrePersist
    protected void onCreate() {
        if (this.timeoutHours == null) {
            this.timeoutHours = 48;
        }
        if (this.escalationType == null) {
            this.escalationType = EscalationType.SKIP_LEVEL_MANAGER;
        }
        if (this.maxEscalations == null) {
            this.maxEscalations = 2;
        }
        if (this.notifyOnEscalation == null) {
            this.notifyOnEscalation = true;
        }
        if (this.isActive == null) {
            this.isActive = true;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        if (this.timeoutHours == null) {
            this.timeoutHours = 48;
        }
        if (this.escalationType == null) {
            this.escalationType = EscalationType.SKIP_LEVEL_MANAGER;
        }
        if (this.maxEscalations == null) {
            this.maxEscalations = 2;
        }
        if (this.notifyOnEscalation == null) {
            this.notifyOnEscalation = true;
        }
        if (this.isActive == null) {
            this.isActive = true;
        }
    }
}
