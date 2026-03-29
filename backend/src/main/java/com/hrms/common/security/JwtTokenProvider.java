package com.hrms.common.security;

import com.hrms.domain.user.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Component
public class JwtTokenProvider {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    /**
     * Validate JWT secret entropy at startup to prevent token forgery.
     *
     * <p><strong>SEC-001:</strong> A weak JWT secret allows attackers to forge tokens
     * and impersonate any user, including SuperAdmin. This check fails the application
     * startup if the secret does not meet minimum security requirements.</p>
     *
     * <p>Requirements: minimum 32 bytes (256 bits) for HMAC-SHA256, must not be a
     * commonly used placeholder value.</p>
     */
    @PostConstruct
    void validateJwtSecret() {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException(
                "JWT_SECRET is not configured. Set the JWT_SECRET environment variable " +
                "with a cryptographically random string of at least 32 bytes."
            );
        }

        int byteLength = jwtSecret.getBytes(StandardCharsets.UTF_8).length;
        if (byteLength < 32) {
            throw new IllegalStateException(
                String.format(
                    "JWT_SECRET is too short (%d bytes). HMAC-SHA256 requires at least 32 bytes (256 bits). " +
                    "Generate a secure secret with: openssl rand -base64 48", byteLength
                )
            );
        }

        // Reject well-known placeholder secrets that might be copy-pasted from docs/tutorials
        Set<String> knownWeakSecrets = Set.of(
            "secret", "mysecret", "jwt-secret", "changeme", "password",
            "your-secret-key", "my-secret-key", "test-secret", "development-secret",
            "your-256-bit-secret", "super-secret-key"
        );

