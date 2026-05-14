package com.nulogic.application.auth.service;

import com.nulogic.api.auth.dto.AuthResponse;
import com.nulogic.api.auth.dto.ChangePasswordRequest;
import com.nulogic.api.auth.dto.LoginRequest;
import com.nulogic.api.auth.dto.ResetPasswordRequest;
import com.nulogic.application.notification.service.EmailNotificationService;
import com.nulogic.application.user.service.ImplicitRoleService;
import com.nulogic.common.config.PasswordPolicyConfig;
import com.nulogic.common.exception.AuthenticationException;
import com.nulogic.common.exception.ResourceNotFoundException;
import com.nulogic.common.exception.ValidationException;
import com.nulogic.common.security.AccountLockoutService;
import com.nulogic.common.security.JwtTokenProvider;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.user.User;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.platform.repository.UserAppAccessRepository;
import com.nulogic.infrastructure.user.repository.PasswordHistoryRepository;
import com.nulogic.infrastructure.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("AuthService Tests")
class AuthServiceTest {

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private UserAppAccessRepository userAppAccessRepository;

    @Mock
    private JwtTokenProvider tokenProvider;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private EmailNotificationService emailNotificationService;

    @Mock
    private ImplicitRoleService implicitRoleService;

    @Mock
    private com.nulogic.common.metrics.MetricsService metricsService;

    @Mock
    private PasswordPolicyService passwordPolicyService;

    @Mock
    private AccountLockoutService accountLockoutService;

    @Mock
    private PasswordHistoryRepository passwordHistoryRepository;

    @Mock
    private PasswordPolicyConfig passwordPolicyConfig;

    @Mock
    private TenantTimeService tenantTimeService;

    @InjectMocks
    private AuthService authService;

    private UUID tenantId;
    private UUID userId;
    private User user;
    private Employee employee;

    @BeforeEach
    void setUp() {
        tenantId = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
        userId = UUID.randomUUID();

        user = User.builder()
                .email("test@example.com")
                .firstName("Test")
                .lastName("User")
                .passwordHash("hashedPassword")
                .status(User.UserStatus.ACTIVE)
                .build();
        ReflectionTestUtils.setField(user, "id", userId);
        ReflectionTestUtils.setField(user, "tenantId", tenantId);

        employee = Employee.builder()
                .employeeCode("EMP001")
                .firstName("Test")
                .lastName("User")
                .build();
        ReflectionTestUtils.setField(employee, "id", UUID.randomUUID());

        ReflectionTestUtils.setField(authService, "jwtExpiration", 3600000L);
        ReflectionTestUtils.setField(authService, "allowedDomain", "nulogic.io");
        when(implicitRoleService.getImplicitRoles(any(UUID.class), any(UUID.class))).thenReturn(Set.of());
        when(implicitRoleService.getImplicitPermissions(any(UUID.class), any(UUID.class))).thenReturn(Set.of());
        // Default tenant-zone stub for tests that don't care about timezone propagation.
        // Specific timezone scenarios (see TenantTimezoneOnLoginTests) override this with
        // their own when(...).thenReturn(...) — Mockito LENIENT mode lets these coexist.
        when(tenantTimeService.zoneFor(any())).thenReturn(ZoneId.of("Asia/Kolkata"));
    }

    @Nested
    @DisplayName("Login Tests")
    class LoginTests {

