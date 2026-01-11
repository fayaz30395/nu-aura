package com.hrms.common.security;

import com.hrms.domain.user.RoleScope;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Service to generate JPA Specifications based on User's RoleScope.
 * This ensures "Row-Level Security" in application layer.
 */
@Service
public class DataScopeService {

    /**
     * Creates a JPA Specification to filter data based on the user's scope for a
     * specific permission.
     * 
     * @param permission The permission being checked (e.g. "ATTENDANCE:VIEW_ALL")
     * @param <T>        The entity type
     * @return Specification to filter query results
     */
    public <T> Specification<T> getScopeSpecification(String permission) {
        return (root, query, cb) -> {
            // 1. Get current Max Scope for this permission
            RoleScope scope = SecurityContext.getPermissionScope(permission);
            if (scope == null) {
                return cb.disjunction(); // No access
            }

            // 2. SYSTEM_ADMIN or GLOBAL scope -> No Filter
            if (SecurityContext.isSystemAdmin() || scope == RoleScope.GLOBAL) {
                return cb.conjunction();
            }

            // 3. Apply Filters based on Scope
            switch (scope) {
                case LOCATION:
                    // Filter by Location ID
                    // Assumes entity has 'locationId' or 'location.id'
                    return getLocationPredicate(root, cb);

                case DEPARTMENT:
                    // Filter by Department ID
                    return getDepartmentPredicate(root, cb);

                case TEAM:
                    // Filter by Team ID (if applicable) or Department as fallback
                    return getTeamPredicate(root, cb);

                case OWN:
                    // Filter by User ID (Created By or Employee ID)
                    return getOwnPredicate(root, cb);

                default:
                    return cb.disjunction();
            }
        };
    }

    private Predicate getLocationPredicate(Root<?> root, CriteriaBuilder cb) {
        UUID locationId = SecurityContext.getCurrentLocationId();
        if (locationId == null) {
            return cb.disjunction();
        }
        try {
            return cb.equal(root.get("officeLocationId"), locationId);
        } catch (IllegalArgumentException e) {
            // Fallback for entities that might use 'locationId' instead of
            // 'officeLocationId'
            try {
                return cb.equal(root.get("locationId"), locationId);
            } catch (IllegalArgumentException e2) {
                return cb.disjunction();
            }
        }
    }

    private Predicate getDepartmentPredicate(Root<?> root, CriteriaBuilder cb) {
        UUID deptId = SecurityContext.getCurrentDepartmentId();
        if (deptId == null) {
            return cb.disjunction();
        }
        try {
            return cb.equal(root.get("departmentId"), deptId);
        } catch (IllegalArgumentException e) {
            return cb.disjunction();
        }
    }

    private Predicate getTeamPredicate(Root<?> root, CriteriaBuilder cb) {
        UUID teamId = SecurityContext.getCurrentTeamId();
        if (teamId == null) {
            // Fallback to Department if Team is not set but scope is TEAM?
            // Usually, if scope is TEAM and user has no team, they shouldn't see anything
            // unless we want to allow department-wide access. Let's be strict for now.
            return cb.disjunction();
        }
        try {
            return cb.equal(root.get("teamId"), teamId);
        } catch (IllegalArgumentException e) {
            // If entity doesn't have teamId, maybe it only has departmentId?
            return getDepartmentPredicate(root, cb);
        }
    }

    private Predicate getOwnPredicate(Root<?> root, CriteriaBuilder cb) {
        UUID userId = SecurityContext.getCurrentUserId();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();

        List<Predicate> predicates = new ArrayList<>();
        if (userId != null) {
            try {
                predicates.add(cb.equal(root.get("createdBy"), userId));
            } catch (IllegalArgumentException ignored) {
            }
            try {
                predicates.add(cb.equal(root.get("userId"), userId));
            } catch (IllegalArgumentException ignored) {
            }
        }

        if (employeeId != null) {
            try {
                predicates.add(cb.equal(root.get("employeeId"), employeeId));
            } catch (IllegalArgumentException ignored) {
            }
            try {
                predicates.add(cb.equal(root.get("hiringManagerId"), employeeId));
            } catch (IllegalArgumentException ignored) {
            }
            try {
                predicates.add(cb.equal(root.get("assignedRecruiterId"), employeeId));
            } catch (IllegalArgumentException ignored) {
            }
        }

        return predicates.isEmpty() ? cb.disjunction() : cb.or(predicates.toArray(new Predicate[0]));
    }
}
