package com.hrms.domain.user;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

/**
 * Represents a rule that automatically assigns a role to users based on their
 * position in the organizational hierarchy.
 *
 * <p>Example: "All employees with direct reports get the 'Reporting Manager' role"
 *
 * <p>Rules are evaluated by the ImplicitRoleRuleEngine, which creates {@link ImplicitUserRole}
 * entries when conditions are met.
 */
@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "implicit_role_rules", indexes = {
        @Index(name = "idx_irr_tenant_active", columnList = "tenant_id,is_active"),
        @Index(name = "idx_irr_target_role", columnList = "target_role_id,is_active")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ImplicitRoleRule extends TenantAware {

    @Column(nullable = false, length = 255)
    private String ruleName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private ImplicitRoleCondition conditionType;

    @Column(nullable = false)
    private UUID targetRoleId;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private RoleScope scope = RoleScope.TEAM;

    @Column(nullable = false)
    @Builder.Default
    private Integer priority = 0;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @PrePersist
    protected void onCreate() {
        if (this.isActive == null) {
            this.isActive = true;
        }
        if (this.priority == null) {
            this.priority = 0;
        }
        if (this.scope == null) {
            this.scope = RoleScope.TEAM;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        if (this.isActive == null) {
            this.isActive = true;
        }
    }
}
