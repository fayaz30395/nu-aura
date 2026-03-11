# Authentication & Security Implementation

This document describes the security implementation for JWT-based authentication in the NU-Aura platform.

## Overview

The authentication system has been hardened with the following security measures:

1. **httpOnly Cookie Storage** - JWTs stored in secure cookies instead of localStorage
2. **CSRF Protection** - Double-submit cookie pattern for state-changing requests
3. **JWT Secret Validation** - Startup enforcement of strong secrets
4. **Token Revocation** - Redis-based blacklist for logout and password changes
5. **Actuator/Swagger Lockdown** - Protected in production, open in dev

---

## 1. JWT Storage Migration

### Problem
Storing JWTs in `localStorage` is vulnerable to XSS attacks. Any JavaScript running on the page can read tokens.

### Solution
Tokens are now stored in **httpOnly cookies** that JavaScript cannot access.

### Backend Implementation

**AuthController.java** - Sets cookies on login:
```java
private void setAuthCookies(HttpServletResponse response, String accessToken, String refreshToken) {
    ResponseCookie accessCookie = ResponseCookie.from("access_token", accessToken)
            .httpOnly(true)
            .secure(cookieConfig.isSecureCookie())  // true in production
            .path("/")
            .maxAge(3600)  // 1 hour
            .sameSite("Strict")
            .build();

    ResponseCookie refreshCookie = ResponseCookie.from("refresh_token", refreshToken)
            .httpOnly(true)
            .secure(cookieConfig.isSecureCookie())
            .path("/api/v1/auth")  // Only sent to auth endpoints
            .maxAge(86400)  // 24 hours
            .sameSite("Strict")
            .build();

    response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());
    response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());
}
```

**JwtAuthenticationFilter.java** - Reads from cookie first, falls back to header:
```java
private String getJwtFromRequest(HttpServletRequest request) {
    // First, try httpOnly cookie (preferred)
    String tokenFromCookie = getJwtFromCookie(request);
    if (StringUtils.hasText(tokenFromCookie)) {
        return tokenFromCookie;
    }

    // Fallback to Authorization header for API clients
    String bearerToken = request.getHeader("Authorization");
    if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
        return bearerToken.substring(7);
    }
    return null;
}
```

### Frontend Implementation

**client.ts** - API client with credentials:
```typescript
this.client = axios.create({
    baseURL: API_URL,
    withCredentials: true,  // CRITICAL: Send cookies with requests
});
```

### Cookie Properties

| Property | Access Token | Refresh Token |
|----------|--------------|---------------|
| Name | `access_token` | `refresh_token` |
| HttpOnly | Yes | Yes |
| Secure | Yes (prod) | Yes (prod) |
| SameSite | Strict | Strict |
| Path | `/` | `/api/v1/auth` |
| Max-Age | 3600s (1hr) | 86400s (24hr) |

---

## 2. CSRF Protection

### Problem
With cookie-based auth, the browser automatically sends cookies with every request, making CSRF attacks possible.

### Solution
Double-submit cookie pattern:
1. Backend sets a non-httpOnly `XSRF-TOKEN` cookie
2. Frontend reads this cookie and sends it in `X-XSRF-TOKEN` header
3. Backend validates the header matches the cookie

### Backend Configuration

**SecurityConfig.java**:
```java
if (csrfEnabled) {
    CookieCsrfTokenRepository csrfTokenRepository = CookieCsrfTokenRepository.withHttpOnlyFalse();
    csrfTokenRepository.setCookiePath("/");

    http.csrf(csrf -> csrf
            .csrfTokenRepository(csrfTokenRepository)
            .ignoringRequestMatchers("/api/v1/auth/**")  // Auth endpoints excluded
            .ignoringRequestMatchers("/api/v1/esignature/external/**")
            .ignoringRequestMatchers("/api/v1/public/offers/**")
    );
} else {
    http.csrf(AbstractHttpConfigurer::disable);
}
```

### Frontend Implementation

