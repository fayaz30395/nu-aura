package com.hrms.application.user.service;

import com.hrms.domain.user.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for PermissionScopeMerger.
 * Tests Keka-style RBAC permission merging across multiple roles.
 */
class PermissionScopeMergerTest {

    private PermissionScopeMerger merger;

    @BeforeEach
    void setUp() {
        merger = new PermissionScopeMerger();
    }

    @Test
    @DisplayName("Most permissive scope should win when merging")
    void testMergePermissions_MostPermissiveScopeWins() {
        // Create permission
        Permission employeeView = createPermission("EMPLOYEE:VIEW");

        // Role 1: EMPLOYEE:VIEW with SELF scope
        Role role1 = createRole("ROLE_1");
        RolePermission rp1 = createRolePermission(role1, employeeView, RoleScope.SELF);
        role1.getPermissions().add(rp1);

        // Role 2: EMPLOYEE:VIEW with DEPARTMENT scope (more permissive)
        Role role2 = createRole("ROLE_2");
        RolePermission rp2 = createRolePermission(role2, employeeView, RoleScope.DEPARTMENT);
        role2.getPermissions().add(rp2);

        // Test
        Map<String, RoleScope> merged = merger.mergePermissions(Set.of(role1, role2));

        // Verify - DEPARTMENT scope should win
        assertThat(merged).containsEntry("EMPLOYEE:VIEW", RoleScope.DEPARTMENT);
    }

    @Test
    @DisplayName("ALL scope should win over all other scopes")
    void testMergePermissions_AllScopeWins() {
        Permission employeeView = createPermission("EMPLOYEE:VIEW");

        Role role1 = createRole("ROLE_1");
        role1.getPermissions().add(createRolePermission(role1, employeeView, RoleScope.TEAM));

        Role role2 = createRole("ROLE_2");
        role2.getPermissions().add(createRolePermission(role1, employeeView, RoleScope.ALL));

        Map<String, RoleScope> merged = merger.mergePermissions(Set.of(role1, role2));

        assertThat(merged).containsEntry("EMPLOYEE:VIEW", RoleScope.ALL);
    }

    @Test
    @DisplayName("CUSTOM scope targets should be unioned from all roles")
    void testMergeCustomTargets_UnionsTargets() {
        Permission employeeView = createPermission("EMPLOYEE:VIEW");

        UUID emp1 = UUID.randomUUID();
        UUID emp2 = UUID.randomUUID();
        UUID dept1 = UUID.randomUUID();

        // Role 1: CUSTOM scope with employee 1
        Role role1 = createRole("ROLE_1");
        RolePermission rp1 = createRolePermission(role1, employeeView, RoleScope.CUSTOM);
        rp1.addCustomTarget(CustomScopeTarget.forEmployee(emp1));
        role1.getPermissions().add(rp1);

        // Role 2: CUSTOM scope with employee 2 and department 1
        Role role2 = createRole("ROLE_2");
        RolePermission rp2 = createRolePermission(role2, employeeView, RoleScope.CUSTOM);
        rp2.addCustomTarget(CustomScopeTarget.forEmployee(emp2));
        rp2.addCustomTarget(CustomScopeTarget.forDepartment(dept1));
        role2.getPermissions().add(rp2);

        // Test
        PermissionScopeMerger.MergedCustomTargets targets = merger.mergeCustomTargets(
                Set.of(role1, role2), "EMPLOYEE:VIEW");

        // Verify - both employees and department should be included
        assertThat(targets.employeeIds()).containsExactlyInAnyOrder(emp1, emp2);
        assertThat(targets.departmentIds()).containsExactly(dept1);
    }

    @Test
    @DisplayName("computeEffectivePermission should return correct scope and targets")
    void testComputeEffectivePermission_ReturnsCorrectResult() {
        Permission employeeView = createPermission("EMPLOYEE:VIEW");

        UUID emp1 = UUID.randomUUID();

        Role role1 = createRole("ROLE_1");
        RolePermission rp1 = createRolePermission(role1, employeeView, RoleScope.CUSTOM);
        rp1.addCustomTarget(CustomScopeTarget.forEmployee(emp1));
        role1.getPermissions().add(rp1);

        // Test
        PermissionScopeMerger.EffectivePermission effective = merger.computeEffectivePermission(
                Set.of(role1), "EMPLOYEE:VIEW");

        // Verify
        assertThat(effective).isNotNull();
        assertThat(effective.permissionCode()).isEqualTo("EMPLOYEE:VIEW");
        assertThat(effective.scope()).isEqualTo(RoleScope.CUSTOM);
        assertThat(effective.customTargets()).isNotNull();
        assertThat(effective.customTargets().employeeIds()).contains(emp1);
    }

    @Test
    @DisplayName("computeEffectivePermission should return null for non-existent permission")
    void testComputeEffectivePermission_ReturnsNullForNonExistent() {
        Role role1 = createRole("ROLE_1");

        PermissionScopeMerger.EffectivePermission effective = merger.computeEffectivePermission(
                Set.of(role1), "NONEXISTENT:VIEW");

        assertThat(effective).isNull();
    }

    @Test
    @DisplayName("Scope hierarchy should be: ALL > LOCATION > DEPARTMENT > TEAM > SELF > CUSTOM")
    void testScopeHierarchy() {
        assertThat(RoleScope.ALL.isMorePermissiveThan(RoleScope.LOCATION)).isTrue();
        assertThat(RoleScope.LOCATION.isMorePermissiveThan(RoleScope.DEPARTMENT)).isTrue();
        assertThat(RoleScope.DEPARTMENT.isMorePermissiveThan(RoleScope.TEAM)).isTrue();
        assertThat(RoleScope.TEAM.isMorePermissiveThan(RoleScope.SELF)).isTrue();
        assertThat(RoleScope.SELF.isMorePermissiveThan(RoleScope.CUSTOM)).isTrue();

        // Reverse should be false
        assertThat(RoleScope.CUSTOM.isMorePermissiveThan(RoleScope.ALL)).isFalse();
        assertThat(RoleScope.SELF.isMorePermissiveThan(RoleScope.TEAM)).isFalse();
    }

    // Helper methods
    private Permission createPermission(String code) {
        Permission permission = new Permission();
        permission.setId(UUID.randomUUID());
        permission.setCode(code);
        permission.setName(code);
        return permission;
    }

    private Role createRole(String code) {
        Role role = new Role();
        role.setId(UUID.randomUUID());
        role.setCode(code);
        role.setName(code);
        role.setPermissions(new HashSet<>());
        return role;
    }

    private RolePermission createRolePermission(Role role, Permission permission, RoleScope scope) {
        return RolePermission.builder()
                .role(role)
                .permission(permission)
                .scope(scope)
                .build();
    }
}
