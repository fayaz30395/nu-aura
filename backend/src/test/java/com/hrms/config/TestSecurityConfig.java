package com.hrms.config;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Profile;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.Permission;
import jakarta.annotation.PostConstruct;

import java.util.Set;
import java.util.Map;
import java.util.HashSet;
import java.util.HashMap;
import java.util.UUID;
import com.hrms.domain.user.RoleScope;

/**
 * Test configuration to set up SecurityContext for integration tests
 */
@TestConfiguration
@Profile("test")
public class TestSecurityConfig {

    private static final UUID TEST_USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440000");
    private static final UUID TEST_EMPLOYEE_ID = UUID.fromString("111e8400-e29b-41d4-a716-446655440099");
    private static final UUID TEST_TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");

    /**
     * Sets up SecurityContext with test user having all permissions
     * This allows all @RequiresPermission checks to pass during tests
     * Also provides the current user for JPA auditing
     */
    @PostConstruct
    public void setupTestSecurityContext() {
        // Set up a test user with system admin permission (bypasses all checks)
        // Using the actual admin user from the database
        Set<String> roles = new HashSet<>();
        roles.add("ADMIN");

        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.SYSTEM_ADMIN, RoleScope.ALL); // This bypasses all permission checks

        SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID, roles, permissions);
        SecurityContext.setCurrentTenantId(TEST_TENANT_ID);
    }
}
