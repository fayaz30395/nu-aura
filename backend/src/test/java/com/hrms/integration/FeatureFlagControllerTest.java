package com.hrms.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.featureflag.FeatureFlagController;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.user.RoleScope;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for FeatureFlagController.
 * Covers UC-ADMIN-001, UC-ADMIN-003 through UC-ADMIN-005.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("Feature Flag Controller Integration Tests")
class FeatureFlagControllerTest {

    private static final String BASE_URL = "/api/v1/feature-flags";
    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440000");
    private static final UUID EMPLOYEE_ID = UUID.fromString("111e8400-e29b-41d4-a716-446655440099");

    @Autowired
    MockMvc mockMvc;
    @Autowired
    ObjectMapper objectMapper;

    @BeforeEach
    void setUpSuperAdminContext() {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.SYSTEM_ADMIN, RoleScope.ALL);
        SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID, Set.of("SUPER_ADMIN"), permissions);
        TenantContext.setCurrentTenant(TENANT_ID);
    }

    // ========================= UC-ADMIN-001: Feature flag toggle =========================

    @Test
    @DisplayName("ucAdminA1_createFeatureFlag_enabled_returns200")
    void ucAdminA1_createFeatureFlag_enabled_returns200() throws Exception {
        FeatureFlagController.FeatureFlagRequest request = new FeatureFlagController.FeatureFlagRequest(
                "PAYROLL_AUTOMATION_V2",
                true,
                "Payroll Automation V2",
                "Enable new payroll automation pipeline",
                "PAYROLL"
        );

        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.featureKey").value("PAYROLL_AUTOMATION_V2"))
                .andExpect(jsonPath("$.enabled").value(true));
    }

    @Test
    @DisplayName("ucAdminA2_createFeatureFlag_disabled_returns200")
    void ucAdminA2_createFeatureFlag_disabled_returns200() throws Exception {
        FeatureFlagController.FeatureFlagRequest request = new FeatureFlagController.FeatureFlagRequest(
                "BETA_REPORTING_DASHBOARD",
                false,
                "Beta Reporting Dashboard",
                "New reporting dashboard in beta",
                "ANALYTICS"
        );

        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.featureKey").value("BETA_REPORTING_DASHBOARD"))
                .andExpect(jsonPath("$.enabled").value(false));
    }

    @Test
    @DisplayName("ucAdminA3_toggleFeatureFlag_returns200WithToggledState")
    void ucAdminA3_toggleFeatureFlag_returns200WithToggledState() throws Exception {
        // Create a flag first
        String featureKey = "TOGGLE_TEST_FLAG_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        FeatureFlagController.FeatureFlagRequest createRequest = new FeatureFlagController.FeatureFlagRequest(
                featureKey, false, "Toggle Test", "Test toggle behavior", "TEST"
        );
        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isOk());

        // Toggle the flag
        mockMvc.perform(post(BASE_URL + "/{featureKey}/toggle", featureKey))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.featureKey").value(featureKey))
                .andExpect(jsonPath("$.enabled").value(true)); // toggled from false → true
    }

    @Test
    @DisplayName("ucAdminA4_getAllFlags_returns200WithList")
    void ucAdminA4_getAllFlags_returns200WithList() throws Exception {
        mockMvc.perform(get(BASE_URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @DisplayName("ucAdminA5_employeeRole_cannotToggleFeatureFlags_returns403")
    void ucAdminA5_employeeRole_cannotToggleFeatureFlags_returns403() throws Exception {
        // Create flag as admin
        String featureKey = "EMP_TEST_FLAG_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        FeatureFlagController.FeatureFlagRequest createRequest = new FeatureFlagController.FeatureFlagRequest(
                featureKey, true, "Employee Test", "Should not be accessible to employees", "HR"
        );
        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isOk());

        // Switch to restricted employee
        Map<String, RoleScope> restrictedPerms = new HashMap<>();
        restrictedPerms.put(Permission.EMPLOYEE_VIEW_SELF, RoleScope.SELF);
        SecurityContext.setCurrentUser(UUID.randomUUID(), UUID.randomUUID(), Set.of("EMPLOYEE"), restrictedPerms);

        mockMvc.perform(post(BASE_URL + "/{featureKey}/toggle", featureKey))
                .andExpect(status().isForbidden());
    }
}
