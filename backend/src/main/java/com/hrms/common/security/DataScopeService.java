package com.hrms.common.security;

import com.hrms.domain.user.RoleScope;
import jakarta.persistence.criteria.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Service to generate JPA Specifications based on User's RoleScope.
 * Implements Keka-style row-level security in the application layer.
 *
 * Scope Hierarchy (Most to Least Permissive):
 * ALL > LOCATION > DEPARTMENT > TEAM > SELF > CUSTOM
 */
@Service
@Slf4j
public class DataScopeService {

    /**
     * Creates a JPA Specification to filter data based on the user's scope for a
     * specific permission.
     *
     * @param permission The permission being checked (e.g. "ATTENDANCE:VIEW")
     * @param <T>        The entity type
     * @return Specification to filter query results
     */
    public <T> Specification<T> getScopeSpecification(String permission) {
        return (root, query, cb) -> {
            // 0. SuperAdmin role bypasses ALL permission checks (per CLAUDE.md non-negotiable rule).
            //    This also handles permission format mismatches (dot vs colon notation).
            if (SecurityContext.isSuperAdmin()) {
                return cb.conjunction();
            }

            // 1. Get current Max Scope for this permission
            RoleScope scope = SecurityContext.getPermissionScope(permission);
            if (scope == null) {
                log.debug("No scope found for permission: {}", permission);
                return cb.disjunction(); // No access
            }

            // 2. SYSTEM_ADMIN or ALL scope -> No Filter (also handle legacy GLOBAL)
            if (SecurityContext.isSystemAdmin() || scope == RoleScope.ALL) {
                return cb.conjunction();
            }

            // 3. Apply Filters based on Scope
            return switch (scope) {
                case LOCATION -> getLocationPredicate(root, cb);
                case DEPARTMENT -> getDepartmentPredicate(root, cb);
                case TEAM -> getTeamPredicate(root, cb, permission);
                case SELF -> getSelfPredicate(root, cb);
                case CUSTOM -> getCustomPredicate(root, cb, permission);
                default -> cb.disjunction();
            };
        };
    }

    /**
     * Creates a specification that filters by both scope AND additional conditions.
     * Useful when you need to combine scope filtering with other business logic.
     */
    public <T> Specification<T> getScopeSpecificationWith(String permission, Specification<T> additionalSpec) {
        Specification<T> scopeSpec = getScopeSpecification(permission);
        return Specification.where(scopeSpec).and(additionalSpec);
    }

    /**
     * LOCATION scope: Filter by user's office location(s).
     * Checks for 'officeLocationId' or 'locationId' fields.
     */
    private Predicate getLocationPredicate(Root<?> root, CriteriaBuilder cb) {
        UUID locationId = SecurityContext.getCurrentLocationId();
        Set<UUID> locationIds = SecurityContext.getCurrentLocationIds();

        // Support multiple locations
        if (locationIds != null && !locationIds.isEmpty()) {
            return getLocationInPredicate(root, cb, locationIds);
        }

        // Fallback to single location
        if (locationId == null) {
            log.debug("No location context for LOCATION scope");
            return cb.disjunction();
        }

        return getLocationEqualPredicate(root, cb, locationId);
    }

    private Predicate getLocationInPredicate(Root<?> root, CriteriaBuilder cb, Set<UUID> locationIds) {
        try {
            return root.get("officeLocationId").in(locationIds);
        } catch (IllegalArgumentException e) {
            try {
                return root.get("locationId").in(locationIds);
            } catch (IllegalArgumentException e2) {
                return cb.disjunction();
            }
        }
    }

    private Predicate getLocationEqualPredicate(Root<?> root, CriteriaBuilder cb, UUID locationId) {
        try {
            return cb.equal(root.get("officeLocationId"), locationId);
        } catch (IllegalArgumentException e) {
            try {
                return cb.equal(root.get("locationId"), locationId);
            } catch (IllegalArgumentException e2) {
                return cb.disjunction();
            }
        }
    }

