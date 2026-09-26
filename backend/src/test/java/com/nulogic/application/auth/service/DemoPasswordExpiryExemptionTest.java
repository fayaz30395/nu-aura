package com.nulogic.application.auth.service;

import com.nulogic.api.auth.dto.LoginRequest;
import com.nulogic.application.audit.service.AuditLogService;
import com.nulogic.application.notification.service.EmailNotificationService;
import com.nulogic.application.user.service.ImplicitRoleService;
import com.nulogic.common.config.PasswordPolicyConfig;
import com.nulogic.common.exception.AuthenticationException;
import com.nulogic.common.exception.BusinessException;
import com.nulogic.common.security.AccountLockoutService;
import com.nulogic.common.security.JwtTokenProvider;
import com.nulogic.common.security.TenantRlsSessionSync;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.user.User;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.platform.repository.UserAppAccessRepository;
import com.nulogic.infrastructure.security.CaptchaService;
import com.nulogic.infrastructure.user.repository.PasswordHistoryRepository;
import com.nulogic.infrastructure.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Collections;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Guards the demo-account password-expiry exemption in
 * {@code AuthService.isExpiryExemptDemoAccount}.
 *
 * <p>The shared demo password ages on the same 90-day {@code maxAgeDays} clock as any
 * real password, which periodically breaks {@code frontend/e2e/auth.setup.ts} and, via
 * Playwright's {@code dependencies: ['setup']}, skips the whole suite. The exemption must
 * hold in demo/E2E environments and must NOT weaken production, where
 * {@code demoCredentialsEnabled} is false.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Demo password expiry exemption")
class DemoPasswordExpiryExemptionTest {

    /** Welcome@123, as seeded by V122 for every {@code @nulogic.io} demo account. */
    private static final String DEMO_PASSWORD_HASH =
            "$2a$10$Yz2jagooVRjNy0jIkBH65uLechlFdTUIRtz44XSrXEtcPAnWObR/e";

    @Mock private AuditLogService auditLogService;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private UserRepository userRepository;
    @Mock private EmployeeRepository employeeRepository;
    @Mock private UserAppAccessRepository userAppAccessRepository;
    @Mock private JwtTokenProvider tokenProvider;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private EmailNotificationService emailNotificationService;
    @Mock private ImplicitRoleService implicitRoleService;
    @Mock private com.nulogic.common.metrics.MetricsService metricsService;
    @Mock private PasswordPolicyService passwordPolicyService;
    @Mock private AccountLockoutService accountLockoutService;
    @Mock private PasswordHistoryRepository passwordHistoryRepository;
    @Mock private PasswordPolicyConfig passwordPolicyConfig;
    @Mock private CaptchaService captchaService;
    @Mock private TenantTimeService tenantTimeService;
    @Mock private TenantRlsSessionSync tenantRlsSessionSync;
    @Mock private StringRedisTemplate stringRedisTemplate;
    @Mock private ValueOperations<String, String> valueOperations;

    @InjectMocks private AuthService authService;

    private UUID tenantId;
    private UUID userId;
    private User user;

