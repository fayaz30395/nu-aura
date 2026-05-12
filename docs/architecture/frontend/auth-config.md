# Authentication Configuration Guide

## Session Timeout Configuration

### Default Values

The session timeout hook uses sensible defaults suitable for most enterprise applications:

```typescript
// File: frontend/lib/hooks/useSessionTimeout.ts

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;    // 30 minutes
const TIMEOUT_WARNING_MS = 5 * 60 * 1000;         // Warning at 25 minutes
const DEBOUNCE_ACTIVITY_MS = 60 * 1000;           // Track activity every 60 seconds
```

### Customizing Timeout Values

To change the session timeout duration, modify the constants in `useSessionTimeout.ts`:

**More Lenient (60 minutes):**

```typescript
const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;    // 60 minutes
const TIMEOUT_WARNING_MS = 5 * 60 * 1000;         // Warning at 55 minutes
```

**More Strict (15 minutes):**

```typescript
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;    // 15 minutes
const TIMEOUT_WARNING_MS = 3 * 60 * 1000;         // Warning at 12 minutes
```

**Financial/High-Security (5 minutes):**

```typescript
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;     // 5 minutes
const TIMEOUT_WARNING_MS = 60 * 1000;             // Warning at 4 minutes
```

---

## Token Refresh Configuration

### Current Settings

The token refresh hook is configured in `frontend/lib/hooks/useTokenRefresh.ts`:

```typescript
const REFRESH_INTERVAL_MS = 50 * 60 * 1000;      // Refresh every 50 minutes
const MIN_REFRESH_GAP_MS = 5 * 60 * 1000;         // Minimum 5 minutes between refreshes
```

These values are based on the assumption that:

- Backend access token TTL: 60 minutes
- Refresh should happen before expiry
- 50-minute refresh gives 10-minute safety margin

### Coordinating with Backend

Ensure backend token configuration matches:

**Application Configuration (Spring Boot):**

```yaml
app:
  jwt:
    access-token-expiry: 3600        # 1 hour (must be > 50 min frontend refresh)
    refresh-token-expiry: 604800     # 7 days

  cookie:
    access-token-max-age: 3600       # 1 hour
    refresh-token-max-age: 604800    # 7 days
    secure: true                      # HTTPS only
    http-only: true                   # No JavaScript access
    same-site: Strict                 # CSRF protection
```

### Activity Tracking Configuration

The session timeout hook tracks user activity with debouncing:

```typescript
const DEBOUNCE_ACTIVITY_MS = 60 * 1000;  // Only process activity every 60 seconds
```

**Tracked Activities:**

- `mousedown` - Any mouse button
- `keydown` - Any keyboard key
- `scroll` - Page/element scrolling
- `touchstart` - Touch screen interaction
- `click` - Element clicks

To add more activities:

```typescript
// In useSessionTimeout.ts, add to events array:
const events = [
  'mousedown', 'keydown', 'scroll', 'touchstart', 'click',
  'wheel',      // Add mouse wheel
  'pointerdown' // Add pointer device (pen, touch)
];
```

---

## Environment-Specific Configuration

### Development Environment

**File: `.env.local`**

```env
# Longer timeouts for testing
SESSION_TIMEOUT_MS=1800000              # 30 minutes
SESSION_WARNING_MS=1500000              # 5 minutes

# Faster refresh for testing
TOKEN_REFRESH_INTERVAL_MS=3000000       # 50 minutes
```

### Staging Environment

**File: `.env.staging`**

```env
# Match production settings
SESSION_TIMEOUT_MS=1800000              # 30 minutes
SESSION_WARNING_MS=1500000              # 5 minutes

TOKEN_REFRESH_INTERVAL_MS=3000000       # 50 minutes
```

### Production Environment

**File: `.env.production`**

```env
# Standard enterprise configuration
SESSION_TIMEOUT_MS=1800000              # 30 minutes
SESSION_WARNING_MS=1500000              # 5 minutes

TOKEN_REFRESH_INTERVAL_MS=3000000       # 50 minutes

# Stricter security
NEXT_PUBLIC_SECURE_COOKIES=true
NEXT_PUBLIC_SAME_SITE_STRICT=true
```

---

## Cookie Configuration (Backend-Side)

These settings should be configured in your backend authentication service.

### HttpOnly Cookies (Mandatory)

```java
// Spring Security Cookie Configuration
@Configuration
public class SecurityConfig {

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http.csrf(csrf -> csrf
      .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
      .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
    )
    .sessionManagement(session -> session
      .sessionFixationProtection(SessionFixationProtection.MIGRATEESSION)
      .sessionConcurrency(c -> c.maximumSessions(3))
    );

    return http.build();
  }
}
```

### Access Token Cookie

```java
@Bean
public CookieSerializer httpSessionIdResolver() {
  DefaultCookieSerializer serializer = new DefaultCookieSerializer();
  serializer.setCookieName("access_token");
  serializer.setCookiePath("/");
  serializer.setCookieMaxAge(3600);        // 1 hour
  serializer.setHttpOnly(true);            // No JavaScript access
  serializer.setSecure(true);              // HTTPS only
  serializer.setSameSite("Strict");        // CSRF protection
  serializer.setDomain("yourdomain.com");  // Set to your domain
  return serializer;
}
```

### Refresh Token Cookie

```java
// Refresh token should have longer TTL than access token
serializer.setCookieName("refresh_token");
serializer.setCookieMaxAge(604800);       // 7 days
serializer.setHttpOnly(true);
serializer.setSecure(true);
serializer.setSameSite("Strict");
```

---

## CSRF Token Configuration

### Backend CSRF Token Endpoint

The frontend expects a CSRF token to be available in a cookie named `XSRF-TOKEN`:

