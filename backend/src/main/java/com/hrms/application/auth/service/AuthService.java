package com.hrms.application.auth.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.hrms.api.auth.dto.*;
import com.hrms.application.platform.service.HrmsPermissionInitializer;
import com.hrms.application.user.service.ImplicitRoleService;
import com.hrms.common.exception.AuthenticationException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.exception.ValidationException;
import com.hrms.common.security.JwtTokenProvider;
import com.hrms.common.security.UserPrincipal;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.platform.UserAppAccess;
import com.hrms.domain.user.User;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.platform.repository.UserAppAccessRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import com.hrms.application.notification.service.EmailNotificationService;
import com.hrms.common.metrics.MetricsService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.GeneralSecurityException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class AuthService {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private UserAppAccessRepository userAppAccessRepository;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EmailNotificationService emailNotificationService;

    @Autowired
    private ImplicitRoleService implicitRoleService;

    @Autowired
    private MetricsService metricsService;

    @Value("${app.jwt.expiration}")
    private long jwtExpiration;

    @Value("${app.google.client-id:}")
    private String googleClientId;

    @Value("${app.auth.allowed-domain:nulogic.io}")
    private String allowedDomain;

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
            // Fallback to demo tenant if user not found and no tenant specified
            tenantId = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
        }

        // Set tenant context for authentication
        com.hrms.common.security.TenantContext.setCurrentTenant(tenantId);

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

            SecurityContextHolder.getContext().setAuthentication(authentication);

            User user = userRepository.findByEmailAndTenantId(request.getEmail(), tenantId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", "email", request.getEmail()));

            user.recordSuccessfulLogin();
            userRepository.save(user);

            // Record successful login metric
            metricsService.recordLoginSuccess("password");

            // Load app-specific permissions from UserAppAccess (NU Platform RBAC)
            Map<String, com.hrms.domain.user.RoleScope> appPermissions = loadAppPermissions(user.getId(),
                    HrmsPermissionInitializer.APP_CODE);
            Set<String> appRoles = loadAppRoles(user.getId(), HrmsPermissionInitializer.APP_CODE);
            Set<String> accessibleApps = loadAccessibleApps(user.getId());

            // Find employee context
            Optional<Employee> empOpt = employeeRepository.findByUserIdAndTenantId(user.getId(), tenantId);
            UUID employeeId = empOpt.map(Employee::getId).orElse(null);
            UUID locationId = empOpt.map(Employee::getOfficeLocationId).orElse(null);
            UUID departmentId = empOpt.map(Employee::getDepartmentId).orElse(null);
            UUID teamId = empOpt.map(Employee::getTeamId).orElse(null);

            // Auto-link employee if user has SUPER_ADMIN role and no employee record
            if (employeeId == null && isSuperAdmin(appRoles)) {
                empOpt = autoLinkOrCreateEmployeeForSuperAdmin(user, tenantId);
                employeeId = empOpt.map(Employee::getId).orElse(null);
                locationId = empOpt.map(Employee::getOfficeLocationId).orElse(null);
                departmentId = empOpt.map(Employee::getDepartmentId).orElse(null);
                teamId = empOpt.map(Employee::getTeamId).orElse(null);
            }

            // Generate token with app-aware permissions
            String accessToken = tokenProvider.generateTokenWithAppPermissions(
                    user, tenantId, HrmsPermissionInitializer.APP_CODE, appPermissions, appRoles, accessibleApps,
                    employeeId, locationId, departmentId, teamId);
            String refreshToken = tokenProvider.generateRefreshToken(request.getEmail(), tenantId);

            return AuthResponse.builder()
                    .accessToken(accessToken)
                    .refreshToken(refreshToken)
                    .tokenType("Bearer")
                    .expiresIn(jwtExpiration)
                    .userId(user.getId())
                    .employeeId(employeeId)
                    .tenantId(tenantId)
                    .email(user.getEmail())
                    .fullName(user.getFullName())
                    .profilePictureUrl(user.getProfilePictureUrl())
                    .build();
        } catch (AuthenticationException | ResourceNotFoundException e) {
            // Record failed login metric
            metricsService.recordLoginFailure("password", e.getClass().getSimpleName());
            throw e;
        } catch (Exception e) {
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

            // For @nulogic.io accounts, use NuLogic tenant; otherwise use provided or demo
            // tenant
            UUID tenantId = request.getTenantId();
            if (tenantId == null) {
                if (email.endsWith("@nulogic.io")) {
                    // NuLogic tenant
                    tenantId = UUID.fromString("660e8400-e29b-41d4-a716-446655440001");
                } else {
                    // Default demo tenant
                    tenantId = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
                }
            }

            // Set tenant context
            com.hrms.common.security.TenantContext.setCurrentTenant(tenantId);

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
            com.hrms.common.security.TenantContext.setCurrentTenant(tenantId);

            // Update profile picture from Google if available
            if (profilePictureUrl != null && !profilePictureUrl.isEmpty()) {
                user.setProfilePictureUrl(profilePictureUrl);
                log.info("Updated profile picture for user {} from Google SSO", email);
            }

            user.recordSuccessfulLogin();
            userRepository.save(user);

            // Record successful Google login metric
            metricsService.recordLoginSuccess("google");

            UserPrincipal userPrincipal = UserPrincipal.create(user);
            Authentication authentication = new UsernamePasswordAuthenticationToken(
                    userPrincipal, null, userPrincipal.getAuthorities());
            SecurityContextHolder.getContext().setAuthentication(authentication);

            // Load app-specific permissions from UserAppAccess (NU Platform RBAC)
            Map<String, com.hrms.domain.user.RoleScope> appPermissions = loadAppPermissions(user.getId(),
                    HrmsPermissionInitializer.APP_CODE);
            Set<String> appRoles = loadAppRoles(user.getId(), HrmsPermissionInitializer.APP_CODE);
            Set<String> accessibleApps = loadAccessibleApps(user.getId());

            // Find employee context
            Optional<Employee> empOpt = employeeRepository.findByUserIdAndTenantId(user.getId(), tenantId);
            UUID employeeId = empOpt.map(Employee::getId).orElse(null);
            UUID locationId = empOpt.map(Employee::getOfficeLocationId).orElse(null);
            UUID departmentId = empOpt.map(Employee::getDepartmentId).orElse(null);
            UUID teamId = empOpt.map(Employee::getTeamId).orElse(null);

            // Auto-link employee if user has SUPER_ADMIN role and no employee record
            if (employeeId == null && isSuperAdmin(appRoles)) {
                empOpt = autoLinkOrCreateEmployeeForSuperAdmin(user, tenantId);
                employeeId = empOpt.map(Employee::getId).orElse(null);
                locationId = empOpt.map(Employee::getOfficeLocationId).orElse(null);
                departmentId = empOpt.map(Employee::getDepartmentId).orElse(null);
                teamId = empOpt.map(Employee::getTeamId).orElse(null);
            }

            // Generate token with app-aware permissions
            String accessToken = tokenProvider.generateTokenWithAppPermissions(
                    user, tenantId, HrmsPermissionInitializer.APP_CODE, appPermissions, appRoles, accessibleApps,
                    employeeId, locationId, departmentId, teamId);
            String refreshToken = tokenProvider.generateRefreshToken(email, tenantId);

            return AuthResponse.builder()
                    .accessToken(accessToken)
                    .refreshToken(refreshToken)
                    .tokenType("Bearer")
                    .expiresIn(jwtExpiration)
                    .userId(user.getId())
                    .employeeId(employeeId)
                    .tenantId(tenantId)
                    .email(user.getEmail())
                    .fullName(user.getFullName())
                    .profilePictureUrl(user.getProfilePictureUrl())
                    .build();
        } catch (AuthenticationException e) {
            throw e;
        } catch (Exception e) {
            metricsService.recordLoginFailure("google", "unknown_error");
            throw e;
        }
    }

    private GoogleIdToken verifyGoogleToken(String idTokenString) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(),
                    GsonFactory.getDefaultInstance())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            return verifier.verify(idTokenString);
        } catch (GeneralSecurityException | IOException e) {
            throw new AuthenticationException("Failed to verify Google token: " + e.getMessage(), e);
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

            return userInfo;
        } catch (IOException | InterruptedException e) {
            log.error("Error calling Google userinfo API", e);
            throw new AuthenticationException("Failed to verify Google access token: " + e.getMessage(), e);
        }
    }

    public AuthResponse refresh(String refreshToken) {
        if (tokenProvider.validateToken(refreshToken)) {
            String email = tokenProvider.getUsernameFromToken(refreshToken);
            UUID tenantId = tokenProvider.getTenantIdFromToken(refreshToken);

            User user = userRepository.findByEmailAndTenantId(email, tenantId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));

            // Load app-specific permissions from UserAppAccess (NU Platform RBAC)
            Map<String, com.hrms.domain.user.RoleScope> appPermissions = loadAppPermissions(user.getId(),
                    HrmsPermissionInitializer.APP_CODE);
            Set<String> appRoles = loadAppRoles(user.getId(), HrmsPermissionInitializer.APP_CODE);
            Set<String> accessibleApps = loadAccessibleApps(user.getId());

            // Find employee context
            Optional<Employee> empOpt = employeeRepository.findByUserIdAndTenantId(user.getId(), tenantId);
            UUID employeeId = empOpt.map(Employee::getId).orElse(null);
            UUID locationId = empOpt.map(Employee::getOfficeLocationId).orElse(null);
            UUID departmentId = empOpt.map(Employee::getDepartmentId).orElse(null);
            UUID teamId = empOpt.map(Employee::getTeamId).orElse(null);

            // Generate token with app-aware permissions
            String accessToken = tokenProvider.generateTokenWithAppPermissions(
                    user, tenantId, HrmsPermissionInitializer.APP_CODE, appPermissions, appRoles, accessibleApps,
                    employeeId, locationId, departmentId, teamId);
            String newRefreshToken = tokenProvider.generateRefreshToken(email, tenantId);

            // Context already handled above

            return AuthResponse.builder()
                    .accessToken(accessToken)
                    .refreshToken(newRefreshToken)
                    .tokenType("Bearer")
                    .expiresIn(jwtExpiration)
                    .userId(user.getId())
                    .employeeId(employeeId)
                    .tenantId(tenantId)
                    .email(user.getEmail())
                    .fullName(user.getFullName())
                    .build();
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
        // Revoke the token by adding it to the blacklist
        if (token != null && !token.isBlank()) {
            tokenProvider.revokeToken(token);
            log.info("Token revoked on logout");
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

        // Hash and update new password
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordChangedAt(LocalDateTime.now());

        userRepository.save(user);

        // Revoke all existing tokens for this user (force re-login on all devices)
        tokenProvider.revokeAllUserTokens(userId.toString());
        log.info("All tokens revoked for user {} after password change", userId);
    }

    // ==================== NU Platform RBAC Helper Methods ====================

    /**
     * Load permissions for a user in a specific application from the NU Platform.
     * Falls back to legacy role-based permissions if no UserAppAccess exists.
     */
    private Map<String, com.hrms.domain.user.RoleScope> loadAppPermissions(UUID userId, String appCode) {
        Optional<UserAppAccess> access = userAppAccessRepository
                .findByUserIdAndAppCodeWithPermissions(userId, appCode);

        Map<String, com.hrms.domain.user.RoleScope> permissionScopes = new HashMap<>();

        if (access.isPresent()) {
            // NU Platform RBAC (AppRole -> AppPermission relations with scopes)
            UserAppAccess userAccess = access.get();

            // Load permissions from roles
            userAccess.getRoles().forEach(appRole -> {
                appRole.getPermissions().forEach(appPerm -> {
                    String code = appPerm.getCode();
                    // Default to ALL scope for NU Platform permissions (admin-level)
                    // In future, AppPermission could have its own scope field
                    com.hrms.domain.user.RoleScope newScope = com.hrms.domain.user.RoleScope.ALL;
                    com.hrms.domain.user.RoleScope existingScope = permissionScopes.get(code);
                    if (existingScope == null || newScope.isMorePermissiveThan(existingScope)) {
                        permissionScopes.put(code, newScope);
                    }
                });
            });

            // Also load direct permissions
            userAccess.getDirectPermissions().forEach(appPerm -> {
                String code = appPerm.getCode();
                com.hrms.domain.user.RoleScope newScope = com.hrms.domain.user.RoleScope.ALL;
                permissionScopes.putIfAbsent(code, newScope);
            });

            // If UserAppAccess exists but AppRoles have no AppPermissions linked (migration gap),
            // fall back to RoleHierarchy defaults based on the role codes.
            if (permissionScopes.isEmpty() && !userAccess.getRoles().isEmpty()) {
                log.warn("UserAppAccess for user {} has roles but no permissions. Deriving from RoleHierarchy defaults.", userId);
                userAccess.getRoleCodes().forEach(roleCode -> {
                    com.hrms.common.security.RoleHierarchy.getDefaultPermissions(roleCode).forEach(perm -> {
                        permissionScopes.putIfAbsent(perm, com.hrms.domain.user.RoleScope.ALL);
                    });
                });
            }

            log.debug("Loaded {} permissions from UserAppAccess for user {}", permissionScopes.size(), userId);
            mergeImplicitPermissions(userId, appCode, permissionScopes);
            return permissionScopes;
        }

        // Fallback: Load from legacy User->Role->RolePermission structure (Matrix RBAC)
        log.debug("No UserAppAccess found for user {}, falling back to legacy role permissions", userId);
        // Use the new method that eagerly fetches roles and permissions
        User user = userRepository.findByIdWithRolesAndPermissions(userId).orElse(null);
        if (user != null) {
            log.debug("User {} has {} roles", userId, user.getRoles().size());
            user.getRoles().forEach(role -> {
                log.debug("Processing role: {} with {} permissions", role.getCode(), role.getPermissions().size());
                role.getPermissions().forEach(rp -> {
                    String code = rp.getPermission().getCode();
                    // Normalize: strip app prefix if present (e.g., "HRMS:EMPLOYEE:READ" -> "EMPLOYEE:READ")
                    // to be consistent with NU Platform RBAC path which stores MODULE:ACTION format
                    if (code.startsWith(appCode + ":")) {
                        code = code.substring(appCode.length() + 1);
                    }
                    log.debug("Permission: {} -> {} (scope: {})", rp.getPermission().getCode(), code, rp.getScope());

                    com.hrms.domain.user.RoleScope newScope = rp.getScope();
                    com.hrms.domain.user.RoleScope existingScope = permissionScopes.get(code);

                    if (existingScope == null || isHigherScope(newScope, existingScope)) {
                        permissionScopes.put(code, newScope);
                    }
                });
            });
        }

        // If still empty after legacy fallback, derive permissions from RoleHierarchy defaults.
        // This handles cases where role_permission join table is empty but user has assigned roles.
        if (permissionScopes.isEmpty() && user != null && !user.getRoles().isEmpty()) {
            log.warn("No permissions found in role_permission table for user {}. Deriving from RoleHierarchy defaults.", userId);
            user.getRoles().forEach(role -> {
                com.hrms.common.security.RoleHierarchy.getDefaultPermissions(role.getCode()).forEach(perm -> {
                    permissionScopes.putIfAbsent(perm, com.hrms.domain.user.RoleScope.ALL);
                });
            });
        }

        log.info("Loaded permissions for user {}: {} permissions", userId, permissionScopes.size());
        mergeImplicitPermissions(userId, appCode, permissionScopes);
        return permissionScopes;
    }

    private boolean isHigherScope(com.hrms.domain.user.RoleScope newScope,
            com.hrms.domain.user.RoleScope existingScope) {
        // Use the new RoleScope.isMorePermissiveThan method
        // Scope hierarchy: ALL(100) > LOCATION(80) > DEPARTMENT(60) > TEAM(40) > SELF(20) > CUSTOM(10)
        return newScope.isMorePermissiveThan(existingScope);
    }

    /**
     * Load roles for a user in a specific application from the NU Platform.
     * Falls back to legacy role codes if no UserAppAccess exists.
     */
    private Set<String> loadAppRoles(UUID userId, String appCode) {
        Optional<UserAppAccess> access = userAppAccessRepository
                .findByUserIdAndAppCodeWithPermissions(userId, appCode);

        if (access.isPresent()) {
            Set<String> roles = new HashSet<>(access.get().getRoleCodes());
            mergeImplicitRoles(userId, roles);
            return roles;
        }

        // Fallback: Load from legacy User->Role structure
        User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            Set<String> roles = user.getRoles().stream()
                    .map(role -> role.getCode())
                    .collect(Collectors.toSet());
            mergeImplicitRoles(userId, roles);
            return roles;
        }
        Set<String> implicitOnlyRoles = new HashSet<>();
        mergeImplicitRoles(userId, implicitOnlyRoles);
        return implicitOnlyRoles;
    }

    /**
     * Load all applications a user has access to.
     */
    private Set<String> loadAccessibleApps(UUID userId) {
        List<UserAppAccess> accessList = userAppAccessRepository.findUserApplications(userId);
        return accessList.stream()
                .map(access -> access.getApplication().getCode())
                .collect(Collectors.toSet());
    }

    private void mergeImplicitRoles(UUID userId, Set<String> roles) {
        UUID tenantId = com.hrms.common.security.TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return;
        }
        employeeRepository.findByUserIdAndTenantId(userId, tenantId)
                .ifPresent(emp -> roles.addAll(implicitRoleService.getImplicitRoles(emp.getId(), tenantId)));
    }

    private void mergeImplicitPermissions(
            UUID userId,
            String appCode,
            Map<String, com.hrms.domain.user.RoleScope> permissionScopes) {
        UUID tenantId = com.hrms.common.security.TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return;
        }
        employeeRepository.findByUserIdAndTenantId(userId, tenantId).ifPresent(emp -> {
            Set<String> implicitPermissions = implicitRoleService.getImplicitPermissions(emp.getId(), tenantId);
            for (String permission : implicitPermissions) {
                String code = permission.startsWith(appCode + ":") ? permission : appCode + ":" + permission;
                permissionScopes.putIfAbsent(code, com.hrms.domain.user.RoleScope.ALL);
            }
        });
    }

    // ==================== Password Reset ====================

    /**
     * Request a password reset for the given email.
     * For security, always returns success even if email doesn't exist.
     */
    @Transactional
    public void requestPasswordReset(String email) {
        // Search across all tenants for the user by email
        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isPresent()) {
            User user = userOpt.get();

            // Generate reset token (valid for 1 hour)
            String resetToken = UUID.randomUUID().toString();
            user.setPasswordResetToken(resetToken);
            user.setPasswordResetTokenExpiry(LocalDateTime.now().plusHours(1));
            userRepository.save(user);

            log.info("Password reset requested for user: {}", email);

            // Send password reset email
            String userName = user.getFullName() != null ? user.getFullName() : email;
            emailNotificationService.sendPasswordResetEmail(email, userName, resetToken);
        } else {
            // Log but don't reveal that user doesn't exist (security best practice)
            log.info("Password reset requested for non-existent email: {}", email);
        }
    }

    /**
     * Reset password using a valid reset token.
     */
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new ValidationException("New password and confirm password do not match");
        }

        User user = userRepository.findByPasswordResetToken(request.getToken())
                .orElseThrow(() -> new AuthenticationException("Invalid or expired reset token"));

        // Check if token is expired
        if (user.getPasswordResetTokenExpiry() == null ||
                user.getPasswordResetTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new AuthenticationException("Password reset token has expired");
        }

        // Update password and clear reset token
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordChangedAt(LocalDateTime.now());
        user.setPasswordResetToken(null);
        user.setPasswordResetTokenExpiry(null);
        userRepository.save(user);

        log.info("Password reset successful for user: {}", user.getEmail());

        // Send confirmation email
        String userName = user.getFullName() != null ? user.getFullName() : user.getEmail();
        emailNotificationService.sendPasswordChangedEmail(user.getEmail(), userName);
    }

    // ==================== SuperAdmin Employee Linking ====================

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
     * @param user the user entity
     * @param tenantId the tenant ID
     * @return Optional containing the linked/created employee
     */
    private Optional<Employee> autoLinkOrCreateEmployeeForSuperAdmin(User user, UUID tenantId) {
        try {
            // Step 1: Try to find an existing employee with the same email
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
            String[] nameParts = user.getFullName().split(" ", 2);
            String firstName = nameParts[0];
            String lastName = nameParts.length > 1 ? nameParts[1] : "";

            // Generate a unique employee code
            String employeeCode = "ADMIN-" + user.getId().toString().substring(0, 8).toUpperCase();

            Employee newEmployee = Employee.builder()
                    .employeeCode(employeeCode)
                    .user(user)
                    .firstName(firstName)
                    .lastName(lastName)
                    .joiningDate(LocalDate.now())
                    .employmentType(Employee.EmploymentType.FULL_TIME)
                    .status(Employee.EmployeeStatus.ACTIVE)
                    .tenantId(tenantId)
                    .build();

            newEmployee = employeeRepository.save(newEmployee);
            log.info("Created minimal employee record for SuperAdmin user {} with employee ID {}", user.getId(), newEmployee.getId());

            return Optional.of(newEmployee);
        } catch (Exception e) {
            log.error("Failed to auto-link/create employee for SuperAdmin user {}: {}", user.getId(), e.getMessage(), e);
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
        com.hrms.common.security.TenantContext.setCurrentTenant(tenantId);

        user.recordSuccessfulLogin();
        userRepository.save(user);

        // Load app-specific permissions from UserAppAccess (NU Platform RBAC)
        Map<String, com.hrms.domain.user.RoleScope> appPermissions = loadAppPermissions(user.getId(),
                HrmsPermissionInitializer.APP_CODE);
        Set<String> appRoles = loadAppRoles(user.getId(), HrmsPermissionInitializer.APP_CODE);
        Set<String> accessibleApps = loadAccessibleApps(user.getId());

        // Find employee context
        Optional<Employee> empOpt = employeeRepository.findByUserIdAndTenantId(user.getId(), tenantId);
        UUID employeeId = empOpt.map(Employee::getId).orElse(null);
        UUID locationId = empOpt.map(Employee::getOfficeLocationId).orElse(null);
        UUID departmentId = empOpt.map(Employee::getDepartmentId).orElse(null);
        UUID teamId = empOpt.map(Employee::getTeamId).orElse(null);

        // Auto-link employee if user has SUPER_ADMIN role and no employee record
        if (employeeId == null && isSuperAdmin(appRoles)) {
            empOpt = autoLinkOrCreateEmployeeForSuperAdmin(user, tenantId);
            employeeId = empOpt.map(Employee::getId).orElse(null);
            locationId = empOpt.map(Employee::getOfficeLocationId).orElse(null);
            departmentId = empOpt.map(Employee::getDepartmentId).orElse(null);
            teamId = empOpt.map(Employee::getTeamId).orElse(null);
        }

        // Generate token with app-aware permissions
        String accessToken = tokenProvider.generateTokenWithAppPermissions(
                user, tenantId, HrmsPermissionInitializer.APP_CODE, appPermissions, appRoles, accessibleApps,
                employeeId, locationId, departmentId, teamId);
        String refreshToken = tokenProvider.generateRefreshToken(user.getEmail(), tenantId);

        log.info("User {} logged in successfully after MFA verification", userId);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtExpiration)
                .userId(user.getId())
                .employeeId(employeeId)
                .tenantId(tenantId)
                .email(user.getEmail())
                .fullName(user.getFullName())
                .profilePictureUrl(user.getProfilePictureUrl())
                .build();
    }
}
