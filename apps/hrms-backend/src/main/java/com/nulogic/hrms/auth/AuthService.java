package com.nulogic.hrms.auth;

import com.nulogic.hrms.audit.AuditService;
import lombok.extern.slf4j.Slf4j;
import com.nulogic.hrms.common.TokenGenerator;
import com.nulogic.hrms.common.TokenHasher;
import com.nulogic.hrms.config.HrmsProperties;
import com.nulogic.hrms.employee.Employee;
import com.nulogic.hrms.employee.EmployeeRepository;
import com.nulogic.hrms.iam.model.RefreshToken;
import com.nulogic.hrms.iam.model.Role;
import com.nulogic.hrms.iam.model.User;
import com.nulogic.hrms.iam.model.UserStatus;
import com.nulogic.hrms.iam.repo.RefreshTokenRepository;
import com.nulogic.hrms.iam.repo.RoleRepository;
import com.nulogic.hrms.iam.repo.UserRepository;
import com.nulogic.hrms.org.Org;
import com.nulogic.hrms.org.OrgService;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
public class AuthService {
    private final GoogleTokenVerifierService tokenVerifierService;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final EmployeeRepository employeeRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final HrmsProperties properties;
    private final OrgService orgService;
    private final AuditService auditService;

    public AuthService(
            GoogleTokenVerifierService tokenVerifierService,
            UserRepository userRepository,
            RoleRepository roleRepository,
            EmployeeRepository employeeRepository,
            RefreshTokenRepository refreshTokenRepository,
            JwtService jwtService,
            HrmsProperties properties,
            OrgService orgService,
            AuditService auditService
    ) {
        this.tokenVerifierService = tokenVerifierService;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.employeeRepository = employeeRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtService = jwtService;
        this.properties = properties;
        this.orgService = orgService;
        this.auditService = auditService;
    }

    @Transactional
    public AuthResult login(String idToken, String ipAddress, String userAgent) {
        GoogleUserInfo userInfo = tokenVerifierService.verify(idToken);
        return loginWithUserInfo(userInfo, ipAddress, userAgent);
    }

    @Transactional
    public AuthResult loginWithGoogleToken(String credential, boolean accessToken, String ipAddress, String userAgent) {
        GoogleUserInfo userInfo = accessToken
                ? tokenVerifierService.verifyAccessToken(credential)
                : tokenVerifierService.verify(credential);
        return loginWithUserInfo(userInfo, ipAddress, userAgent);
    }

    @Transactional
    public AuthResult refresh(String refreshToken, String ipAddress, String userAgent) {
        String tokenHash = TokenHasher.sha256(refreshToken);
        RefreshToken stored = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new IllegalArgumentException("Invalid refresh token"));

        if (stored.getRevokedAt() != null || stored.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new IllegalArgumentException("Refresh token expired or revoked");
        }

        stored.setRevokedAt(OffsetDateTime.now());
        refreshTokenRepository.save(stored);

        User user = stored.getUser();
        List<String> roles = user.getRoles().stream().map(Role::getName).toList();
        String accessToken = jwtService.createAccessToken(user.getId(), user.getEmail(), roles);
        String newRefreshToken = createRefreshToken(user);
        UUID employeeId = resolveEmployeeId(user.getOrg(), user);

        auditService.recordAuthEvent(user.getOrg(), user, "REFRESH", "SUCCESS", ipAddress, userAgent, null);

