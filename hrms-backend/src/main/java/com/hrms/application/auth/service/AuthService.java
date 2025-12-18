package com.hrms.application.auth.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.hrms.api.auth.dto.*;
import com.hrms.application.platform.service.HrmsPermissionInitializer;
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

    @Value("${app.jwt.expiration}")
    private long jwtExpiration;

    @Value("${app.google.client-id:}")
    private String googleClientId;

    @Value("${app.auth.allowed-domain:nulogic.io}")
    private String allowedDomain;

    @Transactional
    public AuthResponse login(LoginRequest request) {
        // Use provided tenantId or default demo tenant
        UUID tenantId = request.getTenantId();
        if (tenantId == null) {
            tenantId = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
        }

        // Set tenant context for authentication
        com.hrms.common.security.TenantContext.setCurrentTenant(tenantId);

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        User user = userRepository.findByEmailAndTenantId(request.getEmail(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", request.getEmail()));

        user.recordSuccessfulLogin();
        userRepository.save(user);

        // Load app-specific permissions from UserAppAccess (NU Platform RBAC)
        Set<String> appPermissions = loadAppPermissions(user.getId(), HrmsPermissionInitializer.APP_CODE);
        Set<String> appRoles = loadAppRoles(user.getId(), HrmsPermissionInitializer.APP_CODE);
        Set<String> accessibleApps = loadAccessibleApps(user.getId());

        // Generate token with app-aware permissions
        String accessToken = tokenProvider.generateTokenWithAppPermissions(
                user, tenantId, HrmsPermissionInitializer.APP_CODE, appPermissions, appRoles, accessibleApps);
        String refreshToken = tokenProvider.generateRefreshToken(request.getEmail(), tenantId);

        // Find employee ID if user is linked to an employee
        Optional<Employee> employee = employeeRepository.findByUserIdAndTenantId(user.getId(), tenantId);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(jwtExpiration)
                .userId(user.getId())
                .employeeId(employee.map(Employee::getId).orElse(null))
                .tenantId(tenantId)
                .email(user.getEmail())
                .fullName(user.getFullName())
                .build();
    }

    @Transactional
    public AuthResponse googleLogin(GoogleLoginRequest request) {
        String email;
        String hostedDomain;

        if (request.isAccessToken()) {
            // Handle access token - call Google userinfo API
            GoogleUserInfo userInfo = getUserInfoFromAccessToken(request.getCredential());
            email = userInfo.email;
            hostedDomain = userInfo.hd;
        } else {
            // Handle ID token - verify with Google
            GoogleIdToken idToken = verifyGoogleToken(request.getCredential());
            if (idToken == null) {
                throw new AuthenticationException("Invalid Google ID token");
            }
            GoogleIdToken.Payload payload = idToken.getPayload();
            email = payload.getEmail();
            hostedDomain = payload.getHostedDomain();
        }

        // Verify domain restriction - must be @allowedDomain
        if (hostedDomain == null || !hostedDomain.equals(allowedDomain)) {
            throw new AuthenticationException("Only @" + allowedDomain + " accounts are allowed");
        }

        if (!email.endsWith("@" + allowedDomain)) {
            throw new AuthenticationException("Only @" + allowedDomain + " accounts are allowed");
        }

        // For @nulogic.io accounts, use NuLogic tenant; otherwise use provided or demo tenant
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
                .orElseThrow(() -> new AuthenticationException("User not found. Please contact your administrator to set up your account."));

        // Update tenantId to user's actual tenant
        tenantId = user.getTenantId();
        com.hrms.common.security.TenantContext.setCurrentTenant(tenantId);

        user.recordSuccessfulLogin();
        userRepository.save(user);

        UserPrincipal userPrincipal = UserPrincipal.create(user);
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                userPrincipal, null, userPrincipal.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(authentication);

        // Load app-specific permissions from UserAppAccess (NU Platform RBAC)
        Set<String> appPermissions = loadAppPermissions(user.getId(), HrmsPermissionInitializer.APP_CODE);
        Set<String> appRoles = loadAppRoles(user.getId(), HrmsPermissionInitializer.APP_CODE);
        Set<String> accessibleApps = loadAccessibleApps(user.getId());

        // Generate token with app-aware permissions
        String accessToken = tokenProvider.generateTokenWithAppPermissions(
                user, tenantId, HrmsPermissionInitializer.APP_CODE, appPermissions, appRoles, accessibleApps);
        String refreshToken = tokenProvider.generateRefreshToken(email, tenantId);

        // Find employee ID if user is linked to an employee
        Optional<Employee> employee = employeeRepository.findByUserIdAndTenantId(user.getId(), tenantId);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(jwtExpiration)
                .userId(user.getId())
                .employeeId(employee.map(Employee::getId).orElse(null))
                .tenantId(tenantId)
                .email(user.getEmail())
                .fullName(user.getFullName())
                .build();
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
        String name;
        String picture;
    }

    /**
     * Get user info from Google using an access token.
     * This is used when the frontend uses the implicit OAuth flow with custom scopes.
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
            userInfo.name = json.has("name") ? json.get("name").asText() : null;
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
            Set<String> appPermissions = loadAppPermissions(user.getId(), HrmsPermissionInitializer.APP_CODE);
            Set<String> appRoles = loadAppRoles(user.getId(), HrmsPermissionInitializer.APP_CODE);
            Set<String> accessibleApps = loadAccessibleApps(user.getId());

            // Generate token with app-aware permissions
            String accessToken = tokenProvider.generateTokenWithAppPermissions(
                    user, tenantId, HrmsPermissionInitializer.APP_CODE, appPermissions, appRoles, accessibleApps);
            String newRefreshToken = tokenProvider.generateRefreshToken(email, tenantId);

            // Find employee ID if user is linked to an employee
            Optional<Employee> employee = employeeRepository.findByUserIdAndTenantId(user.getId(), tenantId);

            return AuthResponse.builder()
                    .accessToken(accessToken)
                    .refreshToken(newRefreshToken)
                    .expiresIn(jwtExpiration)
                    .userId(user.getId())
                    .employeeId(employee.map(Employee::getId).orElse(null))
                    .tenantId(tenantId)
                    .email(user.getEmail())
                    .fullName(user.getFullName())
                    .build();
        }
        throw new AuthenticationException("Invalid or expired refresh token");
    }

    public void logout(String token) {
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
    }

    // ==================== NU Platform RBAC Helper Methods ====================

    /**
     * Load permissions for a user in a specific application from the NU Platform.
     * Falls back to legacy role-based permissions if no UserAppAccess exists.
     */
    private Set<String> loadAppPermissions(UUID userId, String appCode) {
        Optional<UserAppAccess> access = userAppAccessRepository
                .findByUserIdAndAppCodeWithPermissions(userId, appCode);

        if (access.isPresent()) {
            return access.get().getAllPermissions();
        }

        // Fallback: Load from legacy User->Role->Permission structure
        // and convert to app-prefixed format
        User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            return user.getRoles().stream()
                    .flatMap(role -> role.getPermissions().stream())
                    .map(permission -> {
                        String code = permission.getCode();
                        // If permission doesn't already have app prefix, add it
                        if (!code.contains(":") || !code.startsWith(appCode + ":")) {
                            return appCode + ":" + code;
                        }
                        return code;
                    })
                    .collect(Collectors.toSet());
        }

        return Collections.emptySet();
    }

    /**
     * Load roles for a user in a specific application from the NU Platform.
     * Falls back to legacy role codes if no UserAppAccess exists.
     */
    private Set<String> loadAppRoles(UUID userId, String appCode) {
        Optional<UserAppAccess> access = userAppAccessRepository
                .findByUserIdAndAppCodeWithPermissions(userId, appCode);

        if (access.isPresent()) {
            return access.get().getRoleCodes();
        }

        // Fallback: Load from legacy User->Role structure
        User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            return user.getRoles().stream()
                    .map(role -> role.getCode())
                    .collect(Collectors.toSet());
        }

        return Collections.emptySet();
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

    // ==================== Password Reset ====================

    /**
     * Request a password reset for the given email.
     * For security, always returns success even if email doesn't exist.
     */
    @Transactional
    public void requestPasswordReset(String email) {
        // Default tenant for password reset
        UUID tenantId = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");

        Optional<User> userOpt = userRepository.findByEmailAndTenantId(email, tenantId);

        if (userOpt.isPresent()) {
            User user = userOpt.get();

            // Generate reset token (valid for 1 hour)
            String resetToken = UUID.randomUUID().toString();
            user.setPasswordResetToken(resetToken);
            user.setPasswordResetTokenExpiry(LocalDateTime.now().plusHours(1));
            userRepository.save(user);

            // Log the token for now - in production, this would send an email
            log.info("Password reset requested for user: {}. Reset token: {}", email, resetToken);

            // TODO: Send email with reset link containing token
            // emailService.sendPasswordResetEmail(email, resetToken);
        } else {
            // Log but don't reveal that user doesn't exist
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
    }
}