```java
@GetMapping("/auth/csrf-token")
public ResponseEntity<Map<String, String>> getCsrfToken(
  @RequestParam(required = false) String token) {
  return ResponseEntity.ok(Map.of(
    "csrfToken", token != null ? token : UUID.randomUUID().toString()
  ));
}
```

### Frontend CSRF Usage

The token is automatically read and sent with all non-GET requests:

```typescript
// In frontend/lib/api/client.ts
const csrfToken = this.getCsrfToken();
if (csrfToken && config.method !== 'get') {
  config.headers['X-XSRF-TOKEN'] = csrfToken;
}
```

---

## Security Headers Configuration

### Current Headers (Implemented in Middleware)

```typescript
// File: frontend/middleware.ts, function addSecurityHeaders()

// Clickjacking protection
X-Frame-Options: DENY

// MIME type sniffing protection
X-Content-Type-Options: nosniff

// Referrer control
Referrer-Policy: strict-origin-when-cross-origin

// HTTPS enforcement
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

// CORS for OAuth
Cross-Origin-Opener-Policy: same-origin-allow-popups

// CSP (restrictive, allows Google OAuth)
Content-Security-Policy: [detailed policy]

// Permissions denial
Permissions-Policy: geolocation=(), microphone=(), camera=(), ...

// Legacy XSS protection
X-XSS-Protection: 1; mode=block

// DNS prefetch control
X-DNS-Prefetch-Control: off
```

### Customizing CSP

To modify the Content Security Policy for additional resources:

```typescript
// frontend/middleware.ts, around line 195
response.headers.set(
  'Content-Security-Policy',
  [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://accounts.google.com ...",
    // Add your custom sources here
    "connect-src 'self' https://your-api.com https://third-party.com",
  ].join('; ')
);
```

---

## Monitoring & Logging Configuration

### Token Refresh Logging

```typescript
// File: frontend/lib/hooks/useTokenRefresh.ts
logger.debug('[TokenRefresh] Proactive token refresh succeeded');
logger.warn('[TokenRefresh] Proactive token refresh failed:', error);
```

### Session Timeout Logging

```typescript
// File: frontend/lib/hooks/useSessionTimeout.ts
logger.info('[SessionTimeout] Showing inactivity warning');
logger.warn('[SessionTimeout] Inactivity timeout reached. Logging out user.');
```

### API Client Logging

```typescript
// File: frontend/lib/api/client.ts
logger.error('[ApiClient] Error:', method, url, status, message);
logger.warn('[ApiClient] setTokens() is deprecated. Use httpOnly cookies.');
```

### Enable Debug Logging

```typescript
// Frontend logger configuration (if using debug package)
localStorage.setItem('debug', 'nu-aura:*');
```

---

## Troubleshooting

### Issue: User Gets Logged Out Unexpectedly

**Possible Cause:** Activity not being detected
**Solution:** Check that event listeners are attached:

```javascript
// In browser console
window.addEventListener('mousedown', () => console.log('Activity detected'));
// Move mouse - should log
```

### Issue: Token Refresh Not Triggering

**Possible Cause:** Interval not set correctly
**Solution:** Check hook is loaded:

```javascript
// In browser console
console.log('Token refresh interval active');
```

### Issue: CSRF Token Missing

**Possible Cause:** Backend not setting XSRF-TOKEN cookie
**Solution:** Verify backend sets cookie on login/refresh:

```javascript
// Check cookies
document.cookie; // Should see XSRF-TOKEN
```

### Issue: User Still in Session on Other Device After Logout

**Possible Cause:** Backend not invalidating tokens
**Solution:** Ensure backend:

1. Blacklists tokens on logout
2. Uses token version/serial number
3. Implements session store (Redis) for revocation

---

## Performance Tuning

### Reduce Activity Tracking Overhead

Increase debounce interval to reduce event processing:

```typescript
// From 60 seconds to 5 minutes (only track activity every 5 min)
const DEBOUNCE_ACTIVITY_MS = 5 * 60 * 1000;
```

### Reduce Token Refresh Frequency

If users complain about refresh calls:

```typescript
// From 50 minutes to 55 minutes (closer to 60-min expiry)
const REFRESH_INTERVAL_MS = 55 * 60 * 1000;
```

### Optimize for High-Traffic Deployments

For users with many concurrent requests:

```typescript
// Use request queue manager instead of flag
// Implement request queue to batch refresh requests
// Consider Redis-based token blacklist instead of in-memory
```

---

## Regulatory Compliance

### GDPR Requirements

- ✅ Session timeout logout = data minimization
- ✅ HttpOnly cookies = data protection
- ✅ Audit logs for authentication events
- ✅ User can request session termination

### SOC 2 Type II Requirements

- ✅ Secure token storage (HttpOnly cookies)
- ✅ Session timeout (30 minutes default)
- ✅ Access logs and audit trails
- ✅ Secure communication (HTTPS/TLS)

### PCI DSS Requirements (if handling payments)

- ✅ Session timeout (15 minutes recommended)
- ✅ Multi-factor authentication
- ✅ Secure encryption (TLS)
- ✅ Audit logs

---

## Quick Configuration Presets

### Startup/Quick Deployment

```typescript
// Longer timeout for user convenience
INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000    // 60 minutes
TIMEOUT_WARNING_MS = 10 * 60 * 1000       // 10 minute warning
```

### Healthcare/Finance

```typescript
// Stricter security
INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000    // 15 minutes
TIMEOUT_WARNING_MS = 2 * 60 * 1000        // 2 minute warning
```

### High-Security/Government

```typescript
// Maximum security
INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000     // 5 minutes
TIMEOUT_WARNING_MS = 60 * 1000            // 1 minute warning
```

---

**Last Updated:** March 13, 2026
**Maintained By:** NU-AURA Security Team