**client.ts**:
```typescript
private getCsrfToken(): string | null {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'XSRF-TOKEN') {
            return decodeURIComponent(value);
        }
    }
    return null;
}

// In request interceptor:
const csrfToken = this.getCsrfToken();
if (csrfToken && config.method !== 'get') {
    config.headers['X-XSRF-TOKEN'] = csrfToken;
}
```

### Environment Configuration

```yaml
# application.yml
app:
  security:
    csrf:
      enabled: ${CSRF_ENABLED:true}  # false in dev profile
```

---

## 3. JWT Secret Management

### Problem
Weak or missing JWT secrets allow token forgery.

### Solution
Startup validation that fails fast if secret is:
- Missing or empty
- Less than 32 characters
- Contains known weak patterns

### Implementation

**JwtSecretValidator.java**:
```java
@Component
public class JwtSecretValidator {
    private static final int MINIMUM_SECRET_LENGTH = 32;
    private static final String[] FORBIDDEN_SECRETS = {
        "secret", "your-secret-key", "changeme", "password"
    };

    @PostConstruct
    public void validateJwtSecret() {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new SecurityException("JWT_SECRET environment variable is required");
        }
        if (jwtSecret.length() < MINIMUM_SECRET_LENGTH) {
            throw new SecurityException("JWT_SECRET must be at least 32 characters");
        }
        // Check for weak patterns...
    }
}
```

### Environment Configuration

```yaml
# application.yml - NO DEFAULT VALUE
app:
  jwt:
    secret: ${JWT_SECRET}  # REQUIRED - no fallback
```

### Generating a Strong Secret

```bash
# Generate 64-character hex string (256 bits)
openssl rand -hex 32

# Or base64 (43 characters)
openssl rand -base64 32
```

---

## 4. Token Revocation

### Problem
JWTs are stateless - once issued, they're valid until expiry. This is problematic for:
- Logout (token should be invalid immediately)
- Password changes (old tokens should be invalid)
- Account compromise (emergency revocation)

### Solution
Redis-based token blacklist with TTL matching token expiry.

### Implementation

**TokenBlacklistService.java**:
```java
@Service
public class TokenBlacklistService {
    private static final String BLACKLIST_PREFIX = "token:blacklist:";

    public void blacklistToken(String jti, Date expiration) {
        Duration ttl = Duration.ofMillis(expiration.getTime() - System.currentTimeMillis());
        redisTemplate.opsForValue().set(BLACKLIST_PREFIX + jti, "revoked", ttl);
    }

    public boolean isBlacklisted(String jti) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(BLACKLIST_PREFIX + jti));
    }

    public void revokeAllTokensBefore(String userId, Instant timestamp) {
        redisTemplate.opsForValue().set(
            "user:token:revoked_before:" + userId,
            String.valueOf(timestamp.toEpochMilli()),
            Duration.ofHours(24)
        );
    }
}
```

**JwtTokenProvider.java** - Validates against blacklist:
```java
public boolean validateToken(String token) {
    Claims claims = parseToken(token);

    // Check if token is blacklisted by JTI
    String jti = claims.getId();
    if (jti != null && tokenBlacklistService.isBlacklisted(jti)) {
        return false;
    }

    // Check if all user tokens were revoked
    String userId = claims.get("userId", String.class);
    Date issuedAt = claims.getIssuedAt();
    if (tokenBlacklistService.isTokenRevokedByTimestamp(userId, issuedAt)) {
        return false;
    }

    return true;
}
```

### Token Structure

All tokens now include a JTI (JWT ID) claim:
```java
Jwts.builder()
    .id(UUID.randomUUID().toString())  // JTI for revocation
    .subject(email)
    // ... other claims
```

### Revocation Scenarios

| Scenario | Method | Effect |
|----------|--------|--------|
| Logout | `revokeToken(token)` | Blacklists specific token |
| Password Change | `revokeAllUserTokens(userId)` | Invalidates all user tokens |
| Refresh | `revokeToken(oldRefreshToken)` | Prevents reuse |

---

## 5. Actuator & Swagger Lockdown

### Problem
Actuator endpoints expose sensitive operational data. Swagger UI in production is a security risk.

### Solution
- **Production**: Require `SYSTEM_ADMIN` authority
- **Dev profile**: Open access for development