        @Test
        @DisplayName("Should login successfully with valid credentials")
        void shouldLoginSuccessfully() {
            LoginRequest request = new LoginRequest();
            request.setEmail("test@example.com");
            request.setPassword("password123");
            request.setTenantId(tenantId);

            Authentication authentication = mock(Authentication.class);
            when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                    .thenReturn(authentication);
            when(userRepository.findByEmailAndTenantId("test@example.com", tenantId))
                    .thenReturn(Optional.of(user));
            when(userRepository.save(any(User.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));
            when(userAppAccessRepository.findByUserIdAndAppCodeWithPermissions(any(), any()))
                    .thenReturn(Optional.empty());
            when(userAppAccessRepository.findUserApplications(any()))
                    .thenReturn(Collections.emptyList());
            when(tokenProvider.generateTokenWithAppPermissions(any(), any(), any(), any(), any(), any(),
                    any(), any(), any(), any()))
                    .thenReturn("access-token");
            when(tokenProvider.generateRefreshToken(any(), any()))
                    .thenReturn("refresh-token");
            when(employeeRepository.findByUserIdAndTenantId(userId, tenantId))
                    .thenReturn(Optional.of(employee));

            AuthResponse response = authService.login(request);

            assertThat(response).isNotNull();
            assertThat(response.getAccessToken()).isEqualTo("access-token");
            assertThat(response.getRefreshToken()).isEqualTo("refresh-token");
            assertThat(response.getEmail()).isEqualTo("test@example.com");
            verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
        }

        @Test
        @DisplayName("Should throw exception when user not found")
        void shouldThrowExceptionWhenUserNotFound() {
            LoginRequest request = new LoginRequest();
            request.setEmail("unknown@example.com");
            request.setPassword("password123");
            request.setTenantId(tenantId);

            Authentication authentication = mock(Authentication.class);
            when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                    .thenReturn(authentication);
            when(userRepository.findByEmailAndTenantId("unknown@example.com", tenantId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> authService.login(request))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("Should use default tenant when not provided")
        void shouldUseDefaultTenantWhenNotProvided() {
            LoginRequest request = new LoginRequest();
            request.setEmail("test@example.com");
            request.setPassword("password123");
            request.setTenantId(null);

            // The login method now calls findByEmail first to auto-detect tenant
            when(userRepository.findByEmail("test@example.com"))
                    .thenReturn(Optional.of(user));

            Authentication authentication = mock(Authentication.class);
            when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                    .thenReturn(authentication);
            when(userRepository.findByEmailAndTenantId(eq("test@example.com"), any(UUID.class)))
                    .thenReturn(Optional.of(user));
            when(userRepository.save(any(User.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));
            when(userAppAccessRepository.findByUserIdAndAppCodeWithPermissions(any(), any()))
                    .thenReturn(Optional.empty());
            when(userAppAccessRepository.findUserApplications(any()))
                    .thenReturn(Collections.emptyList());
            when(tokenProvider.generateTokenWithAppPermissions(any(), any(), any(), any(), any(), any(),
                    any(), any(), any(), any()))
                    .thenReturn("access-token");
            when(tokenProvider.generateRefreshToken(any(), any()))
                    .thenReturn("refresh-token");
            when(employeeRepository.findByUserIdAndTenantId(any(), any()))
                    .thenReturn(Optional.empty());

            AuthResponse response = authService.login(request);

            assertThat(response).isNotNull();
        }
    }

    @Nested
    @DisplayName("Token Refresh Tests")
    class TokenRefreshTests {

        @Test
        @DisplayName("Should refresh token successfully")
        void shouldRefreshTokenSuccessfully() {
            String refreshToken = "valid-refresh-token";
            when(tokenProvider.validateRefreshToken(refreshToken)).thenReturn(true);
            when(tokenProvider.getUsernameFromToken(refreshToken)).thenReturn("test@example.com");
            when(tokenProvider.getTenantIdFromToken(refreshToken)).thenReturn(tenantId);
            when(userRepository.findByEmailAndTenantId("test@example.com", tenantId))
                    .thenReturn(Optional.of(user));
            when(userAppAccessRepository.findByUserIdAndAppCodeWithPermissions(any(), any()))
                    .thenReturn(Optional.empty());
            when(userAppAccessRepository.findUserApplications(any()))
                    .thenReturn(Collections.emptyList());
            when(tokenProvider.generateTokenWithAppPermissions(any(), any(), any(), any(), any(), any(),
                    any(), any(), any(), any()))
                    .thenReturn("new-access-token");
            when(tokenProvider.generateRefreshToken(any(), any()))
                    .thenReturn("new-refresh-token");
            when(employeeRepository.findByUserIdAndTenantId(any(), any()))
                    .thenReturn(Optional.empty());

            AuthResponse response = authService.refresh(refreshToken);

            assertThat(response).isNotNull();
            assertThat(response.getAccessToken()).isEqualTo("new-access-token");
            assertThat(response.getRefreshToken()).isEqualTo("new-refresh-token");
        }

        @Test
        @DisplayName("Should throw exception for invalid refresh token")
        void shouldThrowExceptionForInvalidRefreshToken() {
            String invalidToken = "invalid-token";
            when(tokenProvider.validateRefreshToken(invalidToken)).thenReturn(false);

            assertThatThrownBy(() -> authService.refresh(invalidToken))
                    .isInstanceOf(AuthenticationException.class)
                    .hasMessageContaining("Invalid or expired");
        }
    }

    @Nested
    @DisplayName("Change Password Tests")
    class ChangePasswordTests {

        @Test
        @DisplayName("Should change password successfully")
        void shouldChangePasswordSuccessfully() {
            ChangePasswordRequest request = new ChangePasswordRequest();
            request.setCurrentPassword("oldPassword");
            request.setNewPassword("newPassword123");
            request.setConfirmPassword("newPassword123");

            when(userRepository.findById(userId)).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("oldPassword", "hashedPassword")).thenReturn(true);
            when(passwordEncoder.encode("newPassword123")).thenReturn("newHashedPassword");
            when(userRepository.save(any(User.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            authService.changePassword(userId, request);

            verify(userRepository).save(any(User.class));
            verify(passwordEncoder).encode("newPassword123");
        }

        @Test
        @DisplayName("Should throw exception when passwords don't match")
        void shouldThrowExceptionWhenPasswordsDontMatch() {
            ChangePasswordRequest request = new ChangePasswordRequest();
            request.setCurrentPassword("oldPassword");
            request.setNewPassword("newPassword123");
            request.setConfirmPassword("differentPassword");

            assertThatThrownBy(() -> authService.changePassword(userId, request))
                    .isInstanceOf(ValidationException.class)
                    .hasMessageContaining("do not match");
        }

        @Test
        @DisplayName("Should throw exception when current password is incorrect")
        void shouldThrowExceptionWhenCurrentPasswordIncorrect() {
            ChangePasswordRequest request = new ChangePasswordRequest();
            request.setCurrentPassword("wrongPassword");
            request.setNewPassword("newPassword123");
            request.setConfirmPassword("newPassword123");

            when(userRepository.findById(userId)).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("wrongPassword", "hashedPassword")).thenReturn(false);

            assertThatThrownBy(() -> authService.changePassword(userId, request))
                    .isInstanceOf(AuthenticationException.class)
                    .hasMessageContaining("incorrect");
        }
    }

    @Nested
    @DisplayName("Password Reset Tests")
    class PasswordResetTests {

        @Test
        @DisplayName("Should request password reset for existing user")
        void shouldRequestPasswordResetForExistingUser() {
            when(userRepository.findByEmail("test@example.com"))
                    .thenReturn(Optional.of(user));
            when(userRepository.save(any(User.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            authService.requestPasswordReset("test@example.com");

            verify(userRepository).save(argThat(savedUser -> savedUser.getPasswordResetToken() != null &&
                    savedUser.getPasswordResetTokenExpiry() != null));
            verify(emailNotificationService).sendPasswordResetEmail(eq("test@example.com"), anyString(),
                    anyString());
        }

        @Test
        @DisplayName("Should not throw exception for non-existent email (security)")
        void shouldNotThrowExceptionForNonExistentEmail() {
            when(userRepository.findByEmail("unknown@example.com"))
                    .thenReturn(Optional.empty());

            assertThatCode(() -> authService.requestPasswordReset("unknown@example.com"))
                    .doesNotThrowAnyException();

            verify(userRepository, never()).save(any(User.class));
            verify(emailNotificationService, never()).sendPasswordResetEmail(anyString(), anyString(),
                    anyString());
        }

        @Test
        @DisplayName("Should reset password with valid token")
        void shouldResetPasswordWithValidToken() {
            // Sprint-1 hardening (P-1.4): reset tokens are now stored as a BCrypt
            // hash. AuthService.resetPassword scans active (unexpired) candidates
            // and matches the submitted token via PasswordEncoder#matches.
            String resetToken = "valid-reset-token";
            String storedHash = "$2a$10$mockedHashThatPasswordEncoderMatchesAgainst";
            user.setPasswordResetTokenHash(storedHash);
            user.setPasswordResetTokenExpiry(LocalDateTime.now().plusHours(1));

            ResetPasswordRequest request = new ResetPasswordRequest();
            request.setToken(resetToken);
            request.setNewPassword("newSecurePassword");
            request.setConfirmPassword("newSecurePassword");

            when(userRepository.findActivePasswordResetCandidates(any()))
                    .thenReturn(List.of(user));
            when(passwordEncoder.matches(eq(resetToken), eq(storedHash))).thenReturn(true);
            when(passwordEncoder.encode("newSecurePassword")).thenReturn("newHashedPassword");
            when(userRepository.save(any(User.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            authService.resetPassword(request);

            // Verify both plaintext and hashed reset-token columns are cleared.
            verify(userRepository).save(argThat(savedUser ->
                    savedUser.getPasswordResetToken() == null &&
                            savedUser.getPasswordResetTokenHash() == null &&
                            savedUser.getPasswordResetTokenExpiry() == null));
            verify(emailNotificationService).sendPasswordChangedEmail(eq("test@example.com"), anyString());
        }

        @Test
        @DisplayName("Should throw exception for expired reset token")
        void shouldThrowExceptionForExpiredResetToken() {
            // The repository query findActivePasswordResetCandidates already filters by
            // expiry > now — so an expired token surfaces as an empty candidate list,
            // which the service translates to an Invalid/Expired AuthenticationException.
            ResetPasswordRequest request = new ResetPasswordRequest();
            request.setToken("expired-reset-token");
            request.setNewPassword("newSecurePassword");
            request.setConfirmPassword("newSecurePassword");

            when(userRepository.findActivePasswordResetCandidates(any()))
                    .thenReturn(Collections.emptyList());

            assertThatThrownBy(() -> authService.resetPassword(request))
                    .isInstanceOf(AuthenticationException.class)
                    .hasMessageContaining("Invalid or expired");
            verify(userRepository, never()).save(any(User.class));
        }

        @Test
        @DisplayName("Should throw exception for invalid reset token")
        void shouldThrowExceptionForInvalidResetToken() {
            // Candidate exists in DB but BCrypt match fails — must surface as a
            // generic Invalid/Expired error (no enumeration leak) and not persist.
            String storedHash = "$2a$10$mockedHashThatPasswordEncoderMatchesAgainst";
            user.setPasswordResetTokenHash(storedHash);
            user.setPasswordResetTokenExpiry(LocalDateTime.now().plusHours(1));

            ResetPasswordRequest request = new ResetPasswordRequest();
            request.setToken("invalid-token");
            request.setNewPassword("newSecurePassword");
            request.setConfirmPassword("newSecurePassword");

            when(userRepository.findActivePasswordResetCandidates(any()))
                    .thenReturn(List.of(user));
            when(passwordEncoder.matches(eq("invalid-token"), eq(storedHash))).thenReturn(false);

            assertThatThrownBy(() -> authService.resetPassword(request))
                    .isInstanceOf(AuthenticationException.class)
                    .hasMessageContaining("Invalid");
            verify(userRepository, never()).save(any(User.class));
        }
    }

    @Nested
    @DisplayName("Logout Tests")
    class LogoutTests {

        @Test
        @DisplayName("Should logout successfully")
        void shouldLogoutSuccessfully() {
            assertThatCode(() -> authService.logout("any-token"))
                    .doesNotThrowAnyException();
        }
    }

    /**
     * Verifies that {@link AuthService#login(LoginRequest)} propagates the tenant's
     * IANA timezone identifier into {@link AuthResponse#getTenantTimezone()} by
     * delegating to {@link TenantTimeService#zoneFor(UUID)}. This is the server-side
     * half of the frontend tenant-zone propagation design — the frontend hydrates a
     * single source of truth for tenant-local time formatting from this field
     * (see docs/architecture/frontend-tenant-zone-propagation-design.md).
     *
     * <p>Coverage matrix:
     * <ul>
     *   <li>Standard tenant with a non-IST zone (America/New_York) flows through unchanged.</li>
     *   <li>Missing tenant falls back to the resolver's default ("Asia/Kolkata"). The
     *       service-level resolver swallows the lookup miss; AuthResponse must surface
     *       the default rather than null.</li>
     *   <li>Mid-flight timezone update: invalidate() forces re-load, and the next login
     *       reflects the new zone — proving the response is never served from a stale
     *       cache after an admin tenant-settings change.</li>
     * </ul>
     */
    @Nested
    @DisplayName("Tenant Timezone Propagation on Login")
    class TenantTimezoneOnLoginTests {

        private LoginRequest buildLoginRequest() {
            LoginRequest request = new LoginRequest();
            request.setEmail("test@example.com");
            request.setPassword("password123");
            request.setTenantId(tenantId);
            return request;
        }

        private void stubLoginCollaborators() {
            Authentication authentication = mock(Authentication.class);
            when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                    .thenReturn(authentication);
            when(userRepository.findByEmailAndTenantId("test@example.com", tenantId))
                    .thenReturn(Optional.of(user));
            when(userRepository.save(any(User.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));
            when(userAppAccessRepository.findByUserIdAndAppCodeWithPermissions(any(), any()))
                    .thenReturn(Optional.empty());
            when(userAppAccessRepository.findUserApplications(any()))
                    .thenReturn(Collections.emptyList());
            when(tokenProvider.generateTokenWithAppPermissions(any(), any(), any(), any(), any(), any(),
                    any(), any(), any(), any()))
                    .thenReturn("access-token");
            when(tokenProvider.generateRefreshToken(any(), any()))
                    .thenReturn("refresh-token");
            when(employeeRepository.findByUserIdAndTenantId(userId, tenantId))
                    .thenReturn(Optional.of(employee));
        }

        @Test
        @DisplayName("Standard tenant with America/New_York zone → response.tenantTimezone = America/New_York")
        void shouldPropagateNonDefaultTenantZone() {
            stubLoginCollaborators();
            when(tenantTimeService.zoneFor(tenantId)).thenReturn(ZoneId.of("America/New_York"));

            AuthResponse response = authService.login(buildLoginRequest());

            assertThat(response).isNotNull();
            assertThat(response.getTenantTimezone()).isEqualTo("America/New_York");
            verify(tenantTimeService).zoneFor(tenantId);
        }

        @Test
        @DisplayName("Missing tenant zone → response.tenantTimezone falls back to DEFAULT_ZONE (Asia/Kolkata)")
        void shouldFallBackToDefaultZoneWhenTenantMissing() {
            stubLoginCollaborators();
            // TenantTimeService#zoneFor swallows a missing/unknown tenant and returns
            // its own DEFAULT_ZONE ("Asia/Kolkata"); AuthService must surface that
            // value verbatim rather than null.
            when(tenantTimeService.zoneFor(tenantId)).thenReturn(ZoneId.of("Asia/Kolkata"));

            AuthResponse response = authService.login(buildLoginRequest());

            assertThat(response).isNotNull();
            assertThat(response.getTenantTimezone()).isEqualTo("Asia/Kolkata");
            verify(tenantTimeService).zoneFor(tenantId);
        }

        @Test
        @DisplayName("Tenant timezone updated mid-flight → next login reflects new zone after invalidate()")
        void shouldReflectUpdatedTenantZoneAfterInvalidate() {
            stubLoginCollaborators();
            // First login: tenant configured to Asia/Kolkata.
            when(tenantTimeService.zoneFor(tenantId)).thenReturn(ZoneId.of("Asia/Kolkata"));
            AuthResponse first = authService.login(buildLoginRequest());
            assertThat(first.getTenantTimezone()).isEqualTo("Asia/Kolkata");

            // Admin updates tenant.timezone → Europe/London; settings flow invalidates
            // the cached entry so the next resolver call re-reads from DB and returns
            // the new zone.
            tenantTimeService.invalidate(tenantId);
            when(tenantTimeService.zoneFor(tenantId)).thenReturn(ZoneId.of("Europe/London"));

            AuthResponse second = authService.login(buildLoginRequest());

            assertThat(second).isNotNull();
            assertThat(second.getTenantTimezone()).isEqualTo("Europe/London");
            verify(tenantTimeService).invalidate(tenantId);
            verify(tenantTimeService, times(2)).zoneFor(tenantId);
        }
    }
}
