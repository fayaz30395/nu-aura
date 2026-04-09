package com.hrms.api.employee;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.employee.service.SkillService;
import com.hrms.common.security.*;
import com.hrms.domain.employee.EmployeeSkill;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(EmployeeSkillController.class)
@ContextConfiguration(classes = {EmployeeSkillController.class, EmployeeSkillControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("EmployeeSkillController Tests")
class EmployeeSkillControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private SkillService skillService;
    @MockitoBean
    private ApiKeyService apiKeyService;
    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;
    @MockitoBean
    private UserDetailsService userDetailsService;
    @MockitoBean
    private ApiKeyAuthenticationFilter apiKeyAuthenticationFilter;
    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockitoBean
    private RateLimitFilter rateLimitFilter;
    @MockitoBean
    private RateLimitingFilter rateLimitingFilter;
    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID employeeId;
    private UUID tenantId;
    private UUID skillId;

    @BeforeEach
    void setUp() {
        employeeId = UUID.randomUUID();
        tenantId = UUID.randomUUID();
        skillId = UUID.randomUUID();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Test
    @DisplayName("Should get employee skills successfully")
    void shouldGetEmployeeSkills() throws Exception {
        EmployeeSkill skill = new EmployeeSkill();
        skill.setEmployeeId(employeeId);

        try (MockedStatic<SecurityContext> mocked = mockStatic(SecurityContext.class)) {
            mocked.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
            when(skillService.getEmployeeSkills(tenantId, employeeId))
                    .thenReturn(List.of(skill));

            mockMvc.perform(get("/api/v1/employees/{employeeId}/skills", employeeId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)));

            verify(skillService).getEmployeeSkills(tenantId, employeeId);
        }
    }

    @Test
    @DisplayName("Should return empty list when employee has no skills")
    void shouldReturnEmptyListWhenNoSkills() throws Exception {
        try (MockedStatic<SecurityContext> mocked = mockStatic(SecurityContext.class)) {
            mocked.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
            when(skillService.getEmployeeSkills(tenantId, employeeId))
                    .thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v1/employees/{employeeId}/skills", employeeId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));
        }
    }

    @Test
    @DisplayName("Should add skill for employee successfully")
    void shouldAddSkillSuccessfully() throws Exception {
        EmployeeSkillController.AddSkillRequest request = new EmployeeSkillController.AddSkillRequest();
        request.setSkillName("Java");
        request.setCategory("Programming");
        request.setProficiencyLevel(4);
        request.setSource("Self-assessed");

        EmployeeSkill skill = new EmployeeSkill();
        skill.setEmployeeId(employeeId);

        try (MockedStatic<SecurityContext> mocked = mockStatic(SecurityContext.class)) {
            mocked.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
            when(skillService.addOrUpdateSkill(eq(tenantId), eq(employeeId), eq("Java"),
                    eq("Programming"), eq(4), eq("Self-assessed")))
                    .thenReturn(skill);

            mockMvc.perform(post("/api/v1/employees/{employeeId}/skills", employeeId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());

            verify(skillService).addOrUpdateSkill(tenantId, employeeId, "Java", "Programming", 4, "Self-assessed");
        }
    }

    @Test
    @DisplayName("Should return 400 when skill name is blank")
    void shouldReturn400WhenSkillNameBlank() throws Exception {
        EmployeeSkillController.AddSkillRequest request = new EmployeeSkillController.AddSkillRequest();
        request.setSkillName("");
        request.setCategory("Programming");
        request.setProficiencyLevel(3);

        mockMvc.perform(post("/api/v1/employees/{employeeId}/skills", employeeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should return 400 when proficiency level is out of range")
    void shouldReturn400WhenProficiencyOutOfRange() throws Exception {
        EmployeeSkillController.AddSkillRequest request = new EmployeeSkillController.AddSkillRequest();
        request.setSkillName("Java");
        request.setCategory("Programming");
        request.setProficiencyLevel(6);

        mockMvc.perform(post("/api/v1/employees/{employeeId}/skills", employeeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should verify skill successfully")
    void shouldVerifySkillSuccessfully() throws Exception {
        UUID verifierId = UUID.randomUUID();

        try (MockedStatic<SecurityContext> mocked = mockStatic(SecurityContext.class)) {
            mocked.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
            mocked.when(SecurityContext::getCurrentEmployeeId).thenReturn(verifierId);
            doNothing().when(skillService).verifySkill(tenantId, skillId, verifierId);

            mockMvc.perform(put("/api/v1/employees/skills/{skillId}/verify", skillId))
                    .andExpect(status().isOk());

            verify(skillService).verifySkill(tenantId, skillId, verifierId);
        }
    }

    @Test
    @DisplayName("Should remove skill successfully")
    void shouldRemoveSkillSuccessfully() throws Exception {
        try (MockedStatic<SecurityContext> mocked = mockStatic(SecurityContext.class)) {
            mocked.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
            doNothing().when(skillService).removeSkill(tenantId, skillId);

            mockMvc.perform(delete("/api/v1/employees/skills/{skillId}", skillId))
                    .andExpect(status().isNoContent());

            verify(skillService).removeSkill(tenantId, skillId);
        }
    }

    @Test
    @DisplayName("Should return 400 when category is blank")
    void shouldReturn400WhenCategoryBlank() throws Exception {
        EmployeeSkillController.AddSkillRequest request = new EmployeeSkillController.AddSkillRequest();
        request.setSkillName("Java");
        request.setCategory("");
        request.setProficiencyLevel(3);

        mockMvc.perform(post("/api/v1/employees/{employeeId}/skills", employeeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should return 400 when proficiency level is null")
    void shouldReturn400WhenProficiencyNull() throws Exception {
        EmployeeSkillController.AddSkillRequest request = new EmployeeSkillController.AddSkillRequest();
        request.setSkillName("Java");
        request.setCategory("Programming");
        // proficiencyLevel left null

        mockMvc.perform(post("/api/v1/employees/{employeeId}/skills", employeeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}
