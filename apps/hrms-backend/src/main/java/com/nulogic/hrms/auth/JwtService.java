package com.nulogic.hrms.auth;

import com.nulogic.hrms.config.HrmsProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Component;

@Component
public class JwtService {
    private final HrmsProperties properties;
    private final SecretKey secretKey;

    public JwtService(HrmsProperties properties) {
        this.properties = properties;
        this.secretKey = buildSecretKey(properties.getSecurity().getJwt().getSecret());
    }

    public String createAccessToken(UUID userId, String email, List<String> roles) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(properties.getSecurity().getJwt().getAccessTtlMinutes(), ChronoUnit.MINUTES);

        return Jwts.builder()
                .issuer(properties.getSecurity().getJwt().getIssuer())
                .subject(userId.toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .claim("email", email)
                .claim("roles", roles)
                .signWith(secretKey)
                .compact();
    }

    public JwtClaims parseAccessToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        String subject = claims.getSubject();
        String email = claims.get("email", String.class);
        List<String> roles = extractRoles(claims.get("roles"));

        return new JwtClaims(UUID.fromString(subject), email, roles);
    }

    private SecretKey buildSecretKey(String secret) {
        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException("JWT secret must be at least 32 characters long");
        }
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    private List<String> extractRoles(Object value) {
        if (value instanceof List<?> list) {
            return list.stream()
                    .filter(item -> item != null && !item.toString().isBlank())
                    .map(Object::toString)
                    .toList();
        }
        return List.of();
    }
}