### Implementation

**SecurityConfig.java** (production):
```java
.authorizeHttpRequests(auth -> auth
    // Health is always public (for load balancers)
    .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
    // Other actuator requires SYSTEM_ADMIN
    .requestMatchers("/actuator/**").hasAuthority("SYSTEM_ADMIN")
    // Swagger requires SYSTEM_ADMIN in production
    .requestMatchers("/swagger-ui/**", "/api-docs/**").hasAuthority("SYSTEM_ADMIN")
)
```

**DevSecurityConfig.java** (dev profile only):
```java
@Configuration
@Profile("dev")
public class DevSecurityConfig {
    @Bean
    @Order(1)
    public SecurityFilterChain swaggerDevFilterChain(HttpSecurity http) throws Exception {
        http
            .securityMatcher("/swagger-ui/**", "/api-docs/**")
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }
}
```

---

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | JWT signing key (min 32 chars) | `openssl rand -hex 32` |

### Optional (with defaults)

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_EXPIRATION` | `3600000` | Access token lifetime (ms) |
| `JWT_REFRESH_EXPIRATION` | `86400000` | Refresh token lifetime (ms) |
| `COOKIE_SECURE` | `true` | Use HTTPS-only cookies |
| `CSRF_ENABLED` | `true` | Enable CSRF protection |
| `COOKIE_DOMAIN` | (empty) | Restrict cookies to domain |

### Dev Profile Overrides

```yaml
# Automatically applied when SPRING_PROFILES_ACTIVE=dev
app:
  cookie:
    secure: false  # Allow HTTP for localhost
  security:
    csrf:
      enabled: false  # Simpler dev experience
```

---

## Migration Guide

### For API Clients (Mobile, External)

API clients that cannot use cookies can continue using the `Authorization: Bearer <token>` header. The backend accepts both:

1. httpOnly cookie (preferred for web)
2. Authorization header (fallback for API clients)

### For Frontend Code

1. Remove all `localStorage.getItem('accessToken')` calls
2. Remove all `localStorage.setItem('accessToken', ...)` calls
3. Ensure axios has `withCredentials: true`
4. For CSRF, read `XSRF-TOKEN` cookie and send as `X-XSRF-TOKEN` header

### Testing

```bash
# Login and verify cookies are set
curl -c cookies.txt -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{"email":"test@example.com","password":"password"}'

# Make authenticated request with cookies
curl -b cookies.txt http://localhost:8080/api/v1/employees \
  -H "X-Tenant-ID: 550e8400-e29b-41d4-a716-446655440000"
```

---

## Files Reference

### Backend

| File | Purpose |
|------|---------|
| `JwtSecretValidator.java` | Startup validation of JWT secret |
| `TokenBlacklistService.java` | Redis-based token revocation |
| `CookieConfig.java` | Cookie configuration constants |
| `DevSecurityConfig.java` | Dev profile security overrides |
| `JwtTokenProvider.java` | Token generation with JTI, validation with blacklist |
| `JwtAuthenticationFilter.java` | Cookie + header token extraction |
| `AuthController.java` | Cookie setting/clearing on auth endpoints |
| `SecurityConfig.java` | CSRF config, Actuator/Swagger lockdown |

### Frontend

| File | Purpose |
|------|---------|
| `lib/api/client.ts` | API client with credentials, CSRF handling |
| `lib/api/auth.ts` | Auth API (no manual token handling) |
| `lib/hooks/useAuth.ts` | Auth state (no token storage) |

---

## Security Checklist

- [ ] `JWT_SECRET` environment variable is set with 32+ random characters
- [ ] `COOKIE_SECURE=true` in production
- [ ] `CSRF_ENABLED=true` in production
- [ ] Redis is available for token blacklist (or accept in-memory fallback)
- [ ] CORS `allowedOrigins` is properly configured
- [ ] CORS `allowCredentials=true` is set
- [ ] Frontend uses `withCredentials: true` in axios
- [ ] Actuator endpoints are not publicly accessible in production
- [ ] Swagger UI is not publicly accessible in production
