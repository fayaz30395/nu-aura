package com.hrms.application.user.service;

import com.hrms.domain.user.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for merging permissions from multiple roles for a user.
 * Implements Keka-style RBAC rules:
 * - For each permission, use the most permissive scope (highest rank)
 * - For CUSTOM scope, union all custom targets from all roles
 *
 * Scope hierarchy (most to least permissive):
 * ALL (100) > LOCATION (80) > DEPARTMENT (60) > TEAM (40) > SELF (20) > CUSTOM (10)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PermissionScopeMerger {

    /**
     * Merge permissions from multiple roles into effective permissions map.
     * Key: permission code, Value: effective scope
     */
    public Map<String, RoleScope> mergePermissions(Set<Role> roles) {
        Map<String, RoleScope> effectivePermissions = new HashMap<>();

        for (Role role : roles) {
            for (RolePermission rp : role.getPermissions()) {
                String permCode = rp.getPermission().getCode();
                RoleScope newScope = rp.getScope();

                RoleScope existingScope = effectivePermissions.get(permCode);
                if (existingScope == null || newScope.isMorePermissiveThan(existingScope)) {
                    effectivePermissions.put(permCode, newScope);
                }
            }
        }

        log.debug("Merged {} permissions from {} roles", effectivePermissions.size(), roles.size());
        return effectivePermissions;
    }

    /**
     * Merge custom targets for a specific permission from multiple roles.
     * Returns a merged result with union of all targets by type.
     */
    public MergedCustomTargets mergeCustomTargets(Set<Role> roles, String permissionCode) {
        Set<UUID> employeeIds = new HashSet<>();
        Set<UUID> departmentIds = new HashSet<>();
        Set<UUID> locationIds = new HashSet<>();

        for (Role role : roles) {
            for (RolePermission rp : role.getPermissions()) {
                if (rp.getPermission().getCode().equals(permissionCode) &&
                    rp.getScope() == RoleScope.CUSTOM) {

                    for (CustomScopeTarget target : rp.getCustomTargets()) {
                        switch (target.getTargetType()) {
                            case EMPLOYEE -> employeeIds.add(target.getTargetId());
                            case DEPARTMENT -> departmentIds.add(target.getTargetId());
                            case LOCATION -> locationIds.add(target.getTargetId());
                        }
                    }
                }
            }
        }

        return new MergedCustomTargets(employeeIds, departmentIds, locationIds);
    }

    /**
     * Get all merged custom targets for all CUSTOM-scoped permissions.
     * Key: permission code, Value: merged custom targets
     */
    @Transactional(readOnly = true)
    public Map<String, MergedCustomTargets> getAllMergedCustomTargets(Set<Role> roles) {
        Map<String, MergedCustomTargets> result = new HashMap<>();

        // Find all permissions that have CUSTOM scope in any role
        Set<String> customScopePermissions = roles.stream()
                .flatMap(r -> r.getPermissions().stream())
                .filter(rp -> rp.getScope() == RoleScope.CUSTOM)
                .map(rp -> rp.getPermission().getCode())
                .collect(Collectors.toSet());

        // Merge custom targets for each such permission
        for (String permCode : customScopePermissions) {
            result.put(permCode, mergeCustomTargets(roles, permCode));
        }

        return result;
    }

    /**
     * Compute the effective scope for a permission, considering all roles.
     * If any role has a more permissive scope, that wins.
     * If the effective scope is CUSTOM, also merges custom targets.
     */
    @Transactional(readOnly = true)
    public EffectivePermission computeEffectivePermission(Set<Role> roles, String permissionCode) {
        RoleScope effectiveScope = null;
        boolean hasPermission = false;

        for (Role role : roles) {
            for (RolePermission rp : role.getPermissions()) {
                if (rp.getPermission().getCode().equals(permissionCode)) {
                    hasPermission = true;
                    if (effectiveScope == null || rp.getScope().isMorePermissiveThan(effectiveScope)) {
                        effectiveScope = rp.getScope();
                    }
                }
            }
        }

        if (!hasPermission) {
            return null;
        }

        MergedCustomTargets customTargets = null;
        if (effectiveScope == RoleScope.CUSTOM) {
            customTargets = mergeCustomTargets(roles, permissionCode);
        }

        return new EffectivePermission(permissionCode, effectiveScope, customTargets);
    }

    /**
     * Container for merged custom targets by type.
     */
    public record MergedCustomTargets(
            Set<UUID> employeeIds,
            Set<UUID> departmentIds,
            Set<UUID> locationIds
    ) {
        public boolean isEmpty() {
            return (employeeIds == null || employeeIds.isEmpty()) &&
                   (departmentIds == null || departmentIds.isEmpty()) &&
                   (locationIds == null || locationIds.isEmpty());
        }
    }

    /**
     * Container for effective permission with scope and merged custom targets.
     */
    public record EffectivePermission(
            String permissionCode,
            RoleScope scope,
            MergedCustomTargets customTargets
    ) {}
}
