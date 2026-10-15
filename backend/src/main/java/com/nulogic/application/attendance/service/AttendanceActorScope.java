package com.nulogic.application.attendance.service;

import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.user.RoleScope;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Attendance-module guard: resolves the acting employee from the authenticated context and
 * checks that the actor's permission scope covers a target employee. Never trusts
 * request-supplied identities. Shared by the shift-swap, overtime and comp-off services and the attendance controller.
 * <p>
 * Scope is defined once, as a {@link Coverage}. It answers "is this one employee covered"
 * ({@code require*}/{@link #canApprove}) and "which rows are covered" ({@link #approvable},
 * {@link #viewable}, for list queries) so a list can never show what a by-id call would refuse.
 */
@Component
@RequiredArgsConstructor
public class AttendanceActorScope {

    private static final String[] VIEW_PERMISSIONS = {
            Permission.ATTENDANCE_VIEW_ALL, Permission.ATTENDANCE_VIEW_TEAM,
            Permission.ATTENDANCE_MANAGE, Permission.ATTENDANCE_VIEW_SELF};

    private final EmployeeRepository employeeRepository;

    /** The authenticated employee; fails closed when the session has no employee context. */
    public UUID requireActor() {
        UUID actor = SecurityContext.getCurrentEmployeeId();
        if (actor == null) {
            throw new AccessDeniedException("No employee context available");
        }
        return actor;
    }

    /** Read access: own data, or any employee covered by one of the attendance view scopes. */
    public void requireViewAccess(UUID targetEmployeeId) {
        UUID actor = requireActor();
        if (actor.equals(targetEmployeeId) || SecurityContext.isSuperAdmin()) {
            return;
        }
        for (String permission : VIEW_PERMISSIONS) {
            if (covers(coverage(permission), targetEmployeeId)) {
                return;
            }
        }
        throw new AccessDeniedException("You do not have access to this employee's attendance data");
    }

    /**
     * Single-permission gate for read and modify endpoints: a super admin, or any target covered by the
     * actor's {@code permission} scope (own data included for TEAM, SELF and CUSTOM). Unlike
     * {@link #requireApprovalAccess} it does not insist on an employee context or refuse self.
     */
    public void requireAccess(UUID targetEmployeeId, String permission) {
        if (SecurityContext.isSuperAdmin()) {
            return;
        }
        if (SecurityContext.getPermissionScope(permission) == null) {
            throw new AccessDeniedException("No access to attendance records");
        }
        if (!covers(coverage(permission), targetEmployeeId)) {
            throw new AccessDeniedException("You do not have permission to access this employee's attendance");
        }
    }

    /**
     * Approval access: the actor's {@code permission} scope must cover the target. Approving
     * one's own request is refused unless the actor is a super admin or holds ALL scope.
     *
     * @return the acting employee id, for stamping approver columns
     */
    public UUID requireApprovalAccess(UUID targetEmployeeId, String permission) {
        UUID actor = requireActor();
        if (SecurityContext.isSuperAdmin()) {
            return actor;
        }
        if (actor.equals(targetEmployeeId) && SecurityContext.getPermissionScope(permission) != RoleScope.ALL) {
            throw new AccessDeniedException("You cannot approve your own request");
        }
        if (!covers(coverage(permission), targetEmployeeId)) {
            throw new AccessDeniedException("This employee is outside your approval scope");
        }
        return actor;
    }

    /** Non-throwing variant of {@link #requireApprovalAccess}. */
    public boolean canApprove(UUID targetEmployeeId, String permission) {
        try {
            requireApprovalAccess(targetEmployeeId, permission);
            return true;
        } catch (AccessDeniedException e) {
            return false;
        }
    }

    /**
     * Query twin of {@link #canApprove}: keeps only rows whose {@code employeeId} path the actor may
     * approve, so a list is filtered by the database instead of after paging.
     */
    public Predicate approvable(String permission, Path<UUID> employeeId, CriteriaQuery<?> query, CriteriaBuilder cb) {
        UUID actor = SecurityContext.getCurrentEmployeeId();
        if (actor == null) {
            return cb.disjunction();
        }
        if (SecurityContext.isSuperAdmin()) {
            return cb.conjunction();
        }
        Coverage coverage = coverage(permission);
        if (coverage.all) {
            return cb.conjunction();
        }
        return cb.and(cb.notEqual(employeeId, actor), matches(coverage, employeeId, query, cb));
    }

    /** Query twin of {@link #requireViewAccess}: keeps only rows whose {@code employeeId} path the actor may view. */
    public Predicate viewable(Path<UUID> employeeId, CriteriaQuery<?> query, CriteriaBuilder cb) {
        UUID actor = SecurityContext.getCurrentEmployeeId();
        if (actor == null) {
            return cb.disjunction();
        }
        if (SecurityContext.isSuperAdmin()) {
            return cb.conjunction();
        }
        Coverage coverage = new Coverage();
        coverage.employees.add(actor);
        for (String permission : VIEW_PERMISSIONS) {
            coverage.merge(coverage(permission));
        }
        return coverage.all ? cb.conjunction() : matches(coverage, employeeId, query, cb);
    }

    /** Who the actor's {@code permission} scope reaches: everyone, or these employees / departments / locations. */
    private static final class Coverage {
        boolean all;
        final Set<UUID> employees = new HashSet<>();
        final Set<UUID> departments = new HashSet<>();
        final Set<UUID> locations = new HashSet<>();

        void merge(Coverage other) {
            all |= other.all;
            employees.addAll(other.employees);
            departments.addAll(other.departments);
            locations.addAll(other.locations);
        }
    }

    private Coverage coverage(String permission) {
        Coverage coverage = new Coverage();
        RoleScope scope = SecurityContext.getPermissionScope(permission);
        if (scope == null) {
            return coverage;
        }
        UUID actor = SecurityContext.getCurrentEmployeeId();
        Set<UUID> self = actor == null ? Set.of() : Set.of(actor);   // no employee context, no "own data"
        switch (scope) {
            case ALL -> coverage.all = true;
            case SELF -> addAll(coverage.employees, self);
            case TEAM -> {
                addAll(coverage.employees, self);
                addAll(coverage.employees, SecurityContext.getAllReporteeIds());
            }
            case DEPARTMENT -> {
                UUID departmentId = SecurityContext.getCurrentDepartmentId();
                if (departmentId != null) {
                    coverage.departments.add(departmentId);
                }
            }
            case LOCATION -> addAll(coverage.locations, SecurityContext.getCurrentLocationIds());
            case CUSTOM -> {
                addAll(coverage.employees, self);
                addAll(coverage.employees, SecurityContext.getCustomEmployeeIds(permission));
                addAll(coverage.departments, SecurityContext.getCustomDepartmentIds(permission));
                addAll(coverage.locations, SecurityContext.getCustomLocationIds(permission));
            }
        }
        return coverage;
    }

    private boolean covers(Coverage coverage, UUID target) {
        if (coverage.all || coverage.employees.contains(target)) {
            return true;
        }
        if (coverage.departments.isEmpty() && coverage.locations.isEmpty()) {
            return false;
        }
        Employee emp = employee(target);
        return emp != null
                && (coverage.departments.contains(emp.getDepartmentId())
                || coverage.locations.contains(emp.getOfficeLocationId()));
    }

    private Predicate matches(Coverage coverage, Path<UUID> employeeId, CriteriaQuery<?> query, CriteriaBuilder cb) {
        List<Predicate> any = new ArrayList<>();
        if (!coverage.employees.isEmpty()) {
            any.add(employeeId.in(coverage.employees));
        }
        UUID tenantId = TenantContext.getCurrentTenant();
        boolean byOrg = !coverage.departments.isEmpty() || !coverage.locations.isEmpty();
        if (byOrg && tenantId != null) {
            Subquery<UUID> inOrg = query.subquery(UUID.class);
            Root<Employee> emp = inOrg.from(Employee.class);
            List<Predicate> org = new ArrayList<>();
            if (!coverage.departments.isEmpty()) {
                org.add(emp.get("departmentId").in(coverage.departments));
            }
            if (!coverage.locations.isEmpty()) {
                org.add(emp.get("officeLocationId").in(coverage.locations));
            }
            inOrg.select(emp.<UUID>get("id"))
                    .where(cb.equal(emp.get("tenantId"), tenantId), cb.or(org.toArray(Predicate[]::new)));
            any.add(employeeId.in(inOrg));
        }
        return any.isEmpty() ? cb.disjunction() : cb.or(any.toArray(Predicate[]::new));
    }

    private static void addAll(Set<UUID> into, Collection<UUID> from) {
        if (from != null) {
            into.addAll(from);
        }
    }

    /** Tenant-filtered lookup; null when the employee does not exist in the caller's tenant. */
    private Employee employee(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return tenantId == null ? null : employeeRepository.findByIdAndTenantId(employeeId, tenantId).orElse(null);
    }
}
