package com.nulogic.application.lms.service;

import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import org.springframework.security.access.AccessDeniedException;

import java.util.Set;
import java.util.UUID;

/**
 * Who may act on a given employee's learning data: the employee, HR/admin, LMS course managers
 * (enrollment only) and the employee's reporting chain.
 */
final class LmsAccessPolicy {

    private LmsAccessPolicy() {
    }

    static void requireSelfOrManager(UUID targetEmployeeId, boolean allowLmsManager) {
        if (targetEmployeeId == null) {
            throw new AccessDeniedException("Employee is required");
        }
        if (SecurityContext.isSuperAdmin() || SecurityContext.isTenantAdmin() || SecurityContext.isHRManager()) {
            return;
        }
        if (allowLmsManager && SecurityContext.hasPermission(Permission.LMS_COURSE_MANAGE)) {
            return;
        }
        UUID current = SecurityContext.getCurrentEmployeeId();
        if (current == null) {
            throw new AccessDeniedException("Not authorized for this employee");
        }
        if (current.equals(targetEmployeeId)) {
            return;
        }
        Set<UUID> reportees = SecurityContext.getAllReporteeIds();
        if (reportees != null && reportees.contains(targetEmployeeId)) {
            return;
        }
        throw new AccessDeniedException("Not authorized for this employee");
    }
}
