package com.hrms.common.security;

import com.hrms.domain.user.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

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

    @Autowired
    private TokenBlacklistService tokenBlacklistService;

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
     * Generate JWT token with NU Platform app-aware permissions.
     * Includes app code, app-specific permissions, roles, and accessible apps.
     */
    public String generateTokenWithAppPermissions(User user, UUID tenantId, String appCode,
            Map<String, com.hrms.domain.user.RoleScope> permissions, Set<String> roles,
            Set<String> accessibleApps, UUID employeeId, UUID locationId, UUID departmentId, UUID teamId) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpiration);

        // Combine roles with ROLE_ prefix for Spring Security
        List<String> authorities = new ArrayList<>();
        roles.forEach(role -> authorities.add("ROLE_" + role));
        authorities.addAll(permissions.keySet());

        return Jwts.builder()
                .id(generateJti()) // JTI for token revocation
                .subject(user.getEmail())
                .claim("userId", user.getId().toString())
                .claim("tenantId", tenantId.toString())
                .claim("appCode", appCode)
                .claim("roles", new ArrayList<>(roles))
                .claim("permissions", new ArrayList<>(permissions.keySet()))
                .claim("permissionScopes", permissions.entrySet().stream()
                        .collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().name())))
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
                .subject(email)
                .claim("tenantId", tenantId.toString())
                .claim("type", "refresh")
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey())
                .compact();
    }

    public String getUsernameFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return claims.getSubject();
    }

    public UUID getTenantIdFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return UUID.fromString(claims.get("tenantId", String.class));
    }

    public UUID getUserIdFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        String userIdStr = claims.get("userId", String.class);
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
            Claims claims = Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

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
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return claims.get("appCode", String.class);
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
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Get roles from token (NU Platform format)
     */
    @SuppressWarnings("unchecked")
    public Set<String> getRolesFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        List<String> roles = claims.get("roles", List.class);
        return roles != null ? new HashSet<>(roles) : Collections.emptySet();
    }

    /**
     * Get accessible applications from token
     */
    @SuppressWarnings("unchecked")
    public Set<String> getAccessibleAppsFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

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
     * Generate an impersonation token for SuperAdmin cross-tenant access
     * SuperAdmin can use this token to act as if they are a member of the target tenant
     */
    public String generateImpersonationToken(UUID userId, String email, UUID targetTenantId, Set<String> roles) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpiration);

        // Combine roles with ROLE_ prefix for Spring Security
        List<String> authorities = new ArrayList<>();
        roles.forEach(role -> authorities.add("ROLE_" + role));

        return Jwts.builder()
                .id(generateJti()) // JTI for token revocation
                .subject(email)
                .claim("userId", userId.toString())
                .claim("tenantId", targetTenantId.toString())
                .claim("roles", new ArrayList<>(roles))
                .claim("isImpersonation", true) // Flag to indicate this is an impersonation token
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
        } catch (Exception e) {
            return false;
        }
    }
}