        if (knownWeakSecrets.contains(jwtSecret.toLowerCase().trim())) {
            throw new IllegalStateException(
                "JWT_SECRET is a known weak/placeholder value. " +
                "Generate a secure secret with: openssl rand -base64 48"
            );
        }
    }

    @Value("${app.jwt.expiration}")
    private long jwtExpiration;

    @Value("${app.jwt.refresh-expiration}")
    private long refreshTokenExpiration;

    private final TokenBlacklistService tokenBlacklistService;

    public JwtTokenProvider(TokenBlacklistService tokenBlacklistService) {
        this.tokenBlacklistService = tokenBlacklistService;
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Generate a unique token ID (JTI) for token revocation support.
     */
    private String generateJti() {
        return UUID.randomUUID().toString();
    }

    public String generateToken(Authentication authentication, UUID tenantId, UUID userId) {
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpiration);

        return Jwts.builder()
                .id(generateJti()) // JTI for token revocation
                .issuer("nu-aura")
                .audience().add("nu-aura-api").and()
                .subject(userPrincipal.getUsername())
                .claim("userId", userId.toString())
                .claim("tenantId", tenantId.toString())
                .claim("roles", authentication.getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority)
                        .collect(Collectors.toList()))
                .claim("type", "access")
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey())
                .compact();
    }

    /**
     * Generate JWT token with NU Platform app-aware identity claims.
     *
     * CRIT-001: Permissions and permissionScopes are NO LONGER embedded in the JWT
     * to keep the cookie under the browser's 4096-byte limit. The frontend must
     * fetch permissions from the /auth/me endpoint after login and store them in
     * the Zustand auth store. The backend still enforces permissions via the
     * SecurityContext (loaded from the database on each request).
     */
    public String generateTokenWithAppPermissions(User user, UUID tenantId, String appCode,
            Map<String, com.hrms.domain.user.RoleScope> permissions, Set<String> roles,
            Set<String> accessibleApps, UUID employeeId, UUID locationId, UUID departmentId, UUID teamId) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpiration);

        return Jwts.builder()
                .id(generateJti())
                .issuer("nu-aura")
                .audience().add("nu-aura-api").and()
                .subject(user.getEmail())
                .claim("userId", user.getId().toString())
                .claim("tenantId", tenantId.toString())
                .claim("appCode", appCode)
                .claim("roles", new ArrayList<>(roles))
                // CRIT-001: permissions moved to /auth/me endpoint — not in JWT
                .claim("accessibleApps", new ArrayList<>(accessibleApps))
                .claim("employeeId", employeeId != null ? employeeId.toString() : null)
                .claim("locationId", locationId != null ? locationId.toString() : null)
                .claim("departmentId", departmentId != null ? departmentId.toString() : null)
                .claim("teamId", teamId != null ? teamId.toString() : null)
                .claim("type", "access")
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey())
                .compact();
    }

    public String generateRefreshToken(String email, UUID tenantId) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + refreshTokenExpiration);

        return Jwts.builder()
                .id(generateJti()) // JTI for token revocation
                .issuer("nu-aura")
                .audience().add("nu-aura-api").and()
                .subject(email)
                .claim("tenantId", tenantId.toString())
                .claim("type", "refresh")
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey())
                .compact();
    }

    public String getUsernameFromToken(String token) {
        return getClaims(token).getSubject();
    }

    public UUID getTenantIdFromToken(String token) {
        return UUID.fromString(getClaims(token).get("tenantId", String.class));
    }

    public UUID getUserIdFromToken(String token) {
        String userIdStr = getClaims(token).get("userId", String.class);
        return userIdStr != null ? UUID.fromString(userIdStr) : null;
    }

    /**
     * Validate a JWT token.
     * Checks signature, expiration, and blacklist status.
     *
     * @param token The JWT token to validate
     * @return true if valid and not revoked
     */
    public boolean validateToken(String token) {
        try {
            Claims claims;
            try {
                // Primary path: validate with issuer + audience claims
                claims = Jwts.parser()
                        .verifyWith(getSigningKey())
                        .requireIssuer("nu-aura")
                        .requireAudience("nu-aura-api")
                        .build()
                        .parseSignedClaims(token)
                        .getPayload();
            } catch (JwtException ex) {
                // CRIT-2 FIX: Transition fallback removed. Tokens missing or with wrong
                // issuer/audience claims are always rejected.
                log.warn("SEC: Rejecting JWT with invalid or missing issuer/audience claims: {}", ex.getMessage());
                throw ex;
            }

            // Check if token is blacklisted
            String jti = claims.getId();
            if (jti != null && tokenBlacklistService.isBlacklisted(jti)) {
                return false;
            }

            // Reject refresh tokens used as access tokens (BUG-010)
            String tokenType = claims.get("type", String.class);
            if ("refresh".equals(tokenType)) {
                return false;
            }

            // Check if all user tokens were revoked (e.g., after password change)
            String userId = claims.get("userId", String.class);
            Date issuedAt = claims.getIssuedAt();
            if (userId != null && issuedAt != null &&
                tokenBlacklistService.isTokenRevokedByTimestamp(userId, issuedAt)) {
                return false;
            }

            return true;
        } catch (JwtException | IllegalArgumentException ex) {
            return false;
        }
    }

    /**
     * Get the JTI (unique token identifier) from a token.
     */
    public String getJtiFromToken(String token) {
        Claims claims = getClaims(token);
        return claims.getId();
    }

    /**
     * Get the expiration date from a token.
     */
    public Date getExpirationFromToken(String token) {
        Claims claims = getClaims(token);
        return claims.getExpiration();
    }

    /**
     * Get the issued-at date from a token.
     */
    public Date getIssuedAtFromToken(String token) {
        Claims claims = getClaims(token);
        return claims.getIssuedAt();
    }

    /**
     * Revoke a token by adding it to the blacklist.
     */
    public void revokeToken(String token) {
        try {
            String jti = getJtiFromToken(token);
            Date expiration = getExpirationFromToken(token);
            if (jti != null && expiration != null) {
                tokenBlacklistService.blacklistToken(jti, expiration);
            }
        } catch (JwtException | IllegalArgumentException ex) {
            // Token may be invalid/expired, but we still want to try blacklisting
        }
    }

    /**
     * Revoke all tokens for a user (e.g., after password change).
     */
    public void revokeAllUserTokens(String userId) {
        tokenBlacklistService.revokeAllTokensBefore(userId, java.time.Instant.now());
    }

    /**
     * Get the current application code from token
     */
    public String getAppCodeFromToken(String token) {
        return getClaims(token).get("appCode", String.class);
    }

    /**
     * Get permissions from token (NU Platform format)
     */
    @SuppressWarnings("unchecked")
    public Set<String> getPermissionsFromToken(String token) {
        Claims claims = getClaims(token);
        List<String> permissions = claims.get("permissions", List.class);
        return permissions != null ? new HashSet<>(permissions) : Collections.emptySet();
    }

    @SuppressWarnings("unchecked")
    public Map<String, com.hrms.domain.user.RoleScope> getPermissionScopesFromToken(String token) {
        Claims claims = getClaims(token);
        Map<String, String> scopesMap = claims.get("permissionScopes", Map.class);
        if (scopesMap == null)
            return Collections.emptyMap();

        Map<String, com.hrms.domain.user.RoleScope> result = new HashMap<>();
        scopesMap.forEach((perm, scope) -> result.put(perm, com.hrms.domain.user.RoleScope.valueOf(scope)));
        return result;
    }

    private Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .requireIssuer("nu-aura")
                .requireAudience("nu-aura-api")
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Get roles from token (NU Platform format)
     */
    @SuppressWarnings("unchecked")
    public Set<String> getRolesFromToken(String token) {
        Claims claims = getClaims(token);
        List<String> roles = claims.get("roles", List.class);
        return roles != null ? new HashSet<>(roles) : Collections.emptySet();
    }

    /**
     * Get accessible applications from token
     */
    @SuppressWarnings("unchecked")
    public Set<String> getAccessibleAppsFromToken(String token) {
        Claims claims = getClaims(token);
        List<String> apps = claims.get("accessibleApps", List.class);
        return apps != null ? new HashSet<>(apps) : Collections.emptySet();
    }

    public UUID getEmployeeIdFromToken(String token) {
        String id = getClaims(token).get("employeeId", String.class);
        return id != null ? UUID.fromString(id) : null;
    }

    public UUID getLocationIdFromToken(String token) {
        String id = getClaims(token).get("locationId", String.class);
        return id != null ? UUID.fromString(id) : null;
    }

    public UUID getDepartmentIdFromToken(String token) {
        String id = getClaims(token).get("departmentId", String.class);
        return id != null ? UUID.fromString(id) : null;
    }

    public UUID getTeamIdFromToken(String token) {
        String id = getClaims(token).get("teamId", String.class);
        return id != null ? UUID.fromString(id) : null;
    }

    /**
     * Generate an impersonation token for SuperAdmin cross-tenant access.
     * CRIT-005: Short expiry (15 min), impersonator claim, and audit-friendly.
     *
     * @param impersonatorUserId the admin's real user ID (for audit trail)
     * @param email              the admin's email
     * @param targetTenantId     the tenant being impersonated
     * @param roles              the admin's roles
     */
    public String generateImpersonationToken(UUID impersonatorUserId, String email, UUID targetTenantId, Set<String> roles) {
        Date now = new Date();
        // CRIT-005: 15-minute expiry for impersonation tokens (not standard jwtExpiration)
        Date expiryDate = new Date(now.getTime() + 15 * 60 * 1000L);

        return Jwts.builder()
                .id(generateJti())
                .issuer("nu-aura")
                .audience().add("nu-aura-api").and()
                .subject(email)
                .claim("userId", impersonatorUserId.toString())
                .claim("impersonatorUserId", impersonatorUserId.toString()) // CRIT-005: audit trail
                .claim("tenantId", targetTenantId.toString())
                .claim("roles", new ArrayList<>(roles))
                .claim("isImpersonation", true)
                .claim("type", "access")
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey())
                .compact();
    }

    /**
     * Check if a token is an impersonation token
     */
    public boolean isImpersonationToken(String token) {
        try {
            Boolean isImpersonation = getClaims(token).get("isImpersonation", Boolean.class);
            return isImpersonation != null && isImpersonation;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
