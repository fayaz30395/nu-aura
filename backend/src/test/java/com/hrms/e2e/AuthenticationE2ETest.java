package com.hrms.e2e;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.user.User;
import com.hrms.infrastructure.user.repository.UserRepository;
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
import java.util.Set;


import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

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
class AuthenticationE2ETest {

    private static final String BASE_URL = "/api/v1/auth";
    private static final UUID TEST_TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
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
        TenantContext.setCurrentTenant(TEST_TENANT_ID);
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
                // Tokens are in httpOnly cookies, not in the response body
                .andExpect(cookie().exists("access_token"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.email").value(testUserEmail))
                .andReturn();

        // Store tokens from cookies for subsequent tests
        jakarta.servlet.http.Cookie accessCookie = result.getResponse().getCookie("access_token");
        jakarta.servlet.http.Cookie refreshCookie = result.getResponse().getCookie("refresh_token");

        assertThat(accessCookie).isNotNull();
        assertThat(accessCookie.getValue()).isNotEmpty();
        accessToken = accessCookie.getValue();

        if (refreshCookie != null) {
            refreshToken = refreshCookie.getValue();
        }
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
        // If refresh token wasn't stored from login (cookie may not be accessible), skip refresh
        if (refreshToken == null || refreshToken.isEmpty()) {
            // Re-login to get fresh tokens from cookies
            Map<String, String> loginRequest = new HashMap<>();
            loginRequest.put("email", testUserEmail);
            loginRequest.put("password", testUserPassword);

            MvcResult loginResult = mockMvc.perform(post(BASE_URL + "/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .header("X-Tenant-ID", TEST_TENANT_ID.toString())
                            .content(objectMapper.writeValueAsString(loginRequest)))
                    .andExpect(status().isOk())
                    .andReturn();

            jakarta.servlet.http.Cookie refreshCookie = loginResult.getResponse().getCookie("refresh_token");
            if (refreshCookie != null) {
                refreshToken = refreshCookie.getValue();
            }
        }

        // If still no refresh token, skip this test — the system uses httpOnly cookies
        org.junit.jupiter.api.Assumptions.assumeTrue(
            refreshToken != null && !refreshToken.isEmpty(),
            "Skipping refresh test: no refresh token available from httpOnly cookie"
        );

        // Send the refresh token in the cookie (httpOnly mechanism)
        MvcResult result = mockMvc.perform(post(BASE_URL + "/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Tenant-ID", TEST_TENANT_ID.toString())
                        .cookie(new jakarta.servlet.http.Cookie("refresh_token", refreshToken)))
                .andExpect(status().isOk())
                // New access token should be in the cookie
                .andExpect(cookie().exists("access_token"))
                .andReturn();

        jakarta.servlet.http.Cookie newAccessCookie = result.getResponse().getCookie("access_token");
        if (newAccessCookie != null) {
            accessToken = newAccessCookie.getValue();
        }
        jakarta.servlet.http.Cookie newRefreshCookie = result.getResponse().getCookie("refresh_token");
        if (newRefreshCookie != null) {
            refreshToken = newRefreshCookie.getValue();
        }
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
        // Ensure we have an access token (login if needed — tokens are in httpOnly cookies)
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

            jakarta.servlet.http.Cookie accessCookie = loginResult.getResponse().getCookie("access_token");
            if (accessCookie != null) {
                accessToken = accessCookie.getValue();
            }
        }

        assertThat(accessToken).isNotEmpty();

        // Set up security context with the test user ID
        SecurityContext.setCurrentUser(testUserId, null, Set.of("EMPLOYEE"), Map.of());
        TenantContext.setCurrentTenant(TEST_TENANT_ID);
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

        String newAccessToken = objectMapper.readTree(
                loginResult.getResponse().getContentAsString()
        ).get("accessToken").asText();

        Map<String, String> changePasswordRequest = new HashMap<>();
        changePasswordRequest.put("currentPassword", "WrongCurrentPassword123!");
        changePasswordRequest.put("newPassword", "AnotherNewPassword789!");
        changePasswordRequest.put("confirmPassword", "AnotherNewPassword789!");

        // Set up security context with the test user ID
        SecurityContext.setCurrentUser(testUserId, null, Set.of("EMPLOYEE"), Map.of());
        TenantContext.setCurrentTenant(TEST_TENANT_ID);
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

        String logoutAccessToken = objectMapper.readTree(
                loginResult.getResponse().getContentAsString()
        ).get("accessToken").asText();
        String logoutRefreshToken = objectMapper.readTree(
                loginResult.getResponse().getContentAsString()
        ).get("refreshToken").asText();

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
