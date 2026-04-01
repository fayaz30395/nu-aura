package com.hrms.domain.user;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

/**
 * Represents a custom scope target for a role permission.
 * When a permission has CUSTOM scope, this entity stores the specific
 * employees, departments, or locations that the permission grants access to.
 */
@Where(clause = "is_deleted = false")
@Entity
@Table(name = "custom_scope_targets", indexes = {
        @Index(name = "idx_custom_scope_target_role_permission", columnList = "role_permission_id"),
        @Index(name = "idx_custom_scope_target_type_id", columnList = "target_type, target_id")
}, uniqueConstraints = {
        @UniqueConstraint(
                name = "uk_custom_scope_target",
                columnNames = {"role_permission_id", "target_type", "target_id"}
        )
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CustomScopeTarget extends TenantAware {

    /**
     * The role permission this custom target belongs to.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_permission_id", nullable = false)
    private RolePermission rolePermission;

    /**
     * The type of target (EMPLOYEE, DEPARTMENT, or LOCATION).
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 20)
    private TargetType targetType;

    /**
     * The UUID of the target entity (employee ID, department ID, or location ID).
     */
    @Column(name = "target_id", nullable = false)
    private UUID targetId;

    @PrePersist
    private void applyTenantFromRolePermission() {
        if (getTenantId() == null && rolePermission != null) {
            setTenantId(rolePermission.getTenantId());
        }
    }

    /**
     * Creates a custom target for a specific employee.
     */
    public static CustomScopeTarget forEmployee(UUID employeeId) {
        return CustomScopeTarget.builder()
                .targetType(TargetType.EMPLOYEE)
                .targetId(employeeId)
                .build();
    }

    /**
     * Creates a custom target for a department.
     */
    public static CustomScopeTarget forDepartment(UUID departmentId) {
        return CustomScopeTarget.builder()
                .targetType(TargetType.DEPARTMENT)
                .targetId(departmentId)
                .build();
    }

    /**
     * Creates a custom target for a location.
     */
    public static CustomScopeTarget forLocation(UUID locationId) {
        return CustomScopeTarget.builder()
                .targetType(TargetType.LOCATION)
                .targetId(locationId)
                .build();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof CustomScopeTarget that)) return false;
        return targetType == that.targetType &&
               targetId != null && targetId.equals(that.targetId) &&
               rolePermission != null && rolePermission.getId() != null &&
               rolePermission.getId().equals(that.rolePermission != null ? that.rolePermission.getId() : null);
    }

    @Override
    public int hashCode() {
        int result = targetType != null ? targetType.hashCode() : 0;
        result = 31 * result + (targetId != null ? targetId.hashCode() : 0);
        return result;
    }
}