    /**
     * DEPARTMENT scope: Filter by user's department.
     */
    private Predicate getDepartmentPredicate(Root<?> root, CriteriaBuilder cb) {
        UUID deptId = SecurityContext.getCurrentDepartmentId();
        if (deptId == null) {
            log.debug("No department context for DEPARTMENT scope");
            return cb.disjunction();
        }
        try {
            return cb.equal(root.get("departmentId"), deptId);
        } catch (IllegalArgumentException e) {
            try {
                return cb.equal(root.get("department").get("id"), deptId);
            } catch (IllegalArgumentException e2) {
                return cb.disjunction();
            }
        }
    }

    /**
     * TEAM scope: Filter by direct AND indirect reports (full team hierarchy).
     * This includes:
     * - Direct reports (employees where user is managerId)
     * - Indirect reports (employees in the reporting chain below direct reports)
     * - User's own data
     */
    private Predicate getTeamPredicate(Root<?> root, CriteriaBuilder cb, String permission) {
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        if (employeeId == null) {
            log.debug("No employee context for TEAM scope");
            return cb.disjunction();
        }

        // Get all reportee IDs (direct + indirect) from SecurityContext
        Set<UUID> reporteeIds = SecurityContext.getAllReporteeIds();

        if (reporteeIds == null || reporteeIds.isEmpty()) {
            // If no reportees, user can only see their own data
            return getSelfPredicate(root, cb);
        }

        // Include self in the team view
        Set<UUID> teamIds = new HashSet<>(reporteeIds);
        teamIds.add(employeeId);

        // Build predicate for employee-related entities
        List<Predicate> predicates = new ArrayList<>();

        // Try employeeId field (most common)
        tryAddPredicate(predicates, () -> root.get("employeeId").in(teamIds));

        // Try employee.id for entities with ManyToOne relationship
        tryAddPredicate(predicates, () -> root.get("employee").get("id").in(teamIds));

        // Try managerId for entities that track manager
        tryAddPredicate(predicates, () -> root.get("managerId").in(teamIds));

        // Try recruiter/manager fields used in recruitment flows
        tryAddPredicate(predicates, () -> root.get("hiringManagerId").in(teamIds));
        tryAddPredicate(predicates, () -> root.get("assignedRecruiterId").in(teamIds));
        tryAddPredicate(predicates, () -> root.get("interviewerId").in(teamIds));

        // Try createdBy for user-created entities
        UUID userId = SecurityContext.getCurrentUserId();
        if (userId != null) {
            tryAddPredicate(predicates, () -> cb.equal(root.get("createdBy"), userId));
        }

        if (predicates.isEmpty()) {
            // Fallback to department if no team fields found
            return getDepartmentPredicate(root, cb);
        }

        return cb.or(predicates.toArray(new Predicate[0]));
    }

    /**
     * SELF scope: Filter by user's own data only.
     * Checks multiple fields that might identify ownership.
     */
    private Predicate getSelfPredicate(Root<?> root, CriteriaBuilder cb) {
        UUID userId = SecurityContext.getCurrentUserId();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();

        List<Predicate> predicates = new ArrayList<>();

        if (userId != null) {
            tryAddPredicate(predicates, () -> cb.equal(root.get("createdBy"), userId));
            tryAddPredicate(predicates, () -> cb.equal(root.get("userId"), userId));
            tryAddPredicate(predicates, () -> cb.equal(root.get("user").get("id"), userId));
        }

        if (employeeId != null) {
            tryAddPredicate(predicates, () -> cb.equal(root.get("employeeId"), employeeId));
            tryAddPredicate(predicates, () -> cb.equal(root.get("employee").get("id"), employeeId));
            tryAddPredicate(predicates, () -> cb.equal(root.get("hiringManagerId"), employeeId));
            tryAddPredicate(predicates, () -> cb.equal(root.get("assignedRecruiterId"), employeeId));
            tryAddPredicate(predicates, () -> cb.equal(root.get("interviewerId"), employeeId));
            tryAddPredicate(predicates, () -> cb.equal(root.get("signerId"), employeeId));
        }

        return predicates.isEmpty() ? cb.disjunction() : cb.or(predicates.toArray(new Predicate[0]));
    }

