package com.hrms.domain.user;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Represents a role that has been implicitly assigned to a user based on
 * organizational hierarchy (via {@link ImplicitRoleRule}).
 *
 * <p>Unlike explicit role assignments (in user_roles table), implicit roles
 * are computed dynamically and may expire or be recomputed if org chart changes.
 *
 * <p>Immutable audit trail: stores the rule that triggered the assignment,
 * the context (e.g., which manager caused this), and computation timestamp.
 */
@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "implicit_user_roles", indexes = {
        @Index(name = "idx_iur_user_active", columnList = "user_id,is_active"),
        @Index(name = "idx_iur_tenant_active", columnList = "tenant_id,is_active")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ImplicitUserRole extends TenantAware {

    @Column(nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private UUID roleId;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private RoleScope scope;

    @Column(nullable = false)
    private UUID derivedFromRuleId;

    @Column(length = 500)
    private String derivedFromContext;

    @Column(nullable = false)
    private LocalDateTime computedAt;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}
