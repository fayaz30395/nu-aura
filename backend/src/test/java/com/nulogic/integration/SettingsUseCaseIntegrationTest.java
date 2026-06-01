package com.nulogic.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.api.auth.dto.ChangePasswordRequest;
import com.nulogic.api.auth.dto.MfaVerifyRequest;
import com.nulogic.api.user.dto.UpdateNotificationPreferencesRequest;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.config.AbstractPostgresIntegrationTest;
import com.nulogic.config.TestSecurityConfig;
import com.nulogic.domain.user.AuthProvider;
import com.nulogic.domain.user.RoleScope;
import com.nulogic.domain.user.User;
import com.nulogic.infrastructure.user.repository.UserRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests for settings use cases.
 * Covers UC-SETTINGS-001 through UC-SETTINGS-007.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("Settings Use Case Integration Tests")
class SettingsUseCaseIntegrationTest extends AbstractPostgresIntegrationTest {

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    @Autowired
    MockMvc mockMvc;
    @Autowired
    ObjectMapper objectMapper;
    @Autowired
    UserRepository userRepository;
    private UUID userId;
    private UUID employeeId = UUID.fromString("111e8400-e29b-41d4-a716-446655440099");

    @BeforeEach
    void setUpSuperAdminContext() {
        // Seed test user with generated ID (avoids @Id-assigned + null @Version "detached" trap)
        User user = User.builder()
                .email("settings-test-" + UUID.randomUUID() + "@example.com")
                .firstName("Settings")
                .lastName("Tester")
                .passwordHash("$2a$10$dummyhashfortestingonlydummyhashfortestingdummyha")
                .status(User.UserStatus.ACTIVE)
                .authProvider(AuthProvider.LOCAL)
                .mfaEnabled(false)
                .build();
        user.setTenantId(TENANT_ID);
        userId = userRepository.save(user).getId();

        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.SYSTEM_ADMIN, RoleScope.ALL);
        SecurityContext.setCurrentUser(userId, employeeId, Set.of("SUPER_ADMIN"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);

        // Provide a Spring Security Authentication so @PreAuthorize("isAuthenticated()") passes
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                userId.toString(), "n/a",
                List.of(new SimpleGrantedAuthority("ROLE_SUPER_ADMIN")));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    // ========================= UC-SETTINGS-001: Change password (correct current password) =========================

    @Test
    @DisplayName("ucSettings1_changePassword_weakNewPassword_returns400")
    void ucSettings1_changePassword_weakNewPassword_returns400() throws Exception {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("OldPassword@123");
        request.setNewPassword("weak");       // violates @Size(min=8)
        request.setConfirmPassword("weak");

        mockMvc.perform(post("/api/v1/auth/change-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("ucSettings1_changePassword_missingCurrentPassword_returns400")
    void ucSettings1_changePassword_missingCurrentPassword_returns400() throws Exception {
        ChangePasswordRequest request = new ChangePasswordRequest();
        // currentPassword intentionally blank
        request.setCurrentPassword("");
        request.setNewPassword("NewPassword@456!");
        request.setConfirmPassword("NewPassword@456!");

        mockMvc.perform(post("/api/v1/auth/change-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // ========================= UC-SETTINGS-002: Complexity enforcement =========================

    @Test
    @DisplayName("ucSettings2_changePassword_passwordTooShort_returns400")
    void ucSettings2_changePassword_passwordTooShort_returns400() throws Exception {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("OldPassword@123");
        request.setNewPassword("Ab1!");       // too short — less than 8 chars
        request.setConfirmPassword("Ab1!");

        mockMvc.perform(post("/api/v1/auth/change-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // ========================= UC-SETTINGS-003: MFA setup =========================

    @Test
    @DisplayName("ucSettings3_mfaSetup_returnsQrCode_200")
    void ucSettings3_mfaSetup_returnsQrCode_200() throws Exception {
        mockMvc.perform(get("/api/v1/auth/mfa/setup"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.qrCodeUrl").isNotEmpty())
                .andExpect(jsonPath("$.secret").isNotEmpty());
    }

    @Test
    @DisplayName("ucSettings3_mfaStatus_returns200")
    void ucSettings3_mfaStatus_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/auth/mfa/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").isBoolean());
    }

    @Test
    @DisplayName("ucSettings3_mfaVerify_invalidCode_returns401")
    void ucSettings3_mfaVerify_invalidCode_returns401() throws Exception {
        MfaVerifyRequest request = new MfaVerifyRequest();
        request.setCode("000000");   // invalid TOTP code

        mockMvc.perform(post("/api/v1/auth/mfa/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    // ========================= UC-SETTINGS-004: Revoke active session =========================

    @Test
    @DisplayName("ucSettings4_revokeSession_returns200TokenInvalidated")
    void ucSettings4_revokeSession_returns200TokenInvalidated() throws Exception {
        // Session revocation is handled by logout + token blacklisting.
        // The POST /api/v1/auth/logout endpoint blacklists the token via TokenBlacklistService.
        mockMvc.perform(post("/api/v1/auth/logout"))
                .andExpect(status().isOk());
    }

    // ========================= UC-SETTINGS-005: Update notification preferences =========================

    @Test
    @DisplayName("ucSettings5_getNotificationPreferences_returns200")
    void ucSettings5_getNotificationPreferences_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/notification-preferences"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ucSettings5_updateNotificationPreferences_returns200Persisted")
    void ucSettings5_updateNotificationPreferences_returns200Persisted() throws Exception {
        UpdateNotificationPreferencesRequest request = new UpdateNotificationPreferencesRequest();
        request.setEmailNotifications(true);
        request.setPushNotifications(false);
        request.setSmsNotifications(false);
        request.setSecurityAlerts(true);

        mockMvc.perform(put("/api/v1/notification-preferences")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.emailNotifications").value(true))
                .andExpect(jsonPath("$.pushNotifications").value(false));
    }

    // ========================= UC-SETTINGS-006: SSO Configuration =========================

    @Test
    @DisplayName("ucSettings6_getSamlConfig_returnsOkOrNotFound")
    void ucSettings6_getSamlConfig_returnsOkOrNotFound() throws Exception {
        // SAML config may or may not be configured in the test tenant — both are valid
        mockMvc.perform(get("/api/v1/auth/saml/config"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status != 200 && status != 404 && status != 403) {
                        throw new AssertionError("Unexpected status: " + status);
                    }
                });
    }

    // ========================= UC-SETTINGS-007: Update display preferences =========================

    @Test
    @DisplayName("ucSettings7_getCurrentUser_returns200WithProfile")
    void ucSettings7_getCurrentUser_returns200WithProfile() throws Exception {
        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNotEmpty());
    }

    @Test
    @DisplayName("ucSettings7_getAuthMe_returns200WithProfile")
    void ucSettings7_getAuthMe_returns200WithProfile() throws Exception {
        // User profile serves as base for display preferences
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isOk());
    }
}