    /**
     * CUSTOM scope: Filter by explicitly selected targets.
     * Targets can be specific employees, departments, or locations.
     */
    private Predicate getCustomPredicate(Root<?> root, CriteriaBuilder cb, String permission) {
        // Get custom targets from SecurityContext
        Set<UUID> customEmployeeIds = SecurityContext.getCustomEmployeeIds(permission);
        Set<UUID> customDepartmentIds = SecurityContext.getCustomDepartmentIds(permission);
        Set<UUID> customLocationIds = SecurityContext.getCustomLocationIds(permission);

        List<Predicate> predicates = new ArrayList<>();

        // Filter by custom employee IDs
        if (customEmployeeIds != null && !customEmployeeIds.isEmpty()) {
            tryAddPredicate(predicates, () -> root.get("employeeId").in(customEmployeeIds));
            tryAddPredicate(predicates, () -> root.get("employee").get("id").in(customEmployeeIds));
            tryAddPredicate(predicates, () -> root.get("id").in(customEmployeeIds)); // For Employee entity itself
            tryAddPredicate(predicates, () -> root.get("hiringManagerId").in(customEmployeeIds));
            tryAddPredicate(predicates, () -> root.get("assignedRecruiterId").in(customEmployeeIds));
            tryAddPredicate(predicates, () -> root.get("interviewerId").in(customEmployeeIds));
        }

        // Filter by custom department IDs
        if (customDepartmentIds != null && !customDepartmentIds.isEmpty()) {
            tryAddPredicate(predicates, () -> root.get("departmentId").in(customDepartmentIds));
            tryAddPredicate(predicates, () -> root.get("department").get("id").in(customDepartmentIds));
        }

        // Filter by custom location IDs
        if (customLocationIds != null && !customLocationIds.isEmpty()) {
            tryAddPredicate(predicates, () -> root.get("officeLocationId").in(customLocationIds));
            tryAddPredicate(predicates, () -> root.get("locationId").in(customLocationIds));
        }

        // Always include user's own data with CUSTOM scope
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        if (employeeId != null) {
            tryAddPredicate(predicates, () -> cb.equal(root.get("employeeId"), employeeId));
        }

        if (predicates.isEmpty()) {
            log.debug("No custom targets found for permission: {}", permission);
            // Fallback to SELF if no custom targets
            return getSelfPredicate(root, cb);
        }

        return cb.or(predicates.toArray(new Predicate[0]));
    }

    /**
     * Helper method to safely try adding a predicate, catching any IllegalArgumentException
     * that occurs when a field doesn't exist on the entity.
     */
    private void tryAddPredicate(List<Predicate> predicates, java.util.function.Supplier<Predicate> predicateSupplier) {
        try {
            predicates.add(predicateSupplier.get());
        } catch (IllegalArgumentException ignored) {
            // Field doesn't exist on this entity - skip
        }
    }

    // ==================== Legacy method aliases for backward compatibility ====================

    /**
     * @deprecated Use getSelfPredicate instead. Will be removed in future version.
     */
    @Deprecated(since = "2.0", forRemoval = true)
    private Predicate getOwnPredicate(Root<?> root, CriteriaBuilder cb) {
        return getSelfPredicate(root, cb);
    }

    /**
     * @deprecated Use getTeamPredicate(root, cb, permission) instead.
     */
    @Deprecated(since = "2.0", forRemoval = true)
    private Predicate getTeamPredicate(Root<?> root, CriteriaBuilder cb) {
        return getTeamPredicate(root, cb, null);
    }
}
