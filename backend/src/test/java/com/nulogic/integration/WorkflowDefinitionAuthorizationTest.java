package com.nulogic.integration;

import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.config.AbstractPostgresIntegrationTest;
import com.nulogic.config.TestSecurityConfig;
import com.nulogic.domain.user.RoleScope;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * SEC-3: the approval-ROUTING configuration is admin-only, and the backend is where that is
 * enforced.
 *
 * <p>{@code WORKFLOW:VIEW} is seeded to EMPLOYEE because every employee needs it for their own
 * approval inbox ({@code /workflow/instances}, {@code /workflow/approvals/**}). The three
 * definition reads were annotated with the same permission, so any employee could retrieve every
 * workflow definition in the tenant — which approver sees which entity, at which step, with which
 * SLA and escalation target — by calling the API directly.</p>
 *
 * <p>The 2026-09-25 pass tightened the React page to {@code isAdmin || canManage}. That is a UX
 * change, not an authorization control: a hidden button does not stop a direct request. These
 * tests hit the endpoints with no UI in the loop and assert the boundary itself, so the fix
 * cannot silently regress to being frontend-only again.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("SEC-3: workflow definition reads require WORKFLOW:MANAGE")
class WorkflowDefinitionAuthorizationTest extends AbstractPostgresIntegrationTest {

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");

    @Autowired
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        SecurityContext.clear();
        TenantContext.setCurrentTenant(TENANT_ID);
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
        TenantContext.clear();
    }

    // ───────────────── ordinary EMPLOYEE: WORKFLOW:VIEW, no MANAGE ─────────────────

    @Test
    @DisplayName("an EMPLOYEE holding WORKFLOW:VIEW cannot list workflow definitions")
    void employeeCannotListDefinitions() throws Exception {
        loginAsEmployeeWithWorkflowView();

        mockMvc.perform(get("/api/v1/workflow/definitions"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("an EMPLOYEE holding WORKFLOW:VIEW cannot read a definition by id")
    void employeeCannotReadDefinitionById() throws Exception {
        loginAsEmployeeWithWorkflowView();

        mockMvc.perform(get("/api/v1/workflow/definitions/{id}", UUID.randomUUID()))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("an EMPLOYEE holding WORKFLOW:VIEW cannot read definitions by entity type")
    void employeeCannotReadDefinitionsByEntityType() throws Exception {
        loginAsEmployeeWithWorkflowView();

        mockMvc.perform(get("/api/v1/workflow/definitions/entity-type/{t}", "LEAVE_REQUEST"))
                .andExpect(status().isForbidden());
    }

    /**
     * The employee-facing side of WORKFLOW:VIEW must keep working — otherwise the fix would
     * just have moved the breakage to the approval inbox.
     */
    @Test
    @DisplayName("WORKFLOW:VIEW still reaches the employee's own approval inbox")
    void employeeCanStillReachTheirApprovalInbox() throws Exception {
        loginAsEmployeeWithWorkflowView();

        mockMvc.perform(get("/api/v1/workflow/my-pending-approvals"))
                .andExpect(status().isOk());
    }

    // ──────────────────────── admin: WORKFLOW:MANAGE ───────────────────────────────

    @Test
    @DisplayName("a WORKFLOW:MANAGE holder can list workflow definitions")
    void managerCanListDefinitions() throws Exception {
        loginAsWorkflowAdmin();

        mockMvc.perform(get("/api/v1/workflow/definitions"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("a WORKFLOW:MANAGE holder can read definitions by entity type")
    void managerCanReadDefinitionsByEntityType() throws Exception {
        loginAsWorkflowAdmin();

        mockMvc.perform(get("/api/v1/workflow/definitions/entity-type/{t}", "LEAVE_REQUEST"))
                .andExpect(status().isOk());
    }

    // ───────────────────────────────── fixtures ────────────────────────────────────

    private void loginAsEmployeeWithWorkflowView() {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.WORKFLOW_VIEW, RoleScope.SELF);

        SecurityContext.setCurrentUser(UUID.randomUUID(), UUID.randomUUID(),
                Set.of("EMPLOYEE"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }

    private void loginAsWorkflowAdmin() {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.WORKFLOW_VIEW, RoleScope.ALL);
        permissions.put(Permission.WORKFLOW_MANAGE, RoleScope.ALL);

        SecurityContext.setCurrentUser(UUID.randomUUID(), UUID.randomUUID(),
                Set.of("TENANT_ADMIN"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }
}
