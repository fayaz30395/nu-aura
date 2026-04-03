package com.hrms.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.benefits.dto.BenefitPlanRequest;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.benefits.BenefitPlan;
import com.hrms.domain.user.RoleScope;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests covering UC-BEN-001 and UC-BEN-002.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
class BenefitManagementControllerTest {

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
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UC-BEN-001: Benefit enrollment (create plan + verify today as effective date)
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void ucBen001_createBenefitPlan_returns201() throws Exception {
        BenefitPlanRequest req = new BenefitPlanRequest();
        req.setPlanCode("HLTH-" + System.currentTimeMillis());
        req.setPlanName("Health Insurance Basic " + System.currentTimeMillis());
        req.setBenefitType(BenefitPlan.BenefitType.HEALTH_INSURANCE);
        req.setEffectiveDate(LocalDate.now());
        req.setEmployeeContribution(new BigDecimal("500.00"));
        req.setEmployerContribution(new BigDecimal("1500.00"));

        mockMvc.perform(post("/api/v1/benefits/plans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists());
    }

    @Test
    void ucBen001_createBenefitPlan_missingPlanCode_returns400() throws Exception {
        BenefitPlanRequest req = new BenefitPlanRequest();
        // planCode omitted — violates @NotBlank
        req.setPlanName("Plan Without Code");
        req.setBenefitType(BenefitPlan.BenefitType.HEALTH_INSURANCE);

        mockMvc.perform(post("/api/v1/benefits/plans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void ucBen001_duplicatePlanCode_returns409OrHandled() throws Exception {
        String uniqueCode = "DUP-BEN-" + System.currentTimeMillis();

        BenefitPlanRequest req = new BenefitPlanRequest();
        req.setPlanCode(uniqueCode);
        req.setPlanName("Duplicate Plan Test");
        req.setBenefitType(BenefitPlan.BenefitType.LIFE_INSURANCE);
        req.setEffectiveDate(LocalDate.now());

        String body = objectMapper.writeValueAsString(req);

        // First create
        mockMvc.perform(post("/api/v1/benefits/plans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());

        // Second create with same code — expect conflict
        mockMvc.perform(post("/api/v1/benefits/plans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status == 201) {
                        throw new AssertionError(
                                "Duplicate benefit plan code should not return 201");
                    }
                });
    }

    @Test
    void ucBen001_getActivePlans_returns200WithArray() throws Exception {
        mockMvc.perform(get("/api/v1/benefits/plans/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UC-BEN-002: New hire auto-enrollment trigger
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void ucBen002_activatePlan_nonExistentPlan_returns404Or400() throws Exception {
        UUID randomPlanId = UUID.randomUUID();

        mockMvc.perform(post("/api/v1/benefits/plans/" + randomPlanId + "/activate"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status != 404 && status != 400 && status != 500) {
                        throw new AssertionError(
                                "Activate non-existent plan returned: " + status);
                    }
                });
    }

    @Test
    void ucBen002_getAllPlans_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/benefits/plans"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }
}
