package com.hrms.common.security;

import com.hrms.domain.user.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

@Component
public class JwtTokenProvider {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration}")
    private long jwtExpiration;

    @Value("${app.jwt.refresh-expiration}")
    private long refreshTokenExpiration;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(Authentication authentication, UUID tenantId, UUID userId) {
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpiration);

        return Jwts.builder()
                .subject(userPrincipal.getUsername())
                .claim("userId", userId.toString())
                .claim("tenantId", tenantId.toString())
                .claim("roles", authentication.getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority)
                        .collect(Collectors.toList()))
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
                                                   Set<String> permissions, Set<String> roles,
                                                   Set<String> accessibleApps) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpiration);

        // Combine roles with ROLE_ prefix for Spring Security
        List<String> authorities = new ArrayList<>();
        roles.forEach(role -> authorities.add("ROLE_" + role));
        authorities.addAll(permissions);

        return Jwts.builder()
                .subject(user.getEmail())
                .claim("userId", user.getId().toString())
                .claim("tenantId", tenantId.toString())
                .claim("appCode", appCode)
                .claim("roles", new ArrayList<>(roles))
                .claim("permissions", new ArrayList<>(permissions))
                .claim("accessibleApps", new ArrayList<>(accessibleApps))
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey())
                .compact();
    }

    public String generateRefreshToken(String email, UUID tenantId) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + refreshTokenExpiration);

        return Jwts.builder()
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

    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException ex) {
            return false;
        }
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
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        List<String> permissions = claims.get("permissions", List.class);
        return permissions != null ? new HashSet<>(permissions) : Collections.emptySet();
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
}
