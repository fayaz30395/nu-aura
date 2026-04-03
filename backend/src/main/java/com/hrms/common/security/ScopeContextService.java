package com.hrms.common.security;

import com.hrms.domain.user.CustomScopeTarget;
import com.hrms.domain.user.RoleScope;
import com.hrms.domain.user.User;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.user.repository.CustomScopeTargetRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Service to load scope-related context data for the current user.
 * Handles loading of:
 * - All reportee IDs (direct + indirect) for TEAM scope
 * - Custom scope targets (employees, departments, locations) for CUSTOM scope
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ScopeContextService {

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final CustomScopeTargetRepository customScopeTargetRepository;

    /**
     * Load all reportee IDs (direct + indirect) for a manager.
     * Uses recursive hierarchy traversal up to 10 levels deep.
     */
    @Transactional(readOnly = true)
    public Set<UUID> loadAllReporteeIds(UUID tenantId, UUID managerId) {
        if (managerId == null) {
            return Collections.emptySet();
        }

        Set<UUID> allReportees = new HashSet<>();
        List<UUID> currentLevel = List.of(managerId);

        // Traverse the hierarchy up to 10 levels deep
        for (int i = 0; i < 10 && !currentLevel.isEmpty(); i++) {
            List<UUID> nextLevel = employeeRepository.findEmployeeIdsByManagerIds(tenantId, currentLevel);
            if (nextLevel.isEmpty()) {
                break;
            }
            allReportees.addAll(nextLevel);
            currentLevel = nextLevel;
        }

        log.debug("Loaded {} reportees for manager {}", allReportees.size(), managerId);
        return allReportees;
    }

    /**
     * Load custom scope targets for a user based on their role permissions.
     * Returns a map of permission code -> custom targets grouped by target type.
     */
    @Transactional(readOnly = true)
    public CustomScopeTargetData loadCustomScopeTargets(UUID userId, UUID tenantId) {
        CustomScopeTargetData data = new CustomScopeTargetData();

        // Get user with roles and permissions
        Optional<User> userOpt = userRepository.findByIdWithRolesAndPermissions(userId);
        if (userOpt.isEmpty()) {
            return data;
        }

        User user = userOpt.get();
        user.getRoles().forEach(role -> {
            role.getPermissions().stream()
                    .filter(rp -> rp.getScope() == RoleScope.CUSTOM)
                    .forEach(rp -> {
                        String permissionCode = rp.getPermission().getCode();

                        // Load custom targets for this role permission
                        List<CustomScopeTarget> targets = customScopeTargetRepository
                                .findByRolePermissionId(rp.getId());

                        targets.forEach(target -> {
                            switch (target.getTargetType()) {
                                case EMPLOYEE -> data.addEmployeeTarget(permissionCode, target.getTargetId());
                                case DEPARTMENT -> data.addDepartmentTarget(permissionCode, target.getTargetId());
                                case LOCATION -> data.addLocationTarget(permissionCode, target.getTargetId());
                            }
                        });
                    });
        });

        log.debug("Loaded custom scope targets for user {}: {} permissions with custom targets",
                userId, data.getPermissionsWithCustomTargets().size());
        return data;
    }

    /**
     * Populate SecurityContext with scope-related data for the current user.
     * Called during authentication filter processing.
     */
    @Transactional(readOnly = true)
    public void populateScopeContext(UUID userId, UUID employeeId, UUID tenantId,
                                     Map<String, RoleScope> permissionScopes) {
        // Load reportee IDs if user has any TEAM scope permissions
        boolean hasTeamScope = permissionScopes.values().stream()
                .anyMatch(scope -> scope == RoleScope.TEAM);

        if (hasTeamScope && employeeId != null) {
            Set<UUID> reporteeIds = loadAllReporteeIds(tenantId, employeeId);
            SecurityContext.setAllReporteeIds(reporteeIds);
        }

        // Load custom scope targets if user has any CUSTOM scope permissions
        boolean hasCustomScope = permissionScopes.values().stream()
                .anyMatch(scope -> scope == RoleScope.CUSTOM);

        if (hasCustomScope) {
            CustomScopeTargetData customTargets = loadCustomScopeTargets(userId, tenantId);

            // Set custom targets in SecurityContext for each permission
            customTargets.getPermissionsWithCustomTargets().forEach(permission -> {
                SecurityContext.setCustomScopeTargets(
                        permission,
                        customTargets.getEmployeeTargets(permission),
                        customTargets.getDepartmentTargets(permission),
                        customTargets.getLocationTargets(permission)
                );
            });
        }
    }

    /**
     * Data class to hold custom scope targets organized by permission and target type.
     * Note: This is a plain POJO (not a Spring bean), so @Transactional has no effect here.
     */
    public static class CustomScopeTargetData {
        private final Map<String, Set<UUID>> employeeTargets = new HashMap<>();
        private final Map<String, Set<UUID>> departmentTargets = new HashMap<>();
        private final Map<String, Set<UUID>> locationTargets = new HashMap<>();

        public void addEmployeeTarget(String permissionCode, UUID employeeId) {
            employeeTargets.computeIfAbsent(permissionCode, k -> new HashSet<>()).add(employeeId);
        }

        public void addDepartmentTarget(String permissionCode, UUID departmentId) {
            departmentTargets.computeIfAbsent(permissionCode, k -> new HashSet<>()).add(departmentId);
        }

        public void addLocationTarget(String permissionCode, UUID locationId) {
            locationTargets.computeIfAbsent(permissionCode, k -> new HashSet<>()).add(locationId);
        }

        public Set<UUID> getEmployeeTargets(String permissionCode) {
            return employeeTargets.getOrDefault(permissionCode, Collections.emptySet());
        }

        public Set<UUID> getDepartmentTargets(String permissionCode) {
            return departmentTargets.getOrDefault(permissionCode, Collections.emptySet());
        }

        public Set<UUID> getLocationTargets(String permissionCode) {
            return locationTargets.getOrDefault(permissionCode, Collections.emptySet());
        }

        public Set<String> getPermissionsWithCustomTargets() {
            Set<String> permissions = new HashSet<>();
            permissions.addAll(employeeTargets.keySet());
            permissions.addAll(departmentTargets.keySet());
            permissions.addAll(locationTargets.keySet());
            return permissions;
        }
    }
}
