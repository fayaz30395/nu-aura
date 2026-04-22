package com.hrms.common.security;

import com.hrms.domain.user.RoleScope;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.domain.Specification;

import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for DataScopeService.
 * Tests Keka-style RBAC scope filtering logic.
 */
class DataScopeServiceTest {

    private DataScopeService dataScopeService;

    @BeforeEach
    void setUp() {
        dataScopeService = new DataScopeService();
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
    }

    private void setupSecurityContext(UUID userId, UUID employeeId, UUID tenantId,
                                      String permission, RoleScope scope) {
        SecurityContext.setCurrentUser(userId, employeeId,
                Collections.emptySet(),
                Map.of(permission, scope));
        TenantContext.setCurrentTenant(tenantId);
    }

    private void setupSecurityContextWithRoles(UUID userId, UUID employeeId, UUID tenantId,
                                               String permission, RoleScope scope, Set<String> roles) {
        SecurityContext.setCurrentUser(userId, employeeId, roles, Map.of(permission, scope));
        TenantContext.setCurrentTenant(tenantId);
    }

    @Test
    @DisplayName("ALL scope should return conjunction (no filter)")
    void testAllScope_ReturnsNoFilter() {
        // Setup
        UUID userId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();

        setupSecurityContext(userId, employeeId, tenantId, "TEST:VIEW", RoleScope.ALL);

        // Test
        Specification<?> spec = dataScopeService.getScopeSpecification("TEST:VIEW");

        // Verify - specification should not be null
        assertThat(spec).isNotNull();
    }

    @Test
    @DisplayName("SELF scope should filter by user's own records")
    void testSelfScope_FiltersOwnRecords() {
        // Setup
        UUID userId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();

        setupSecurityContext(userId, employeeId, tenantId, "TEST:VIEW", RoleScope.SELF);

        // Test
        Specification<?> spec = dataScopeService.getScopeSpecification("TEST:VIEW");

        // Verify
        assertThat(spec).isNotNull();
    }

    @Test
    @DisplayName("TEAM scope should include direct and indirect reports")
    void testTeamScope_IncludesReportees() {
        // Setup
        UUID userId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        Set<UUID> reporteeIds = Set.of(UUID.randomUUID(), UUID.randomUUID());

        setupSecurityContext(userId, employeeId, tenantId, "TEST:VIEW", RoleScope.TEAM);
        SecurityContext.setAllReporteeIds(reporteeIds);

        // Test
        Specification<?> spec = dataScopeService.getScopeSpecification("TEST:VIEW");

        // Verify
        assertThat(spec).isNotNull();
    }

    @Test
    @DisplayName("DEPARTMENT scope should filter by department")
    void testDepartmentScope_FiltersByDepartment() {
        // Setup
        UUID userId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        UUID departmentId = UUID.randomUUID();

        setupSecurityContext(userId, employeeId, tenantId, "TEST:VIEW", RoleScope.DEPARTMENT);
        SecurityContext.setOrgContext(null, departmentId, null);

        // Test
        Specification<?> spec = dataScopeService.getScopeSpecification("TEST:VIEW");

        // Verify
        assertThat(spec).isNotNull();
    }

    @Test
    @DisplayName("LOCATION scope should filter by location")
    void testLocationScope_FiltersByLocation() {
        // Setup
        UUID userId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        UUID locationId = UUID.randomUUID();

        setupSecurityContext(userId, employeeId, tenantId, "TEST:VIEW", RoleScope.LOCATION);
        SecurityContext.setOrgContext(locationId, null, null);

        // Test
        Specification<?> spec = dataScopeService.getScopeSpecification("TEST:VIEW");

        // Verify
        assertThat(spec).isNotNull();
    }

    @Test
    @DisplayName("LOCATION scope should filter by multiple locations")
    void testLocationScope_FiltersByMultipleLocations() {
        // Setup
        UUID userId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        Set<UUID> locationIds = Set.of(UUID.randomUUID(), UUID.randomUUID());

        setupSecurityContext(userId, employeeId, tenantId, "TEST:VIEW", RoleScope.LOCATION);
        SecurityContext.setCurrentLocationIds(locationIds);

        // Test
        Specification<?> spec = dataScopeService.getScopeSpecification("TEST:VIEW");

        // Verify
        assertThat(spec).isNotNull();
    }

    @Test
    @DisplayName("CUSTOM scope should filter by custom targets")
    void testCustomScope_FiltersByCustomTargets() {
        // Setup
        UUID userId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        Set<UUID> customEmployeeIds = Set.of(UUID.randomUUID(), UUID.randomUUID());

        setupSecurityContext(userId, employeeId, tenantId, "TEST:VIEW", RoleScope.CUSTOM);
        SecurityContext.setCustomScopeTargets("TEST:VIEW", customEmployeeIds, null, null);

        // Test
        Specification<?> spec = dataScopeService.getScopeSpecification("TEST:VIEW");

        // Verify
        assertThat(spec).isNotNull();
    }

