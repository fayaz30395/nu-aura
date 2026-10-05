package com.nulogic.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.config.AbstractPostgresIntegrationTest;
import com.nulogic.config.TestSecurityConfig;
import com.nulogic.domain.user.RoleScope;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * FINANCE_ADMIN Role-Boundary Tests — UC-FIN-RBAC-001 through UC-FIN-RBAC-004.
 * <p>
 * V286 seeds the FINANCE_ADMIN role with finance-scoped permissions
 * (PAYROLL:VIEW_ALL, LOAN:VIEW_ALL/APPROVE/MANAGE, EXPENSE:*, STATUTORY:*,
 * COMPENSATION:*, BENEFIT:*), and V312 seeds the demo user
 * finance@nulogic.io. This test proves the boundary: a FINANCE_ADMIN may
 * reach finance/payroll endpoints but is forbidden from system-admin and
 * non-finance administrative routes.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@DisplayName("FINANCE_ADMIN Role-Boundary Tests")
class FinanceAdminBoundaryTest extends AbstractPostgresIntegrationTest {

    private static final UUID TENANT_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440001");
    private static final UUID USER_ID = UUID.fromString("48000000-0e02-0000-0000-000000000015");
    private static final UUID EMPLOYEE_ID = UUID.fromString("48000000-e001-0000-0000-000000000015");

    @Autowired
    MockMvc mockMvc;
    @Autowired
    ObjectMapper objectMapper;

    @BeforeEach
    void setUpFinanceAdminContext() {
        // Mirror V286 role_permissions grants for FINANCE_ADMIN (all at ALL scope).
        Map<String, RoleScope> financePerms = new HashMap<>();
        financePerms.put(Permission.PAYROLL_VIEW, RoleScope.ALL);
        financePerms.put(Permission.PAYROLL_VIEW_ALL, RoleScope.ALL);
        financePerms.put(Permission.PAYROLL_VIEW_SELF, RoleScope.ALL);
        financePerms.put(Permission.PAYROLL_PROCESS, RoleScope.ALL);
        financePerms.put(Permission.PAYROLL_APPROVE, RoleScope.ALL);
        financePerms.put(Permission.LOAN_VIEW, RoleScope.ALL);
        financePerms.put(Permission.LOAN_VIEW_ALL, RoleScope.ALL);
        financePerms.put(Permission.LOAN_APPROVE, RoleScope.ALL);
        financePerms.put(Permission.LOAN_MANAGE, RoleScope.ALL);
        financePerms.put(Permission.STATUTORY_VIEW, RoleScope.ALL);
        financePerms.put(Permission.EXPENSE_VIEW, RoleScope.ALL);
        financePerms.put(Permission.EXPENSE_VIEW_ALL, RoleScope.ALL);
        financePerms.put(Permission.COMPENSATION_VIEW, RoleScope.ALL);
        financePerms.put(Permission.COMPENSATION_VIEW_ALL, RoleScope.ALL);

        SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID, Set.of("FINANCE_ADMIN"), financePerms);
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UC-FIN-RBAC-001: FINANCE_ADMIN may view payroll runs → 200
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("UC-FIN-RBAC-001: FINANCE_ADMIN accessing /api/v1/payroll/runs → 200")
    void ucFinRbac001_financeAdmin_accessesPayrollRuns_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/payroll/runs")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UC-FIN-RBAC-002: FINANCE_ADMIN may list all loans → 200
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("UC-FIN-RBAC-002: FINANCE_ADMIN accessing /api/v1/loans (all) → 200")
    void ucFinRbac002_financeAdmin_accessesAllLoans_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/loans")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UC-FIN-RBAC-003: FINANCE_ADMIN forbidden from system-admin routes → 403
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("UC-FIN-RBAC-003: FINANCE_ADMIN accessing /api/v1/admin/system/overview → 403")
    void ucFinRbac003_financeAdmin_cannotAccessSystemAdmin_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/system/overview")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UC-FIN-RBAC-004: FINANCE_ADMIN forbidden from employee directory (no
    // EMPLOYEE:VIEW_ALL/VIEW_TEAM) → 403
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("UC-FIN-RBAC-004: FINANCE_ADMIN accessing /api/v1/employees → 403")
    void ucFinRbac004_financeAdmin_cannotListEmployees_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/employees")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }
}