        return new AuthResult(accessToken, newRefreshToken, user, roles, employeeId);
    }

    @Transactional
    public void logout(String refreshToken, String ipAddress, String userAgent) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }
        String tokenHash = TokenHasher.sha256(refreshToken);
        refreshTokenRepository.findByTokenHash(tokenHash).ifPresent(token -> {
            token.setRevokedAt(OffsetDateTime.now());
            refreshTokenRepository.save(token);
            auditService.recordAuthEvent(token.getUser().getOrg(), token.getUser(), "LOGOUT", "SUCCESS", ipAddress, userAgent, null);
        });
    }

    private User createUser(Org org, GoogleUserInfo userInfo) {
        User user = new User();
        user.setOrg(org);
        user.setEmail(userInfo.getEmail());
        user.setFullName(userInfo.getFullName() != null ? userInfo.getFullName() : userInfo.getEmail());
        user.setStatus(UserStatus.ACTIVE);
        user.setCreatedAt(OffsetDateTime.now());
        user.setUpdatedAt(OffsetDateTime.now());
        return userRepository.save(user);
    }

    private void linkEmployeeIfPresent(Org org, User user) {
        employeeRepository.findByOrg_IdAndOfficialEmail(org.getId(), user.getEmail())
                .filter(employee -> employee.getUser() == null)
                .ifPresent(employee -> {
                    employee.setUser(user);
                    employeeRepository.save(employee);
                });
    }

    private void ensureDefaultRoleAssigned(Org org, User user) {
        String defaultRoleName = "EMPLOYEE";
        Role role = roleRepository.findByOrg_IdAndName(org.getId(), defaultRoleName)
                .orElseThrow(() -> new IllegalStateException("Default role missing: " + defaultRoleName));
        if (user.getRoles().stream().noneMatch(r -> r.getName().equals(role.getName()))) {
            user.getRoles().add(role);
            userRepository.save(user);
        }

        String bootstrapAdminEmail = properties.getBootstrap().getSuperAdminEmail();
        if (bootstrapAdminEmail != null && !bootstrapAdminEmail.isBlank()
                && bootstrapAdminEmail.equalsIgnoreCase(user.getEmail())) {
            roleRepository.findByOrg_IdAndName(org.getId(), "SUPER_ADMIN")
                    .ifPresent(superAdmin -> {
                        if (user.getRoles().stream().noneMatch(r -> r.getName().equals(superAdmin.getName()))) {
                            user.getRoles().add(superAdmin);
                            userRepository.save(user);
                        }
                    });
        }
    }

    private String createRefreshToken(User user) {
        String rawToken = TokenGenerator.randomToken();
        RefreshToken token = new RefreshToken();
        token.setUser(user);
        token.setTokenHash(TokenHasher.sha256(rawToken));
        token.setExpiresAt(OffsetDateTime.now().plusDays(properties.getSecurity().getJwt().getRefreshTtlDays()));
        refreshTokenRepository.save(token);
        return rawToken;
    }

    private AuthResult loginWithUserInfo(GoogleUserInfo userInfo, String ipAddress, String userAgent) {
        log.info("Processing login for user: {}", userInfo.getEmail());
        Org org = orgService.getOrCreateOrg();
        log.info("Resolved organization: {} ({})", org.getName(), org.getId());

        User user = userRepository.findByOrg_IdAndEmail(org.getId(), userInfo.getEmail())
                .orElseGet(() -> {
                    log.info("User not found, creating new user for: {}", userInfo.getEmail());
                    return createUser(org, userInfo);
                });

        if (user.getStatus() != UserStatus.ACTIVE) {
            log.warn("Login denied for inactive user: {}", user.getEmail());
            throw new IllegalArgumentException("User is inactive");
        }

        log.info("User authenticated: {} (ID: {})", user.getEmail(), user.getId());
        user.setLastLoginAt(OffsetDateTime.now());
        userRepository.save(user);

        log.debug("Linking employee if present...");
        linkEmployeeIfPresent(org, user);
        
        log.debug("Ensuring default role assigned...");
        ensureDefaultRoleAssigned(org, user);

        List<String> roles = user.getRoles().stream().map(Role::getName).toList();
        log.info("User roles: {}", roles);
        
        String accessToken = jwtService.createAccessToken(user.getId(), user.getEmail(), roles);
        String refreshToken = createRefreshToken(user);
        UUID employeeId = resolveEmployeeId(org, user);
        
        log.info("Login successful. Employee ID: {}", employeeId);

        auditService.recordAuthEvent(org, user, "LOGIN", "SUCCESS", ipAddress, userAgent, null);

        return new AuthResult(accessToken, refreshToken, user, roles, employeeId);
    }

    private UUID resolveEmployeeId(Org org, User user) {
        return employeeRepository.findByOrg_IdAndUser_Id(org.getId(), user.getId())
                .map(Employee::getId)
                .orElse(null);
    }

    public record AuthResult(String accessToken, String refreshToken, User user, List<String> roles, UUID employeeId) {
    }
}