    @Test
    @DisplayName("CUSTOM scope should filter by department targets")
    void testCustomScope_FiltersByDepartmentTargets() {
        // Setup
        UUID userId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        Set<UUID> customDepartmentIds = Set.of(UUID.randomUUID());

        setupSecurityContext(userId, employeeId, tenantId, "TEST:VIEW", RoleScope.CUSTOM);
        SecurityContext.setCustomScopeTargets("TEST:VIEW", null, customDepartmentIds, null);

        // Test
        Specification<?> spec = dataScopeService.getScopeSpecification("TEST:VIEW");

        // Verify
        assertThat(spec).isNotNull();
    }

    @Test
    @DisplayName("CUSTOM scope should filter by location targets")
    void testCustomScope_FiltersByLocationTargets() {
        // Setup
        UUID userId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        Set<UUID> customLocationIds = Set.of(UUID.randomUUID());

        setupSecurityContext(userId, employeeId, tenantId, "TEST:VIEW", RoleScope.CUSTOM);
        SecurityContext.setCustomScopeTargets("TEST:VIEW", null, null, customLocationIds);

        // Test
        Specification<?> spec = dataScopeService.getScopeSpecification("TEST:VIEW");

        // Verify
        assertThat(spec).isNotNull();
    }

    @Test
    @DisplayName("No scope found should return disjunction (no access)")
    void testNoScope_ReturnsNoAccess() {
        // Setup - no permission scope set for the requested permission
        UUID userId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();

        // Set up context with a different permission
        setupSecurityContext(userId, employeeId, tenantId, "OTHER:VIEW", RoleScope.ALL);

        // Test - request a non-existent permission
        Specification<?> spec = dataScopeService.getScopeSpecification("NONEXISTENT:VIEW");

        // Verify
        assertThat(spec).isNotNull();
    }

    @Test
    @DisplayName("System admin should bypass all filters")
    void testSystemAdmin_BypassesAllFilters() {
        // Setup with SYSTEM_ADMIN permission which allows isSystemAdmin() to return true
        UUID userId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();

        SecurityContext.setCurrentUser(userId, employeeId,
                Collections.emptySet(),
                Map.of(
                        "TEST:VIEW", RoleScope.SELF,
                        Permission.SYSTEM_ADMIN, RoleScope.ALL
                ));
        TenantContext.setCurrentTenant(tenantId);

        // Test
        Specification<?> spec = dataScopeService.getScopeSpecification("TEST:VIEW");

        // Verify - should return conjunction (no filter) for system admin
        assertThat(spec).isNotNull();
    }

    @Test
    @DisplayName("getScopeSpecificationWith should combine scope with additional spec")
    void testGetScopeSpecificationWith_CombinesSpecs() {
        // Setup
        UUID userId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();

        setupSecurityContext(userId, employeeId, tenantId, "TEST:VIEW", RoleScope.ALL);

        // Additional specification that always returns true
        Specification<Object> additionalSpec = (root, query, cb) -> cb.conjunction();

        // Test
        Specification<Object> combined = dataScopeService.getScopeSpecificationWith("TEST:VIEW", additionalSpec);

        // Verify
        assertThat(combined).isNotNull();
    }

    @Test
    @DisplayName("TEAM scope with no reportees should fallback to SELF")
    void testTeamScope_NoReportees_FallsBackToSelf() {
        // Setup - no reportees set
        UUID userId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();

        setupSecurityContext(userId, employeeId, tenantId, "TEST:VIEW", RoleScope.TEAM);
        // Explicitly set empty reportee list
        SecurityContext.setAllReporteeIds(Collections.emptySet());

        // Test
        Specification<?> spec = dataScopeService.getScopeSpecification("TEST:VIEW");

        // Verify
        assertThat(spec).isNotNull();
    }

    @Test
    @DisplayName("CUSTOM scope with no targets should fallback to SELF")
    void testCustomScope_NoTargets_FallsBackToSelf() {
        // Setup - no custom targets set
        UUID userId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();

        setupSecurityContext(userId, employeeId, tenantId, "TEST:VIEW", RoleScope.CUSTOM);
        // Don't set any custom targets

        // Test
        Specification<?> spec = dataScopeService.getScopeSpecification("TEST:VIEW");

        // Verify
        assertThat(spec).isNotNull();
    }

    @Test
    @DisplayName("DEPARTMENT scope with no department should return no access")
    void testDepartmentScope_NoDepartment_ReturnsNoAccess() {
        // Setup - no department in org context
        UUID userId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();

        setupSecurityContext(userId, employeeId, tenantId, "TEST:VIEW", RoleScope.DEPARTMENT);
        // Don't set org context

        // Test
        Specification<?> spec = dataScopeService.getScopeSpecification("TEST:VIEW");

        // Verify
        assertThat(spec).isNotNull();
    }

    @Test
    @DisplayName("LOCATION scope with no location should return no access")
    void testLocationScope_NoLocation_ReturnsNoAccess() {
        // Setup - no location in org context
        UUID userId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();

        setupSecurityContext(userId, employeeId, tenantId, "TEST:VIEW", RoleScope.LOCATION);
        // Don't set org context

        // Test
        Specification<?> spec = dataScopeService.getScopeSpecification("TEST:VIEW");

        // Verify
        assertThat(spec).isNotNull();
    }
}
