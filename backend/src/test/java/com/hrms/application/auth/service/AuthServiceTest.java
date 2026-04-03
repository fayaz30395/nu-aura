package com.hrms.application.auth.service;

import com.hrms.api.auth.dto.*;
import com.hrms.application.notification.service.EmailNotificationService;
import com.hrms.application.user.service.ImplicitRoleService;
import com.hrms.common.exception.AuthenticationException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.exception.ValidationException;
import com.hrms.common.security.JwtTokenProvider;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.user.User;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.platform.repository.UserAppAccessRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import org.junit.jupiter.api.*;
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
    private com.hrms.common.metrics.MetricsService metricsService;

    @Mock
    private PasswordPolicyService passwordPolicyService;

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
            when(tokenProvider.validateToken(refreshToken)).thenReturn(true);
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
            when(tokenProvider.validateToken(invalidToken)).thenReturn(false);

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
            String resetToken = "valid-reset-token";
            user.setPasswordResetToken(resetToken);
            user.setPasswordResetTokenExpiry(LocalDateTime.now().plusHours(1));

            ResetPasswordRequest request = new ResetPasswordRequest();
            request.setToken(resetToken);
            request.setNewPassword("newSecurePassword");
            request.setConfirmPassword("newSecurePassword");

            when(userRepository.findByPasswordResetToken(resetToken))
                    .thenReturn(Optional.of(user));
            when(passwordEncoder.encode("newSecurePassword")).thenReturn("newHashedPassword");
            when(userRepository.save(any(User.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            authService.resetPassword(request);

            verify(userRepository).save(argThat(savedUser -> savedUser.getPasswordResetToken() == null &&
                    savedUser.getPasswordResetTokenExpiry() == null));
            verify(emailNotificationService).sendPasswordChangedEmail(eq("test@example.com"), anyString());
        }

        @Test
        @DisplayName("Should throw exception for expired reset token")
        void shouldThrowExceptionForExpiredResetToken() {
            String resetToken = "expired-reset-token";
            user.setPasswordResetToken(resetToken);
            user.setPasswordResetTokenExpiry(LocalDateTime.now().minusHours(1)); // Expired

            ResetPasswordRequest request = new ResetPasswordRequest();
            request.setToken(resetToken);
            request.setNewPassword("newSecurePassword");
            request.setConfirmPassword("newSecurePassword");

            when(userRepository.findByPasswordResetToken(resetToken))
                    .thenReturn(Optional.of(user));

            assertThatThrownBy(() -> authService.resetPassword(request))
                    .isInstanceOf(AuthenticationException.class)
                    .hasMessageContaining("expired");
        }

        @Test
        @DisplayName("Should throw exception for invalid reset token")
        void shouldThrowExceptionForInvalidResetToken() {
            ResetPasswordRequest request = new ResetPasswordRequest();
            request.setToken("invalid-token");
            request.setNewPassword("newSecurePassword");
            request.setConfirmPassword("newSecurePassword");

            when(userRepository.findByPasswordResetToken("invalid-token"))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> authService.resetPassword(request))
                    .isInstanceOf(AuthenticationException.class)
                    .hasMessageContaining("Invalid");
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
}
