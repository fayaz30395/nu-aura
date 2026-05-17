package com.nulogic.application.auth.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.nulogic.api.auth.dto.*;
import com.nulogic.application.notification.service.EmailNotificationService;
import com.nulogic.application.platform.service.HrmsPermissionInitializer;
import com.nulogic.infrastructure.security.CaptchaService;
import com.nulogic.application.user.service.ImplicitRoleService;
import com.nulogic.common.config.PasswordPolicyConfig;
import com.nulogic.common.exception.AuthenticationException;
import com.nulogic.common.exception.BusinessException;
import com.nulogic.common.exception.ResourceNotFoundException;
import com.nulogic.common.exception.ValidationException;
import com.nulogic.common.metrics.MetricsService;
import com.nulogic.common.security.AccountLockoutService;
import com.nulogic.common.security.JwtTokenProvider;
import com.nulogic.common.security.UserPrincipal;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.platform.UserAppAccess;
import com.nulogic.domain.user.PasswordHistory;
import com.nulogic.domain.user.User;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.platform.repository.UserAppAccessRepository;
import com.nulogic.infrastructure.user.repository.PasswordHistoryRepository;
import com.nulogic.infrastructure.user.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class AuthService {

    /**
     * Redis key prefix for the failed-attempt counter. MUST match the constant
     * in {@code AccountLockoutService} (intentional duplication — that service
     * is out of scope for this change and we read the same counter so a single
     * brute-force window drives both the captcha gate and the lockout cap).
     */
    private static final String LOCKOUT_ATTEMPTS_KEY_PREFIX = "lockout:attempts:";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final UserAppAccessRepository userAppAccessRepository;
    private final JwtTokenProvider tokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final EmailNotificationService emailNotificationService;
    private final ImplicitRoleService implicitRoleService;
    private final MetricsService metricsService;
    private final PasswordPolicyService passwordPolicyService;
    private final AccountLockoutService accountLockoutService;
    private final PasswordHistoryRepository passwordHistoryRepository;
    private final PasswordPolicyConfig passwordPolicyConfig;
    private final CaptchaService captchaService;
    private final StringRedisTemplate stringRedisTemplate;
    private final TenantTimeService tenantTimeService;
    @Value("${app.jwt.expiration}")
    private long jwtExpiration;
    @Value("${app.security.captcha.threshold-attempts:3}")
    private int captchaThresholdAttempts;
    @Value("${app.google.client-id:}")
    private String googleClientId;
    /**
     * Fallback tenant ID used when no tenant can be determined during password login.
     * Should be set to the demo/default tenant UUID via the {@code APP_DEFAULT_TENANT_ID}
     * environment variable. If left empty, login without a tenant context will fail fast.
     */
    @Value("${app.auth.default-tenant-id:550e8400-e29b-41d4-a716-446655440000}")
    private String defaultTenantId;
    /**
     * Tenant ID for the NuLogic corporate domain ({@code @nulogic.io}).
     * Configurable via {@code APP_NULOGIC_TENANT_ID}; defaults to the seeded demo value.
     */
    @Value("${app.auth.nulogic-tenant-id:660e8400-e29b-41d4-a716-446655440001}")
    private String nulogicTenantId;
    @Value("${app.auth.allowed-domain:nulogic.io}")
    private String allowedDomain;

    public AuthService(AuthenticationManager authenticationManager,
                       UserRepository userRepository,
                       EmployeeRepository employeeRepository,
                       UserAppAccessRepository userAppAccessRepository,
                       JwtTokenProvider tokenProvider,
                       PasswordEncoder passwordEncoder,
                       EmailNotificationService emailNotificationService,
                       ImplicitRoleService implicitRoleService,
                       MetricsService metricsService,
                       PasswordPolicyService passwordPolicyService,
                       AccountLockoutService accountLockoutService,
                       PasswordHistoryRepository passwordHistoryRepository,
                       PasswordPolicyConfig passwordPolicyConfig,
                       CaptchaService captchaService,
                       StringRedisTemplate stringRedisTemplate,
                       TenantTimeService tenantTimeService) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.employeeRepository = employeeRepository;
        this.userAppAccessRepository = userAppAccessRepository;
        this.tokenProvider = tokenProvider;
        this.passwordEncoder = passwordEncoder;
        this.emailNotificationService = emailNotificationService;
        this.implicitRoleService = implicitRoleService;
        this.metricsService = metricsService;
        this.passwordPolicyService = passwordPolicyService;
        this.accountLockoutService = accountLockoutService;
        this.passwordHistoryRepository = passwordHistoryRepository;
        this.passwordPolicyConfig = passwordPolicyConfig;
        this.captchaService = captchaService;
        this.stringRedisTemplate = stringRedisTemplate;
        this.tenantTimeService = tenantTimeService;
    }

    /**
     * /auth/me hot path. NOTE: a Redis @Cacheable was tried here but the
     * default GenericJackson2JsonRedisSerializer rejected the AuthResponse
     * builder-generated class with a silent SerializationException, so the
     * decoration was a no-op while still adding cache-error log noise.
     * Reverting to the plain read-only transactional path and relying on
     * the V172 index improvements + RoleRepository two-level JOIN FETCH
     * for the perf win. If we later want Redis caching, build it manually
     * with StringRedisTemplate + a typed Jackson ObjectMapper instead of
     * fighting the default serializer.
     */
    @Transactional(readOnly = true)
    public AuthResponse getUserProfile(UUID userId) {
        User user = userRepository.findByIdWithRolesAndPermissions(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        UUID tenantId = user.getTenantId();
        AuthContext ctx = buildAuthContext(user, tenantId);

        return AuthResponse.builder()
                .userId(user.getId())
                .employeeId(ctx.employeeId())
                .tenantId(tenantId)
                .email(user.getEmail())
                .fullName(user.getFullName())
                .profilePictureUrl(user.getProfilePictureUrl())
                .tenantTimezone(resolveTenantTimezone(tenantId))
                .roles(new ArrayList<>(ctx.appRoles()))
                .permissions(new ArrayList<>(ctx.appPermissions().keySet()))
                .build();
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        // First, find the user by email to auto-detect their tenant
        UUID tenantId = request.getTenantId();

        // Try to find user by email first (without tenant filter) to auto-detect tenant
        Optional<User> userByEmail = userRepository.findByEmail(request.getEmail());

        if (userByEmail.isPresent()) {
            // Use the user's actual tenant
            tenantId = userByEmail.get().getTenantId();
        } else if (tenantId == null) {
            // Fallback: use the configurable default tenant when no tenant is specified.
            // Configure APP_AUTH_DEFAULT_TENANT_ID in production to avoid relying on the demo seed.
            if (defaultTenantId == null || defaultTenantId.isBlank()) {
                throw new com.nulogic.common.exception.BusinessException(
                        "Unable to determine tenant context. Please provide a valid X-Tenant-ID header or tenantId in the request.");
            }
            tenantId = UUID.fromString(defaultTenantId);
        }

        // Set tenant context for authentication
        com.nulogic.common.security.TenantContext.setCurrentTenant(tenantId);

        // Check account lockout before attempting authentication.
        // SEC: Burn the same wall-clock time a real BCrypt compare would take so the
        // "locked" response is not distinguishable from a "wrong password" response
        // (and so a "user-not-found" response is not distinguishable either).
        if (accountLockoutService.isAccountLocked(request.getEmail())) {
            accountLockoutService.equalizeTiming();
            metricsService.recordLoginFailure("password", "account_locked");
            throw new org.springframework.security.authentication.LockedException(
                    "Account temporarily locked due to too many failed login attempts");
        }

        // SEC (Wave-10 P2-3): once an account has accumulated `captchaThresholdAttempts`
        // failed logins in the current sliding window, require a reCAPTCHA token on
        // every subsequent attempt up until the AccountLockoutService MAX_ATTEMPTS=5
        // hard lock. This adds a friction wall against credential-stuffing without
        // burdening legitimate users on the first few mistypes. The counter we read
        // is the SAME Redis key AccountLockoutService writes, so attempts are not
        // double-counted. We deliberately read straight from StringRedisTemplate
        // because exposing the counter via AccountLockoutService is out of scope
        // for this change.
        int currentFailedAttempts = readFailedLoginAttempts(request.getEmail());
        if (currentFailedAttempts >= captchaThresholdAttempts) {
            String captchaToken = request.getCaptchaToken();
            if (captchaToken == null || captchaToken.isBlank()
                    || !captchaService.verify(captchaToken, resolveRemoteIp())) {
                metricsService.recordLoginFailure("password", "captcha_required");
                // Throw the project's AuthenticationException (NOT Spring's
                // BadCredentialsException) so that GlobalExceptionHandler's
                // handleAuthenticationException preserves our literal message in
                // the response body. The Spring BadCredentialsException handler
                // hard-codes the user-facing message to "Invalid email or password"
                // (line 224 of GlobalExceptionHandler) which would strip the
                // "captcha-required" signal the frontend keys off. We are not
                // permitted to edit GlobalExceptionHandler under the strict scope
                // of this change, so we route through the AuthenticationException
                // path instead. End result on the wire: 401 UNAUTHORIZED with
                // errorCode=AUTHENTICATION_FAILED and message="captcha-required".
                //
                // We intentionally do NOT increment loginFailed() here — failing
                // the captcha is not a password attempt and should not accelerate
                // the user toward the 5-strike lockout.
                throw new AuthenticationException("captcha-required");
            }
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

            SecurityContextHolder.getContext().setAuthentication(authentication);

            User user = userRepository.findByEmailAndTenantId(request.getEmail(), tenantId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", "email", request.getEmail()));

            // Check password expiry (90-day policy)
            if (user.getPasswordChangedAt() != null && passwordPolicyConfig.getMaxAgeDays() > 0) {
                long daysSinceChange = java.time.temporal.ChronoUnit.DAYS.between(
                        user.getPasswordChangedAt().toLocalDate(), tenantTimeService.today(tenantId));
                if (daysSinceChange > passwordPolicyConfig.getMaxAgeDays()) {
                    throw new BusinessException("Your password has expired. Please reset your password.");
                }
            }

            // Bookkeeping write via a bare UPDATE so parallel logins (E2E
            // workers, multi-tab navigation) don't collide on the User row's
            // @Version. See `UserRepository.recordSuccessfulLogin` Javadoc.
            userRepository.recordSuccessfulLogin(user.getId(),
                    tenantTimeService.now(tenantId));

            // Clear lockout state on successful login
            accountLockoutService.loginSucceeded(request.getEmail());

            // Record successful login metric
            metricsService.recordLoginSuccess("password");

            // Build auth context (permissions, roles, employee linking) and generate response
            AuthContext ctx = buildAuthContext(user, tenantId);
            // CRIT-001: permissions in response body (not JWT) to keep cookie under 4KB
            return buildAuthResponse(user, tenantId, ctx);
        } catch (AuthenticationException | ResourceNotFoundException e) {
            // Record failed login metric
            metricsService.recordLoginFailure("password", e.getClass().getSimpleName());
            throw e;
        } catch (org.springframework.security.core.AuthenticationException e) {
            // Spring Security authentication failures (BadCredentialsException, LockedException, etc.)
            // must be caught separately because they extend a different AuthenticationException
            // than com.nulogic.common.exception.AuthenticationException
            accountLockoutService.loginFailed(request.getEmail());
            metricsService.recordLoginFailure("password", e.getClass().getSimpleName());
            throw new AuthenticationException(e.getMessage(), e);
        } catch (Exception e) { // Intentional broad catch — re-throws after recording failure metric for unexpected errors during login
            // Record unexpected error during login
            metricsService.recordLoginFailure("password", "unknown_error");
            throw e;
        }
    }

    @Transactional
    public AuthResponse googleLogin(GoogleLoginRequest request) {
        try {
            String email;
            String hostedDomain;
            String profilePictureUrl = null;

            if (request.isAccessToken()) {
                // Handle access token - call Google userinfo API
                GoogleUserInfo userInfo = getUserInfoFromAccessToken(request.getCredential());
                email = userInfo.email;
                hostedDomain = userInfo.hd;
                profilePictureUrl = userInfo.picture;
            } else {
                // Handle ID token - verify with Google
                GoogleIdToken idToken = verifyGoogleToken(request.getCredential());
                if (idToken == null) {
                    metricsService.recordLoginFailure("google", "invalid_token");
                    throw new AuthenticationException("Invalid Google ID token");
                }
                GoogleIdToken.Payload payload = idToken.getPayload();
                email = payload.getEmail();
                if (email == null || email.isBlank()) {
                    metricsService.recordLoginFailure("google", "missing_email");
                    throw new AuthenticationException("Google ID token does not contain a verified email address");
                }
                hostedDomain = payload.getHostedDomain();
                profilePictureUrl = (String) payload.get("picture");
            }

            // Verify domain restriction - must be @allowedDomain
            if (hostedDomain == null || !hostedDomain.equals(allowedDomain)) {
                metricsService.recordLoginFailure("google", "domain_mismatch");
                throw new AuthenticationException("Only @" + allowedDomain + " accounts are allowed");
            }

            if (!email.endsWith("@" + allowedDomain)) {
                metricsService.recordLoginFailure("google", "domain_mismatch");
                throw new AuthenticationException("Only @" + allowedDomain + " accounts are allowed");
            }

            // For @nulogic.io accounts, use the configured NuLogic tenant;
            // otherwise fall back to the configured default tenant.
            UUID tenantId = request.getTenantId();
            if (tenantId == null) {
                if (email.endsWith("@" + allowedDomain) && nulogicTenantId != null && !nulogicTenantId.isBlank()) {
                    tenantId = UUID.fromString(nulogicTenantId);
                } else if (defaultTenantId != null && !defaultTenantId.isBlank()) {
                    tenantId = UUID.fromString(defaultTenantId);
                } else {
                    throw new com.nulogic.common.exception.BusinessException(
                            "Unable to determine tenant context. Please provide a valid X-Tenant-ID header.");
                }
            }

            // Set tenant context
            com.nulogic.common.security.TenantContext.setCurrentTenant(tenantId);

            // Find user by email - first try specified tenant, then search across tenants
            User user = userRepository.findByEmailAndTenantId(email, tenantId)
                    .or(() -> userRepository.findByEmail(email).stream().findFirst())
                    .orElseThrow(() -> {
                        metricsService.recordLoginFailure("google", "user_not_found");
                        return new AuthenticationException(
                                "User not found. Please contact your administrator to set up your account.");
                    });

            // Update tenantId to user's actual tenant
            tenantId = user.getTenantId();
            com.nulogic.common.security.TenantContext.setCurrentTenant(tenantId);

            // Update profile picture from Google if available
            if (profilePictureUrl != null && !profilePictureUrl.isEmpty()) {
                user.setProfilePictureUrl(profilePictureUrl);
                log.info("Updated profile picture for user {} from Google SSO", email);
            }

            // Ensure auth_provider is set to GOOGLE for SSO users
            if (user.getAuthProvider() != com.nulogic.domain.user.AuthProvider.GOOGLE) {
                user.setAuthProvider(com.nulogic.domain.user.AuthProvider.GOOGLE);
                log.info("Updated auth_provider to GOOGLE for user {}", email);
            }

            user.recordSuccessfulLogin();
            userRepository.save(user);

            // Record successful Google login metric
            metricsService.recordLoginSuccess("google");

            UserPrincipal userPrincipal = UserPrincipal.create(user);
            Authentication authentication = new UsernamePasswordAuthenticationToken(
                    userPrincipal, null, userPrincipal.getAuthorities());
            SecurityContextHolder.getContext().setAuthentication(authentication);

            // Build auth context and generate response
            AuthContext ctx = buildAuthContext(user, tenantId);
            return buildAuthResponse(user, tenantId, ctx);
        } catch (AuthenticationException e) {
            throw e;
        } catch (
                Exception e) { // Intentional broad catch — re-throws after recording failure metric for unexpected errors during Google login
            metricsService.recordLoginFailure("google", "unknown_error");
            throw e;
        }
    }

    private GoogleIdToken verifyGoogleToken(String idTokenString) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(),
                    GsonFactory.getDefaultInstance())
                    .setAudience(List.of(googleClientId))
                    .build();

            return verifier.verify(idTokenString);
        } catch (GeneralSecurityException | IOException e) {
            throw new AuthenticationException("Failed to verify Google token: " + e.getMessage(), e);
        }
    }

    /**
     * Get user info from Google using an access token.
     * This is used when the frontend uses the implicit OAuth flow with custom
     * scopes.
     */
    private GoogleUserInfo getUserInfoFromAccessToken(String accessToken) {
        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://www.googleapis.com/oauth2/v3/userinfo"))
                    .header("Authorization", "Bearer " + accessToken)
                    .GET()
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.error("Google userinfo API error: {} - {}", response.statusCode(), response.body());
                throw new AuthenticationException("Failed to verify Google access token");
            }

            ObjectMapper mapper = new ObjectMapper();
            JsonNode json = mapper.readTree(response.body());

            GoogleUserInfo userInfo = new GoogleUserInfo();
            userInfo.email = json.has("email") ? json.get("email").asText() : null;
            userInfo.hd = json.has("hd") ? json.get("hd").asText() : null;
            userInfo.picture = json.has("picture") ? json.get("picture").asText() : null;

            if (userInfo.email == null) {
                throw new AuthenticationException("Google access token does not contain email");
            }

            // Verify token audience matches our client ID to prevent token substitution attacks
            HttpRequest tokenInfoRequest = HttpRequest.newBuilder()
                    .uri(URI.create("https://oauth2.googleapis.com/tokeninfo?access_token=" + accessToken))
                    .GET()
                    .build();
            try {
                HttpResponse<String> tokenInfoResponse = client.send(tokenInfoRequest, HttpResponse.BodyHandlers.ofString());
                if (tokenInfoResponse.statusCode() == 200) {
                    JsonNode tokenInfoJson = mapper.readTree(tokenInfoResponse.body());
                    String tokenAudience = tokenInfoJson.has("aud") ? tokenInfoJson.get("aud").asText() : null;
                    if (!googleClientId.equals(tokenAudience)) {
                        log.warn("Google access token audience mismatch: expected={}", googleClientId);
                        throw new AuthenticationException("Invalid Google token audience");
                    }
                } else {
                    log.warn("Failed to verify Google access token audience: tokeninfo returned {}", tokenInfoResponse.statusCode());
                    throw new AuthenticationException("Unable to verify Google token");
                }
            } catch (IOException | InterruptedException e) {
                log.warn("Failed to verify Google access token audience");
                throw new AuthenticationException("Unable to verify Google token");
            }

            return userInfo;
        } catch (IOException | InterruptedException e) {
            log.error("Error calling Google userinfo API", e);
            throw new AuthenticationException("Failed to verify Google access token: " + e.getMessage(), e);
        }
    }

    @Transactional(readOnly = true)
    public AuthResponse refresh(String refreshToken) {
        if (tokenProvider.validateRefreshToken(refreshToken)) {
            String email = tokenProvider.getUsernameFromToken(refreshToken);
            UUID tenantId = tokenProvider.getTenantIdFromToken(refreshToken);

            // Set tenant context so RLS and implicit role queries work correctly
            com.nulogic.common.security.TenantContext.setCurrentTenant(tenantId);

            User user = userRepository.findByEmailAndTenantId(email, tenantId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));

            // Build auth context and generate response
            AuthContext ctx = buildAuthContext(user, tenantId);
            return buildAuthResponse(user, tenantId, ctx);
        }
        throw new AuthenticationException("Invalid or expired refresh token");
    }

    /**
     * Logout user by revoking their token and clearing security context.
     * The token is added to a blacklist so it cannot be reused even if not expired.
     *
     * @param token The JWT access token to revoke
     */
    public void logout(String token) {
        // Revoke the specific token by adding it to the blacklist
        if (token != null && !token.isBlank()) {
            tokenProvider.revokeToken(token);

            // BUG-001 FIX: Also revoke ALL tokens for this user (both access and refresh)
            // so that any other sessions / tabs with different refresh tokens are invalidated.
            // Without this, a refresh token from a prior session can re-authenticate the user.
            try {
                UUID userId = tokenProvider.getUserIdFromToken(token);
                if (userId != null) {
                    tokenProvider.revokeAllUserTokens(userId.toString());
                    // Downgraded from INFO to DEBUG: userId is PII and logout is high-volume.
                    log.debug("All tokens revoked for user {} on logout", userId);
                }
            } catch (Exception e) {
                // Token may already be expired/invalid — the individual revoke above is enough
                log.debug("Could not extract userId for bulk revocation on logout: {}", e.getMessage());
            }
        }
        SecurityContextHolder.clearContext();
    }

    @Transactional
    public void changePassword(UUID userId, ChangePasswordRequest request) {
        // Validate that new password and confirm password match
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new ValidationException("New password and confirm password do not match");
        }

        // Get current user
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        // Verify current password
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new AuthenticationException("Current password is incorrect");
        }

        // Validate new password against policy (P0 security hardening)
        passwordPolicyService.validatePassword(
                request.getNewPassword(),
                user.getEmail(),
                user.getFullName()
        );

        // Ensure new password is different from current
        if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
            throw new ValidationException("New password must be different from current password");
        }

        // Check password history — prevent reuse of last N passwords
        int historyCount = passwordPolicyConfig.getHistoryCount();
        if (historyCount > 0) {
            List<PasswordHistory> history = passwordHistoryRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
            for (int i = 0; i < Math.min(historyCount, history.size()); i++) {
                if (passwordEncoder.matches(request.getNewPassword(), history.get(i).getPasswordHash())) {
                    throw new BusinessException("New password cannot be the same as your last " + historyCount + " passwords");
                }
            }
        }

        // Capture old hash before overwriting
        String oldPasswordHash = user.getPasswordHash();

        // Hash and update new password
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordChangedAt(tenantTimeService.now(user.getTenantId()));

        userRepository.save(user);

        // Save old password to history
        passwordHistoryRepository.save(new PasswordHistory(user.getId(), user.getTenantId(), oldPasswordHash));

        // Revoke all existing tokens for this user (force re-login on all devices)
        tokenProvider.revokeAllUserTokens(userId.toString());
        log.info("All tokens revoked for user {} after password change", userId);
    }

    // ==================== NU Platform RBAC Helper Methods ====================

    /**
     * Load permissions for a user using a pre-fetched UserAppAccess.
     * Accepts the already-loaded employee to avoid redundant DB lookups.
     * Falls back to legacy role-based permissions if no UserAppAccess exists.
     */
    private Map<String, com.nulogic.domain.user.RoleScope> loadAppPermissionsFromAccess(
            UUID userId, String appCode, Optional<UserAppAccess> access, Employee employee) {

        Map<String, com.nulogic.domain.user.RoleScope> permissionScopes = new HashMap<>();

        if (access.isPresent()) {
            // NU Platform RBAC (AppRole -> AppPermission relations with scopes)
            UserAppAccess userAccess = access.get();

            // Load permissions from roles
            userAccess.getRoles().forEach(appRole -> {
                appRole.getPermissions().forEach(appPerm -> {
                    String code = appPerm.getCode();
                    com.nulogic.domain.user.RoleScope newScope = com.nulogic.domain.user.RoleScope.ALL;
                    com.nulogic.domain.user.RoleScope existingScope = permissionScopes.get(code);
                    if (existingScope == null || newScope.isMorePermissiveThan(existingScope)) {
                        permissionScopes.put(code, newScope);
                    }
                });
            });

            // Also load direct permissions
            userAccess.getDirectPermissions().forEach(appPerm -> {
                String code = appPerm.getCode();
                com.nulogic.domain.user.RoleScope newScope = com.nulogic.domain.user.RoleScope.ALL;
                permissionScopes.putIfAbsent(code, newScope);
            });

            // If UserAppAccess exists but AppRoles have no AppPermissions linked (migration gap),
            // fall back to RoleHierarchy defaults based on the role codes.
            if (permissionScopes.isEmpty() && !userAccess.getRoles().isEmpty()) {
                log.warn("UserAppAccess for user {} has roles but no permissions. Deriving from RoleHierarchy defaults.", userId);
                userAccess.getRoleCodes().forEach(roleCode -> {
                    com.nulogic.common.security.RoleHierarchy.getDefaultPermissions(roleCode).forEach(perm -> {
                        permissionScopes.putIfAbsent(perm, com.nulogic.domain.user.RoleScope.ALL);
                    });
                });
            }

            log.debug("Loaded {} permissions from UserAppAccess for user {}", permissionScopes.size(), userId);
            mergeImplicitPermissions(employee, appCode, permissionScopes);
            return permissionScopes;
        }

        // Fallback: Load from legacy User->Role->RolePermission structure (Matrix RBAC)
        log.debug("No UserAppAccess found for user {}, falling back to legacy role permissions", userId);
        User user = userRepository.findByIdWithRolesAndPermissions(userId).orElse(null);
        if (user != null) {
            log.debug("User {} has {} roles", userId, user.getRoles().size());
            user.getRoles().forEach(role -> {
                log.debug("Processing role: {} with {} permissions", role.getCode(), role.getPermissions().size());
                role.getPermissions().forEach(rp -> {
                    String code = rp.getPermission().getCode();
                    if (code.startsWith(appCode + ":")) {
                        code = code.substring(appCode.length() + 1);
                    }
                    log.debug("Permission: {} -> {} (scope: {})", rp.getPermission().getCode(), code, rp.getScope());

                    com.nulogic.domain.user.RoleScope newScope = rp.getScope();
                    com.nulogic.domain.user.RoleScope existingScope = permissionScopes.get(code);

                    if (existingScope == null || isHigherScope(newScope, existingScope)) {
                        permissionScopes.put(code, newScope);
                    }
                });
            });
        }

        // If still empty after legacy fallback, derive permissions from RoleHierarchy defaults.
        if (permissionScopes.isEmpty() && user != null && !user.getRoles().isEmpty()) {
            log.warn("No permissions found in role_permission table for user {}. Deriving from RoleHierarchy defaults.", userId);
            user.getRoles().forEach(role -> {
                com.nulogic.common.security.RoleHierarchy.getDefaultPermissions(role.getCode()).forEach(perm -> {
                    permissionScopes.putIfAbsent(perm, com.nulogic.domain.user.RoleScope.ALL);
                });
            });
        }

        log.info("Loaded permissions for user {}: {} permissions", userId, permissionScopes.size());
        mergeImplicitPermissions(employee, appCode, permissionScopes);
        return permissionScopes;
    }

    private boolean isHigherScope(com.nulogic.domain.user.RoleScope newScope,
                                  com.nulogic.domain.user.RoleScope existingScope) {
        return newScope.isMorePermissiveThan(existingScope);
    }

    /**
     * Load roles for a user using a pre-fetched UserAppAccess.
     * Accepts the already-loaded employee to avoid redundant DB lookups.
     * Falls back to legacy role codes if no UserAppAccess exists.
     */
    private Set<String> loadAppRolesFromAccess(
            UUID userId, String appCode, Optional<UserAppAccess> access, Employee employee) {

        if (access.isPresent()) {
            Set<String> roles = new HashSet<>(access.get().getRoleCodes());
            mergeImplicitRoles(employee, roles);
            return roles;
        }

        // Fallback: Load from legacy User->Role structure
        User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            Set<String> roles = user.getRoles().stream()
                    .map(com.nulogic.domain.user.Role::getCode)
                    .collect(Collectors.toSet());
            mergeImplicitRoles(employee, roles);
            return roles;
        }
        Set<String> implicitOnlyRoles = new HashSet<>();
        mergeImplicitRoles(employee, implicitOnlyRoles);
        return implicitOnlyRoles;
    }

    /**
     * Load all application codes a user has access to.
     * Uses a JPQL projection to fetch only the app codes, avoiding entity hydration overhead.
     */
    private Set<String> loadAccessibleApps(UUID userId) {
        return new HashSet<>(userAppAccessRepository.findActiveApplicationCodesByUserId(userId));
    }

    /**
     * Merge implicit roles (REPORTING_MANAGER, SKIP_LEVEL_MANAGER) using the already-loaded employee.
     * Eliminates redundant employeeRepository.findByUserIdAndTenantId() calls.
     */
    private void mergeImplicitRoles(Employee employee, Set<String> roles) {
        if (employee == null) {
            return;
        }
        UUID tenantId = com.nulogic.common.security.TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return;
        }
        roles.addAll(implicitRoleService.getImplicitRoles(employee.getId(), tenantId));
    }

    /**
     * Merge implicit permissions using the already-loaded employee.
     * Eliminates redundant employeeRepository.findByUserIdAndTenantId() calls.
     */
    private void mergeImplicitPermissions(
            Employee employee,
            String appCode,
            Map<String, com.nulogic.domain.user.RoleScope> permissionScopes) {
        if (employee == null) {
            return;
        }
        UUID tenantId = com.nulogic.common.security.TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return;
        }
        Set<String> implicitPermissions = implicitRoleService.getImplicitPermissions(employee.getId(), tenantId);
        for (String permission : implicitPermissions) {
            String code = permission.startsWith(appCode + ":") ? permission : appCode + ":" + permission;
            permissionScopes.putIfAbsent(code, com.nulogic.domain.user.RoleScope.ALL);
        }
    }

    // ==================== Password Reset ====================

    /**
     * Request a password reset for the given email.
     * For security, always returns success even if email doesn't exist.
     *
     * @return "LOCAL" if reset email was sent, "GOOGLE" if user uses SSO,
     * or "LOCAL" for non-existent emails (to prevent user enumeration).
     */
    @Transactional
    public String requestPasswordReset(String email) {
        // Search across all tenants for the user by email
        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isPresent()) {
            User user = userOpt.get();

            // If user authenticates via Google SSO, don't send a reset email
            if (user.getAuthProvider() == com.nulogic.domain.user.AuthProvider.GOOGLE) {
                log.info("Password reset requested for SSO user -- redirecting to identity provider");
                return "GOOGLE";
            }

            // SEC: generate a 256-bit URL-safe random token and persist only its BCrypt
            // hash. The cleartext is emailed to the user and never stored. This prevents
            // an attacker with read access to the users table from minting reset links.
            String resetToken = generateUrlSafeToken(32);
            String resetTokenHash = passwordEncoder.encode(resetToken);

            user.setPasswordResetTokenHash(resetTokenHash);
            // Keep legacy plaintext column null so old lookups never succeed.
            user.setPasswordResetToken(null);
            user.setPasswordResetTokenExpiry(tenantTimeService.now(user.getTenantId()).plusHours(1));
            userRepository.save(user);

            log.info("Password reset requested for user ID: {}", user.getId());

            // Send password reset email with the cleartext token (link payload)
            String userName = user.getFullName() != null ? user.getFullName() : email;
            emailNotificationService.sendPasswordResetEmail(email, userName, resetToken);
            return "LOCAL";
        } else {
            // Log but don't reveal that user doesn't exist (security best practice)
            log.debug("Password reset requested for non-existent account");
            return "LOCAL";
        }
    }

    // ==================== Password Reset Helpers ====================

    /**
     * Reset password using a valid reset token.
     */
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new ValidationException("New password and confirm password do not match");
        }

        // SEC: token stored as BCrypt hash — scan unexpired candidates and constant-time match.
        // TODO(scaling): if the candidate set grows large, add a short-lived in-memory
        // salt-prefix index keyed by token prefix to narrow the BCrypt comparisons.
        String submittedToken = request.getToken();
        if (submittedToken == null || submittedToken.isBlank()) {
            throw new AuthenticationException("Invalid or expired reset token");
        }

        // Cross-tenant candidate scan happens BEFORE we know the user — no tenant
        // context exists yet, so fall back to Asia/Kolkata via null. Once the
        // matching user is resolved, subsequent timestamps use the user's tenant.
        List<User> candidates = userRepository.findActivePasswordResetCandidates(tenantTimeService.now(null));
        User user = candidates.stream()
                .filter(u -> u.getPasswordResetTokenHash() != null
                        && passwordEncoder.matches(submittedToken, u.getPasswordResetTokenHash()))
                .findFirst()
                .orElseThrow(() -> new AuthenticationException("Invalid or expired reset token"));

        // Check if token is expired (defence-in-depth — query already filters)
        if (user.getPasswordResetTokenExpiry() == null ||
                user.getPasswordResetTokenExpiry().isBefore(tenantTimeService.now(user.getTenantId()))) {
            throw new AuthenticationException("Password reset token has expired");
        }

        // Validate new password against policy (P0 security hardening)
        passwordPolicyService.validatePassword(
                request.getNewPassword(),
                user.getEmail(),
                user.getFullName()
        );

        // Check password history — prevent reuse of last N passwords
        int historyCount = passwordPolicyConfig.getHistoryCount();
        if (historyCount > 0) {
            List<PasswordHistory> history = passwordHistoryRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
            for (int i = 0; i < Math.min(historyCount, history.size()); i++) {
                if (passwordEncoder.matches(request.getNewPassword(), history.get(i).getPasswordHash())) {
                    throw new BusinessException("New password cannot be the same as your last " + historyCount + " passwords");
                }
            }
        }

        // Capture old hash before overwriting
        String oldPasswordHash = user.getPasswordHash();

        // Update password and clear reset token (both legacy plaintext and hashed columns)
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordChangedAt(tenantTimeService.now(user.getTenantId()));
        user.setPasswordResetToken(null);
        user.setPasswordResetTokenHash(null);
        user.setPasswordResetTokenExpiry(null);
        userRepository.save(user);

        // Save old password to history
        passwordHistoryRepository.save(new PasswordHistory(user.getId(), user.getTenantId(), oldPasswordHash));

        log.info("Password reset successful for user ID: {}", user.getId());

        // Send confirmation email
        String userName = user.getFullName() != null ? user.getFullName() : user.getEmail();
        emailNotificationService.sendPasswordChangedEmail(user.getEmail(), userName);
    }

    /**
     * Generate a URL-safe Base64-encoded random token containing {@code byteLength}
     * bytes (~256 bits when byteLength=32). Padding is stripped so the value can
     * appear unmodified in a URL.
     */
    private String generateUrlSafeToken(int byteLength) {
        byte[] bytes = new byte[byteLength];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /**
     * Constant-time string equality. Helper kept for any future direct-string
     * comparisons (e.g., HMAC-SHA256 reset tokens) — current flow uses BCrypt
     * via {@link PasswordEncoder#matches(CharSequence, String)} which is already
     * constant-time over the produced hash.
     */
    @SuppressWarnings("unused")
    private boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) return false;
        byte[] ab = a.getBytes(StandardCharsets.UTF_8);
        byte[] bb = b.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(ab, bb);
    }

    /**
     * Load permissions, roles, employee context, and auto-link SuperAdmin employee
     * in a single reusable call. Used by all login flows (password, Google, MFA, refresh).
     */
    private AuthContext buildAuthContext(User user, UUID tenantId) {
        Optional<Employee> empOpt = employeeRepository.findByUserIdWithUser(user.getId(), tenantId);

        Optional<UserAppAccess> appAccess = userAppAccessRepository
                .findByUserIdAndAppCodeWithPermissions(user.getId(), HrmsPermissionInitializer.APP_CODE);

        Map<String, com.nulogic.domain.user.RoleScope> appPermissions = loadAppPermissionsFromAccess(
                user.getId(), HrmsPermissionInitializer.APP_CODE, appAccess, empOpt.orElse(null));
        Set<String> appRoles = loadAppRolesFromAccess(
                user.getId(), HrmsPermissionInitializer.APP_CODE, appAccess, empOpt.orElse(null));
        Set<String> accessibleApps = loadAccessibleApps(user.getId());

        UUID employeeId = empOpt.map(Employee::getId).orElse(null);
        UUID locationId = empOpt.map(Employee::getOfficeLocationId).orElse(null);
        UUID departmentId = empOpt.map(Employee::getDepartmentId).orElse(null);
        UUID teamId = empOpt.map(Employee::getTeamId).orElse(null);

        if (employeeId == null && isSuperAdmin(appRoles)) {
            empOpt = autoLinkOrCreateEmployeeForSuperAdmin(user, tenantId);
            employeeId = empOpt.map(Employee::getId).orElse(null);
            locationId = empOpt.map(Employee::getOfficeLocationId).orElse(null);
            departmentId = empOpt.map(Employee::getDepartmentId).orElse(null);
            teamId = empOpt.map(Employee::getTeamId).orElse(null);
        }

        return new AuthContext(appPermissions, appRoles, accessibleApps,
                employeeId, locationId, departmentId, teamId);
    }

    // ==================== SuperAdmin Employee Linking ====================

    // ==================== Auth Context Helper ====================

    /**
     * Generate access + refresh tokens and build the common AuthResponse.
     */
    private AuthResponse buildAuthResponse(User user, UUID tenantId, AuthContext ctx) {
        String accessToken = tokenProvider.generateTokenWithAppPermissions(
                user, tenantId, HrmsPermissionInitializer.APP_CODE,
                ctx.appPermissions(), ctx.appRoles(), ctx.accessibleApps(),
                ctx.employeeId(), ctx.locationId(), ctx.departmentId(), ctx.teamId());
        String refreshToken = tokenProvider.generateRefreshToken(user.getEmail(), tenantId);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtExpiration)
                .userId(user.getId())
                .employeeId(ctx.employeeId())
                .tenantId(tenantId)
                .email(user.getEmail())
                .fullName(user.getFullName())
                .profilePictureUrl(user.getProfilePictureUrl())
                .tenantTimezone(resolveTenantTimezone(tenantId))
                .roles(new ArrayList<>(ctx.appRoles()))
                .permissions(new ArrayList<>(ctx.appPermissions().keySet()))
                .build();
    }

    /**
     * Resolve the IANA timezone identifier for the tenant via the cached
     * {@link TenantTimeService}. Falls back to {@code Asia/Kolkata} when the tenant id
     * is null or the lookup fails (matching the resolver's own fallback contract) so
     * a downstream lookup miss never blocks login. Exposed on AuthResponse so the
     * frontend can hydrate tenant-local time formatting from a single source of truth
     * (see docs/architecture/frontend-tenant-zone-propagation-design.md).
     */
    private String resolveTenantTimezone(UUID tenantId) {
        return tenantTimeService.zoneFor(tenantId).getId();
    }

    /**
     * Check if the given set of role codes contains SUPER_ADMIN.
     */
    private boolean isSuperAdmin(Set<String> appRoles) {
        return appRoles != null && appRoles.contains("SUPER_ADMIN");
    }

    /**
     * For SuperAdmin users without an employee record, attempt to:
     * 1. Find and link an existing employee with matching email
     * 2. If no employee exists, create a minimal employee record
     *
     * @param user     the user entity
     * @param tenantId the tenant ID
     * @return Optional containing the linked/created employee, or empty if creation failed
     * (login still succeeds - employeeId will be null, which is acceptable for SuperAdmin)
     */
    private Optional<Employee> autoLinkOrCreateEmployeeForSuperAdmin(User user, UUID tenantId) {
        try {
            // Validate required fields before attempting creation
            if (user.getFullName() == null || user.getFullName().isBlank()) {
                log.warn("Cannot auto-create employee for SuperAdmin {}: fullName is null or empty", user.getId());
                return Optional.empty();
            }

            // Step 1: Try to find an existing employee with the same email
            // Use a targeted query instead of loading all employees to prevent memory issues
            List<Employee> matchingEmployees = employeeRepository.findByTenantId(tenantId).stream()
                    .filter(e -> e.getUser() != null && e.getUser().getEmail().equals(user.getEmail()))
                    .toList();

            if (!matchingEmployees.isEmpty()) {
                // Link the first matching employee to this user
                Employee employee = matchingEmployees.get(0);
                employee.setUser(user);
                employee = employeeRepository.save(employee);
                log.info("Auto-linked existing employee {} to SuperAdmin user {}", employee.getId(), user.getId());
                return Optional.of(employee);
            }

            // Step 2: Create a minimal employee record for the SuperAdmin
            String[] nameParts = user.getFullName().trim().split("\\s+", 2);
            String firstName = nameParts[0];
            String lastName = nameParts.length > 1 ? nameParts[1] : "";

            // Generate a unique employee code based on timestamp to prevent duplicates
            String employeeCode = "ADMIN-" + System.currentTimeMillis() + "-" + user.getId().toString().substring(0, 4).toUpperCase();

            Employee newEmployee = Employee.builder()
                    .employeeCode(employeeCode)
                    .user(user)
                    .firstName(firstName)
                    .lastName(lastName)
                    .joiningDate(tenantTimeService.today(tenantId))
                    .employmentType(Employee.EmploymentType.FULL_TIME)
                    .status(Employee.EmployeeStatus.ACTIVE)
                    .tenantId(tenantId)
                    .build();

            newEmployee = employeeRepository.save(newEmployee);
            log.info("Created minimal employee record for SuperAdmin user {} with employee ID {}", user.getId(), newEmployee.getId());

            return Optional.of(newEmployee);
        } catch (IllegalArgumentException | NullPointerException e) {
            // Validation errors during employee creation (bad data, null fields)
            log.error("Validation error during auto-creation of employee for SuperAdmin {}: {}", user.getId(), e.getMessage(), e);
            return Optional.empty();
        } catch (DataAccessException e) {
            // Database constraint violations, deadlocks, or other persistence errors
            // Log the full error but allow login to succeed with null employeeId
            log.error("Database error during auto-creation of employee for SuperAdmin {}: {} - Details: {}",
                    user.getId(), e.getClass().getSimpleName(), e.getMessage(), e);

            // Specific logging for common constraint violations
            String errorMessage = e.getMessage() != null ? e.getMessage() : "Unknown error";
            if (errorMessage.contains("duplicate") || errorMessage.contains("unique")) {
                log.warn("Employee code uniqueness constraint violation for SuperAdmin {}: {}", user.getId(), errorMessage);
            } else if (errorMessage.contains("foreign key") || errorMessage.contains("constraint")) {
                log.warn("Database constraint violation for SuperAdmin {}: {}", user.getId(), errorMessage);
            }

            return Optional.empty();
        }
    }

    /**
     * Complete login after MFA verification.
     * Called after user successfully enters MFA code during login flow.
     *
     * @param userId the user ID
     * @return AuthResponse with full authentication tokens
     * @throws ResourceNotFoundException if user not found
     */
    @Transactional
    public AuthResponse loginAfterMfa(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        UUID tenantId = user.getTenantId();
        com.nulogic.common.security.TenantContext.setCurrentTenant(tenantId);

        user.recordSuccessfulLogin();
        userRepository.save(user);

        // Build auth context and generate response
        AuthContext ctx = buildAuthContext(user, tenantId);

        log.info("User {} logged in successfully after MFA verification", userId);

        return buildAuthResponse(user, tenantId, ctx);
    }

    /**
     * Read the current failed-attempt counter for the given username from
     * Redis. Returns {@code 0} when the key is absent, malformed, or Redis is
     * unreachable — the captcha gate is fail-open on Redis errors because the
     * downstream {@link AccountLockoutService} will also see a fresh counter
     * and the user can re-attempt. This is intentional: a Redis outage should
     * not lock every user out of password login.
     *
     * <p>The key format ({@value LOCKOUT_ATTEMPTS_KEY_PREFIX}{@code <username>})
     * MUST stay in sync with {@code AccountLockoutService.ATTEMPTS_KEY_PREFIX}.
     * The duplication is deliberate scaffolding under the strict scope rule
     * that prohibits modifying {@code AccountLockoutService}.</p>
     */
    private int readFailedLoginAttempts(String username) {
        if (username == null || username.isBlank()) {
            return 0;
        }
        try {
            String value = stringRedisTemplate.opsForValue().get(LOCKOUT_ATTEMPTS_KEY_PREFIX + username);
            if (value == null || value.isBlank()) {
                return 0;
            }
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException badInt) {
            log.warn("Lockout counter for {} is non-numeric — treating as zero", username);
            return 0;
        } catch (DataAccessException redisDown) {
            // Redis unreachable — fail open. AccountLockoutService.loginFailed()
            // will also no-op in this case, so the brute-force window is
            // effectively suspended until Redis recovers; that is the same
            // pre-existing behaviour and out of scope to change here.
            log.warn("Could not read lockout counter for {}: {}", username, redisDown.getMessage());
            return 0;
        }
    }

    /**
     * Best-effort resolve the remote IP of the current request for forwarding
     * to Google's siteverify call. Reads {@code X-Forwarded-For} (first hop)
     * when present so the value reflects the real client behind the K8s
     * ingress, falling back to the direct {@code remoteAddr}. Returns
     * {@code null} when no request is bound to the current thread (e.g. an
     * internal call path) — Google treats {@code remoteip} as optional, so a
     * null is safe.
     */
    private String resolveRemoteIp() {
        try {
            org.springframework.web.context.request.RequestAttributes attrs =
                    org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
            if (!(attrs instanceof org.springframework.web.context.request.ServletRequestAttributes sra)) {
                return null;
            }
            jakarta.servlet.http.HttpServletRequest req = sra.getRequest();
            String forwarded = req.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                // X-Forwarded-For may be a comma-separated chain; the original
                // client is the leftmost entry.
                int comma = forwarded.indexOf(',');
                return (comma > 0 ? forwarded.substring(0, comma) : forwarded).trim();
            }
            return req.getRemoteAddr();
        } catch (Exception swallow) { // Intentional broad catch — pure diagnostic helper, must never break login
            log.debug("Could not resolve remote IP: {}", swallow.getMessage());
            return null;
        }
    }

    /**
     * Simple class to hold user info from Google userinfo API
     */
    private static class GoogleUserInfo {
        String email;
        String hd; // hosted domain
        String picture; // profile picture URL
    }

    /**
     * Holds all the resolved auth context needed to build tokens and responses.
     * Eliminates the repeated permission/role/employee loading block that was
     * duplicated across login(), googleLogin(), refresh(), and loginAfterMfa().
     */
    private record AuthContext(
            Map<String, com.nulogic.domain.user.RoleScope> appPermissions,
            Set<String> appRoles,
            Set<String> accessibleApps,
            UUID employeeId,
            UUID locationId,
            UUID departmentId,
            UUID teamId
    ) {
    }
}
