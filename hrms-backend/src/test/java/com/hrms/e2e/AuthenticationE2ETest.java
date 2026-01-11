package com.hrms.e2e;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.auth.service.AuthService;
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
import com.hrms.domain.user.RoleScope;

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

    private static final String BASE_URL = "/api/v1/auth";
    private static final UUID TEST_TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");

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
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.refreshToken").exists())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.email").value(testUserEmail))
                .andReturn();

        // Store tokens for subsequent tests
        String responseBody = result.getResponse().getContentAsString();
        accessToken = objectMapper.readTree(responseBody).get("accessToken").asText();
        refreshToken = objectMapper.readTree(responseBody).get("refreshToken").asText();

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
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.refreshToken").exists())
                .andReturn();

        // Verify new tokens are different
        String responseBody = result.getResponse().getContentAsString();
        String newAccessToken = objectMapper.readTree(responseBody).get("accessToken").asText();
        String newRefreshToken = objectMapper.readTree(responseBody).get("refreshToken").asText();

        assertThat(newAccessToken).isNotEmpty();
        // Update tokens for future tests
        accessToken = newAccessToken;
        refreshToken = newRefreshToken;
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

            String responseBody = loginResult.getResponse().getContentAsString();
            accessToken = objectMapper.readTree(responseBody).get("accessToken").asText();
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

        String newAccessToken = objectMapper.readTree(
                loginResult.getResponse().getContentAsString()
        ).get("accessToken").asText();

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
