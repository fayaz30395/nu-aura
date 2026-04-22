package com.hrms.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * App Switcher Use-Case Integration Tests — UC-APPSW-001 through UC-APPSW-003
 * <p>
 * Tests that the app switcher correctly exposes apps based on user permissions
 * and that cross-app route access is controlled by role.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@DisplayName("App Switcher Use-Case Integration Tests (UC-APPSW)")
class AppSwitcherUseCaseIntegrationTest {

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

    // ─────────────────────────────────────────────────────────────────────────
    // UC-APPSW-001: app switcher returns list of apps user has access to
    // App access is controlled by backend module permissions (HRMS, Hire, Grow, Fluence)
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("UC-APPSW-001: SUPER_ADMIN can access HRMS employee list (NU-HRMS app)")
    void ucAppsw001_superAdmin_canAccessHrmsApp() throws Exception {
        mockMvc.perform(get("/api/v1/employees")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("UC-APPSW-001: SUPER_ADMIN can access Recruitment (NU-Hire app)")
    void ucAppsw001_superAdmin_canAccessHireApp() throws Exception {
        mockMvc.perform(get("/api/v1/recruitment/job-openings")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("UC-APPSW-001: SUPER_ADMIN can access LMS (NU-Grow app)")
    void ucAppsw001_superAdmin_canAccessGrowApp() throws Exception {
        mockMvc.perform(get("/api/v1/lms/courses")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UC-APPSW-002: switching from HRMS to Hire app — Hire routes accessible
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("UC-APPSW-002: RECRUITMENT_VIEW permission allows access to Hire app routes")
    void ucAppsw002_hiringAppRoutes_accessibleWithRecruitmentPermission() throws Exception {
        Map<String, RoleScope> hiringPerms = new HashMap<>();
        hiringPerms.put(Permission.RECRUITMENT_VIEW, RoleScope.ALL);
        hiringPerms.put(Permission.EMPLOYEE_VIEW_SELF, RoleScope.SELF);
        SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID, Set.of("RECRUITER"), hiringPerms);
        TenantContext.setCurrentTenant(TENANT_ID);

        // Hire app route — should be accessible
        mockMvc.perform(get("/api/v1/recruitment/job-openings")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("UC-APPSW-002: Recruiter can list job openings in Hire app")
    void ucAppsw002_recruiter_canListJobOpenings() throws Exception {
        Map<String, RoleScope> recruiterPerms = new HashMap<>();
        recruiterPerms.put(Permission.RECRUITMENT_VIEW, RoleScope.ALL);
        SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID, Set.of("RECRUITER"), recruiterPerms);
        TenantContext.setCurrentTenant(TENANT_ID);

        mockMvc.perform(get("/api/v1/recruitment/job-openings")
                        .param("page", "0")
                        .param("size", "20")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UC-APPSW-003: EMPLOYEE role cannot access Grow admin routes after switch
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("UC-APPSW-003: EMPLOYEE without LMS_COURSE_MANAGE → 403 on Grow admin course creation")
    void ucAppsw003_employee_cannotAccessGrowAdminRoutes_returns403() throws Exception {
        Map<String, RoleScope> employeePerms = new HashMap<>();
        employeePerms.put(Permission.EMPLOYEE_VIEW_SELF, RoleScope.SELF);
        employeePerms.put(Permission.TRAINING_VIEW, RoleScope.SELF);
        // NO LMS_COURSE_MANAGE (Grow admin permission)
        SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID, Set.of("EMPLOYEE"), employeePerms);
        TenantContext.setCurrentTenant(TENANT_ID);

        Map<String, Object> courseRequest = new HashMap<>();
        courseRequest.put("title", "Hacker Course");
        courseRequest.put("description", "Unauthorized course creation");

        mockMvc.perform(post("/api/v1/lms/courses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(courseRequest)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("UC-APPSW-003: EMPLOYEE without RECRUITMENT_CREATE → 403 on Hire admin routes")
    void ucAppsw003_employee_cannotAccessHireAdminRoutes_returns403() throws Exception {
        Map<String, RoleScope> employeePerms = new HashMap<>();
        employeePerms.put(Permission.EMPLOYEE_VIEW_SELF, RoleScope.SELF);
        // NO RECRUITMENT_CREATE
        SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID, Set.of("EMPLOYEE"), employeePerms);
        TenantContext.setCurrentTenant(TENANT_ID);

        Map<String, Object> jobRequest = new HashMap<>();
        jobRequest.put("title", "Software Engineer");
        jobRequest.put("departmentId", UUID.randomUUID().toString());

        mockMvc.perform(post("/api/v1/recruitment/job-openings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(jobRequest)))
                .andExpect(status().isForbidden());
    }
}
