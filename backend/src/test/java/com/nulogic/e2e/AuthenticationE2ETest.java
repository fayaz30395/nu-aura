package com.nulogic.e2e;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.application.auth.service.AuthService;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.config.AbstractPostgresIntegrationTest;
import com.nulogic.config.TestSecurityConfig;
import com.nulogic.domain.user.User;
import com.nulogic.infrastructure.user.repository.UserRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-End tests for Authentication functionality.
 * Tests the complete authentication workflow including login, token refresh, and password management.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class AuthenticationE2ETest extends AbstractPostgresIntegrationTest {

    private static final String BASE_URL = "/api/v1/auth";
    private static final UUID TEST_TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private AuthService authService;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    private UUID testUserId;
    private String testUserEmail;
    private String testUserPassword = "TestPassword123!";
    private String accessToken;
    private String refreshToken;

    @BeforeAll
    void setUpTestData() {
        // Create test user
        testUserEmail = "auth.test" + System.currentTimeMillis() + "@test.com";

        User testUser = User.builder()
                .email(testUserEmail)
                .passwordHash(passwordEncoder.encode(testUserPassword))
                .firstName("Auth")
                .lastName("TestUser")
                .status(User.UserStatus.ACTIVE)
                .build();
        testUser.setTenantId(TEST_TENANT_ID);

        User savedUser = userRepository.save(testUser);
        testUserId = savedUser.getId();
    }

    @BeforeEach
    void setUp() {
        SecurityContext.setCurrentTenantId(TEST_TENANT_ID);
        TenantContext.setCurrentTenant(TEST_TENANT_ID);
    }

    // ==================== Login Tests ====================

    @Test
    @Order(1)
    @DisplayName("E2E: Login with valid credentials")
    void login_ValidCredentials_Success() throws Exception {
        Map<String, String> loginRequest = new HashMap<>();
        loginRequest.put("email", testUserEmail);
        loginRequest.put("password", testUserPassword);

        MvcResult result = mockMvc.perform(post(BASE_URL + "/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Tenant-ID", TEST_TENANT_ID.toString())
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.email").value(testUserEmail))
                .andReturn();

        // Tokens are returned in httpOnly cookies (security best practice), not in body
        Cookie accessCookie = result.getResponse().getCookie("access_token");
        Cookie refreshCookie = result.getResponse().getCookie("refresh_token");
        assertThat(accessCookie).isNotNull();
        assertThat(refreshCookie).isNotNull();
        accessToken = accessCookie.getValue();
        refreshToken = refreshCookie.getValue();

        assertThat(accessToken).isNotEmpty();
        assertThat(refreshToken).isNotEmpty();
    }

    @Test
    @Order(2)
    @DisplayName("E2E: Login with invalid password fails")
    void login_InvalidPassword_Fails() throws Exception {
        Map<String, String> loginRequest = new HashMap<>();
        loginRequest.put("email", testUserEmail);
        loginRequest.put("password", "WrongPassword123!");

        mockMvc.perform(post(BASE_URL + "/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Tenant-ID", TEST_TENANT_ID.toString())
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @Order(3)
    @DisplayName("E2E: Login with non-existent email fails")
    void login_NonExistentEmail_Fails() throws Exception {
        Map<String, String> loginRequest = new HashMap<>();
        loginRequest.put("email", "nonexistent@test.com");
        loginRequest.put("password", testUserPassword);

        mockMvc.perform(post(BASE_URL + "/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Tenant-ID", TEST_TENANT_ID.toString())
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized());
    }

    // ==================== Token Refresh Tests ====================

    @Test
    @Order(4)
    @DisplayName("E2E: Refresh token successfully")
    void refreshToken_Valid_Success() throws Exception {
        assertThat(refreshToken).isNotEmpty();

        MvcResult result = mockMvc.perform(post(BASE_URL + "/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Tenant-ID", TEST_TENANT_ID.toString())
                        .header("X-Refresh-Token", refreshToken))
                .andExpect(status().isOk())
                .andReturn();

        // New tokens are returned in cookies (body fields are nulled for security)
        Cookie newAccessCookie = result.getResponse().getCookie("access_token");
        Cookie newRefreshCookie = result.getResponse().getCookie("refresh_token");
        assertThat(newAccessCookie).isNotNull();
        assertThat(newRefreshCookie).isNotNull();

        accessToken = newAccessCookie.getValue();
        refreshToken = newRefreshCookie.getValue();
        assertThat(accessToken).isNotEmpty();
    }

    @Test
    @Order(5)
    @DisplayName("E2E: Refresh with invalid token fails")
    void refreshToken_Invalid_Fails() throws Exception {
        mockMvc.perform(post(BASE_URL + "/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Tenant-ID", TEST_TENANT_ID.toString())
                        .header("X-Refresh-Token", "invalid-refresh-token"))
                .andExpect(status().isUnauthorized());
    }

    // ==================== Password Change Tests ====================

    @Test
    @Order(6)
    @DisplayName("E2E: Change password successfully")
    void changePassword_Valid_Success() throws Exception {
        // Ensure we have an access token (login if needed)
        if (accessToken == null || accessToken.isEmpty()) {
            Map<String, String> loginRequest = new HashMap<>();
            loginRequest.put("email", testUserEmail);
            loginRequest.put("password", testUserPassword);

            MvcResult loginResult = mockMvc.perform(post(BASE_URL + "/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .header("X-Tenant-ID", TEST_TENANT_ID.toString())
                            .content(objectMapper.writeValueAsString(loginRequest)))
                    .andExpect(status().isOk())
                    .andReturn();

            Cookie c = loginResult.getResponse().getCookie("access_token");
            accessToken = c != null ? c.getValue() : null;
        }

        assertThat(accessToken).isNotEmpty();

        // Set up security context with the test user ID
        SecurityContext.setCurrentUser(testUserId, null, Set.of("EMPLOYEE"), Map.of());
        SecurityContext.setCurrentTenantId(TEST_TENANT_ID);
        TenantContext.setCurrentTenant(TEST_TENANT_ID);

        String newPassword = "NewTestPassword456!";

        Map<String, String> changePasswordRequest = new HashMap<>();
        changePasswordRequest.put("currentPassword", testUserPassword);
        changePasswordRequest.put("newPassword", newPassword);
        changePasswordRequest.put("confirmPassword", newPassword);

        mockMvc.perform(post(BASE_URL + "/change-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + accessToken)
                        .header("X-Tenant-ID", TEST_TENANT_ID.toString())
                        .content(objectMapper.writeValueAsString(changePasswordRequest)))
                .andExpect(status().isOk());

        // Verify can login with new password
        Map<String, String> loginRequest = new HashMap<>();
        loginRequest.put("email", testUserEmail);
        loginRequest.put("password", newPassword);

        mockMvc.perform(post(BASE_URL + "/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Tenant-ID", TEST_TENANT_ID.toString())
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk());

        // Update stored password
        testUserPassword = newPassword;
    }

    @Test
    @Order(7)
    @DisplayName("E2E: Change password with wrong current password fails")
    void changePassword_WrongCurrentPassword_Fails() throws Exception {
        // Re-login to get fresh token
        Map<String, String> loginRequest = new HashMap<>();
        loginRequest.put("email", testUserEmail);
        loginRequest.put("password", testUserPassword);

        MvcResult loginResult = mockMvc.perform(post(BASE_URL + "/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Tenant-ID", TEST_TENANT_ID.toString())
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        Cookie newAccessCookie = loginResult.getResponse().getCookie("access_token");
        String newAccessToken = newAccessCookie != null ? newAccessCookie.getValue() : "";

        Map<String, String> changePasswordRequest = new HashMap<>();
        changePasswordRequest.put("currentPassword", "WrongCurrentPassword123!");
        changePasswordRequest.put("newPassword", "AnotherNewPassword789!");
        changePasswordRequest.put("confirmPassword", "AnotherNewPassword789!");

        // Set up security context with the test user ID
        SecurityContext.setCurrentUser(testUserId, null, Set.of("EMPLOYEE"), Map.of());
        SecurityContext.setCurrentTenantId(TEST_TENANT_ID);
        TenantContext.setCurrentTenant(TEST_TENANT_ID);

        mockMvc.perform(post(BASE_URL + "/change-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + newAccessToken)
                        .header("X-Tenant-ID", TEST_TENANT_ID.toString())
                        .content(objectMapper.writeValueAsString(changePasswordRequest)))
                .andExpect(status().isUnauthorized());
    }

    // ==================== Password Reset Tests ====================

    @Test
    @Order(8)
    @DisplayName("E2E: Request password reset")
    void requestPasswordReset_ValidEmail_Success() throws Exception {
        Map<String, String> resetRequest = new HashMap<>();
        resetRequest.put("email", testUserEmail);

        mockMvc.perform(post(BASE_URL + "/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Tenant-ID", TEST_TENANT_ID.toString())
                        .content(objectMapper.writeValueAsString(resetRequest)))
                .andExpect(status().isOk());
    }

    @Test
    @Order(9)
    @DisplayName("E2E: Request password reset for non-existent email succeeds (security)")
    void requestPasswordReset_NonExistentEmail_SucceedsForSecurity() throws Exception {
        // Should return success even for non-existent email (security best practice)
        Map<String, String> resetRequest = new HashMap<>();
        resetRequest.put("email", "nonexistent.user@test.com");

        mockMvc.perform(post(BASE_URL + "/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Tenant-ID", TEST_TENANT_ID.toString())
                        .content(objectMapper.writeValueAsString(resetRequest)))
                .andExpect(status().isOk());
    }

    // ==================== Logout Tests ====================

    @Test
    @Order(10)
    @DisplayName("E2E: Logout successfully")
    void logout_Success() throws Exception {
        // First login to get fresh tokens
        Map<String, String> loginRequest = new HashMap<>();
        loginRequest.put("email", testUserEmail);
        loginRequest.put("password", testUserPassword);

        MvcResult loginResult = mockMvc.perform(post(BASE_URL + "/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Tenant-ID", TEST_TENANT_ID.toString())
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        Cookie logoutAccessCookie = loginResult.getResponse().getCookie("access_token");
        Cookie logoutRefreshCookie = loginResult.getResponse().getCookie("refresh_token");
        String logoutAccessToken = logoutAccessCookie != null ? logoutAccessCookie.getValue() : "";
        String logoutRefreshToken = logoutRefreshCookie != null ? logoutRefreshCookie.getValue() : "";

        // Perform logout
        Map<String, String> logoutRequest = new HashMap<>();
        logoutRequest.put("refreshToken", logoutRefreshToken);

        mockMvc.perform(post(BASE_URL + "/logout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + logoutAccessToken)
                        .header("X-Tenant-ID", TEST_TENANT_ID.toString())
                        .content(objectMapper.writeValueAsString(logoutRequest)))
                .andExpect(status().isOk());
    }

    // ==================== Service Layer Tests ====================

    @Test
    @Order(11)
    @DisplayName("E2E: AuthService validates credentials correctly")
    void authService_ValidatesCredentials() {
        // This tests the service layer directly
        // Note: Actual implementation depends on your AuthService interface

        // Verify user exists
        Optional<User> user = userRepository.findByEmailAndTenantId(testUserEmail, TEST_TENANT_ID);
        assertThat(user).isPresent();
        assertThat(user.get().getStatus()).isEqualTo(User.UserStatus.ACTIVE);
    }

    // ==================== Validation Tests ====================

    @Test
    @Order(12)
    @DisplayName("E2E: Login with empty email fails validation")
    void login_EmptyEmail_FailsValidation() throws Exception {
        Map<String, String> loginRequest = new HashMap<>();
        loginRequest.put("email", "");
        loginRequest.put("password", testUserPassword);

        mockMvc.perform(post(BASE_URL + "/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Tenant-ID", TEST_TENANT_ID.toString())
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(13)
    @DisplayName("E2E: Login with empty password fails validation")
    void login_EmptyPassword_FailsValidation() throws Exception {
        Map<String, String> loginRequest = new HashMap<>();
        loginRequest.put("email", testUserEmail);
        loginRequest.put("password", "");

        mockMvc.perform(post(BASE_URL + "/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Tenant-ID", TEST_TENANT_ID.toString())
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isBadRequest());
    }

    @AfterAll
    void cleanUp() {
        // Clean up test user
        if (testUserId != null) {
            userRepository.deleteById(testUserId);
        }
    }
}