    @BeforeEach
    void setUp() {
        tenantId = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
        userId = UUID.randomUUID();

        // Password last changed 200 days ago — well past the 90-day policy.
        user = User.builder()
                .email("fayaz.m@nulogic.io")
                .firstName("Fayaz")
                .lastName("M")
                .passwordHash(DEMO_PASSWORD_HASH)
                .status(User.UserStatus.ACTIVE)
                .passwordChangedAt(LocalDateTime.now().minusDays(200))
                .build();
        ReflectionTestUtils.setField(user, "id", userId);
        ReflectionTestUtils.setField(user, "tenantId", tenantId);

        ReflectionTestUtils.setField(authService, "jwtExpiration", 3600000L);
        ReflectionTestUtils.setField(authService, "captchaThresholdAttempts", 3);
        ReflectionTestUtils.setField(authService, "allowedDomain", "nulogic.io");
        ReflectionTestUtils.setField(authService, "defaultTenantId", tenantId.toString());
        ReflectionTestUtils.setField(authService, "nulogicTenantId", tenantId.toString());
        ReflectionTestUtils.setField(authService, "accountLockoutUseRedis", false);
        ReflectionTestUtils.setField(authService, "loginBookkeepingEnabled", false);

        when(passwordPolicyConfig.getMaxAgeDays()).thenReturn(90);
        when(tenantTimeService.zoneFor(any())).thenReturn(ZoneId.of("Asia/Kolkata"));
        when(tenantTimeService.today(nullable(UUID.class))).thenReturn(LocalDate.now());
        when(tenantTimeService.now(nullable(UUID.class))).thenReturn(LocalDateTime.now());
        when(implicitRoleService.getImplicitRoles(any(UUID.class), any(UUID.class))).thenReturn(Set.of());
        when(implicitRoleService.getImplicitPermissions(any(UUID.class), any(UUID.class))).thenReturn(Set.of());
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOperations);
        lenient().when(valueOperations.get(anyString())).thenReturn(null);

        Authentication authentication = mock(Authentication.class);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(authentication);
        when(userRepository.findByEmailAndTenantId(any(), any())).thenReturn(Optional.of(user));
        when(userAppAccessRepository.findByUserIdAndAppCodeWithPermissions(any(), any()))
                .thenReturn(Optional.empty());
        when(userAppAccessRepository.findUserApplications(any())).thenReturn(Collections.emptyList());
        when(employeeRepository.findByUserIdAndTenantId(any(), any()))
                .thenReturn(Optional.of(Employee.builder().employeeCode("EMP001").build()));
        when(tokenProvider.generateTokenWithAppPermissions(any(), any(), any(), any(), any(), any(),
                any(), any(), any(), any())).thenReturn("access-token");
        when(tokenProvider.generateRefreshToken(any(), any(), any())).thenReturn("refresh-token");
    }

    private LoginRequest loginRequest() {
        LoginRequest request = new LoginRequest();
        request.setEmail(user.getEmail());
        request.setPassword("Welcome@123");
        request.setTenantId(tenantId);
        return request;
    }

    @Test
    @DisplayName("demo flag ON: a demo account with a 200-day-old password still logs in")
    void demoAccountIsExemptWhenDemoCredentialsEnabled() {
        ReflectionTestUtils.setField(authService, "demoCredentialsEnabled", true);

        assertThat(authService.login(loginRequest()).getAccessToken()).isEqualTo("access-token");
    }

    @Test
    @DisplayName("demo flag OFF (production): the SAME account is rejected, not exempted")
    void sameDemoAccountIsRejectedWhenDemoCredentialsDisabled() {
        ReflectionTestUtils.setField(authService, "demoCredentialsEnabled", false);

        // Production posture: a known demo hash never authenticates at all, so the
        // exemption can never be reached there. The expiry policy is untouched.
        assertThatThrownBy(() -> authService.login(loginRequest()))
                .isInstanceOf(AuthenticationException.class)
                .hasMessage("Invalid email or password");
    }

    @Test
    @DisplayName("demo flag ON: a real account's password still expires (exemption does not leak)")
    void realAccountStillExpiresEvenInDemoEnvironment() {
        ReflectionTestUtils.setField(authService, "demoCredentialsEnabled", true);
        user.setPasswordHash("$2a$10$aRealUserHashThatIsNotAKnownDemoCredentialXXXXXXXXXXXXX");

        assertThatThrownBy(() -> authService.login(loginRequest()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("expired");
    }

    @Test
    @DisplayName("demo flag OFF: a real account's password expires exactly as before")
    void realAccountExpiresInProduction() {
        ReflectionTestUtils.setField(authService, "demoCredentialsEnabled", false);
        user.setPasswordHash("$2a$10$aRealUserHashThatIsNotAKnownDemoCredentialXXXXXXXXXXXXX");

        assertThatThrownBy(() -> authService.login(loginRequest()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("expired");
    }
}
