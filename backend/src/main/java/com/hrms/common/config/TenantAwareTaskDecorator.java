package com.hrms.common.config;

import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.user.RoleScope;
import org.springframework.core.task.TaskDecorator;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.HashMap;

/**
 * TaskDecorator that propagates both {@link TenantContext} and
 * {@link SecurityContext} from the calling thread to the async worker thread.
 *
 * <p>Without this decorator, Spring's default {@code SimpleAsyncTaskExecutor}
 * creates new threads with empty ThreadLocals. Any {@code @Async} method
 * invoked with a tenant in context will lose the tenant ID, causing one of:
 * <ul>
 *   <li>NullPointerException when {@code TenantContext.requireCurrentTenant()} is called</li>
 *   <li>RLS bypass — queries return data from all tenants</li>
 *   <li>Cross-tenant notification leakage</li>
 * </ul>
 *
 * <p>This decorator is registered in {@link AsyncConfig} as the decorator
 * for the platform's named thread pool executor.</p>
 *
 * <p><strong>Security note:</strong> Snapshots are taken at call-site (the
 * submitting thread) so that the async worker sees the tenant that initiated
 * the operation, not whatever tenant may be set in the pool thread at the
 * time it is reused.</p>
 */
public class TenantAwareTaskDecorator implements TaskDecorator {

    @Override
    public Runnable decorate(Runnable runnable) {
        // Capture call-site context before the task is submitted
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        Set<String> roles = SecurityContext.getCurrentRoles();
        Map<String, RoleScope> permissions = snapshotPermissions();
        String appCode = SecurityContext.getCurrentAppCode();
        UUID departmentId = SecurityContext.getCurrentDepartmentId();
        UUID locationId = SecurityContext.getCurrentLocationId();
        UUID teamId = SecurityContext.getCurrentTeamId();
        // Capture Spring Security context for DelegatingSecurityContextExecutor compatibility
        var springSecurityCtx = SecurityContextHolder.getContext();

        return () -> {
            try {
                // Restore captured context in the worker thread
                if (tenantId != null) {
                    TenantContext.setCurrentTenant(tenantId);
                }
                if (userId != null) {
                    SecurityContext.setCurrentUser(userId, employeeId, roles, permissions);
                }
                if (appCode != null) {
                    SecurityContext.setCurrentApp(appCode);
                }
                SecurityContext.setOrgContext(locationId, departmentId, teamId);
                SecurityContextHolder.setContext(springSecurityCtx);

                runnable.run();
            } finally {
                // Always clear context to prevent ThreadLocal leaks in pool threads
                TenantContext.clear();
                SecurityContext.clear();
                SecurityContextHolder.clearContext();
            }
        };
    }

    /**
     * Snapshot current permissions into an immutable copy so the async thread
     * gets a stable view and cannot mutate the calling thread's permission map.
     */
    private Map<String, RoleScope> snapshotPermissions() {
        Set<String> permKeys = SecurityContext.getCurrentPermissions();
        if (permKeys.isEmpty()) {
            return Map.of();
        }
        // Rebuild as immutable map — RoleScope per permission key
        Map<String, RoleScope> snapshot = new HashMap<>();
        for (String key : permKeys) {
            RoleScope scope = SecurityContext.getPermissionScope(key);
            if (scope != null) {
                snapshot.put(key, scope);
            }
        }
        return Map.copyOf(snapshot);
    }
}
