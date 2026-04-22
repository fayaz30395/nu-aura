package com.hrms.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.letter.dto.GenerateLetterRequest;
import com.hrms.api.letter.dto.LetterTemplateRequest;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.letter.LetterTemplate.LetterCategory;
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

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for LetterController.
 * Covers UC-LETTER-001 through UC-LETTER-007.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("Letter Controller Integration Tests")
class LetterControllerTest {

    private static final String BASE_URL = "/api/v1/letters";
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

    // ========================= UC-LETTER-001: Create template + Generate letter =========================

    @Test
    @DisplayName("ucLetterA1_createTemplate_returns201")
    void ucLetterA1_createTemplate_returns201() throws Exception {
        LetterTemplateRequest request = buildTemplateRequest("Experience Letter Template", LetterCategory.EXPERIENCE);

        mockMvc.perform(post(BASE_URL + "/templates")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Experience Letter Template"))
                .andExpect(jsonPath("$.category").value("EXPERIENCE"));
    }

    @Test
    @DisplayName("ucLetterA2_createTemplateMissingName_returns400")
    void ucLetterA2_createTemplateMissingName_returns400() throws Exception {
        // Build a request missing the required `name` field — validation should fail
        LetterTemplateRequest request = LetterTemplateRequest.builder()
                // name intentionally omitted
                .code("offer-template")
                .category(LetterCategory.OFFER)
                .templateContent("Dear {{employeeName}},")
                .build();

        mockMvc.perform(post(BASE_URL + "/templates")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("ucLetterA3_generateExperienceLetter_returns201")
    void ucLetterA3_generateExperienceLetter_returns201() throws Exception {
        // First create a template
        LetterTemplateRequest templateRequest = buildTemplateRequest("Exp Letter", LetterCategory.EXPERIENCE);
        String templateBody = mockMvc.perform(post(BASE_URL + "/templates")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(templateRequest)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        UUID templateId = UUID.fromString(objectMapper.readTree(templateBody).get("id").asText());

        // Generate the letter
        GenerateLetterRequest request = GenerateLetterRequest.builder()
                .templateId(templateId)
                .employeeId(EMPLOYEE_ID)
                .letterTitle("Experience Letter - Test Employee")
                .letterDate(LocalDate.now())
                .submitForApproval(false)
                .build();

        mockMvc.perform(post(BASE_URL + "/generate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.employeeId").value(EMPLOYEE_ID.toString()));
    }

    @Test
    @DisplayName("ucLetterA4_getAllTemplates_returns200WithPage")
    void ucLetterA4_getAllTemplates_returns200WithPage() throws Exception {
        mockMvc.perform(get(BASE_URL + "/templates")
                        .param("page", "0").param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    @DisplayName("ucLetterA5_getActiveTemplates_returns200")
    void ucLetterA5_getActiveTemplates_returns200() throws Exception {
        mockMvc.perform(get(BASE_URL + "/templates/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @DisplayName("ucLetterA6_adminCanGenerateLetterForAnyEmployee_returns201")
    void ucLetterA6_adminCanGenerateLetterForAnyEmployee_returns201() throws Exception {
        // Create template
        LetterTemplateRequest templateRequest = buildTemplateRequest("Salary Certificate", LetterCategory.SALARY_CERTIFICATE);
        String templateBody = mockMvc.perform(post(BASE_URL + "/templates")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(templateRequest)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        UUID templateId = UUID.fromString(objectMapper.readTree(templateBody).get("id").asText());

        // Generate for a specific employee (admin can do this)
        UUID targetEmployeeId = UUID.randomUUID();
        GenerateLetterRequest request = GenerateLetterRequest.builder()
                .templateId(templateId)
                .employeeId(targetEmployeeId)
                .letterDate(LocalDate.now())
                .build();

        mockMvc.perform(post(BASE_URL + "/generate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("ucLetterA7_employeeRole_cannotGenerateLetterForOtherEmployee_returns403")
    void ucLetterA7_employeeRole_cannotGenerateLetterForOtherEmployee_returns403() throws Exception {
        // Create template as super admin
        LetterTemplateRequest templateRequest = buildTemplateRequest("Offer Letter", LetterCategory.OFFER);
        String templateBody = mockMvc.perform(post(BASE_URL + "/templates")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(templateRequest)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        UUID templateId = UUID.fromString(objectMapper.readTree(templateBody).get("id").asText());

        // Switch to restricted employee
        UUID selfEmployeeId = UUID.randomUUID();
        Map<String, RoleScope> restrictedPerms = new HashMap<>();
        restrictedPerms.put(Permission.LETTER_GENERATE, RoleScope.SELF);
        SecurityContext.setCurrentUser(UUID.randomUUID(), selfEmployeeId, Set.of("EMPLOYEE"), restrictedPerms);

        // Try to generate for a DIFFERENT employee
        UUID otherEmployeeId = UUID.randomUUID();
        GenerateLetterRequest request = GenerateLetterRequest.builder()
                .templateId(templateId)
                .employeeId(otherEmployeeId)
                .letterDate(LocalDate.now())
                .build();

        mockMvc.perform(post(BASE_URL + "/generate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    // ============================= Helpers =============================

    private LetterTemplateRequest buildTemplateRequest(String name, LetterCategory category) {
        return LetterTemplateRequest.builder()
                .name(name)
                .code(name.toLowerCase().replace(" ", "-") + "-" + UUID.randomUUID().toString().substring(0, 6))
                .category(category)
                .templateContent("Dear {{employeeName}},\n\nThis is to certify that you have been employed with us.\n\nRegards,\nHR Team")
                .isActive(true)
                .requiresApproval(false)
                .build();
    }
}
